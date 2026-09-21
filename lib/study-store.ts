import { calculateWeightedAverage } from "@/lib/academics";
import { noteText } from "@/lib/notes";
import type { Assessment, Discipline, Note } from "@/lib/types";
import type { AssessmentInput, DisciplineInput, NoteInput } from "@/lib/validators";

type StoreOptions = {
  seed?: boolean;
  now?: () => Date;
};

// cria identificadores sem acoplar o domínio ao mecanismo de persistência futuro.
function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createStudyStore({ seed = true, now = () => new Date() }: StoreOptions = {}) {
  // mantém os registros acadêmicos em memória enquanto a persistência definitiva não entra.
  const disciplines: Discipline[] = [];
  const notes: Note[] = [];
  const assessments: Assessment[] = [];

  if (seed) {
    const createdAt = now();
    disciplines.push({
      id: "disciplina-demo",
      userId: "demo-user",
      name: "Desenvolvimento Web",
      description: "Projetos e prática de código para a web.",
      color: "lime",
      icon: "code",
      createdAt,
      updatedAt: createdAt,
    });
    assessments.push({
      id: "avaliacao-demo",
      userId: "demo-user",
      disciplineId: "disciplina-demo",
      title: "Projeto parcial",
      grade: 8.5,
      weight: 1,
      createdAt,
      updatedAt: createdAt,
    });
  }

  return {
    // cria uma disciplina vinculada ao usuário atual.
    createDiscipline(userId: string, input: DisciplineInput) {
      const timestamp = now();
      const discipline: Discipline = {
        id: createId("discipline"),
        userId,
        name: input.name.trim(),
        description: input.description ?? "",
        color: input.color,
        icon: input.icon ?? "book",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      disciplines.push(discipline);
      return discipline;
    },

    // lista somente as disciplinas pertencentes ao usuário informado.
    listDisciplines(userId: string) {
      return disciplines.filter((discipline) => discipline.userId === userId);
    },

    // busca uma disciplina sem permitir acesso a outro usuário.
    getDiscipline(userId: string, id: string) {
      return disciplines.find((discipline) => discipline.userId === userId && discipline.id === id);
    },

    // aplica somente os campos enviados e atualiza a data da disciplina.
    updateDiscipline(userId: string, id: string, input: Partial<DisciplineInput>) {
      const discipline = disciplines.find((item) => item.userId === userId && item.id === id);
      if (!discipline) {
        return false;
      }

      if (input.name !== undefined) {
        discipline.name = input.name.trim();
      }
      if (input.color !== undefined) {
        discipline.color = input.color;
      }
      if (input.description !== undefined) {
        discipline.description = input.description.trim();
      }
      if (input.icon !== undefined) {
        discipline.icon = input.icon;
      }
      discipline.updatedAt = now();
      return discipline;
    },

    // remove a disciplina e os registros que dependem dela.
    deleteDiscipline(userId: string, id: string) {
      const index = disciplines.findIndex((discipline) => discipline.userId === userId && discipline.id === id);
      if (index === -1) {
        return false;
      }

      disciplines.splice(index, 1);
      notes.splice(0, notes.length, ...notes.filter((note) => note.disciplineId !== id || note.userId !== userId));
      assessments.splice(
        0,
        assessments.length,
        ...assessments.filter((assessment) => assessment.disciplineId !== id || assessment.userId !== userId),
      );
      return true;
    },

    // cria uma anotação depois de confirmar que a disciplina existe.
    createNote(userId: string, disciplineId: string, input: NoteInput) {
      if (!disciplines.some((discipline) => discipline.userId === userId && discipline.id === disciplineId)) {
        throw new Error("Disciplina não encontrada.");
      }

      const timestamp = now();
      const note: Note = {
        id: createId("note"),
        userId,
        disciplineId,
        title: input.title.trim(),
        content: input.content.trim(),
        imageDataUrl: input.imageDataUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      notes.push(note);
      return note;
    },

    // lista as anotações de uma disciplina para o usuário atual.
    listNotes(userId: string, disciplineId: string) {
      return notes.filter((note) => note.userId === userId && note.disciplineId === disciplineId);
    },

    // encontra uma anotação pelo identificador dentro do espaço do usuário.
    getNote(userId: string, id: string) {
      return notes.find((note) => note.userId === userId && note.id === id);
    },

    // pesquisa título e conteúdo sem considerar a marcação HTML do editor.
    searchNotes(userId: string, disciplineId: string, query: string) {
      const normalizedQuery = query.trim().toLocaleLowerCase();
      if (!normalizedQuery) {
        return this.listNotes(userId, disciplineId);
      }

      return this.listNotes(userId, disciplineId).filter((note) =>
        `${note.title} ${noteText(note.content)}`.toLocaleLowerCase().includes(normalizedQuery),
      );
    },

    // atualiza os campos permitidos de uma anotação existente.
    updateNote(userId: string, id: string, input: Partial<NoteInput>) {
      const note = notes.find((item) => item.userId === userId && item.id === id);
      if (!note) {
        return false;
      }

      if (input.title !== undefined) {
        note.title = input.title.trim();
      }
      if (input.content !== undefined) {
        note.content = input.content.trim();
      }
      if ("imageDataUrl" in input) {
        note.imageDataUrl = input.imageDataUrl;
      }
      note.updatedAt = now();
      return note;
    },

    // remove uma anotação somente quando ela pertence ao usuário.
    deleteNote(userId: string, id: string) {
      const index = notes.findIndex((note) => note.userId === userId && note.id === id);
      if (index === -1) {
        return false;
      }
      notes.splice(index, 1);
      return true;
    },

    // cria uma avaliação vinculada a uma disciplina válida.
    createAssessment(userId: string, disciplineId: string, input: AssessmentInput) {
      if (!disciplines.some((discipline) => discipline.userId === userId && discipline.id === disciplineId)) {
        throw new Error("Disciplina não encontrada.");
      }

      const timestamp = now();
      const assessment: Assessment = {
        id: createId("assessment"),
        userId,
        disciplineId,
        title: input.title.trim(),
        grade: Number(input.grade),
        weight: Number(input.weight),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      assessments.push(assessment);
      return assessment;
    },

    // lista as avaliações da disciplina para compor a média.
    listAssessments(userId: string, disciplineId: string) {
      return assessments.filter((assessment) => assessment.userId === userId && assessment.disciplineId === disciplineId);
    },

    // encontra uma avaliação pelo identificador dentro do espaço do usuário.
    getAssessment(userId: string, id: string) {
      return assessments.find((assessment) => assessment.userId === userId && assessment.id === id);
    },

    // atualiza nota e peso sem substituir os campos que não foram enviados.
    updateAssessment(userId: string, id: string, input: Partial<AssessmentInput>) {
      const assessment = assessments.find((item) => item.userId === userId && item.id === id);
      if (!assessment) {
        return false;
      }

      if (input.title !== undefined) {
        assessment.title = input.title.trim();
      }
      if (input.grade !== undefined) {
        assessment.grade = Number(input.grade);
      }
      if (input.weight !== undefined) {
        assessment.weight = Number(input.weight);
      }
      assessment.updatedAt = now();
      return assessment;
    },

    // remove uma avaliação e deixa o cálculo pronto para ser recalculado.
    deleteAssessment(userId: string, id: string) {
      const index = assessments.findIndex((assessment) => assessment.userId === userId && assessment.id === id);
      if (index === -1) {
        return false;
      }
      assessments.splice(index, 1);
      return true;
    },

    // calcula a média ponderada das avaliações da disciplina.
    getDisciplineAverage(userId: string, disciplineId: string) {
      return calculateWeightedAverage(this.listAssessments(userId, disciplineId));
    },
  };
}

export type StudyStore = ReturnType<typeof createStudyStore>;
