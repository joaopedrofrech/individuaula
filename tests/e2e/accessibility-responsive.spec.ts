import { expect, test } from "./fixtures";

test.describe("RNF03, RNF14, RNF15 e RNF16", () => {
  test("mantém navegação por teclado e campos identificados", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    const themeToggle = page.getByRole("button", { name: /tema|modo escuro|modo claro/i });
    await themeToggle.focus();
    await expect(themeToggle).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Abrir menu do usuário" })).toBeFocused();
    const mobileMenu = page.getByRole("button", { name: "Abrir menu", exact: true });
    if (await mobileMenu.isVisible().catch(() => false)) {
      await mobileMenu.click();
    }
    const navigation = page.getByRole("navigation");
    if (await navigation.count()) {
      await expect(navigation).toBeVisible();
    } else {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test("alterna tema claro e escuro sem perder o conteúdo", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    const themeToggle = page.getByRole("button", { name: /tema|modo escuro|modo claro/i });

    await themeToggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: /dashboard|bom dia/i })).toBeVisible();
    await themeToggle.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("não cria rolagem horizontal em viewport de smartphone", async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expect(page.getByRole("main")).toBeVisible();
  });
});
