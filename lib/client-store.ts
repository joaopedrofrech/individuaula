import type { Assessment, Discipline, Note, StudySession, User } from "@/lib/types";

// estado em memória do app; a fonte da verdade é o banco, que o servidor entrega pela API.
export type ClientState = {
  user: User | null;
  disciplines: Discipline[];
  notes: Note[];
  assessments: Assessment[];
  studySessions: StudySession[];
};

export const emptyClientState: ClientState = {
  user: null,
  disciplines: [],
  notes: [],
  assessments: [],
  studySessions: [],
};

// gera ids no cliente para mostrar o registro novo na hora; o servidor valida o formato antes de gravar.
export function createClientId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

type Raw<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | undefined ? string | undefined : T[K] };

// o JSON da API traz datas como texto; reconstrói os objetos Date que a interface espera.
export function reviveUser(raw: Raw<User>): User {
  return { ...raw, createdAt: new Date(raw.createdAt) };
}

export type StudyPayloadRaw = {
  disciplines: Raw<Discipline>[];
  notes: Raw<Note>[];
  assessments: Raw<Assessment>[];
  studySessions: Raw<StudySession>[];
};

export function reviveStudyPayload(raw: StudyPayloadRaw) {
  return {
    disciplines: (raw.disciplines ?? []).map((item) => ({ ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) })),
    notes: (raw.notes ?? []).map((item) => ({ ...item, imageDataUrl: item.imageDataUrl ?? undefined, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) })),
    assessments: (raw.assessments ?? []).map((item) => ({ ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) })),
    studySessions: (raw.studySessions ?? []).map((item) => ({ ...item, date: new Date(item.date) })),
  };
}
