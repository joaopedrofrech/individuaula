import { describe, expect, it } from "vitest";
import {
  assessmentSchema,
  contentSearchSchema,
  disciplineSchema,
  loginSchema,
  noteSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  profileSchema,
  registrationSchema,
} from "@/lib/validators";

describe("validações de entrada", () => {
  it("aceita o cadastro de disciplina mínimo", () => {
    expect(disciplineSchema.safeParse({ name: "Matemática", color: "blue" }).success).toBe(true);
  });

  it("recusa disciplina sem nome", () => {
    expect(disciplineSchema.safeParse({ name: "", color: "blue" }).success).toBe(false);
  });

  it("recusa disciplina com nome excessivamente longo", () => {
    expect(disciplineSchema.safeParse({ name: "a".repeat(121), color: "blue" }).success).toBe(false);
  });

  it("valida anotação com título e conteúdo", () => {
    expect(
      noteSchema.safeParse({ title: "Funções", content: "Revisar domínio e imagem." }).success,
    ).toBe(true);
    expect(noteSchema.safeParse({ title: "Funções", content: "" }).success).toBe(false);
  });

  it("recusa anotações sem título e com conteúdo excessivo", () => {
    expect(noteSchema.safeParse({ title: "", content: "texto" }).success).toBe(false);
    expect(noteSchema.safeParse({ title: "Título", content: "a".repeat(20_001) }).success).toBe(false);
  });

  it("mantém notas e pesos dentro das faixas esperadas", () => {
    expect(assessmentSchema.safeParse({ title: "Prova 1", grade: 8, weight: 2 }).success).toBe(true);
    expect(assessmentSchema.safeParse({ title: "Prova 1", grade: 0, weight: 1 }).success).toBe(true);
    expect(assessmentSchema.safeParse({ title: "Prova 1", grade: 11, weight: 2 }).success).toBe(false);
    expect(assessmentSchema.safeParse({ title: "Prova 1", grade: 8, weight: 0 }).success).toBe(false);
    expect(assessmentSchema.safeParse({ title: "Prova 1", grade: 8, weight: -1 }).success).toBe(false);
  });

  it("exige e-mail e senha válidos no login", () => {
    expect(loginSchema.safeParse({ email: "aluno@exemplo.com", password: "123456" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "aluno", password: "123" }).success).toBe(false);
  });

  it("normaliza espaços dos dados textuais antes do uso", () => {
    const result = registrationSchema.safeParse({
      name: "  Ana Souza  ",
      email: "  ANA@EXEMPLO.COM  ",
      password: "segredo123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ana Souza");
      expect(result.data.email).toBe("ana@exemplo.com");
    }
  });

  it("valida o cadastro e a edição de perfil", () => {
    expect(
      registrationSchema.safeParse({
        name: "Ana Souza",
        email: "ana@exemplo.com",
        password: "segredo123",
      }).success,
    ).toBe(true);
    expect(profileSchema.safeParse({ name: "", email: "ana@exemplo.com" }).success).toBe(false);
  });

  it("valida solicitação e confirmação de recuperação de senha", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "aluno@exemplo.com" }).success).toBe(true);
    expect(passwordResetRequestSchema.safeParse({ email: "aluno" }).success).toBe(false);
    expect(
      passwordResetSchema.safeParse({ token: "token-de-teste", password: "nova-senha123" }).success,
    ).toBe(true);
    expect(passwordResetSchema.safeParse({ token: "", password: "123" }).success).toBe(false);
  });

  it("exige um termo não vazio para a pesquisa de conteúdos", () => {
    expect(contentSearchSchema.safeParse({ query: "  funções  " }).success).toBe(true);
    expect(contentSearchSchema.safeParse({ query: "   " }).success).toBe(false);
    expect(contentSearchSchema.safeParse({ query: "a".repeat(201) }).success).toBe(false);
  });
});
