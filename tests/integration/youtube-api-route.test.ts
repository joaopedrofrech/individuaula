// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as createDiscipline } from "@/app/api/disciplines/route";
import { GET } from "@/app/api/youtube/search/route";
import { call } from "../support/api";
import { createTestServices } from "../support/services";
import { createTestDatabase } from "../support/test-db";

const ctx = vi.hoisted(() => ({ services: undefined as unknown }));
vi.mock("@/server/services", () => ({ getServices: () => ctx.services }));

let database: Awaited<ReturnType<typeof createTestDatabase>>;
let cookie: string;

beforeAll(async () => { database = await createTestDatabase(); }, 60_000);
afterAll(async () => { await database.dispose(); });
beforeEach(async () => {
  await database.reset();
  ctx.services = createTestServices(database.db);
  cookie = (await call(register, "POST", "/api/auth/register", { body: { name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" } })).cookie!;
});

const search = (query: string, { ip = "10.0.0.1", session = cookie }: { ip?: string; session?: string } = {}) =>
  call(GET, "GET", `/api/youtube/search?q=${query}`, { cookie: session, headers: { "cf-connecting-ip": ip } });

describe("rota de busca de conteúdos", () => {
  it("exige uma sessão válida, para que ninguém de fora consuma a cota da API", async () => {
    expect((await call(GET, "GET", "/api/youtube/search?q=matematica")).status).toBe(401);
    expect((await search("matematica", { session: `session=${"0".repeat(64)}` })).status).toBe(401);
  });

  it("responde com resultados para um aluno logado", async () => {
    const response = await search("matematica");

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
  });

  it("limita as buscas por cliente para proteger a cota da API", async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 31; index += 1) statuses.push((await search("matematica")).status);

    expect(statuses.slice(0, 30).every((status) => status === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });

  it("não bloqueia outro cliente quando um deles estourou o limite", async () => {
    for (let index = 0; index < 31; index += 1) await search("matematica", { ip: "10.0.0.1" });

    expect((await search("matematica", { ip: "10.0.0.2" })).status).toBe(200);
  });

  it("informa quando tentar de novo", async () => {
    for (let index = 0; index < 30; index += 1) await search("matematica");
    const blocked = await search("matematica");

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("valida o termo antes de qualquer consulta externa", async () => {
    expect((await search("")).status).toBe(400);
    expect((await search("a".repeat(201))).status).toBe(400);
  });

  it("só pesquisa dentro de uma disciplina que pertence ao aluno", async () => {
    const mine = (await call(createDiscipline, "POST", "/api/disciplines", { cookie, body: { name: "Matemática", color: "blue" } })).body.id;
    const other = (await call(register, "POST", "/api/auth/register", { body: { name: "Bia Lima", email: "bia@exemplo.com", password: "segredo456" }, headers: { "cf-connecting-ip": "10.0.0.9" } })).cookie!;
    const theirs = (await call(createDiscipline, "POST", "/api/disciplines", { cookie: other, body: { name: "História", color: "coral" } })).body.id;

    const own = await call(GET, "GET", `/api/youtube/search?q=funcoes&disciplineId=${mine}`, { cookie });
    const foreign = await call(GET, "GET", `/api/youtube/search?q=funcoes&disciplineId=${theirs}`, { cookie });
    const missing = await call(GET, "GET", "/api/youtube/search?q=funcoes&disciplineId=inexistente", { cookie });

    expect(own.status).toBe(200);
    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it("envia a chave configurada só do servidor para o YouTube e nunca a devolve ao navegador", async () => {
    ctx.services = createTestServices(database.db, { youtubeApiKey: "chave-secreta-de-teste" });
    const user = await call(register, "POST", "/api/auth/register", { body: { name: "Caio Dias", email: "caio@exemplo.com", password: "segredo789" }, headers: { "cf-connecting-ip": "10.0.0.7" } });
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return Response.json({ items: [{ id: { videoId: "abc" }, snippet: { title: "Aula de funções", channelTitle: "Canal" } }] });
    });

    const response = await call(GET, "GET", "/api/youtube/search?q=funcoes", { cookie: user.cookie });

    expect(response.body.source).toBe("youtube");
    expect(calls[0]).toContain("key=chave-secreta-de-teste");
    expect(JSON.stringify(response.body)).not.toContain("chave-secreta-de-teste");
    vi.unstubAllGlobals();
  });
});
