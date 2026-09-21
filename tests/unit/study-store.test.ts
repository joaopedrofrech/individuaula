import { describe, expect, it } from "vitest";
import { createStudyStore } from "@/lib/study-store";

describe("regras de isolamento e CRUD acadêmico", () => {
  it("isola disciplinas entre usuários", () => {
    const store = createStudyStore({ seed: false });
    store.createDiscipline("aluno-1", { name: "Matemática", color: "blue" });
    store.createDiscipline("aluno-2", { name: "História", color: "green" });

    expect(store.listDisciplines("aluno-1")).toHaveLength(1);
    expect(store.listDisciplines("aluno-1")[0].name).toBe("Matemática");
  });

  it("faz o ciclo de vida de uma disciplina", () => {
    const store = createStudyStore({ seed: false });
    const discipline = store.createDiscipline("aluno-1", { name: "Web", color: "blue" });

    store.updateDiscipline("aluno-1", discipline.id, { name: "Desenvolvimento Web" });
    expect(store.getDiscipline("aluno-1", discipline.id)?.name).toBe("Desenvolvimento Web");

    expect(store.deleteDiscipline("aluno-1", discipline.id)).toBe(true);
    expect(store.getDiscipline("aluno-1", discipline.id)).toBeUndefined();
  });

  it("impede que um usuário altere ou exclua disciplina de outro usuário", () => {
    const store = createStudyStore({ seed: false });
    const discipline = store.createDiscipline("aluno-1", { name: "Web", color: "blue" });

    expect(store.getDiscipline("aluno-2", discipline.id)).toBeUndefined();
    expect(store.updateDiscipline("aluno-2", discipline.id, { name: "Acesso indevido" })).toBe(false);
    expect(store.deleteDiscipline("aluno-2", discipline.id)).toBe(false);
    expect(store.getDiscipline("aluno-1", discipline.id)?.name).toBe("Web");
  });

  it("preserva a criação e atualiza a data de alteração da disciplina", () => {
    const store = createStudyStore({ seed: false });
    const discipline = store.createDiscipline("aluno-1", { name: "Web", color: "blue" });

    store.updateDiscipline("aluno-1", discipline.id, { name: "Desenvolvimento Web" });
    const updated = store.getDiscipline("aluno-1", discipline.id);

    expect(updated?.createdAt).toBe(discipline.createdAt);
    expect(updated?.updatedAt).not.toBe(discipline.createdAt);
  });

  it("faz o ciclo de vida de uma anotação e pesquisa título/conteúdo", () => {
    const store = createStudyStore({ seed: false });
    const discipline = store.createDiscipline("aluno-1", { name: "Web", color: "blue" });
    const note = store.createNote("aluno-1", discipline.id, {
      title: "HTML semântico",
      content: "header, main e footer",
    });

    expect(store.searchNotes("aluno-1", discipline.id, "semântico")).toHaveLength(1);
    expect(store.searchNotes("aluno-1", discipline.id, "footer")).toHaveLength(1);
    store.updateNote("aluno-1", note.id, { title: "HTML semântico revisado" });
    expect(store.getNote("aluno-1", note.id)?.title).toContain("revisado");
    expect(store.deleteNote("aluno-1", note.id)).toBe(true);
  });

  it("não permite anotações sem uma disciplina pertencente ao usuário", () => {
    const store = createStudyStore({ seed: false });
    const discipline = store.createDiscipline("aluno-1", { name: "Web", color: "blue" });

    expect(() =>
      store.createNote("aluno-2", discipline.id, {
        title: "Acesso indevido",
        content: "Este vínculo não deveria existir.",
      }),
    ).toThrow();
  });

  it("pesquisa anotações sem diferenciar maiúsculas e minúsculas", () => {
    const store = createStudyStore({ seed: false });
    const discipline = store.createDiscipline("aluno-1", { name: "Web", color: "blue" });
    store.createNote("aluno-1", discipline.id, {
      title: "Acessibilidade na Web",
      content: "Usar rótulos claros nos campos.",
    });

    expect(store.searchNotes("aluno-1", discipline.id, "ACESSIBILIDADE")).toHaveLength(1);
    expect(store.searchNotes("aluno-1", discipline.id, "rótulos claros")).toHaveLength(1);
  });

  it("calcula e mantém avaliações vinculadas à disciplina", () => {
    const store = createStudyStore({ seed: false });
    const discipline = store.createDiscipline("aluno-1", { name: "Web", color: "blue" });
    store.createAssessment("aluno-1", discipline.id, { title: "Prova 1", grade: 8, weight: 2 });
    store.createAssessment("aluno-1", discipline.id, { title: "Projeto", grade: 10, weight: 1 });

    expect(store.getDisciplineAverage("aluno-1", discipline.id)).toBe(8.67);
    expect(store.listAssessments("aluno-1", discipline.id)).toHaveLength(2);
  });

  it("recalcula a média quando uma nota é editada ou excluída", () => {
    const store = createStudyStore({ seed: false });
    const discipline = store.createDiscipline("aluno-1", { name: "Web", color: "blue" });
    const assessment = store.createAssessment("aluno-1", discipline.id, {
      title: "Prova 1",
      grade: 6,
      weight: 1,
    });
    store.createAssessment("aluno-1", discipline.id, { title: "Prova 2", grade: 10, weight: 1 });

    expect(store.getDisciplineAverage("aluno-1", discipline.id)).toBe(8);
    store.updateAssessment("aluno-1", assessment.id, { grade: 8 });
    expect(store.getDisciplineAverage("aluno-1", discipline.id)).toBe(9);
    expect(store.deleteAssessment("aluno-1", assessment.id)).toBe(true);
    expect(store.getDisciplineAverage("aluno-1", discipline.id)).toBe(10);
  });

  it("impede registros acadêmicos órfãos após a exclusão da disciplina", () => {
    const store = createStudyStore({ seed: false });
    const discipline = store.createDiscipline("aluno-1", { name: "Web", color: "blue" });
    const note = store.createNote("aluno-1", discipline.id, { title: "Nota", content: "Conteúdo" });
    const assessment = store.createAssessment("aluno-1", discipline.id, {
      title: "Prova",
      grade: 8,
      weight: 1,
    });

    expect(store.deleteDiscipline("aluno-1", discipline.id)).toBe(true);
    expect(store.getNote("aluno-1", note.id)).toBeUndefined();
    expect(store.listAssessments("aluno-1", discipline.id)).toEqual([]);
    expect(store.getAssessment("aluno-1", assessment.id)).toBeUndefined();
  });
});
