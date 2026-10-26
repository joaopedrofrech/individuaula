export const SESSION_COOKIE_NAME = "session";

// o cookie só leva `Secure` em HTTPS; em http://localhost de desenvolvimento os navegadores o descartariam.
export function isSecureRequest(request: Request) {
  return new URL(request.url).protocol === "https:";
}

export function createSessionCookie({ token, expiresAt, secure = true }: { token: string; expiresAt: Date; secure?: boolean }) {
  // serializa o token em um cookie protegido contra leitura por scripts e envio entre sites.
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax;${secure ? " Secure;" : ""} Expires=${expiresAt.toUTCString()}`;
}

export function clearSessionCookie(secure = true) {
  // devolve um cookie expirado para limpar a sessão do navegador.
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax;${secure ? " Secure;" : ""} Max-Age=0`;
}

export function readSessionToken(request: Request) {
  // localiza o token da sessão no cabeçalho de cookies recebido.
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
  return value || undefined;
}
