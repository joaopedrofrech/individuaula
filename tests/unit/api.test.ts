import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { assertSameOrigin, enforceRateLimit, errorResponse, handle, HttpError, readJson, requireUser } from "@/server/api";
import { AuthError } from "@/server/auth-service";
import { createRateLimiter } from "@/server/rate-limit";

describe("utilitários das rotas de API", () => {
  it("lê um corpo JSON válido", async () => {
    const request = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ ok: true }) });
    await expect(readJson(request)).resolves.toEqual({ ok: true });
  });

  it("transforma corpo inválido em erro 400", async () => {
    const request = new Request("http://localhost/api", { method: "POST", body: "{quebrado" });
    await expect(readJson(request)).rejects.toMatchObject({ status: 400 });
  });

  it("aceita requisições do mesmo site ou sem origem", () => {
    expect(() => assertSameOrigin(new Request("http://localhost/api", { headers: { origin: "http://localhost" } }))).not.toThrow();
    expect(() => assertSameOrigin(new Request("http://localhost/api"))).not.toThrow();
  });

  it("aceita a origem igual ao Host da requisição mesmo que a URL interna use outro endereço", () => {
    const request = new Request("http://localhost:3000/api", { headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" } });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("aceita a origem igual ao host encaminhado pelo proxy", () => {
    const request = new Request("http://interno/api", { headers: { origin: "https://app.exemplo.com", "x-forwarded-host": "app.exemplo.com" } });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("recusa origem malformada e requisições marcadas como cross-site sem Origin", () => {
    expect(() => assertSameOrigin(new Request("http://localhost/api", { headers: { origin: "não-é-url" } }))).toThrow(/origem/i);
    expect(() => assertSameOrigin(new Request("http://localhost/api", { headers: { "sec-fetch-site": "cross-site" } }))).toThrow(/origem/i);
    expect(() => assertSameOrigin(new Request("http://localhost/api", { headers: { "sec-fetch-site": "same-origin" } }))).not.toThrow();
  });

  it("não aceita um site malicioso apenas porque o Host da requisição é o do app", () => {
    const request = new Request("http://localhost/api", { headers: { origin: "https://malicioso.example", host: "localhost" } });
    expect(() => assertSameOrigin(request)).toThrow(/origem/i);
  });

  it("rejeita requisições de outro site", () => {
    const request = new Request("http://localhost/api", { headers: { origin: "https://site-malicioso.example" } });
    expect(() => assertSameOrigin(request)).toThrow(HttpError);
    expect(() => assertSameOrigin(request)).toThrow(/origem/i);
  });

  it("devolve 429 com Retry-After quando o limite é excedido", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const request = new Request("http://localhost/api");
    enforceRateLimit(request, limiter);

    let caught: unknown;
    try {
      enforceRateLimit(request, limiter);
    } catch (error) {
      caught = error;
    }
    const response = errorResponse(caught, "falha");

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("mostra só a primeira mensagem de validação, sem o dump do Zod", async () => {
    const result = z.object({ email: z.string().email("Informe um e-mail válido.") }).safeParse({ email: "x" });
    const response = errorResponse(result.error, "falha");

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Informe um e-mail válido." });
  });

  it("mostra a mensagem e o código dos erros de autenticação", async () => {
    const response = errorResponse(new AuthError("EMAIL_TAKEN", "E-mail já cadastrado."), "falha");

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "E-mail já cadastrado.", code: "EMAIL_TAKEN" });
  });

  it("esconde erros inesperados atrás de uma mensagem genérica e registra o detalhe no log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = errorResponse(new Error("D1_ERROR: no such table: users"), "Não foi possível concluir.");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Não foi possível concluir." });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("handle transforma exceções da rota em respostas seguras", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect((await handle("falha", async () => { throw new HttpError(404, "Não encontrado."); })).status).toBe(404);
    expect((await handle("falha", async () => { throw new Error("interno"); })).status).toBe(500);
    expect((await handle("falha", async () => Response.json({ ok: true }))).status).toBe(200);
    log.mockRestore();
  });

  it("requireUser devolve o usuário da sessão e recusa a ausência dela", async () => {
    const user = { id: "u1", name: "Ana", email: "ana@exemplo.com", createdAt: new Date() };
    const auth = { getSession: async (token: string) => (token === "valido" ? user : null) };

    await expect(requireUser(new Request("http://localhost", { headers: { cookie: "session=valido" } }), auth)).resolves.toBe(user);
    await expect(requireUser(new Request("http://localhost", { headers: { cookie: "session=outro" } }), auth)).rejects.toMatchObject({ status: 401 });
    await expect(requireUser(new Request("http://localhost"), auth)).rejects.toMatchObject({ status: 401 });
  });
});
