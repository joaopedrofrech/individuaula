import { describe, expect, it } from "vitest";
import { createAuthService } from "@/lib/auth";

describe("regras de autenticação", () => {
  it("cria uma conta sem devolver a senha em texto puro", async () => {
    const auth = createAuthService({ seed: false });

    const user = await auth.register({
      name: "  Ana Souza  ",
      email: "  ANA@EXEMPLO.COM ",
      password: "segredo123",
    });

    expect(user).toMatchObject({ name: "Ana Souza", email: "ana@exemplo.com" });
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("impede duas contas com o mesmo e-mail normalizado", async () => {
    const auth = createAuthService({ seed: false });
    const first = { name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" };

    await auth.register(first);
    await expect(
      auth.register({ ...first, email: " ANA@EXEMPLO.COM " }),
    ).rejects.toThrow(/e-mail|email/i);
  });

  it("autentica credenciais válidas e cria uma sessão com expiração", async () => {
    const auth = createAuthService({ seed: false });
    await auth.register({ name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" });

    const result = await auth.login({ email: "ANA@EXEMPLO.COM", password: "segredo123" });

    expect(result.user.email).toBe("ana@exemplo.com");
    expect(result.session.id).toEqual(expect.any(String));
    expect(result.session.expiresAt).toBeInstanceOf(Date);
    expect(result).not.toHaveProperty("password");
  });

  it("usa uma mensagem genérica para credenciais inválidas", async () => {
    const auth = createAuthService({ seed: false });
    await auth.register({ name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" });

    await expect(auth.login({ email: "ana@exemplo.com", password: "errada123" })).rejects.toThrow(
      /credenciais inválidas/i,
    );
    await expect(auth.login({ email: "inexistente@exemplo.com", password: "errada123" })).rejects.toThrow(
      /credenciais inválidas/i,
    );
  });

  it("permite recuperação de senha com token de uso único", async () => {
    const auth = createAuthService({ seed: false });
    await auth.register({ name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" });

    const request = await auth.requestPasswordReset({ email: "ana@exemplo.com" });
    expect(request.requestId).toEqual(expect.any(String));

    await auth.resetPassword({ requestId: request.requestId, password: "nova-senha123" });
    await expect(
      auth.resetPassword({ requestId: request.requestId, password: "outra-senha123" }),
    ).rejects.toThrow(/inválido|expirado|utilizado/i);
    await expect(auth.login({ email: "ana@exemplo.com", password: "nova-senha123" })).resolves.toBeDefined();
  });

  it("atualiza somente dados pessoais permitidos no perfil", async () => {
    const auth = createAuthService({ seed: false });
    const user = await auth.register({ name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" });

    const updated = await auth.updateProfile(user.id, {
      name: "Ana Silva",
      email: "ana.silva@exemplo.com",
    });

    expect(updated).toMatchObject({ id: user.id, name: "Ana Silva", email: "ana.silva@exemplo.com" });
    expect(updated).not.toHaveProperty("password");
  });

  it("encerra a sessão e bloqueia o acesso posterior", async () => {
    const auth = createAuthService({ seed: false });
    await auth.register({ name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" });
    const { session } = await auth.login({ email: "ana@exemplo.com", password: "segredo123" });

    await auth.logout(session.id);

    await expect(auth.getSession(session.id)).resolves.toBeNull();
  });
});
