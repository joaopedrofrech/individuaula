// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { assessments, disciplines, notes, studySessions } from "@/db/schema";
import { createTestServices } from "../support/services";
import { createTestDatabase } from "../support/test-db";

let database: Awaited<ReturnType<typeof createTestDatabase>>;
let study: ReturnType<typeof createTestServices>["study"];
let auth: ReturnType<typeof createTestServices>["auth"];
let ana: string;
let bia: string;

beforeAll(async () => { database = await createTestDatabase(); }, 60_000);
afterAll(async () => { await database.dispose(); });
beforeEach(async () => {
  await database.reset();
  ({ study, auth } = createTestServices(database.db));
  ana = (await auth.register({ name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" })).id;
  bia = (await auth.register({ name: "Bia Lima", email: "bia@exemplo.com", password: "segredo456" })).id;
});

const discipline = { name: "Matemática", description: "Funções", color: "blue", icon: "calculator" };
const rowCount = async (table: typeof disciplines | typeof notes | typeof assessments | typeof studySessions) => (await database.db.select({ total: count() }).from(table))[0].total;

describe("disciplinas", () => {
  it("grava no banco e devolve o registro com dono e datas", async () => {
    const created = await study.createDiscipline(ana, "discipline-1", discipline);

    expect(created).toMatchObject({ id: "discipline-1", userId: ana, ...discipline });
    expect(created.createdAt).toBeInstanceOf(Date);
    expect((await study.loadAll(ana)).disciplines).toHaveLength(1);
  });

  it("não deixa um aluno ver as disciplinas de outro", async () => {
    await study.createDiscipline(ana, "discipline-ana", discipline);
    await study.createDiscipline(bia, "discipline-bia", { ...discipline, name: "História" });

    expect((await study.loadAll(ana)).disciplines.map((item) => item.name)).toEqual(["Matemática"]);
    expect((await study.loadAll(bia)).disciplines.map((item) => item.name)).toEqual(["História"]);
  });

  it("recusa um id que já existe, mesmo vindo de outro aluno", async () => {
    await study.createDiscipline(ana, "discipline-1", discipline);

    await expect(study.createDiscipline(bia, "discipline-1", discipline)).rejects.toThrow();
    expect((await study.loadAll(bia)).disciplines).toHaveLength(0);
  });

  it("atualiza só os campos enviados e preserva os demais", async () => {
    const created = await study.createDiscipline(ana, "discipline-1", discipline);

    const updated = await study.updateDiscipline(ana, "discipline-1", { name: "Matemática Aplicada" });

    expect(updated).toMatchObject({ name: "Matemática Aplicada", description: "Funções", icon: "calculator", color: "blue" });
    expect(updated!.createdAt).toEqual(created.createdAt);
  });

  it("não altera nem exclui a disciplina de outro aluno", async () => {
    await study.createDiscipline(ana, "discipline-1", discipline);

    expect(await study.updateDiscipline(bia, "discipline-1", { name: "Invadida" })).toBeNull();
    expect(await study.deleteDiscipline(bia, "discipline-1")).toBe(false);
    expect((await study.loadAll(ana)).disciplines[0].name).toBe("Matemática");
  });

  it("exclui e informa quando não há o que excluir", async () => {
    await study.createDiscipline(ana, "discipline-1", discipline);

    expect(await study.deleteDiscipline(ana, "discipline-1")).toBe(true);
    expect(await study.deleteDiscipline(ana, "discipline-1")).toBe(false);
  });
});

describe("anotações", () => {
  beforeEach(async () => { await study.createDiscipline(ana, "discipline-1", discipline); });

  it("cria, edita e exclui uma anotação com imagem", async () => {
    const image = "data:image/png;base64,iVBORw0KGgo=";
    const created = await study.createNote(ana, "discipline-1", "note-1", { title: "Resumo", content: "<p>texto</p>", imageDataUrl: image });
    expect(created).toMatchObject({ title: "Resumo", imageDataUrl: image });

    const updated = await study.updateNote(ana, "note-1", { title: "Resumo revisado" });
    expect(updated).toMatchObject({ title: "Resumo revisado", content: "<p>texto</p>", imageDataUrl: image });

    expect(await study.deleteNote(ana, "note-1")).toBe(true);
    expect((await study.loadAll(ana)).notes).toEqual([]);
  });

  it("remove a imagem só quando recebe null e a mantém quando o campo é omitido", async () => {
    await study.createNote(ana, "discipline-1", "note-1", { title: "Resumo", content: "x", imageDataUrl: "data:image/png;base64,AAAA" });

    await study.updateNote(ana, "note-1", { title: "Novo título" });
    expect((await study.loadAll(ana)).notes[0].imageDataUrl).toBe("data:image/png;base64,AAAA");

    await study.updateNote(ana, "note-1", { imageDataUrl: null });
    expect((await study.loadAll(ana)).notes[0].imageDataUrl).toBeUndefined();
  });

  it("não cria anotação em disciplina de outro aluno nem inexistente", async () => {
    expect(await study.createNote(bia, "discipline-1", "note-x", { title: "Invasão", content: "x" })).toBeNull();
    expect(await study.createNote(ana, "inexistente", "note-y", { title: "Órfã", content: "x" })).toBeNull();
    expect(await rowCount(notes)).toBe(0);
  });

  it("não deixa outro aluno editar ou excluir a anotação", async () => {
    await study.createNote(ana, "discipline-1", "note-1", { title: "Privada", content: "x" });

    expect(await study.updateNote(bia, "note-1", { title: "Invadida" })).toBeNull();
    expect(await study.deleteNote(bia, "note-1")).toBe(false);
    expect((await study.loadAll(ana)).notes[0].title).toBe("Privada");
  });

  it("exige uma disciplina existente por chave estrangeira, direto no banco", async () => {
    await expect(database.binding.prepare("INSERT INTO notes (id,user_id,discipline_id,title,content,created_at,updated_at) VALUES ('n',?,'sem-disciplina','t','c',1,1)").bind(ana).run()).rejects.toThrow();
  });
});

describe("avaliações", () => {
  beforeEach(async () => { await study.createDiscipline(ana, "discipline-1", discipline); });

  it("cria, edita só a nota e exclui", async () => {
    await study.createAssessment(ana, "discipline-1", "assessment-1", { title: "Prova", grade: 6.5, weight: 2 });

    const updated = await study.updateAssessment(ana, "assessment-1", { grade: 9 });

    expect(updated).toMatchObject({ title: "Prova", grade: 9, weight: 2 });
    expect(await study.deleteAssessment(ana, "assessment-1")).toBe(true);
  });

  it("guarda notas decimais sem perder precisão", async () => {
    await study.createAssessment(ana, "discipline-1", "assessment-1", { title: "Prova", grade: 7.85, weight: 1.5 });

    expect((await study.loadAll(ana)).assessments[0]).toMatchObject({ grade: 7.85, weight: 1.5 });
  });

  it("não cria avaliação em disciplina alheia e não deixa outro aluno mexer nela", async () => {
    expect(await study.createAssessment(bia, "discipline-1", "assessment-x", { title: "Invasão", grade: 0, weight: 1 })).toBeNull();
    await study.createAssessment(ana, "discipline-1", "assessment-1", { title: "Prova", grade: 7, weight: 1 });

    expect(await study.updateAssessment(bia, "assessment-1", { grade: 0 })).toBeNull();
    expect(await study.deleteAssessment(bia, "assessment-1")).toBe(false);
    expect((await study.loadAll(ana)).assessments[0].grade).toBe(7);
  });
});

describe("integridade e exclusão em cascata", () => {
  it("excluir a disciplina apaga anotações e avaliações dela, e só dela", async () => {
    await study.createDiscipline(ana, "discipline-1", discipline);
    await study.createDiscipline(ana, "discipline-2", { ...discipline, name: "Física" });
    await study.createNote(ana, "discipline-1", "note-1", { title: "A", content: "x" });
    await study.createNote(ana, "discipline-2", "note-2", { title: "B", content: "y" });
    await study.createAssessment(ana, "discipline-1", "assessment-1", { title: "P1", grade: 8, weight: 1 });
    await study.createAssessment(ana, "discipline-2", "assessment-2", { title: "P2", grade: 9, weight: 1 });

    await study.deleteDiscipline(ana, "discipline-1");

    const data = await study.loadAll(ana);
    expect(data.notes.map((note) => note.id)).toEqual(["note-2"]);
    expect(data.assessments.map((item) => item.id)).toEqual(["assessment-2"]);
  });

  it("não deixa registros órfãos no banco depois da exclusão", async () => {
    await study.createDiscipline(ana, "discipline-1", discipline);
    await study.createNote(ana, "discipline-1", "note-1", { title: "A", content: "x" });
    await study.createAssessment(ana, "discipline-1", "assessment-1", { title: "P", grade: 8, weight: 1 });

    await study.deleteDiscipline(ana, "discipline-1");

    expect(await rowCount(notes)).toBe(0);
    expect(await rowCount(assessments)).toBe(0);
  });

  it("excluir a conta apaga todos os dados do aluno e preserva os dos outros", async () => {
    await study.seedDemoData(ana);
    await study.seedDemoData(bia);

    await database.binding.prepare("DELETE FROM users WHERE id = ?").bind(ana).run();

    expect((await study.loadAll(ana)).disciplines).toHaveLength(0);
    expect((await study.loadAll(bia)).disciplines).toHaveLength(2);
    expect(await rowCount(studySessions)).toBe(7);
  });
});

describe("dados de exemplo", () => {
  it("grava disciplinas, anotações, avaliações e a semana de estudo no banco", async () => {
    const data = await study.seedDemoData(ana);

    expect(data.disciplines).toHaveLength(2);
    expect(data.notes).toHaveLength(2);
    expect(data.assessments).toHaveLength(2);
    expect(data.studySessions).toHaveLength(7);
    expect(await rowCount(disciplines)).toBe(2);
  });

  it("grava uma única vez, mesmo se chamado de novo", async () => {
    await study.seedDemoData(ana);
    await study.seedDemoData(ana);

    expect(await rowCount(disciplines)).toBe(2);
  });

  it("não grava se o aluno já tem disciplinas próprias", async () => {
    await study.createDiscipline(ana, "discipline-1", discipline);

    const data = await study.seedDemoData(ana);

    expect(data.disciplines).toHaveLength(1);
  });

  it("vincula tudo ao aluno certo, com ids que não colidem entre alunos", async () => {
    await study.seedDemoData(ana);
    await study.seedDemoData(bia);

    for (const owner of [ana, bia]) {
      const data = await study.loadAll(owner);
      for (const record of [...data.disciplines, ...data.notes, ...data.assessments, ...data.studySessions]) {
        expect(record.userId).toBe(owner);
      }
    }
  });
});

describe("leitura", () => {
  it("devolve listas vazias para quem não tem dados", async () => {
    expect(await study.loadAll(ana)).toEqual({ disciplines: [], notes: [], assessments: [], studySessions: [] });
  });

  it("devolve só os dados do aluno pedido", async () => {
    await study.seedDemoData(ana);

    expect((await study.loadAll(bia)).studySessions).toEqual([]);
  });
});
