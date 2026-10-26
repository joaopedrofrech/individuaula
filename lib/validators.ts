import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Informe um e-mail válido.");
export const passwordSchema = z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").max(128);
const password = passwordSchema;

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

export const updateProfileSchema = z.object({ name: z.string().trim().min(2, "Informe seu nome.").max(120) });

const disciplineShape = {
  name: z.string().trim().min(1, "Informe o nome da disciplina.").max(120),
  description: z.string().trim().max(280, "A descrição precisa ter no máximo 280 caracteres."),
  color: z.enum(["lime", "coral", "blue", "violet", "slate", "green"]),
  icon: z.enum(["book", "calculator", "code", "flask", "language", "music"]),
};

export const disciplineSchema = z.object({
  ...disciplineShape,
  description: disciplineShape.description.default(""),
  icon: disciplineShape.icon.default("book"),
});

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Informe um título para a anotação.").max(160),
  content: z.string().trim().min(1, "Escreva o conteúdo da anotação.").max(20_000),
  // aceita apenas imagens raster em base64; SVG e outros tipos podem carregar scripts.
  imageDataUrl: z
    .string()
    // o D1 limita cada linha a 2 MB, então a imagem em base64 fica abaixo de 1 MB (cerca de 700 KB de arquivo).
    .max(1_000_000, "A imagem precisa ter no máximo 700 KB.")
    .regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/, "Use uma imagem PNG, JPG, WEBP ou GIF.")
    .optional(),
});

export const assessmentSchema = z.object({
  title: z.string().trim().min(1, "Informe o nome da avaliação.").max(160),
  grade: z.coerce.number().min(0, "A nota mínima é 0.").max(10, "A nota máxima é 10."),
  weight: z.coerce.number().positive("O peso precisa ser maior que zero.").max(100),
});

// o cliente gera o id para atualizar a tela na hora; o servidor só aceita o formato esperado.
const clientId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}-[0-9a-f-]{36}$`), "Identificador inválido.");

export const disciplineCreateSchema = disciplineSchema.extend({ id: clientId("discipline").optional() });
export const noteCreateSchema = noteSchema.extend({ id: clientId("note").optional(), disciplineId: z.string().min(1).max(100) });
export const assessmentCreateSchema = assessmentSchema.extend({ id: clientId("assessment").optional(), disciplineId: z.string().min(1).max(100) });

// a edição parcial não pode reaplicar os valores padrão, senão apagaria descrição e ícone já salvos.
export const disciplineUpdateSchema = z.object(disciplineShape).partial();
export const noteUpdateSchema = noteSchema.partial();
// na API, `null` remove a imagem da anotação e omitir o campo a mantém.
export const noteUpdateRequestSchema = noteSchema.partial().extend({ imageDataUrl: noteSchema.shape.imageDataUrl.unwrap().nullable().optional() });
export const assessmentUpdateSchema = assessmentSchema.partial();

export const contentSearchSchema = z.object({
  query: z.string().trim().min(1, "Informe um termo de busca.").max(200),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type DisciplineInput = z.input<typeof disciplineSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type AssessmentInput = z.infer<typeof assessmentSchema>;
