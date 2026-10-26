import { describe, expect, it } from "vitest";
import { buildApiHeaders, buildSecurityHeaders } from "@/lib/security-headers";

const header = (headers: ReturnType<typeof buildSecurityHeaders>, key: string) => headers.find((item) => item.key === key)?.value ?? "";

describe("cabeçalhos de segurança", () => {
  const production = buildSecurityHeaders({ isDev: false });

  it("impede que a aplicação seja carregada dentro de outro site", () => {
    expect(header(production, "X-Frame-Options")).toBe("DENY");
    expect(header(production, "Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("restringe origem de scripts, objetos, formulários e conexões", () => {
    const csp = header(production, "Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("não permite eval em produção, mas permite no desenvolvimento", () => {
    expect(header(production, "Content-Security-Policy")).not.toContain("unsafe-eval");
    expect(header(buildSecurityHeaders({ isDev: true }), "Content-Security-Policy")).toContain("unsafe-eval");
  });

  it("libera apenas as miniaturas do YouTube como imagem externa", () => {
    const csp = header(production, "Content-Security-Policy");
    expect(csp).toMatch(/img-src[^;]*https:\/\/i\.ytimg\.com/);
    expect(csp).not.toMatch(/img-src[^;]*\*(?!\.)/);
  });

  it("inclui os demais cabeçalhos de proteção", () => {
    expect(header(production, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(production, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header(production, "Strict-Transport-Security")).toContain("max-age=");
    expect(header(production, "Permissions-Policy")).toContain("camera=()");
  });
});

describe("cabeçalhos das rotas de API", () => {
  it("proíbem o navegador de guardar respostas com dados pessoais ou de sessão", () => {
    expect(buildApiHeaders()).toEqual([{ key: "Cache-Control", value: "no-store" }]);
  });
});
