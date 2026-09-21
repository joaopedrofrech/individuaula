import type { Assessment, Discipline, Note, StudySession, User } from "@/lib/types";

export type ClientAccount = {
  user: User;
  passwordHash: string;
};

export type ClientState = {
  user: User | null;
  accounts: ClientAccount[];
  disciplines: Discipline[];
  notes: Note[];
  assessments: Assessment[];
  studySessions: StudySession[];
};

export const CLIENT_STORAGE_KEY = "individuaula-state-v1";

export const emptyClientState: ClientState = {
  user: null,
  accounts: [],
  disciplines: [],
  notes: [],
  assessments: [],
  studySessions: [],
};

// gera ids estáveis para a camada demo até a persistência relacional entrar.
export function createClientId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

// serializa datas porque o armazenamento do navegador só aceita texto.
export function parseClientState(value: string | null): ClientState {
  // reconstrói datas e aplica valores compatíveis com estados salvos de versões anteriores.
  if (!value) {
    return emptyClientState;
  }

  try {
    const parsed = JSON.parse(value) as ClientState;
    return {
      ...emptyClientState,
      ...parsed,
      user: parsed.user ? { ...parsed.user, createdAt: new Date(parsed.user.createdAt) } : null,
      accounts: (parsed.accounts ?? []).map((account) => ({
        ...account,
        user: { ...account.user, createdAt: new Date(account.user.createdAt) },
      })),
      disciplines: (parsed.disciplines ?? []).map((item) => ({
        ...item,
        description: item.description ?? "",
        icon: item.icon ?? "book",
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      notes: (parsed.notes ?? []).map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      assessments: (parsed.assessments ?? []).map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      studySessions: (parsed.studySessions ?? []).map((item) => ({
        ...item,
        date: new Date(item.date),
      })),
    };
  } catch {
    return emptyClientState;
  }
}

export function serializeClientState(state: ClientState) {
  // transforma o estado do aplicativo em texto para o localStorage.
  return JSON.stringify(state);
}

// resume a conta demo apenas quando o usuário escolhe entrar como visitante.
export function createSampleStudyData(user: User) {
  const createdAt = new Date();
  const disciplines: Discipline[] = [
    {
      id: `${user.id}-demo-web`,
      userId: user.id,
      name: "Desenvolvimento Web",
      description: "Projetos, interfaces e prática de código para a web.",
      color: "lime",
      icon: "code",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: `${user.id}-demo-math`,
      userId: user.id,
      name: "Matemática",
      description: "Funções, raciocínio e resolução de problemas.",
      color: "coral",
      icon: "calculator",
      createdAt,
      updatedAt: createdAt,
    },
  ];
  const assessments: Assessment[] = [
    {
      id: `${user.id}-demo-web-assessment`,
      userId: user.id,
      disciplineId: `${user.id}-demo-web`,
      title: "Projeto parcial",
      grade: 8.5,
      weight: 1,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: `${user.id}-demo-math-assessment`,
      userId: user.id,
      disciplineId: `${user.id}-demo-math`,
      title: "Lista 01",
      grade: 7.8,
      weight: 1,
      createdAt,
      updatedAt: createdAt,
    },
  ];
  const notes: Note[] = [
    {
      id: `${user.id}-demo-note-web`,
      userId: user.id,
      disciplineId: `${user.id}-demo-web`,
      title: "Estrutura de uma página",
      content: "<p>Uma interface clara começa com <strong>HTML semântico</strong> e uma hierarquia que ajuda a pessoa a encontrar o que procura.</p>",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: `${user.id}-demo-note-math`,
      userId: user.id,
      disciplineId: `${user.id}-demo-math`,
      title: "Como revisar funções",
      content: "<p>Revisar o conceito, resolver um exemplo e explicar com as próprias palavras ajuda a fixar o assunto.</p>",
      createdAt,
      updatedAt: createdAt,
    },
  ];
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setHours(9, 0, 0, 0);
  monday.setDate(today.getDate() + mondayOffset);
  const minutesByDay = [55, 80, 35, 95, 60, 40, 0];
  const studySessions: StudySession[] = minutesByDay.map((minutes, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { id: `${user.id}-demo-session-${index}`, userId: user.id, date, minutes };
  });

  return { disciplines, notes, assessments, studySessions };
}

export function createDemoState(): ClientState {
  // monta o estado completo usado por testes e demonstrações locais.
  const createdAt = new Date("2026-09-20T10:00:00.000Z");
  const user: User = {
    id: "demo-user",
    name: "Ana Souza",
    email: "ana@individuaula.local",
    createdAt,
  };
  return { ...emptyClientState, user, ...createSampleStudyData(user) };
}
