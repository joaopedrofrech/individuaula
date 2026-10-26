import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("higienização sem DOM (servidor)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function sanitizeOnServer(html: string) {
    vi.stubGlobal("DOMParser", undefined);
    return sanitizeNoteHtml(html);
  }

  it("remove atributos de eventos de tags permitidas", () => {
    const html = sanitizeOnServer('<p onclick="roubar()" style="x">texto</p>');

    expect(html).toBe("<p>texto</p>");
  });

  it("remove blocos executáveis com o conteúdo", () => {
    const html = sanitizeOnServer("<p>ok</p><script>alert(1)</script><style>body{}</style><iframe src=x></iframe>");

    expect(html).toBe("<p>ok</p>");
  });

  it("remove tags desconhecidas e mantém o texto", () => {
    expect(sanitizeOnServer("<a href=\"javascript:alert(1)\">link</a><img src=x onerror=alert(1)>")).toBe("link");
  });

  it("mantém a formatação permitida", () => {
    expect(sanitizeOnServer("<h2>Título</h2><ul><li><strong>um</strong></li></ul>")).toBe("<h2>Título</h2><ul><li><strong>um</strong></li></ul>");
  });

  it("devolve vazio para conteúdo em branco", () => {
    expect(sanitizeOnServer("   ")).toBe("");
  });
});

describe("higienização com DOM (navegador)", () => {
  it("remove atributos perigosos de tags permitidas", () => {
    expect(sanitizeNoteHtml('<p onclick="roubar()">texto</p>')).toBe("<p>texto</p>");
  });

  it("transforma links e imagens em texto simples", () => {
    const html = sanitizeNoteHtml('<a href="javascript:alert(1)">clique</a><img src=x onerror=alert(1)>');

    expect(html).not.toContain("javascript");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("onerror");
  });

  it("escapa o texto de um script para que ele não execute", () => {
    expect(sanitizeNoteHtml("<script>alert(1)</script>")).not.toContain("<script");
  });
});
