import { describe, expect, it } from "vitest";
import { emptyClientState, type ClientState } from "@/lib/client-store";
import {
  addAssessment,
  addDiscipline,
  addNote,
  disciplineAverage,
  listAssessments,
  listDisciplines,
  listNotes,
  ownsDiscipline,
  patchAssessment,
  patchDiscipline,
  patchNote,
  removeAssessment,
  removeDiscipline,
  removeNote,
  searchNotes,
} from "@/lib/study-state";

const t0 = new Date("2026-10-01T10:00:00.000Z");
const t1 = new Date("2026-10-02T10:00:00.000Z");

const disciplineData = { name: "Web", description: "", color: "blue" as const, icon: "book" as const };

function withDiscipline(userId = "aluno-1", state: ClientState = emptyClientState) {
  const next = addDiscipline(state, userId, disciplineData, t0);
  return { state: next, discipline: next.disciplines[next.disciplines.length - 1] };
}

describe("regras de isolamento e CRUD acadêmico", () => {
  it("isola disciplinas entre usuários", () => {
    let { state } = withDiscipline("aluno-1");
    state = addDiscipline(state, "aluno-2", { ...disciplineData, name: "História", color: "green" }, t0);

    expect(listDisciplines(state, "aluno-1")).toHaveLength(1);
    expect(listDisciplines(state, "aluno-1")[0].name).toBe("Web");
    expect(listDisciplines(state, "aluno-2")[0].name).toBe("História");
  });

  it("faz o ciclo de vida de uma disciplina", () => {
    const { state, discipline } = withDiscipline();

    const edited = patchDiscipline(state, "aluno-1", discipline.id, { name: "Desenvolvimento Web" }, t1);
    expect(edited.disciplines[0].name).toBe("Desenvolvimento Web");

    const removed = removeDiscipline(edited, "aluno-1", discipline.id);
    expect(removed.disciplines).toHaveLength(0);
  });

  it("impede que um usuário altere ou exclua disciplina de outro usuário", () => {
    const { state, discipline } = withDiscipline();

    expect(patchDiscipline(state, "aluno-2", discipline.id, { name: "Acesso indevido" }, t1).disciplines[0].name).toBe("Web");
    expect(removeDiscipline(state, "aluno-2", discipline.id).disciplines).toHaveLength(1);
  });

  it("preserva a criação e atualiza a data de alteração da disciplina", () => {
    const { state, discipline } = withDiscipline();

    const [updated] = patchDiscipline(state, "aluno-1", discipline.id, { name: "Novo nome" }, t1).disciplines;

    expect(updated.createdAt).toEqual(t0);
    expect(updated.updatedAt).toEqual(t1);
  });

  it("não apaga descrição e ícone ao editar só o nome", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = patchDiscipline(state, "aluno-1", discipline.id, { description: "Projetos", icon: "code" }, t1);

    const [updated] = patchDiscipline(state, "aluno-1", discipline.id, { name: "Outro" }, t1).disciplines;

    expect(updated).toMatchObject({ name: "Outro", description: "Projetos", icon: "code" });
  });

  it("não altera o estado original ao aplicar uma operação", () => {
    const { state, discipline } = withDiscipline();
    const snapshot = JSON.stringify(state);

    patchDiscipline(state, "aluno-1", discipline.id, { name: "Mutação" }, t1);
    removeDiscipline(state, "aluno-1", discipline.id);
    addNote(state, "aluno-1", discipline.id, { title: "x", content: "y" }, t1);

    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("confirma a posse da disciplina", () => {
    const { state, discipline } = withDiscipline();

    expect(ownsDiscipline(state, "aluno-1", discipline.id)).toBe(true);
    expect(ownsDiscipline(state, "aluno-2", discipline.id)).toBe(false);
    expect(ownsDiscipline(state, "aluno-1", "inexistente")).toBe(false);
  });
});

describe("anotações", () => {
  it("faz o ciclo de vida de uma anotação e pesquisa título e conteúdo", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = addNote(state, "aluno-1", discipline.id, { title: "HTML semântico", content: "header, main e footer" }, t0);
    const note = state.notes[0];

    expect(searchNotes(state, "aluno-1", discipline.id, "semântico")).toHaveLength(1);
    expect(searchNotes(state, "aluno-1", discipline.id, "footer")).toHaveLength(1);

    state = patchNote(state, "aluno-1", note.id, { title: "HTML semântico revisado" }, t1);
    expect(state.notes[0].title).toContain("revisado");
    expect(state.notes[0].content).toBe("header, main e footer");
    expect(state.notes[0].updatedAt).toEqual(t1);

    expect(removeNote(state, "aluno-1", note.id).notes).toHaveLength(0);
  });

  it("pesquisa sem diferenciar maiúsculas e minúsculas e ignora a marcação HTML", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = addNote(state, "aluno-1", discipline.id, { title: "Acessibilidade na Web", content: "<p>Usar <strong>rótulos claros</strong> nos campos.</p>" }, t0);

    expect(searchNotes(state, "aluno-1", discipline.id, "ACESSIBILIDADE")).toHaveLength(1);
    expect(searchNotes(state, "aluno-1", discipline.id, "rótulos claros")).toHaveLength(1);
    expect(searchNotes(state, "aluno-1", discipline.id, "strong")).toHaveLength(0);
  });

  it("devolve todas as anotações da disciplina quando a busca está vazia", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = addNote(state, "aluno-1", discipline.id, { title: "Um", content: "a" }, t0);
    state = addNote(state, "aluno-1", discipline.id, { title: "Dois", content: "b" }, t0);

    expect(searchNotes(state, "aluno-1", discipline.id, "   ")).toHaveLength(2);
    expect(searchNotes(state, "aluno-1", discipline.id, "nada parecido")).toHaveLength(0);
  });

  it("lista só as anotações do usuário e da disciplina pedida", () => {
    const base = withDiscipline("aluno-1");
    const { discipline } = base;
    let state = base.state;
    const other = withDiscipline("aluno-2", state);
    state = addNote(other.state, "aluno-1", discipline.id, { title: "Minha", content: "x" }, t0);
    state = addNote(state, "aluno-2", other.discipline.id, { title: "Dele", content: "y" }, t0);

    expect(listNotes(state, "aluno-1", discipline.id).map((note) => note.title)).toEqual(["Minha"]);
    expect(listNotes(state, "aluno-1", other.discipline.id)).toEqual([]);
  });

  it("impede que um usuário edite ou exclua anotação de outro", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = addNote(state, "aluno-1", discipline.id, { title: "Privada", content: "x" }, t0);
    const note = state.notes[0];

    expect(patchNote(state, "aluno-2", note.id, { title: "Invadida" }, t1).notes[0].title).toBe("Privada");
    expect(removeNote(state, "aluno-2", note.id).notes).toHaveLength(1);
  });

  it("permite remover a imagem de uma anotação", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = addNote(state, "aluno-1", discipline.id, { title: "Com imagem", content: "x", imageDataUrl: "data:image/png;base64,AAAA" }, t0);

    state = patchNote(state, "aluno-1", state.notes[0].id, { imageDataUrl: undefined }, t1);

    expect(state.notes[0].imageDataUrl).toBeUndefined();
  });
});

describe("avaliações e médias", () => {
  it("calcula a média ponderada das avaliações da disciplina", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = addAssessment(state, "aluno-1", discipline.id, { title: "Prova 1", grade: 8, weight: 2 }, t0);
    state = addAssessment(state, "aluno-1", discipline.id, { title: "Projeto", grade: 10, weight: 1 }, t0);

    expect(disciplineAverage(state, "aluno-1", discipline.id)).toBe(8.67);
    expect(listAssessments(state, "aluno-1", discipline.id)).toHaveLength(2);
  });

  it("recalcula a média quando uma nota é editada ou excluída", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = addAssessment(state, "aluno-1", discipline.id, { title: "Prova 1", grade: 6, weight: 1 }, t0);
    state = addAssessment(state, "aluno-1", discipline.id, { title: "Prova 2", grade: 10, weight: 1 }, t0);
    const first = state.assessments[0];

    expect(disciplineAverage(state, "aluno-1", discipline.id)).toBe(8);
    state = patchAssessment(state, "aluno-1", first.id, { grade: 8 }, t1);
    expect(disciplineAverage(state, "aluno-1", discipline.id)).toBe(9);
    state = removeAssessment(state, "aluno-1", first.id);
    expect(disciplineAverage(state, "aluno-1", discipline.id)).toBe(10);
  });

  it("devolve média zero quando não há avaliações", () => {
    const { state, discipline } = withDiscipline();

    expect(disciplineAverage(state, "aluno-1", discipline.id)).toBe(0);
  });

  it("não mistura as notas de usuários diferentes na média", () => {
    const base = withDiscipline("aluno-1");
    const { discipline } = base;
    let state = base.state;
    state = addAssessment(state, "aluno-1", discipline.id, { title: "Prova", grade: 10, weight: 1 }, t0);
    state = addAssessment(state, "aluno-2", discipline.id, { title: "Prova", grade: 0, weight: 1 }, t0);

    expect(disciplineAverage(state, "aluno-1", discipline.id)).toBe(10);
  });

  it("impede que um usuário edite ou exclua avaliação de outro", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = addAssessment(state, "aluno-1", discipline.id, { title: "Prova", grade: 7, weight: 1 }, t0);
    const assessment = state.assessments[0];

    expect(patchAssessment(state, "aluno-2", assessment.id, { grade: 0 }, t1).assessments[0].grade).toBe(7);
    expect(removeAssessment(state, "aluno-2", assessment.id).assessments).toHaveLength(1);
  });
});

describe("integridade entre registros", () => {
  it("não deixa anotações e avaliações órfãs depois de excluir a disciplina", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    state = addNote(state, "aluno-1", discipline.id, { title: "Nota", content: "Conteúdo" }, t0);
    state = addAssessment(state, "aluno-1", discipline.id, { title: "Prova", grade: 8, weight: 1 }, t0);

    state = removeDiscipline(state, "aluno-1", discipline.id);

    expect(state.notes).toEqual([]);
    expect(state.assessments).toEqual([]);
  });

  it("excluir uma disciplina não afeta os registros das outras", () => {
    const base = withDiscipline();
    const { discipline } = base;
    let state = base.state;
    const second = withDiscipline("aluno-1", state);
    state = addNote(second.state, "aluno-1", discipline.id, { title: "A", content: "x" }, t0);
    state = addNote(state, "aluno-1", second.discipline.id, { title: "B", content: "y" }, t0);

    state = removeDiscipline(state, "aluno-1", discipline.id);

    expect(state.notes.map((note) => note.title)).toEqual(["B"]);
    expect(state.disciplines).toHaveLength(1);
  });

  it("uma exclusão negada não apaga os registros de ninguém", () => {
    const base = withDiscipline("aluno-1");
    const { discipline } = base;
    let state = base.state;
    state = addNote(state, "aluno-1", discipline.id, { title: "Privada", content: "x" }, t0);
    state = addAssessment(state, "aluno-1", discipline.id, { title: "Prova", grade: 8, weight: 1 }, t0);

    const attempt = removeDiscipline(state, "aluno-2", discipline.id);

    expect(attempt).toBe(state);
    expect(attempt.notes).toHaveLength(1);
    expect(attempt.assessments).toHaveLength(1);
  });

  it("preserva os demais campos do estado, como a conta logada", () => {
    const logged: ClientState = { ...emptyClientState, user: { id: "aluno-1", name: "Ana", email: "ana@exemplo.com", createdAt: t0 } };

    const { state } = withDiscipline("aluno-1", logged);

    expect(state.user).toBe(logged.user);
  });
});
