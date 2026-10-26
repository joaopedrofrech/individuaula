import { describe, expect, it } from "vitest";
import { clearSessionCookie, createSessionCookie, isSecureRequest, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

const expiresAt = new Date("2026-12-31T23:59:59.000Z");

describe("cookie de sessão", () => {
  it("cria o cookie com os atributos de proteção", () => {
    const cookie = createSessionCookie({ token: "token-de-teste", expiresAt }).toLowerCase();

    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=token-de-teste`);
    expect(cookie).toContain("httponly");
    expect(cookie).toContain("samesite=lax");
    expect(cookie).toContain("secure");
    expect(cookie).toContain("path=/");
    expect(cookie).toContain("expires=");
  });

  it("omite Secure só quando pedido, para o desenvolvimento em HTTP", () => {
    expect(createSessionCookie({ token: "t", expiresAt, secure: false }).toLowerCase()).not.toContain("secure");
    expect(clearSessionCookie(false).toLowerCase()).not.toContain("secure");
  });

  it("limpa o cookie com Max-Age zero mantendo HttpOnly", () => {
    const cookie = clearSessionCookie().toLowerCase();

    expect(cookie).toContain("max-age=0");
    expect(cookie).toContain("httponly");
    expect(cookie).toContain("secure");
  });

  it("detecta HTTPS pela URL da requisição", () => {
    expect(isSecureRequest(new Request("https://app.exemplo.com/x"))).toBe(true);
    expect(isSecureRequest(new Request("http://localhost:3000/x"))).toBe(false);
  });

  it("lê o token entre vários cookies", () => {
    const request = new Request("http://localhost", { headers: { cookie: "tema=escuro; session=abc123; outro=1" } });

    expect(readSessionToken(request)).toBe("abc123");
  });

  it("devolve undefined sem cookie, sem sessão ou com valor vazio", () => {
    expect(readSessionToken(new Request("http://localhost"))).toBeUndefined();
    expect(readSessionToken(new Request("http://localhost", { headers: { cookie: "tema=escuro" } }))).toBeUndefined();
    expect(readSessionToken(new Request("http://localhost", { headers: { cookie: "session=" } }))).toBeUndefined();
  });

  it("não confunde outro cookie que apenas termina com o nome da sessão", () => {
    expect(readSessionToken(new Request("http://localhost", { headers: { cookie: "xsession=falso" } }))).toBeUndefined();
  });
});
