import type { Session } from "@/lib/types";

export const SESSION_COOKIE_NAME = "session";
const sessions = new Map<string, Session>();

// mantém a sessão fora do componente para que a troca por Better Auth fique localizada.
export function createSession(input: Omit<Session, "id">) {
  const session: Session = { id: crypto.randomUUID(), ...input };
  sessions.set(session.id, session);
  return session;
}

export async function getValidSession(id: string) {
  // remove sessões expiradas antes de devolver uma sessão válida.
  const session = sessions.get(id);
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      sessions.delete(id);
    }
    return null;
  }
  return session;
}

export function revokeSession(id: string) {
  // exclui a sessão do registro em memória.
  sessions.delete(id);
}

export function createSessionCookie({ sessionId, expiresAt }: { sessionId: string; expiresAt: Date }) {
  // serializa a sessão em um cookie protegido para as rotas do servidor.
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Expires=${expiresAt.toUTCString()}`;
}

export function clearSessionCookie() {
  // devolve um cookie expirado para limpar a sessão do navegador.
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function readSessionId(request: Request) {
  // localiza o identificador da sessão no cabeçalho de cookies recebido.
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split("=")[1];
}
