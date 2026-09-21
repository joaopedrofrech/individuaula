import { describe, expect, it } from "vitest";
import { noteText, sanitizeNoteHtml, toEditorHtml } from "@/lib/notes";

describe("conteúdo rico das anotações", () => {
  it("mantém formatação permitida e remove tags perigosas", () => {
    const html = sanitizeNoteHtml("<p>Resumo <strong>importante</strong></p><script>alert(1)</script><img src=x>");

    expect(html).toContain("<strong>importante</strong>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("img");
  });

  it("converte html em texto pesquisável", () => {
    expect(noteText("<h2>Funções</h2><p>domínio e imagem</p>")).toBe("Funções domínio e imagem");
  });

  it("prepara notas antigas em texto para o editor", () => {
    expect(toEditorHtml("header & main")).toBe("<p>header &amp; main</p>");
    expect(toEditorHtml("<p>já formatada</p>")).toBe("<p>já formatada</p>");
  });
});
