import { contentSearchSchema } from "@/lib/validators";
import { getDemoYoutubeResults, mapYoutubeSearchResponse } from "@/lib/youtube";

type SearchOptions = {
  apiKey?: string;
  fetcher?: typeof fetch;
  validateDiscipline?: (disciplineId: string) => Promise<boolean>;
};

export async function createYoutubeSearchResponse(request: Request, options: SearchOptions = {}) {
  // valida a busca, consulta a API configurada e mantém fallback demonstrativo seguro.
  const params = new URL(request.url).searchParams;
  const parsed = contentSearchSchema.safeParse({ query: params.get("q") ?? "" });
  if (!parsed.success) {
    return Response.json({ error: "Informe um termo de busca." }, { status: 400 });
  }

  const disciplineId = params.get("disciplineId");
  if (disciplineId && options.validateDiscipline && !(await options.validateDiscipline(disciplineId))) {
    return Response.json({ error: "Disciplina não encontrada." }, { status: 404 });
  }

  const query = parsed.data.query;
  if (!options.apiKey) {
    return Response.json({ items: getDemoYoutubeResults(query), source: "demo" });
  }

  try {
    const fetcher = options.fetcher ?? fetch;
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "8");
    url.searchParams.set("q", query);
    url.searchParams.set("key", options.apiKey);
    const upstream = await fetcher(url);
    if (!upstream.ok) {
      return Response.json({ error: "O serviço de vídeos está indisponível. Tente novamente." }, { status: 503 });
    }
    const data = await upstream.json();
    return Response.json({ items: mapYoutubeSearchResponse(data), source: "youtube" });
  } catch {
    return Response.json({ error: "O serviço de vídeos está indisponível. Tente novamente." }, { status: 503 });
  }
}
