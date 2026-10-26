import { z } from "zod";
import { contentSearchSchema } from "@/lib/validators";
import { getDemoYoutubeResults, mapYoutubeSearchResponse } from "@/lib/youtube";

type SearchOptions = {
  apiKey?: string;
  fetcher?: typeof fetch;
  validateDiscipline?: (disciplineId: string) => Promise<boolean>;
};

// repassa o token da próxima página só se ele tiver o formato esperado.
function safeToken(value: unknown) {
  const parsed = pageTokenSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

// vídeos por página; o YouTube cobra 100 unidades de cota por chamada, não por vídeo, então páginas maiores rendem mais.
export const PAGE_SIZE = 12;

// o token de página é opaco e vem do próprio YouTube; aceitar só este formato evita injetar parâmetros na consulta.
const pageTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

export async function createYoutubeSearchResponse(request: Request, options: SearchOptions = {}) {
  // valida a busca, consulta a API configurada e devolve resultados de exemplo quando não há chave configurada.
  const params = new URL(request.url).searchParams;
  const parsed = contentSearchSchema.safeParse({ query: params.get("q") ?? "" });
  if (!parsed.success) {
    return Response.json({ error: "Informe um termo de busca." }, { status: 400 });
  }

  const rawPageToken = params.get("pageToken");
  const pageToken = rawPageToken === null ? undefined : pageTokenSchema.safeParse(rawPageToken);
  if (pageToken && !pageToken.success) {
    return Response.json({ error: "Página inválida." }, { status: 400 });
  }

  const disciplineId = params.get("disciplineId");
  if (disciplineId && options.validateDiscipline && !(await options.validateDiscipline(disciplineId))) {
    return Response.json({ error: "Disciplina não encontrada." }, { status: 404 });
  }

  const query = parsed.data.query;
  if (!options.apiKey) {
    // sem chave só há o resultado de exemplo, que não tem próxima página.
    return Response.json({ items: pageToken ? [] : getDemoYoutubeResults(query), source: "demo" });
  }

  try {
    const fetcher = options.fetcher ?? fetch;
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", String(PAGE_SIZE));
    url.searchParams.set("q", query);
    if (pageToken?.success) url.searchParams.set("pageToken", pageToken.data);
    url.searchParams.set("key", options.apiKey);
    const upstream = await fetcher(url);
    if (!upstream.ok) {
      return Response.json({ error: "O serviço de vídeos está indisponível. Tente novamente." }, { status: 503 });
    }
    const data = await upstream.json();
    return Response.json({ items: mapYoutubeSearchResponse(data), nextPageToken: safeToken(data.nextPageToken), source: "youtube" });
  } catch {
    return Response.json({ error: "O serviço de vídeos está indisponível. Tente novamente." }, { status: 503 });
  }
}
