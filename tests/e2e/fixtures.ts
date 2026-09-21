import { expect, type Locator, type Page, test as base } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

type Fixtures = {
  testUser: TestUser;
  authenticatedPage: Page;
};

// simula a digitação real nos navegadores móveis, onde o preenchimento programático pode ser adiado.
export async function typeInto(locator: Locator, value: string) {
  await locator.click()
  await locator.selectText()
  await locator.pressSequentially(value)
}

// usa o atalho lateral no desktop e o menu do usuário em telas compactas.
export async function logoutFromApp(page: Page) {
  const sidebarLogout = page.getByRole("button", { name: "Sair", exact: true })
  if (await sidebarLogout.isVisible().catch(() => false)) {
    await sidebarLogout.click()
    return
  }
  await page.getByRole("button", { name: "Abrir menu do usuário" }).click()
  await page.getByRole("menuitem", { name: /sair da conta/i }).click()
}

// cria um usuário isolado para cada cenário que depende de autenticação.
export const test = base.extend<Fixtures>({
  testUser: async ({}, releaseFixture, testInfo) => {
    const suffix = `${Date.now()}-${testInfo.workerIndex}-${Math.random().toString(36).slice(2, 8)}`;
    await releaseFixture({
      name: "Aluno de Teste",
      email: `aluno-${suffix}@exemplo.com`,
      password: "segredo123",
    });
  },
  authenticatedPage: async ({ page, testUser }, releaseFixture) => {
    await page.goto("/cadastro");
    const nameField = page.locator("#name");
    const emailField = page.locator("#registration-email");
    const passwordField = page.locator("#registration-password");
    await expect(nameField).toBeVisible();
    await typeInto(nameField, testUser.name);
    await typeInto(emailField, testUser.email);
    await typeInto(passwordField, testUser.password);
    await expect(nameField).toHaveValue(testUser.name);
    await expect(emailField).toHaveValue(testUser.email);
    await expect(passwordField).toHaveValue(testUser.password);
    await page.getByRole("button", { name: /criar conta|cadastrar/i }).click();

    if (await page.getByRole("heading", { name: /entrar no individuaula|que bom ver você/i }).isVisible().catch(() => false)) {
      await typeInto(page.locator("#email"), testUser.email);
      await typeInto(page.locator("#password"), testUser.password);
      await page.getByRole("button", { name: /entrar/i }).click();
    }

    await expect(page).toHaveURL(/dashboard|^http:\/\/127\.0\.0\.1:3000\/$/);
    await releaseFixture(page);
  },
});

export { expect };
