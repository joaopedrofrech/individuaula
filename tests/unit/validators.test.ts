import { describe, expect, it } from "vitest";
import {
  assessmentSchema,
  assessmentUpdateSchema,
  disciplineUpdateSchema,
  noteUpdateSchema,
  passwordSchema,
  contentSearchSchema,
  disciplineSchema,
  loginSchema,
  noteSchema,
  updateProfileSchema,
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

  it("na atualização do perfil só o nome é aceito e o e-mail enviado é descartado", () => {
    expect(updateProfileSchema.parse({ name: "  Ana Silva ", email: "outro@exemplo.com" })).toEqual({ name: "Ana Silva" });
    expect(updateProfileSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("exige um termo não vazio para a pesquisa de conteúdos", () => {
    expect(contentSearchSchema.safeParse({ query: "  funções  " }).success).toBe(true);
    expect(contentSearchSchema.safeParse({ query: "   " }).success).toBe(false);
    expect(contentSearchSchema.safeParse({ query: "a".repeat(201) }).success).toBe(false);
  });
});

describe("imagem anexada à anotação", () => {
  const base = { title: "Resumo", content: "<p>texto</p>" };
  const png = "data:image/png;base64,iVBORw0KGgo=";

  it.each(["png", "jpeg", "webp", "gif"])("aceita imagem %s em base64", (type) => {
    expect(noteSchema.safeParse({ ...base, imageDataUrl: `data:image/${type};base64,AAAA` }).success).toBe(true);
  });

  it("aceita anotação sem imagem", () => {
    expect(noteSchema.safeParse(base).success).toBe(true);
    expect(noteSchema.safeParse({ ...base, imageDataUrl: png }).success).toBe(true);
  });

  it.each([
    ["SVG, que pode carregar scripts", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
    ["HTML disfarçado de dado", "data:text/html;base64,PHNjcmlwdD48L3NjcmlwdD4="],
    ["protocolo javascript", "javascript:alert(1)"],
    ["endereço externo", "https://exemplo.com/imagem.png"],
    ["base64 com caracteres inválidos", "data:image/png;base64,<script>"],
  ])("recusa %s", (_label, imageDataUrl) => {
    expect(noteSchema.safeParse({ ...base, imageDataUrl }).success).toBe(false);
  });

  it("recusa imagem acima do limite de tamanho", () => {
    const huge = `data:image/png;base64,${"A".repeat(2_000_000)}`;
    expect(noteSchema.safeParse({ ...base, imageDataUrl: huge }).success).toBe(false);
  });
});

describe("regras de senha", () => {
  it("exige entre 6 e 128 caracteres", () => {
    expect(passwordSchema.safeParse("12345").success).toBe(false);
    expect(passwordSchema.safeParse("123456").success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(128)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});

describe("atualizações parciais", () => {
  it("não reaplica valores padrão ao editar só o nome da disciplina", () => {
    expect(disciplineUpdateSchema.parse({ name: "Física" })).toEqual({ name: "Física" });
  });

  it("continua aplicando os valores padrão ao criar uma disciplina", () => {
    expect(disciplineSchema.parse({ name: "Física", color: "blue" })).toEqual({ name: "Física", color: "blue", description: "", icon: "book" });
  });

  it("descarta campos que não fazem parte do contrato, como o dono do registro", () => {
    const parsed = noteUpdateSchema.parse({ title: "Novo", userId: "invasor", disciplineId: "outra" });

    expect(parsed).toEqual({ title: "Novo" });
  });

  it("continua validando os valores enviados", () => {
    expect(assessmentUpdateSchema.safeParse({ grade: 11 }).success).toBe(false);
    expect(assessmentUpdateSchema.safeParse({ weight: 0 }).success).toBe(false);
    expect(assessmentUpdateSchema.parse({ grade: "7,5".replace(",", ".") })).toEqual({ grade: 7.5 });
    expect(noteUpdateSchema.safeParse({ title: "" }).success).toBe(false);
  });
});
