// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sessions, users } from "@/db/schema";
import { SESSION_TTL_MS, AuthError } from "@/server/auth-service";
import { createTestServices } from "../support/services";
import { createTestDatabase } from "../support/test-db";

const account = { name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" };

let database: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => { database = await createTestDatabase(); }, 60_000);
afterAll(async () => { await database.dispose(); });
beforeEach(async () => { await database.reset(); });

function setup(options: Parameters<typeof createTestServices>[1] = {}) {
  return { auth: createTestServices(database.db, options).auth };
}

const failure = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => error as AuthError);

describe("cadastro", () => {
  it("cria a conta no banco, normaliza o e-mail e não devolve a senha nem o hash", async () => {
    const { auth } = setup();

    const user = await auth.register({ name: "  Ana Souza  ", email: "  ANA@EXEMPLO.COM ", password: "segredo123" });

    expect(user).toMatchObject({ name: "Ana Souza", email: "ana@exemplo.com" });
    expect(JSON.stringify(user)).not.toMatch(/password|hash|segredo123/i);
    const [row] = await database.db.select().from(users);
    expect(row.email).toBe("ana@exemplo.com");
  });

  it("guarda a senha só como hash PBKDF2 com sal individual", async () => {
    const { auth } = setup();
    await auth.register(account);
    await auth.register({ ...account, email: "outra@exemplo.com" });

    const rows = await database.db.select().from(users);
    expect(rows.every((row) => row.passwordHash.startsWith("pbkdf2$"))).toBe(true);
    expect(rows.some((row) => row.passwordHash.includes("segredo123"))).toBe(false);
    expect(rows[0].passwordHash).not.toBe(rows[1].passwordHash);
  });

  it("impede duas contas com o mesmo e-mail, ignorando maiúsculas e espaços", async () => {
    const { auth } = setup();
    await auth.register(account);

    const error = await failure(auth.register({ ...account, email: " ANA@EXEMPLO.COM " }));

    expect(error).toMatchObject({ code: "EMAIL_TAKEN", status: 409 });
    expect(await database.db.select().from(users)).toHaveLength(1);
  });

  it("resolve duas requisições simultâneas com o mesmo e-mail com uma única conta", async () => {
    const { auth } = setup();

    const results = await Promise.allSettled([auth.register(account), auth.register(account)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await database.db.select().from(users)).toHaveLength(1);
  });

  it("rejeita dados inválidos antes de tocar no banco", async () => {
    const { auth } = setup();

    await expect(auth.register({ name: "A", email: "nao-e-email", password: "123" })).rejects.toThrow();
    await expect(auth.register(null)).rejects.toThrow();
    expect(await database.db.select().from(users)).toHaveLength(0);
  });

});

describe("login e sessão", () => {
  it("autentica credenciais válidas e cria uma sessão com expiração de 7 dias", async () => {
    const { auth } = setup();
    await auth.register(account);

    const result = await auth.login({ email: "ANA@EXEMPLO.COM", password: "segredo123" });

    expect(result.user.email).toBe("ana@exemplo.com");
    expect(result.token).toHaveLength(64);
    expect(result.expiresAt.getTime() - Date.now()).toBeGreaterThan(SESSION_TTL_MS - 5_000);
    expect(JSON.stringify(result)).not.toMatch(/passwordHash/);
  });

  it("guarda só o hash do token da sessão, nunca o token", async () => {
    const { auth } = setup();
    await auth.register(account);
    const { token } = await auth.login(account);

    const rows = await database.db.select().from(sessions);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).not.toBe(token);
    expect(rows[0].id).toHaveLength(64);
  });

  it("usa a mesma mensagem para senha errada e e-mail inexistente", async () => {
    const { auth } = setup();
    await auth.register(account);

    const wrongPassword = await failure(auth.login({ email: account.email, password: "errada123" }));
    const unknownEmail = await failure(auth.login({ email: "ninguem@exemplo.com", password: "errada123" }));

    expect(wrongPassword).toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
    expect(unknownEmail?.message).toBe(wrongPassword?.message);
  });

  it("resolve o usuário a partir do token e recusa tokens desconhecidos", async () => {
    const { auth } = setup();
    await auth.register(account);
    const { token } = await auth.login(account);

    await expect(auth.getSession(token)).resolves.toMatchObject({ email: account.email });
    await expect(auth.getSession("0".repeat(64))).resolves.toBeNull();
  });

  it("recusa e remove a sessão vencida", async () => {
    let clock = new Date("2026-01-01T10:00:00.000Z");
    const { auth } = setup({ now: () => clock });
    await auth.register(account);
    const { token } = await auth.login(account);

    clock = new Date(clock.getTime() + SESSION_TTL_MS + 1000);

    await expect(auth.getSession(token)).resolves.toBeNull();
    expect(await database.db.select().from(sessions)).toHaveLength(0);
  });

  it("encerra a sessão no logout e ela deixa de valer", async () => {
    const { auth } = setup();
    await auth.register(account);
    const { token } = await auth.login(account);

    await auth.logout(token);

    await expect(auth.getSession(token)).resolves.toBeNull();
  });

  it("mantém uma sessão por aparelho: sair em um não derruba o outro", async () => {
    const { auth } = setup();
    await auth.register(account);
    const first = await auth.login(account);
    const second = await auth.login(account);

    await auth.logout(first.token);

    await expect(auth.getSession(second.token)).resolves.not.toBeNull();
  });
});

describe("perfil", () => {
  it("atualiza o nome e mantém e-mail e conta", async () => {
    const { auth } = setup();
    const user = await auth.register(account);

    const updated = await auth.updateProfile(user.id, { name: "  Ana Silva " });

    expect(updated).toMatchObject({ id: user.id, name: "Ana Silva", email: account.email });
  });

  it("rejeita nome inválido e usuário inexistente", async () => {
    const { auth } = setup();
    const user = await auth.register(account);

    await expect(auth.updateProfile(user.id, { name: "A" })).rejects.toThrow();
    expect(await failure(auth.updateProfile("id-inexistente", { name: "Fulano" }))).toMatchObject({ code: "NOT_FOUND" });
  });
});
