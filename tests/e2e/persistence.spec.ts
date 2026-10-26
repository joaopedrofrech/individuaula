import { expect, randomClientIp, test, typeInto } from "./fixtures";

// os dados ficam no banco D1 e não no navegador: estes cenários só passam se a persistência for do servidor.
async function createDiscipline(page: import("@playwright/test").Page, name: string) {
  await page.goto("/disciplinas");
  await page.getByRole("button", { name: /adicionar disciplina/i }).click();
  await page.getByLabel(/nome da disciplina/i).fill(name);
  await page.getByRole("button", { name: /salvar disciplina/i }).click();
  await expect(page.getByText(name).first()).toBeVisible();
}

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await typeInto(page.locator("#email"), email);
  await typeInto(page.locator("#password"), password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test.describe("persistência no banco de dados", () => {
  test("mantém a disciplina depois de recarregar a página", async ({ authenticatedPage: page }) => {
    await createDiscipline(page, "Geografia");

    await page.reload();

    await expect(page.getByText("Geografia").first()).toBeVisible();
  });

  test("a disciplina chega ao banco: a API a devolve para a mesma sessão", async ({ authenticatedPage: page }) => {
    await createDiscipline(page, "Química");

    await expect.poll(async () => {
      const data = await (await page.request.get("/api/data")).json();
      return data.disciplines.map((item: { name: string }) => item.name);
    }).toEqual(["Química"]);
  });

  test("mostra os mesmos dados em outro navegador depois de entrar na conta", async ({ authenticatedPage: page, testUser, browser }) => {
    await createDiscipline(page, "Filosofia");
    await expect.poll(async () => (await (await page.request.get("/api/data")).json()).disciplines.length).toBe(1);

    const other = await browser.newContext({ extraHTTPHeaders: { "cf-connecting-ip": randomClientIp() } });
    const otherPage = await other.newPage();
    await signIn(otherPage, testUser.email, testUser.password);
    await otherPage.goto("/disciplinas");

    await expect(otherPage.getByText("Filosofia").first()).toBeVisible();
    await other.close();
  });

  test("um aluno nunca vê as disciplinas de outro aluno", async ({ authenticatedPage: page, browser }) => {
    await createDiscipline(page, "Disciplina privada da Ana");

    const context = await browser.newContext({ extraHTTPHeaders: { "cf-connecting-ip": randomClientIp() } });
    const other = await context.newPage();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await other.goto("/cadastro");
    await typeInto(other.locator("#name"), "Outra Aluna");
    await typeInto(other.locator("#registration-email"), `outra-${suffix}@exemplo.com`);
    await typeInto(other.locator("#registration-password"), "segredo456");
    await other.getByRole("button", { name: /criar conta|cadastrar/i }).click();
    await expect(other).toHaveURL(/dashboard/);
    await other.goto("/disciplinas");

    await expect(other.getByText("Disciplina privada da Ana")).toHaveCount(0);
    expect((await (await other.request.get("/api/data")).json()).disciplines).toEqual([]);
    await context.close();
  });

  test("não permite mexer em um registro de outro aluno nem sabendo o identificador", async ({ authenticatedPage: page, browser }) => {
    await createDiscipline(page, "Alvo");
    const [target] = (await (await page.request.get("/api/data")).json()).disciplines;

    const context = await browser.newContext({ extraHTTPHeaders: { "cf-connecting-ip": randomClientIp() } });
    const other = await context.newPage();
    await other.goto("/cadastro");
    await typeInto(other.locator("#name"), "Invasora");
    await typeInto(other.locator("#registration-email"), `invasora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@exemplo.com`);
    await typeInto(other.locator("#registration-password"), "segredo456");
    await other.getByRole("button", { name: /criar conta|cadastrar/i }).click();
    await expect(other).toHaveURL(/dashboard/);

    expect((await other.request.patch(`/api/disciplines/${target.id}`, { data: { name: "Invadida" } })).status()).toBe(404);
    expect((await other.request.delete(`/api/disciplines/${target.id}`)).status()).toBe(404);
    expect((await (await page.request.get("/api/data")).json()).disciplines[0].name).toBe("Alvo");
    await context.close();
  });

  test("encerrar a sessão invalida o cookie no servidor, e não apenas na tela", async ({ authenticatedPage: page }) => {
    const cookie = (await page.context().cookies()).find((item) => item.name === "session")!;
    await page.goto("/dashboard");
    await page.request.post("/api/auth/logout");

    const stale = await page.context().browser()!.newContext({ extraHTTPHeaders: { cookie: `session=${cookie.value}`, "cf-connecting-ip": randomClientIp() } });
    expect((await stale.request.get("/api/auth/session")).status()).toBe(401);
    await stale.close();
  });

  test("os dados de exemplo ficam gravados e voltam no próximo acesso", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /ver com dados de exemplo/i }).click();
    await expect(page.getByText("Desenvolvimento Web").first()).toBeVisible();

    await page.reload();

    await expect(page.getByText("Desenvolvimento Web").first()).toBeVisible();
    expect((await (await page.request.get("/api/data")).json()).studySessions).toHaveLength(7);
  });

  test("uma anotação com imagem é gravada e reaparece depois de recarregar", async ({ authenticatedPage: page }) => {
    await createDiscipline(page, "Artes");
    await page.getByRole("link", { name: /artes/i }).first().click();
    await page.getByRole("button", { name: /nova anotação|adicionar anotação/i }).first().click();
    await page.getByLabel(/título/i).first().fill("Cores quentes");
    await page.locator('[contenteditable="true"]').first().fill("Vermelho, laranja e amarelo.");
    await page.getByRole("button", { name: /salvar anotação/i }).click();
    await expect(page.getByText("Cores quentes")).toBeVisible();

    await page.reload();

    await expect(page.getByText("Cores quentes")).toBeVisible();
  });
});
