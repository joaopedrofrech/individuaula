import { expect, logoutFromApp, test } from "./fixtures";

test.describe("RNF05, RNF06, RNF07, RNF09 e RNF19", () => {
  test("redireciona acesso direto a áreas protegidas sem autenticação", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
    await page.goto("/disciplinas");
    await expect(page).toHaveURL(/login/);
    await page.goto("/perfil");
    await expect(page).toHaveURL(/login/);
  });

  test("bloqueia a sessão após logout mesmo ao voltar para a página", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await logoutFromApp(page);
    await page.goBack();
    await expect(page).toHaveURL(/login|cadastro/);
    await expect(page.getByRole("heading", { name: /que bom ver você|comece pelo seu ritmo|entrar no individuaula/i })).toBeVisible();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("não apresenta chave de integração externa no HTML entregue ao navegador", async ({ authenticatedPage: page }) => {
    await page.goto("/conteudos");
    const html = await page.content();

    expect(html).not.toContain("YOUTUBE_API_KEY");
    expect(html).not.toContain("AIza");
  });
});
