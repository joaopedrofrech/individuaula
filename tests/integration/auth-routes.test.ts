// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as sessionRoute } from "@/app/api/auth/session/route";
import { GET as profile, PATCH as updateProfile } from "@/app/api/auth/profile/route";
import { call } from "../support/api";
import { createTestServices } from "../support/services";
import { createTestDatabase } from "../support/test-db";

const ctx = vi.hoisted(() => ({ services: undefined as unknown }));
vi.mock("@/server/services", () => ({ getServices: () => ctx.services }));

let database: Awaited<ReturnType<typeof createTestDatabase>>;

beforeAll(async () => { database = await createTestDatabase(); }, 60_000);
afterAll(async () => { await database.dispose(); });
beforeEach(async () => { await database.reset(); ctx.services = createTestServices(database.db); });

const account = { name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" };
const signUp = (body: unknown = account, headers?: Record<string, string>) => call(register, "POST", "/api/auth/register", { body, headers });

describe("cadastro e login", () => {
  it("cadastra, abre a sessão em cookie HttpOnly e não devolve credenciais", async () => {
    const response = await signUp();

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ name: "Ana Souza", email: "ana@exemplo.com" });
    expect(JSON.stringify(response.body)).not.toMatch(/password|hash/i);
    const setCookie = response.headers.get("set-cookie")!.toLowerCase();
    expect(setCookie).toContain("httponly");
    expect(setCookie).toContain("samesite=lax");
  });

  it("só marca o cookie como Secure em HTTPS", async () => {
    const http = await signUp();
    expect(http.headers.get("set-cookie")!.toLowerCase()).not.toContain("secure");

    const https = await register(new Request("https://app.exemplo.com/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...account, email: "https@exemplo.com" }) }));
    expect(https.headers.get("set-cookie")!.toLowerCase()).toContain("secure");
  });

  it("retorna conflito para e-mail já cadastrado", async () => {
    await signUp();

    const response = await signUp();

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("EMAIL_TAKEN");
  });

  it("autentica no login e erra sem diferenciar usuário inexistente", async () => {
    await signUp();

    const ok = await call(login, "POST", "/api/auth/login", { body: { email: account.email, password: account.password } });
    const wrong = await call(login, "POST", "/api/auth/login", { body: { email: account.email, password: "errada123" } });
    const unknown = await call(login, "POST", "/api/auth/login", { body: { email: "ninguem@exemplo.com", password: "errada123" } });

    expect(ok.status).toBe(200);
    expect(ok.cookie).toMatch(/^session=[0-9a-f]{64}$/);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("não expõe o dump do Zod nos erros de validação", async () => {
    const response = await signUp({ name: "A", email: "nao-e-email", password: "123" });

    expect(response.status).toBe(422);
    expect(response.body.error).not.toMatch(/[\[{]/);
    expect(response.body.error.length).toBeLessThan(80);
  });

  it("responde 400 quando o corpo não é JSON", async () => {
    const response = await call(login, "POST", "/api/auth/login", { rawBody: "{quebrado" });

    expect(response.status).toBe(400);
  });

  it("não vaza detalhes internos quando o banco falha", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const original = ctx.services;
    ctx.services = { ...(original as object), auth: { register: async () => { throw new Error("D1_ERROR: no such table: users"); } } };

    const response = await signUp();

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toMatch(/D1_ERROR|table/i);
    ctx.services = original;
    error.mockRestore();
  });
});

describe("sessão, perfil e logout", () => {
  it("restaura a sessão pelo cookie e devolve o usuário", async () => {
    const { cookie } = await signUp();

    const response = await call(sessionRoute, "GET", "/api/auth/session", { cookie });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(account.email);
  });

  it("recusa sessão ausente, inventada ou malformada", async () => {
    expect((await call(sessionRoute, "GET", "/api/auth/session")).status).toBe(401);
    expect((await call(sessionRoute, "GET", "/api/auth/session", { cookie: `session=${"0".repeat(64)}` })).status).toBe(401);
    expect((await call(sessionRoute, "GET", "/api/auth/session", { cookie: "session=" })).status).toBe(401);
  });

  it("lê e atualiza o perfil com sessão válida", async () => {
    const { cookie } = await signUp();

    const read = await call(profile, "GET", "/api/auth/profile", { cookie });
    const update = await call(updateProfile, "PATCH", "/api/auth/profile", { cookie, body: { name: "Ana Silva" } });

    expect(read.body.user.email).toBe(account.email);
    expect(update.status).toBe(200);
    expect(update.body.user.name).toBe("Ana Silva");
  });

  it("protege a leitura e a edição do perfil sem sessão", async () => {
    expect((await call(profile, "GET", "/api/auth/profile")).status).toBe(401);
    expect((await call(updateProfile, "PATCH", "/api/auth/profile", { body: { name: "Invasor" } })).status).toBe(401);
  });

  it("invalida o cookie no banco depois do logout", async () => {
    const { cookie } = await signUp();

    const out = await call(logout, "POST", "/api/auth/logout", { cookie });
    const after = await call(sessionRoute, "GET", "/api/auth/session", { cookie });

    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")!.toLowerCase()).toContain("max-age=0");
    expect(after.status).toBe(401);
  });

  it("rejeita nome inválido no perfil mantendo a mensagem curta", async () => {
    const { cookie } = await signUp();

    const response = await call(updateProfile, "PATCH", "/api/auth/profile", { cookie, body: { name: "A" } });

    expect(response.status).toBe(422);
    expect(response.body.error).not.toMatch(/[\[{]/);
  });
});

describe("proteção contra abuso", () => {
  const evil = { origin: "https://malicioso.example" };

  it("recusa requisições vindas de outro site em todas as rotas que alteram estado", async () => {
    const { cookie } = await signUp();
    const attempts = await Promise.all([
      call(login, "POST", "/api/auth/login", { body: { email: "a@b.com", password: "123456" }, headers: evil }),
      call(register, "POST", "/api/auth/register", { body: { ...account, email: "x@y.com" }, headers: evil }),
      call(logout, "POST", "/api/auth/logout", { cookie, headers: evil }),
      call(updateProfile, "PATCH", "/api/auth/profile", { cookie, body: { name: "Invasor" }, headers: evil }),
    ]);

    expect(attempts.map((attempt) => attempt.status)).toEqual(Array(4).fill(403));
    expect((await call(sessionRoute, "GET", "/api/auth/session", { cookie })).body.user.name).toBe("Ana Souza");
  });

  it("aceita a mesma origem do servidor", async () => {
    const response = await call(login, "POST", "/api/auth/login", { body: { email: "x@y.com", password: "123456" }, headers: { origin: "http://localhost" } });

    expect(response.status).toBe(401);
  });

  it("bloqueia o login depois de muitas tentativas e informa quando tentar de novo", async () => {
    const attempt = () => call(login, "POST", "/api/auth/login", { body: { email: account.email, password: "errada123" } });
    const statuses: number[] = [];
    for (let index = 0; index < 11; index += 1) statuses.push((await attempt()).status);

    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(Number((await attempt()).headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("limita a criação de contas por cliente", async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 6; index += 1) {
      statuses.push((await signUp({ ...account, email: `lote-${index}@exemplo.com` })).status);
    }

    expect(statuses.slice(0, 5).every((status) => status === 201)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it("conta tentativas por cliente, sem punir outros endereços", async () => {
    const from = (ip: string) => call(login, "POST", "/api/auth/login", { body: { email: account.email, password: "errada123" }, headers: { "cf-connecting-ip": ip } });
    for (let index = 0; index < 11; index += 1) await from("10.0.0.1");

    expect((await from("10.0.0.1")).status).toBe(429);
    expect((await from("10.0.0.2")).status).toBe(401);
  });

});
