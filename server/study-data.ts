import { and, eq } from "drizzle-orm";
import { assessments, disciplines, notes, studySessions } from "@/db/schema";
import type { Assessment, Discipline, Note, StudySession } from "@/lib/types";
import { HttpError } from "@/server/api";
import type { Db } from "@/server/db";
import { createSampleStudyData } from "@/server/demo-data";

export type StudyPayload = { disciplines: Discipline[]; notes: Note[]; assessments: Assessment[]; studySessions: StudySession[] };

type NoteRow = typeof notes.$inferSelect;

// o banco guarda a imagem ausente como NULL; a interface trabalha com `undefined`.
const toNote = (row: NoteRow): Note => ({ ...row, imageDataUrl: row.imageDataUrl ?? undefined });

// remove as chaves indefinidas para que uma atualização parcial não sobrescreva colunas com NULL.
function defined<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Partial<T>;
}

// converte a violação de unicidade do banco (id já usado) em um conflito claro, sem expor o erro do SQLite.
async function insertOrConflict<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    // o Drizzle embrulha o erro do SQLite em `cause`; olhamos os dois níveis.
    const detail = [error, (error as { cause?: unknown })?.cause].map((item) => (item instanceof Error ? item.message : "")).join(" ");
    if (/UNIQUE constraint/i.test(detail)) {
      throw new HttpError(409, "Este registro já existe.");
    }
    throw error;
  }
}

// toda consulta filtra pelo dono; é aqui que o isolamento entre alunos é garantido.
export function createStudyData(db: Db, now: () => Date = () => new Date()) {
  async function ownsDiscipline(userId: string, disciplineId: string) {
    const [row] = await db.select({ id: disciplines.id }).from(disciplines).where(and(eq(disciplines.id, disciplineId), eq(disciplines.userId, userId))).limit(1);
    return Boolean(row);
  }

  return {
    // permite que outras rotas confirmem a posse de uma disciplina antes de usá-la.
    ownsDiscipline,

    async loadAll(userId: string): Promise<StudyPayload> {
      const [disciplineRows, noteRows, assessmentRows, sessionRows] = await db.batch([
        db.select().from(disciplines).where(eq(disciplines.userId, userId)),
        db.select().from(notes).where(eq(notes.userId, userId)),
        db.select().from(assessments).where(eq(assessments.userId, userId)),
        db.select().from(studySessions).where(eq(studySessions.userId, userId)),
      ]);
      return { disciplines: disciplineRows, notes: noteRows.map(toNote), assessments: assessmentRows, studySessions: sessionRows };
    },

    async createDiscipline(userId: string, id: string, data: { name: string; description: string; color: string; icon: string }) {
      const timestamp = now();
      const [row] = await insertOrConflict(() => db.insert(disciplines).values({ id, userId, ...data, createdAt: timestamp, updatedAt: timestamp }).returning());
      return row;
    },

    async updateDiscipline(userId: string, id: string, data: Partial<{ name: string; description: string; color: string; icon: string }>) {
      const [row] = await db.update(disciplines).set({ ...defined(data), updatedAt: now() }).where(and(eq(disciplines.id, id), eq(disciplines.userId, userId))).returning();
      return row ?? null;
    },

    // as chaves estrangeiras com ON DELETE CASCADE removem anotações e avaliações da disciplina.
    async deleteDiscipline(userId: string, id: string) {
      const removed = await db.delete(disciplines).where(and(eq(disciplines.id, id), eq(disciplines.userId, userId))).returning({ id: disciplines.id });
      return removed.length > 0;
    },

    async createNote(userId: string, disciplineId: string, id: string, data: { title: string; content: string; imageDataUrl?: string }) {
      if (!(await ownsDiscipline(userId, disciplineId))) {
        return null;
      }
      const timestamp = now();
      const [row] = await insertOrConflict(() => db.insert(notes).values({ id, userId, disciplineId, title: data.title, content: data.content, imageDataUrl: data.imageDataUrl ?? null, createdAt: timestamp, updatedAt: timestamp }).returning());
      return toNote(row);
    },

    // `imageDataUrl: null` remove a imagem; omitir o campo a mantém.
    async updateNote(userId: string, id: string, data: Partial<{ title: string; content: string; imageDataUrl: string | null }>) {
      const [row] = await db.update(notes).set({ ...defined(data), updatedAt: now() }).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning();
      return row ? toNote(row) : null;
    },

    async deleteNote(userId: string, id: string) {
      const removed = await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning({ id: notes.id });
      return removed.length > 0;
    },

    async createAssessment(userId: string, disciplineId: string, id: string, data: { title: string; grade: number; weight: number }) {
      if (!(await ownsDiscipline(userId, disciplineId))) {
        return null;
      }
      const timestamp = now();
      const [row] = await insertOrConflict(() => db.insert(assessments).values({ id, userId, disciplineId, ...data, createdAt: timestamp, updatedAt: timestamp }).returning());
      return row;
    },

    async updateAssessment(userId: string, id: string, data: Partial<{ title: string; grade: number; weight: number }>) {
      const [row] = await db.update(assessments).set({ ...defined(data), updatedAt: now() }).where(and(eq(assessments.id, id), eq(assessments.userId, userId))).returning();
      return row ?? null;
    },

    async deleteAssessment(userId: string, id: string) {
      const removed = await db.delete(assessments).where(and(eq(assessments.id, id), eq(assessments.userId, userId))).returning({ id: assessments.id });
      return removed.length > 0;
    },

    // grava os dados de exemplo uma única vez; se o aluno já tem disciplinas, não faz nada.
    async seedDemoData(userId: string) {
      const [existing] = await db.select({ id: disciplines.id }).from(disciplines).where(eq(disciplines.userId, userId)).limit(1);
      if (!existing) {
        const sample = createSampleStudyData(userId, now());
        await db.batch([
          db.insert(disciplines).values(sample.disciplines),
          db.insert(notes).values(sample.notes.map((note) => ({ ...note, imageDataUrl: null }))),
          db.insert(assessments).values(sample.assessments),
          db.insert(studySessions).values(sample.studySessions),
        ]);
      }
      return this.loadAll(userId);
    },
  };
}
