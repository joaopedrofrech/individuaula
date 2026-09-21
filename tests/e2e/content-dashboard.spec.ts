import { expect, test } from "./fixtures";

test.describe("UC07 e UC08", () => {
  test("pesquisa conteúdos, exibe metadados e abre o vídeo selecionado", async ({ authenticatedPage: page }) => {
    await page.goto("/conteudos");
    await page.getByRole("textbox", { name: /buscar conteúdo/i }).fill("funções");
    await page.getByRole("button", { name: /pesquisar/i }).click();

    await expect(page.getByText(/conteúdos encontrados/i)).toBeVisible();
    await expect(page.getByText(/canal|descrição/i).first()).toBeVisible();
    const videoLink = page.getByRole("link", { name: /assistir|visualizar vídeo/i }).first();
    await expect(videoLink).toHaveAttribute("href", /youtube\.com/);
  });

  test("permite pesquisar conteúdo dentro de uma disciplina", async ({ authenticatedPage: page }) => {
    await page.goto("/disciplinas");
    await page.getByRole("button", { name: /adicionar disciplina/i }).click();
    await page.getByLabel(/nome da disciplina/i).fill("Física");
    await page.getByRole("button", { name: /salvar disciplina/i }).click();
    await page.getByRole("link", { name: /física/i }).click();
    await page.getByRole("tab", { name: /conteúdos/i }).click();
    await page.getByRole("textbox", { name: /buscar conteúdo/i }).fill("cinemática");
    await page.getByRole("button", { name: /pesquisar/i }).click();

    await expect(page.getByText(/conteúdos encontrados|nenhum conteúdo/i)).toBeVisible();
  });

  test("apresenta dashboard vazio com orientação inicial", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /dashboard|bom dia/i })).toBeVisible();
    await expect(page.getByText(/comece cadastrando|nenhuma disciplina|ainda não há dados/i)).toBeVisible();
  });

  test("carrega dados de exemplo para preencher o ritmo da semana", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /ver com dados de exemplo/i }).click();

    await expect(page.getByText("Desenvolvimento Web")).toBeVisible();
    await expect(page.getByLabel(/gráfico de horas estudadas por dia/i)).toBeVisible();
    await expect(page.getByText("6,1h nesta semana")).toBeVisible();
  });

  test("resume disciplinas, médias e indicador de desempenho", async ({ authenticatedPage: page }) => {
    await page.goto("/disciplinas");
    await page.getByRole("button", { name: /adicionar disciplina/i }).click();
    await page.getByLabel(/nome da disciplina/i).fill("Biologia");
    await page.getByRole("button", { name: /salvar disciplina/i }).click();
    await page.getByRole("link", { name: /biologia/i }).click();
    await page.getByRole("tab", { name: /avaliações e notas/i }).click();
    await page.getByRole("button", { name: /adicionar avaliação/i }).click();
    await page.getByLabel(/nome da avaliação|título/i).fill("Prova 1");
    await page.getByRole("spinbutton", { name: "Nota" }).fill("9");
    await page.getByRole("spinbutton", { name: "Peso" }).fill("1");
    await page.getByRole("button", { name: /salvar avaliação/i }).click();

    await page.goto("/dashboard");
    await expect(page.getByText("Biologia")).toBeVisible();
    await expect(page.getByText("9,0").first()).toBeVisible();
    await expect(page.getByText(/desempenho excelente/i)).toBeVisible();
  });
});
