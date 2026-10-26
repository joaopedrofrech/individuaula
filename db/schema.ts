import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// modelo de dados do IndividuAula (Cloudflare D1 / SQLite):
//
//   users 1───N sessions
//   users 1───N disciplines 1───N notes
//                           1───N assessments
//   users 1───N study_sessions
//
// todo registro acadêmico guarda o `user_id` do dono, e toda consulta filtra por ele.
// as chaves estrangeiras usam ON DELETE CASCADE: apagar uma disciplina (ou uma conta) apaga o que depende dela.

// datas guardadas como milissegundos desde 1970, o que o Drizzle converte de e para Date.
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

// contas de alunos; a senha existe apenas como hash PBKDF2, nunca em texto puro.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // sempre em minúsculas; a unicidade impede duas contas com o mesmo e-mail.
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// sessões de login (uma por aparelho); guarda só o hash do token, então um vazamento do banco não permite assumir sessões abertas.
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

// matérias do aluno, com cor e ícone escolhidos por ele.
export const disciplines = sqliteTable(
  "disciplines",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    color: text("color").notNull(),
    icon: text("icon").notNull().default("book"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("disciplines_user_idx").on(table.userId)],
);

// anotações de uma disciplina; `content` é HTML higienizado e a imagem opcional vai como data URL (limite de uma linha do D1).
export const notes = sqliteTable(
  "notes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    disciplineId: text("discipline_id").notNull().references(() => disciplines.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageDataUrl: text("image_data_url"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("notes_user_discipline_idx").on(table.userId, table.disciplineId)],
);

// provas e trabalhos de uma disciplina; a média ponderada é calculada a partir de `grade` e `weight`.
export const assessments = sqliteTable(
  "assessments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    disciplineId: text("discipline_id").notNull().references(() => disciplines.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    grade: real("grade").notNull(),
    weight: real("weight").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("assessments_user_discipline_idx").on(table.userId, table.disciplineId)],
);

// minutos estudados por dia, que alimentam o gráfico semanal do dashboard.
export const studySessions = sqliteTable(
  "study_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    minutes: integer("minutes").notNull(),
  },
  (table) => [index("study_sessions_user_idx").on(table.userId)],
);
