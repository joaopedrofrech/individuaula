import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Informe um e-mail válido.");
const password = z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").max(128);

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email,
  password,
});

export const loginSchema = z.object({ email, password });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email,
});

export const passwordResetRequestSchema = z.object({ email });

export const passwordResetSchema = z.object({
  token: z.string().trim().min(1, "Token inválido."),
  password,
});

export const disciplineSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da disciplina.").max(120),
  description: z.string().trim().max(280, "A descrição precisa ter no máximo 280 caracteres.").default(""),
  color: z.enum(["lime", "coral", "blue", "violet", "slate", "green"]),
  icon: z.enum(["book", "calculator", "code", "flask", "language", "music"]).default("book"),
});

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Informe um título para a anotação.").max(160),
  content: z.string().trim().min(1, "Escreva o conteúdo da anotação.").max(20_000),
  imageDataUrl: z.string().max(2_000_000, "A imagem precisa ter no máximo 1,5 MB.").optional(),
});

export const assessmentSchema = z.object({
  title: z.string().trim().min(1, "Informe o nome da avaliação.").max(160),
  grade: z.coerce.number().min(0, "A nota mínima é 0.").max(10, "A nota máxima é 10."),
  weight: z.coerce.number().positive("O peso precisa ser maior que zero.").max(100),
});

export const contentSearchSchema = z.object({
  query: z.string().trim().min(1, "Informe um termo de busca.").max(200),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type DisciplineInput = z.input<typeof disciplineSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type AssessmentInput = z.infer<typeof assessmentSchema>;
