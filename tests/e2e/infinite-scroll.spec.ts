import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// o servidor de teste não tem a chave do YouTube, então a rota de busca é respondida pelo próprio teste.
// o navegador, a rolagem e o IntersectionObserver são reais.
const video = (n: number) => ({ id: `video-${n}`, title: `Aula ${n}`, channel: "Canal", description: "Descrição", thumbnailUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg", videoUrl: `https://www.youtube.com/watch?v=video-${n}` });
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => video(from + index));

async function mockSearch(page: Page, { failSecondPageOnce = false } = {}) {
  const requested: Array<string | null> = [];
  let failed = false;
  await page.route("**/api/youtube/search**", async (route) => {
    const token = new URL(route.request().url()).searchParams.get("pageToken");
    requested.push(token);
    if (failSecondPageOnce && token === "T2" && !failed) {
      failed = true;
      return route.fulfill({ status: 503, json: { error: "O serviço de vídeos está indisponível. Tente novamente." } });
    }
    const body = token === null ? { items: range(1, 12), nextPageToken: "T2" } : token === "T2" ? { items: range(13, 24), nextPageToken: "T3" } : { items: range(25, 30) };
    await route.fulfill({ json: { ...body, source: "youtube" } });
  });
  return requested;
}

async function searchFor(page: Page, term: string) {
  await page.goto("/conteudos");
  await page.getByRole("textbox", { name: /buscar conteúdo/i }).fill(term);
  await page.getByRole("button", { name: /pesquisar/i }).click();
}

const cards = (page: Page) => page.getByRole("link", { name: /assistir vídeo/i });

test.describe("rolagem infinita nos conteúdos", () => {
  test("carrega mais vídeos conforme o aluno chega ao fim da lista", async ({ authenticatedPage: page }) => {
    const requested = await mockSearch(page);
    await searchFor(page, "funções");

    await expect(cards(page)).toHaveCount(12);
    expect(requested).toEqual([null]);

    await cards(page).last().scrollIntoViewIfNeeded();
    await expect(cards(page)).toHaveCount(24);

    await cards(page).last().scrollIntoViewIfNeeded();
    await expect(cards(page)).toHaveCount(30);
    expect(requested).toEqual([null, "T2", "T3"]);
  });

  test("avisa que chegou ao fim e não pede mais páginas", async ({ authenticatedPage: page }) => {
    const requested = await mockSearch(page);
    await searchFor(page, "funções");
    await expect(cards(page)).toHaveCount(12);
    await cards(page).last().scrollIntoViewIfNeeded();
    await expect(cards(page)).toHaveCount(24);
    await cards(page).last().scrollIntoViewIfNeeded();
    await expect(cards(page)).toHaveCount(30);

    await expect(page.getByText(/você chegou ao fim dos resultados/i)).toBeVisible();
    await page.waitForTimeout(500);
    expect(requested).toHaveLength(3);
  });

  test("não repete vídeos e mantém a ordem da busca", async ({ authenticatedPage: page }) => {
    await mockSearch(page);
    await searchFor(page, "funções");
    await expect(cards(page)).toHaveCount(12);
    await cards(page).last().scrollIntoViewIfNeeded();
    await expect(cards(page)).toHaveCount(24);

    const links = await cards(page).evaluateAll((items) => items.map((item) => (item as HTMLAnchorElement).href));
    expect(new Set(links).size).toBe(links.length);
    expect(links[0]).toContain("video-1");
    expect(links[23]).toContain("video-24");
  });

  test("oferece tentar de novo quando uma página falha, sem perder o que já carregou", async ({ authenticatedPage: page }) => {
    await mockSearch(page, { failSecondPageOnce: true });
    await searchFor(page, "funções");
    await expect(cards(page)).toHaveCount(12);

    await cards(page).last().scrollIntoViewIfNeeded();
    await expect(page.getByRole("alert").filter({ hasText: /indisponível/i })).toBeVisible();
    await expect(cards(page)).toHaveCount(12);

    await page.getByRole("button", { name: /tentar de novo/i }).click();
    await expect(cards(page)).toHaveCount(24);
  });

  test("uma nova pesquisa volta ao início da lista", async ({ authenticatedPage: page }) => {
    const requested = await mockSearch(page);
    await searchFor(page, "funções");
    await expect(cards(page)).toHaveCount(12);
    await cards(page).last().scrollIntoViewIfNeeded();
    await expect(cards(page)).toHaveCount(24);

    await page.getByRole("textbox", { name: /buscar conteúdo/i }).fill("geometria");
    await page.getByRole("button", { name: /pesquisar/i }).click();

    await expect(cards(page)).toHaveCount(12);
    expect(requested.at(-1)).toBeNull();
  });
});
