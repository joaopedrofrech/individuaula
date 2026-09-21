import { describe, expect, it } from "vitest";
import { createSessionCookie, SESSION_COOKIE_NAME } from "@/lib/session";

describe("segurança de sessão", () => {
  it("cria cookie de sessão com atributos de proteção", () => {
    const cookie = createSessionCookie({
      sessionId: "sessao-de-teste",
      expiresAt: new Date("2026-12-31T23:59:59.000Z"),
    });

    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect(cookie.toLowerCase()).toContain("secure");
  });

  it("não aceita uma sessão expirada", async () => {
    const session = await import("@/lib/session");
    const expired = session.createSession({
      userId: "aluno-1",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    await expect(session.getValidSession(expired.id)).resolves.toBeNull();
  });
});
