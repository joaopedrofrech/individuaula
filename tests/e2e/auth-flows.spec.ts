import { expect, logoutFromApp, test, typeInto } from "./fixtures";

test.describe("UC01, UC02 e gerenciamento da conta", () => {
  test("cadastra uma conta e rejeita dados obrigatórios ausentes", async ({ page, testUser }) => {
    await page.goto("/cadastro");
    await page.getByRole("button", { name: /criar conta|cadastrar/i }).click();
    await expect(page.getByText(/nome.*obrigatório/i)).toBeVisible();

    await typeInto(page.locator("#name"), testUser.name);
    await typeInto(page.locator("#registration-email"), testUser.email);
    await typeInto(page.locator("#registration-password"), testUser.password);
    await page.getByRole("button", { name: /criar conta|cadastrar/i }).click();

    await expect(page).toHaveURL(/dashboard|login/);
  });

  test("permite login válido e informa credenciais inválidas", async ({ page, testUser }) => {
    await page.goto("/cadastro");
    await typeInto(page.locator("#name"), testUser.name);
    await typeInto(page.locator("#registration-email"), testUser.email);
    await typeInto(page.locator("#registration-password"), testUser.password);
    await page.getByRole("button", { name: /criar conta|cadastrar/i }).click();
    await expect(page).toHaveURL(/dashboard/);
    await logoutFromApp(page);
    await expect(page).toHaveURL(/login/);

    await typeInto(page.locator("#email"), testUser.email);
    await typeInto(page.locator("#password"), "senha-incorreta");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByText(/credenciais inválidas/i)).toBeVisible();

    await typeInto(page.locator("#password"), testUser.password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/dashboard|^http:\/\/127\.0\.0\.1:3000\/$/);
  });

  test("edita o perfil e encerra a sessão", async ({ authenticatedPage: page, testUser }) => {
    await page.goto("/perfil");
    await page.getByLabel(/nome/i).fill("Aluno Atualizado");
    await page.getByRole("button", { name: /salvar alterações|salvar/i }).click();
    await expect(page.getByText("Aluno Atualizado")).toBeVisible();

    await logoutFromApp(page);
    await expect(page).toHaveURL(/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
    await expect(page.getByText(testUser.email)).not.toBeVisible();
  });

  test("o botão voltar do painel leva à página inicial, sem prender o aluno no cadastro", async ({ page, testUser }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /começar agora/i }).click();
    await expect(page).toHaveURL(/cadastro/);
    await typeInto(page.locator("#name"), testUser.name);
    await typeInto(page.locator("#registration-email"), testUser.email);
    await typeInto(page.locator("#registration-password"), testUser.password);
    await page.getByRole("button", { name: /criar conta|cadastrar/i }).click();
    await expect(page).toHaveURL(/dashboard/);

    await page.goBack();

    await expect(page).toHaveURL(/127\.0\.0\.1:3000\/$/);
    await expect(page.getByRole("link", { name: /ir para o meu painel/i })).toBeVisible();
  });

  test("quem já está logado vai direto ao painel em vez de ver login ou cadastro", async ({ authenticatedPage: page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/dashboard/);

    await page.goto("/cadastro");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("na página inicial o botão de entrar vira atalho para o painel", async ({ authenticatedPage: page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /ir para o painel/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^entrar$/i })).toHaveCount(0);
    await page.getByRole("link", { name: /ir para o meu painel/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test("depois de sair, a página inicial e o login voltam ao normal", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await logoutFromApp(page);
    await expect(page).toHaveURL(/login/);

    await page.goto("/");
    await expect(page.getByRole("link", { name: /começar agora/i })).toBeVisible();
    await page.goto("/login");
    await expect(page).toHaveURL(/login/);
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  });
});
