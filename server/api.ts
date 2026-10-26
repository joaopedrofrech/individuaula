import { ZodError } from "zod";
import type { User } from "@/lib/types";
import { readSessionToken } from "@/lib/session";
import { AuthError } from "@/server/auth-service";
import { clientKey, type createRateLimiter } from "@/server/rate-limit";

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly headers?: HeadersInit) {
    super(message);
  }
}

// lê o corpo JSON e devolve um erro 400 claro em vez de deixar a exceção vazar.
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Corpo da requisição inválido.");
  }
}

// rejeita requisições que vieram de outro site, que é o caminho de um ataque CSRF.
// o navegador sempre envia `Origin` nas escritas e não deixa uma página alheia forjar `Host`, então
// comparar os dois é seguro; a URL da requisição pode divergir do endereço visto pelo navegador atrás de proxies.
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      throw new HttpError(403, "Origem não permitida.");
    }
    return;
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Origem não permitida.");
  }
  const allowed = [new URL(request.url).host, request.headers.get("host"), request.headers.get("x-forwarded-host")];
  if (!allowed.includes(originHost)) {
    throw new HttpError(403, "Origem não permitida.");
  }
}

// bloqueia o excesso de tentativas por cliente e informa quando tentar de novo.
export function enforceRateLimit(request: Request, limiter: ReturnType<typeof createRateLimiter>) {
  const result = limiter.check(clientKey(request));
  if (!result.allowed) {
    throw new HttpError(429, "Muitas tentativas. Aguarde um instante e tente novamente.", {
      "retry-after": String(result.retryAfterSeconds),
    });
  }
}

// converte qualquer falha em uma resposta segura: erros conhecidos mostram a própria mensagem e os inesperados
// (banco, rede) viram uma mensagem genérica, com o detalhe só no log do servidor.
export function errorResponse(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status, headers: error.headers });
  }
  if (error instanceof AuthError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? fallback }, { status: 422 });
  }
  console.error(fallback, error);
  return Response.json({ error: fallback }, { status: 500 });
}

// executa a rota e garante que toda falha vire uma resposta segura.
export async function handle(fallback: string, run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    return errorResponse(error, fallback);
  }
}

// exige uma sessão válida e devolve o usuário; sem ela a rota responde 401.
export async function requireUser(request: Request, auth: { getSession(token: string): Promise<User | null> }) {
  const token = readSessionToken(request);
  const user = token ? await auth.getSession(token) : null;
  if (!user) {
    throw new HttpError(401, "Sessão inválida.");
  }
  return user;
}
