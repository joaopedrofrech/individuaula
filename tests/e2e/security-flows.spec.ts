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
    await page.goto("/disciplinas");
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

  test("entrega cabeçalhos de segurança em todas as páginas", async ({ request }) => {
    for (const path of ["/", "/login", "/dashboard"]) {
      const response = await request.get(path);
      const headers = response.headers();

      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(headers["content-security-policy"]).toContain("object-src 'none'");
    }
  });

  test("a política de segurança não gera violações nas telas principais", async ({ authenticatedPage: page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/content security policy|refused to/i.test(message.text())) violations.push(message.text());
    });

    for (const path of ["/dashboard", "/disciplinas", "/conteudos", "/perfil"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }

    expect(violations).toEqual([]);
  });

  test("não guarda dados nem credenciais no armazenamento do navegador", async ({ authenticatedPage: page }) => {
    await page.goto("/disciplinas");
    await page.getByRole("button", { name: /nova disciplina|adicionar disciplina/i }).first().click();
    await page.getByLabel(/nome da disciplina/i).fill("Disciplina no banco");
    await page.getByRole("button", { name: /salvar disciplina/i }).click();
    await expect(page.getByText("Disciplina no banco")).toBeVisible();

    const storage = await page.evaluate(() => ({ local: window.localStorage.length, session: window.sessionStorage.length }));

    expect(storage).toEqual({ local: 0, session: 0 });
  });

  test("o cookie de sessão é HttpOnly e não pode ser lido por scripts", async ({ authenticatedPage: page }) => {
    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name === "session");

    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("session=");
  });

  test("dados forjados no navegador não dão acesso: a sessão vem do servidor", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("individuaula-state-v1", JSON.stringify({ user: { id: "forjado", name: "Invasor", email: "i@x.com" } }));
    });
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/login/);
  });

  test("as rotas de dados respondem 401 sem sessão", async ({ request }) => {
    for (const path of ["/api/data", "/api/auth/session", "/api/youtube/search?q=matematica"]) {
      expect((await request.get(path)).status()).toBe(401);
    }
    expect((await request.post("/api/disciplines", { data: { name: "X", color: "blue" } })).status()).toBe(401);
  });

  test("recusa escrita vinda de outro site mesmo com sessão válida", async ({ authenticatedPage: page }) => {
    const response = await page.request.post("/api/disciplines", { data: { name: "Invasora", color: "blue" }, headers: { origin: "https://malicioso.example" } });

    expect(response.status()).toBe(403);
  });

  test("a rota de busca limita o excesso de requisições", async ({ authenticatedPage: page }) => {
    const statuses: number[] = [];
    for (let index = 0; index < 35; index += 1) {
      statuses.push((await page.request.get("/api/youtube/search?q=matematica")).status());
    }

    expect(statuses).toContain(429);
  });

  test("as respostas da API não podem ser guardadas em cache pelo navegador", async ({ authenticatedPage: page }) => {
    for (const path of ["/api/auth/session", "/api/data", "/api/youtube/search?q=funcoes"]) {
      expect((await page.request.get(path)).headers()["cache-control"]).toBe("no-store");
    }
    expect((await page.request.get("/api/auth/session", { headers: { cookie: "" } })).headers()["cache-control"]).toBe("no-store");
  });

  test("o painel não reaparece com a conta antiga ao voltar depois de sair", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await page.goto("/disciplinas");
    await logoutFromApp(page);

    await page.goBack();

    await expect(page).toHaveURL(/login/);
    await expect(page.getByText("Visão geral")).toHaveCount(0);
  });
});
