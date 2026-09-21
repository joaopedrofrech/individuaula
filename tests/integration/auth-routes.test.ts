import { describe, expect, it } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as profile, PATCH as updateProfile } from "@/app/api/auth/profile/route";
import { jsonRequest } from "../support/http";

describe("contrato HTTP de autenticação", () => {
  it("cadastra aluno e não devolve credenciais sensíveis", async () => {
    const email = "ana-success@exemplo.com";
    const response = await register(
      jsonRequest("http://localhost/api/auth/register", {
        name: "Ana Souza",
        email,
        password: "segredo123",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.user).toMatchObject({ name: "Ana Souza", email });
    expect(body).not.toHaveProperty("password");
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("httponly");
  });

  it("retorna conflito para e-mail já cadastrado", async () => {
    const body = { name: "Ana Souza", email: "ana-duplicate@exemplo.com", password: "segredo123" };
    await register(jsonRequest("http://localhost/api/auth/register", body));

    const response = await register(jsonRequest("http://localhost/api/auth/register", body));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/e-mail|email/i);
  });

  it("retorna erro de autenticação sem diferenciar usuário inexistente", async () => {
    const invalid = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "inexistente@exemplo.com",
        password: "errada123",
      }),
    );

    expect(invalid.status).toBe(401);
    expect((await invalid.json()).error).toMatch(/credenciais inválidas/i);
  });

  it("limpa a sessão ao realizar logout", async () => {
    const response = await logout(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: "session=sessao-de-teste" },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("max-age=0");
  });

  it("protege a leitura e edição de perfil sem sessão válida", async () => {
    const readResponse = await profile(new Request("http://localhost/api/auth/profile"));
    const updateResponse = await updateProfile(
      jsonRequest("http://localhost/api/auth/profile", { name: "Acesso indevido" }, { method: "PATCH" }),
    );

    expect(readResponse.status).toBe(401);
    expect(updateResponse.status).toBe(401);
  });
});
