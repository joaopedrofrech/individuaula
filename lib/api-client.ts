export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

type RequestOptions = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown };

// o navegador limita o corpo de um fetch `keepalive` a 64 KB; acima disso a gravação não sobrevive à navegação.
const KEEPALIVE_LIMIT = 60_000;

// chama a API do próprio app; o navegador envia o cookie de sessão sozinho (HttpOnly, fora do alcance de scripts).
export async function apiRequest<T = unknown>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    // nunca reaproveita uma resposta guardada: sessão e dados mudam a cada logout, login e gravação.
    cache: "no-store",
    headers: payload === undefined ? undefined : { "content-type": "application/json" },
    body: payload,
    // uma gravação pequena termina mesmo que o aluno recarregue ou feche a página logo em seguida.
    keepalive: method !== "GET" && (payload?.length ?? 0) < KEEPALIVE_LIMIT,
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const data = (await response.json().catch(() => null)) as { error?: string; code?: string } | null;
  if (!response.ok) {
    throw new ApiError(data?.error ?? "Não foi possível concluir a operação.", response.status, data?.code);
  }
  return data as T;
}
