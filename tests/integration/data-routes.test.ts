// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as loadData } from "@/app/api/data/route";
import { POST as seedDemo } from "@/app/api/demo-data/route";
import { POST as createDiscipline } from "@/app/api/disciplines/route";
import { PATCH as patchDiscipline, DELETE as deleteDiscipline } from "@/app/api/disciplines/[id]/route";
import { POST as createNote } from "@/app/api/notes/route";
import { PATCH as patchNote, DELETE as deleteNote } from "@/app/api/notes/[id]/route";
import { POST as createAssessment } from "@/app/api/assessments/route";
import { PATCH as patchAssessment, DELETE as deleteAssessment } from "@/app/api/assessments/[id]/route";
import { call } from "../support/api";
import { createTestServices } from "../support/services";
import { createTestDatabase } from "../support/test-db";

const ctx = vi.hoisted(() => ({ services: undefined as unknown }));
vi.mock("@/server/services", () => ({ getServices: () => ctx.services }));

let database: Awaited<ReturnType<typeof createTestDatabase>>;
let ana: string;
let bia: string;

beforeAll(async () => { database = await createTestDatabase(); }, 60_000);
afterAll(async () => { await database.dispose(); });
beforeEach(async () => {
  await database.reset();
  ctx.services = createTestServices(database.db);
  ana = (await call(register, "POST", "/api/auth/register", { body: { name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" } })).cookie!;
  bia = (await call(register, "POST", "/api/auth/register", { body: { name: "Bia Lima", email: "bia@exemplo.com", password: "segredo456" }, headers: { "cf-connecting-ip": "10.0.0.2" } })).cookie!;
});

const newDiscipline = (cookie: string, body: object = { name: "Matemática", color: "blue" }) => call(createDiscipline, "POST", "/api/disciplines", { cookie, body });
const newNote = (cookie: string, disciplineId: string, body: object = { title: "Resumo", content: "<p>texto</p>" }) => call(createNote, "POST", "/api/notes", { cookie, body: { disciplineId, ...body } });
const newAssessment = (cookie: string, disciplineId: string, body: object = { title: "Prova", grade: 8, weight: 1 }) => call(createAssessment, "POST", "/api/assessments", { cookie, body: { disciplineId, ...body } });

describe("autenticação obrigatória", () => {
  it("devolve 401 em todas as rotas de dados sem sessão", async () => {
    const responses = await Promise.all([
      call(loadData, "GET", "/api/data"),
      call(seedDemo, "POST", "/api/demo-data"),
      call(createDiscipline, "POST", "/api/disciplines", { body: { name: "X", color: "blue" } }),
      call(patchDiscipline, "PATCH", "/api/disciplines/x", { body: { name: "Y" }, id: "x" }),
      call(deleteDiscipline, "DELETE", "/api/disciplines/x", { id: "x" }),
      call(createNote, "POST", "/api/notes", { body: { disciplineId: "x", title: "t", content: "c" } }),
      call(patchNote, "PATCH", "/api/notes/x", { body: { title: "t" }, id: "x" }),
      call(deleteNote, "DELETE", "/api/notes/x", { id: "x" }),
      call(createAssessment, "POST", "/api/assessments", { body: { disciplineId: "x", title: "t", grade: 1, weight: 1 } }),
      call(patchAssessment, "PATCH", "/api/assessments/x", { body: { grade: 1 }, id: "x" }),
      call(deleteAssessment, "DELETE", "/api/assessments/x", { id: "x" }),
    ]);

    expect(responses.map((response) => response.status)).toEqual(Array(11).fill(401));
  });

  it("recusa escrita vinda de outro site mesmo com sessão válida", async () => {
    const evil = { origin: "https://malicioso.example" };
    const created = await newDiscipline(ana);
    const id = created.body.id;

    const attempts = await Promise.all([
      call(createDiscipline, "POST", "/api/disciplines", { cookie: ana, body: { name: "X", color: "blue" }, headers: evil }),
      call(patchDiscipline, "PATCH", `/api/disciplines/${id}`, { cookie: ana, body: { name: "Invadida" }, id, headers: evil }),
      call(deleteDiscipline, "DELETE", `/api/disciplines/${id}`, { cookie: ana, id, headers: evil }),
      call(seedDemo, "POST", "/api/demo-data", { cookie: ana, headers: evil }),
    ]);

    expect(attempts.map((attempt) => attempt.status)).toEqual([403, 403, 403, 403]);
    expect((await call(loadData, "GET", "/api/data", { cookie: ana })).body.disciplines).toHaveLength(1);
  });
});

describe("disciplinas", () => {
  it("cria no banco, aplica os valores padrão e aparece na leitura", async () => {
    const response = await newDiscipline(ana);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: "Matemática", description: "", icon: "book" });
    expect((await call(loadData, "GET", "/api/data", { cookie: ana })).body.disciplines).toHaveLength(1);
  });

  it("usa o id enviado pelo cliente quando ele tem o formato esperado", async () => {
    const id = `discipline-${crypto.randomUUID()}`;

    const response = await call(createDiscipline, "POST", "/api/disciplines", { cookie: ana, body: { id, name: "Física", color: "coral" } });

    expect(response.body.id).toBe(id);
  });

  it("recusa ids fora do formato, como tentativa de injeção", async () => {
    for (const id of ["x", "note-123", "discipline-'; DROP TABLE users;--", `discipline-${"a".repeat(80)}`]) {
      const response = await call(createDiscipline, "POST", "/api/disciplines", { cookie: ana, body: { id, name: "Física", color: "coral" } });
      expect(response.status).toBe(422);
    }
  });

  it("não aceita um dono enviado no corpo da requisição", async () => {
    const response = await call(createDiscipline, "POST", "/api/disciplines", { cookie: ana, body: { name: "Física", color: "coral", userId: "user-de-outro" } });

    const data = await call(loadData, "GET", "/api/data", { cookie: bia });
    expect(response.body.userId).not.toBe("user-de-outro");
    expect(data.body.disciplines).toHaveLength(0);
  });

  it("valida os campos com mensagem curta", async () => {
    const response = await call(createDiscipline, "POST", "/api/disciplines", { cookie: ana, body: { name: "", color: "roxo" } });

    expect(response.status).toBe(422);
    expect(response.body.error).not.toMatch(/[\[{]/);
  });

  it("edita só os campos enviados", async () => {
    const { body: created } = await newDiscipline(ana, { name: "Matemática", color: "blue", description: "Funções", icon: "calculator" });

    const response = await call(patchDiscipline, "PATCH", `/api/disciplines/${created.id}`, { cookie: ana, id: created.id, body: { name: "Álgebra" } });

    expect(response.body).toMatchObject({ name: "Álgebra", description: "Funções", icon: "calculator", color: "blue" });
  });

  it("responde 404 para disciplina inexistente", async () => {
    expect((await call(patchDiscipline, "PATCH", "/api/disciplines/nada", { cookie: ana, id: "nada", body: { name: "X" } })).status).toBe(404);
    expect((await call(deleteDiscipline, "DELETE", "/api/disciplines/nada", { cookie: ana, id: "nada" })).status).toBe(404);
  });

  it("exclui com 204 e leva anotações e avaliações junto", async () => {
    const { body: discipline } = await newDiscipline(ana);
    await newNote(ana, discipline.id);
    await newAssessment(ana, discipline.id);

    const response = await call(deleteDiscipline, "DELETE", `/api/disciplines/${discipline.id}`, { cookie: ana, id: discipline.id });

    expect(response.status).toBe(204);
    expect((await call(loadData, "GET", "/api/data", { cookie: ana })).body).toMatchObject({ disciplines: [], notes: [], assessments: [] });
  });
});

describe("isolamento entre alunos", () => {
  it("um aluno nunca vê os dados do outro", async () => {
    const { body: discipline } = await newDiscipline(ana);
    await newNote(ana, discipline.id);
    await newAssessment(ana, discipline.id);

    const data = (await call(loadData, "GET", "/api/data", { cookie: bia })).body;

    expect(data).toEqual({ disciplines: [], notes: [], assessments: [], studySessions: [] });
  });

  it("responde 404, e não 403, ao mexer em registros alheios, sem confirmar que eles existem", async () => {
    const { body: discipline } = await newDiscipline(ana);
    const { body: note } = await newNote(ana, discipline.id);
    const { body: assessment } = await newAssessment(ana, discipline.id);

    const attempts = await Promise.all([
      call(patchDiscipline, "PATCH", `/api/disciplines/${discipline.id}`, { cookie: bia, id: discipline.id, body: { name: "Invadida" } }),
      call(deleteDiscipline, "DELETE", `/api/disciplines/${discipline.id}`, { cookie: bia, id: discipline.id }),
      call(patchNote, "PATCH", `/api/notes/${note.id}`, { cookie: bia, id: note.id, body: { title: "Invadida" } }),
      call(deleteNote, "DELETE", `/api/notes/${note.id}`, { cookie: bia, id: note.id }),
      call(patchAssessment, "PATCH", `/api/assessments/${assessment.id}`, { cookie: bia, id: assessment.id, body: { grade: 0 } }),
      call(deleteAssessment, "DELETE", `/api/assessments/${assessment.id}`, { cookie: bia, id: assessment.id }),
      newNote(bia, discipline.id),
      newAssessment(bia, discipline.id),
    ]);

    expect(attempts.map((attempt) => attempt.status)).toEqual(Array(8).fill(404));
    const mine = (await call(loadData, "GET", "/api/data", { cookie: ana })).body;
    expect(mine.disciplines[0].name).toBe("Matemática");
    expect(mine.notes[0].title).toBe("Resumo");
    expect(mine.assessments[0].grade).toBe(8);
  });

  it("recusa o mesmo id duas vezes para o mesmo aluno com 409", async () => {
    const id = `note-${crypto.randomUUID()}`;
    const { body: discipline } = await newDiscipline(ana);

    expect((await newNote(ana, discipline.id, { id, title: "A", content: "x" })).status).toBe(201);
    expect((await newNote(ana, discipline.id, { id, title: "B", content: "y" })).status).toBe(409);
  });

  it("não deixa reaproveitar o id de outro aluno para sobrescrever o registro dele", async () => {
    const { body: discipline } = await newDiscipline(ana);

    const response = await call(createDiscipline, "POST", "/api/disciplines", { cookie: bia, body: { id: discipline.id, name: "Roubada", color: "blue" } });

    expect(response.status).toBe(409);
    expect(JSON.stringify(response.body)).not.toMatch(/sqlite|constraint|D1_ERROR/i);
    expect((await call(loadData, "GET", "/api/data", { cookie: ana })).body.disciplines[0].name).toBe("Matemática");
  });
});

describe("anotações", () => {
  it("higieniza o HTML no servidor mesmo que o navegador envie conteúdo perigoso", async () => {
    const { body: discipline } = await newDiscipline(ana);

    const response = await newNote(ana, discipline.id, { title: "XSS", content: '<p onclick="roubar()">oi</p><script>alert(1)</script><img src=x onerror=alert(1)>' });

    expect(response.status).toBe(201);
    expect(response.body.content).not.toMatch(/script|onclick|onerror|<img/i);
    expect(response.body.content).toContain("oi");
  });

  it("recusa uma anotação que fica vazia depois de higienizada", async () => {
    const { body: discipline } = await newDiscipline(ana);

    const response = await newNote(ana, discipline.id, { title: "Vazia", content: "<script>alert(1)</script>" });

    expect(response.status).toBe(422);
  });

  it("aceita imagem raster e recusa SVG, HTML e endereços externos", async () => {
    const { body: discipline } = await newDiscipline(ana);

    expect((await newNote(ana, discipline.id, { title: "Ok", content: "x", imageDataUrl: "data:image/png;base64,iVBORw0KGgo=" })).status).toBe(201);
    for (const imageDataUrl of ["data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", "data:text/html;base64,PHNjcmlwdD4=", "javascript:alert(1)", "https://exemplo.com/a.png"]) {
      expect((await newNote(ana, discipline.id, { title: "Ruim", content: "x", imageDataUrl })).status).toBe(422);
    }
  });

  it("recusa imagem acima do limite que cabe em uma linha do D1", async () => {
    const { body: discipline } = await newDiscipline(ana);

    const response = await newNote(ana, discipline.id, { title: "Grande", content: "x", imageDataUrl: `data:image/png;base64,${"A".repeat(1_000_001)}` });

    expect(response.status).toBe(422);
  });

  it("edita título e conteúdo, higienizando o novo HTML", async () => {
    const { body: discipline } = await newDiscipline(ana);
    const { body: note } = await newNote(ana, discipline.id);

    const response = await call(patchNote, "PATCH", `/api/notes/${note.id}`, { cookie: ana, id: note.id, body: { title: "Novo", content: "<p onclick=x>novo</p>" } });

    expect(response.body).toMatchObject({ title: "Novo", content: "<p>novo</p>" });
  });

  it("remove a imagem com null e a mantém quando o campo é omitido", async () => {
    const { body: discipline } = await newDiscipline(ana);
    const { body: note } = await newNote(ana, discipline.id, { title: "Com imagem", content: "x", imageDataUrl: "data:image/png;base64,AAAA" });

    const kept = await call(patchNote, "PATCH", `/api/notes/${note.id}`, { cookie: ana, id: note.id, body: { title: "Outro" } });
    expect(kept.body.imageDataUrl).toBe("data:image/png;base64,AAAA");

    const removed = await call(patchNote, "PATCH", `/api/notes/${note.id}`, { cookie: ana, id: note.id, body: { imageDataUrl: null } });
    expect(removed.body.imageDataUrl).toBeUndefined();
  });

  it("exclui a anotação", async () => {
    const { body: discipline } = await newDiscipline(ana);
    const { body: note } = await newNote(ana, discipline.id);

    expect((await call(deleteNote, "DELETE", `/api/notes/${note.id}`, { cookie: ana, id: note.id })).status).toBe(204);
    expect((await call(deleteNote, "DELETE", `/api/notes/${note.id}`, { cookie: ana, id: note.id })).status).toBe(404);
  });
});

describe("avaliações", () => {
  it("converte nota e peso enviados como texto e guarda decimais", async () => {
    const { body: discipline } = await newDiscipline(ana);

    const response = await newAssessment(ana, discipline.id, { title: "Prova", grade: "7.5", weight: "2" });

    expect(response.body).toMatchObject({ grade: 7.5, weight: 2 });
  });

  it("recusa nota fora de 0 a 10 e peso zero ou negativo", async () => {
    const { body: discipline } = await newDiscipline(ana);

    for (const body of [{ grade: 11, weight: 1 }, { grade: -1, weight: 1 }, { grade: 5, weight: 0 }, { grade: 5, weight: -2 }, { grade: "abc", weight: 1 }]) {
      expect((await newAssessment(ana, discipline.id, { title: "Prova", ...body })).status).toBe(422);
    }
  });

  it("edita só a nota e valida o novo valor", async () => {
    const { body: discipline } = await newDiscipline(ana);
    const { body: assessment } = await newAssessment(ana, discipline.id, { title: "Prova", grade: 6, weight: 2 });

    const ok = await call(patchAssessment, "PATCH", `/api/assessments/${assessment.id}`, { cookie: ana, id: assessment.id, body: { grade: 9 } });
    const invalid = await call(patchAssessment, "PATCH", `/api/assessments/${assessment.id}`, { cookie: ana, id: assessment.id, body: { grade: 11 } });

    expect(ok.body).toMatchObject({ title: "Prova", grade: 9, weight: 2 });
    expect(invalid.status).toBe(422);
  });

  it("exclui a avaliação", async () => {
    const { body: discipline } = await newDiscipline(ana);
    const { body: assessment } = await newAssessment(ana, discipline.id);

    expect((await call(deleteAssessment, "DELETE", `/api/assessments/${assessment.id}`, { cookie: ana, id: assessment.id })).status).toBe(204);
  });
});

describe("dados de exemplo", () => {
  it("grava no banco uma única vez e devolve tudo para a tela", async () => {
    const first = await call(seedDemo, "POST", "/api/demo-data", { cookie: ana });
    const second = await call(seedDemo, "POST", "/api/demo-data", { cookie: ana });

    expect(first.body).toMatchObject({ disciplines: expect.any(Array) });
    expect(first.body.disciplines).toHaveLength(2);
    expect(first.body.studySessions).toHaveLength(7);
    expect(second.body.disciplines).toHaveLength(2);
  });

  it("não cria dados de exemplo para o outro aluno", async () => {
    await call(seedDemo, "POST", "/api/demo-data", { cookie: ana });

    expect((await call(loadData, "GET", "/api/data", { cookie: bia })).body.disciplines).toEqual([]);
  });
});
