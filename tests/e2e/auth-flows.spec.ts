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
    await page.goto("/login");

    await typeInto(page.locator("#email"), testUser.email);
    await typeInto(page.locator("#password"), "senha-incorreta");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByText(/credenciais inválidas/i)).toBeVisible();

    await typeInto(page.locator("#password"), testUser.password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/dashboard|^http:\/\/127\.0\.0\.1:3000\/$/);
  });

  test("solicita recuperação de senha sem revelar se o e-mail existe", async ({ page, testUser }) => {
    await page.goto("/recuperar-senha");
    await typeInto(page.locator("#recovery-email"), testUser.email);
    await page.getByRole("button", { name: /enviar|recuperar/i }).click();

    await expect(page.getByRole("status")).toContainText(/se o e-mail estiver cadastrado/i);
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
});
