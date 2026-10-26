import { expect, test } from "./fixtures";

test.describe("UC03, UC04, UC05 e UC06", () => {
  test("cria, edita, acessa e exclui uma disciplina", async ({ authenticatedPage: page }) => {
    await page.goto("/disciplinas");
    await page.getByRole("button", { name: /adicionar disciplina/i }).click();
    await page.getByLabel(/nome da disciplina/i).fill("Projeto Integrador II");
    await page.getByRole("button", { name: /salvar disciplina/i }).click();
    await expect(page.getByText("Projeto Integrador II")).toBeVisible();

    await page.getByRole("link", { name: /projeto integrador ii/i }).click();
    await expect(page.getByRole("heading", { name: /projeto integrador ii/i })).toBeVisible();
    await page.getByRole("button", { name: /editar disciplina/i }).click();
    await page.getByLabel(/nome da disciplina/i).fill("Projeto Integrador II - Revisado");
    await page.getByRole("button", { name: /salvar disciplina/i }).click();
    await expect(page.getByText("Projeto Integrador II - Revisado")).toBeVisible();

    await page.getByRole("button", { name: /excluir disciplina/i }).click();
    await page.getByRole("button", { name: /confirmar exclusão/i }).click();
    await expect(page.getByText("Projeto Integrador II - Revisado")).not.toBeVisible();
  });

  test("gerencia anotações, pesquisa título e conteúdo e mantém datas", async ({ authenticatedPage: page }) => {
    await page.goto("/disciplinas");
    await page.getByRole("button", { name: /adicionar disciplina/i }).click();
    await page.getByLabel(/nome da disciplina/i).fill("Desenvolvimento Web");
    await page.getByRole("button", { name: /salvar disciplina/i }).click();
    await page.getByRole("link", { name: /desenvolvimento web/i }).click();

    await page.getByRole("button", { name: /adicionar anotação/i }).click();
    await page.getByLabel(/título/i).fill("HTML semântico");
    await page.getByLabel(/conteúdo/i).fill("header, main e footer");
    await page.getByRole("button", { name: /salvar anotação/i }).click();
    await expect(page.getByText("HTML semântico")).toBeVisible();
    await expect(page.getByText(/criada em|atualizada em/i)).toBeVisible();

    await page.getByRole("textbox", { name: /pesquisar anotações/i }).fill("footer");
    await expect(page.getByText("HTML semântico")).toBeVisible();
    await page.getByRole("button", { name: /editar anotação/i }).click();
    await page.getByLabel(/título/i).fill("HTML semântico revisado");
    await page.getByRole("button", { name: /salvar anotação/i }).click();
    await expect(page.getByText("HTML semântico revisado")).toBeVisible();

    await page.getByRole("button", { name: /excluir anotação/i }).click();
    await page.getByRole("button", { name: /confirmar exclusão/i }).click();
    await expect(page.getByText("HTML semântico revisado")).not.toBeVisible();
  });

  test("monta uma anotação com editor e imagem de apoio", async ({ authenticatedPage: page }) => {
    await page.goto("/disciplinas");
    await page.getByRole("button", { name: /adicionar disciplina/i }).click();
    await page.getByLabel(/nome da disciplina/i).fill("Projeto Visual");
    await page.getByRole("button", { name: /salvar disciplina/i }).click();
    await page.getByRole("link", { name: /projeto visual/i }).click();

    await page.getByRole("button", { name: /adicionar anotação/i }).click();
    await page.getByLabel(/título/i).fill("Resumo visual");
    await page.getByLabel(/conteúdo/i).fill("Uma anotação construída com texto formatado.");
    await page.getByRole("button", { name: "Negrito" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "apoio.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
    });

    await expect(page.getByAltText("Imagem anexada à anotação")).toBeVisible();
    await page.getByRole("button", { name: /salvar anotação/i }).click();
    await expect(page.getByText("Resumo visual")).toBeVisible();
    await expect(page.getByAltText("Imagem anexada à anotação")).toBeVisible();
  });

  test("registra avaliações, edita nota, calcula média e exibe histórico", async ({ authenticatedPage: page }) => {
    await page.goto("/disciplinas");
    await page.getByRole("button", { name: /adicionar disciplina/i }).click();
    await page.getByLabel(/nome da disciplina/i).fill("Matemática");
    await page.getByRole("button", { name: /salvar disciplina/i }).click();
    await page.getByRole("link", { name: /matemática/i }).click();
    await page.getByRole("tab", { name: /avaliações e notas/i }).click();

    await page.getByRole("button", { name: /adicionar avaliação/i }).click();
    await page.getByLabel(/nome da avaliação|título/i).fill("Prova 1");
    await page.getByRole("spinbutton", { name: "Nota" }).fill("8");
    await page.getByRole("spinbutton", { name: "Peso" }).fill("2");
    await page.getByRole("button", { name: /salvar avaliação/i }).click();
    await expect(page.getByText("Prova 1")).toBeVisible();
    await expect(page.getByText("média atual")).toBeVisible();
    await expect(page.getByRole("cell", { name: "8,00" })).toBeVisible();

    await page.getByRole("button", { name: /editar avaliação|editar nota/i }).click();
    await page.getByRole("spinbutton", { name: "Nota" }).fill("9");
    await page.getByRole("button", { name: /salvar avaliação/i }).click();
    await expect(page.getByRole("cell", { name: "9,00" })).toBeVisible();
    await expect(page.getByRole("region", { name: /histórico de avaliações/i })).toBeVisible();
  });

  test("mostra estado vazio quando a disciplina ainda não tem notas", async ({ authenticatedPage: page }) => {
    await page.goto("/disciplinas");
    await page.getByRole("button", { name: /adicionar disciplina/i }).click();
    await page.getByLabel(/nome da disciplina/i).fill("História");
    await page.getByRole("button", { name: /salvar disciplina/i }).click();
    await page.getByRole("link", { name: /história/i }).click();
    await page.getByRole("tab", { name: /avaliações e notas/i }).click();

    await expect(page.getByText(/ainda não há notas|sem dados suficientes/i)).toBeVisible();
  });
});
