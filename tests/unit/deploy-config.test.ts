import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// o wrangler.jsonc aceita comentários; remove-os antes de ler como JSON.
const config = JSON.parse(readFileSync(path.resolve(__dirname, "../../wrangler.jsonc"), "utf8").replace(/^\s*\/\/.*$/gm, ""));

describe("configuração de deploy na Cloudflare", () => {
  it("desliga keep_names para não quebrar o script inline do tema (`__name is not defined`)", () => {
    expect(config.keep_names).toBe(false);
  });

  it("publica o worker com o nome que forma o endereço app.individuaula.workers.dev", () => {
    expect(config.name).toBe("app");
  });

  it("configura os domínios personalizados individuaula.tech e www.individuaula.tech", () => {
    expect(config.routes).toEqual([
      { pattern: "individuaula.tech", custom_domain: true },
      { pattern: "www.individuaula.tech", custom_domain: true },
    ]);
  });

  it("habilita a compatibilidade com Node exigida pelo OpenNext", () => {
    expect(config.compatibility_flags).toContain("nodejs_compat");
  });

  it("liga o banco D1 pelo binding DB e aponta para a pasta de migrações do Drizzle", () => {
    expect(config.d1_databases).toHaveLength(1);
    expect(config.d1_databases[0]).toMatchObject({ binding: "DB", database_name: "individuaula-db", migrations_dir: "drizzle" });
    expect(config.d1_databases[0].database_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("não guarda segredos no arquivo de configuração", () => {
    expect(JSON.stringify(config)).not.toMatch(/re_[A-Za-z0-9]{10,}|api[_-]?key["']?\s*:\s*["'][^"']+/i);
    expect(config.vars).not.toHaveProperty("RESEND_API_KEY");
    expect(config.vars).not.toHaveProperty("TURNSTILE_SECRET");
    expect(config.vars).not.toHaveProperty("YOUTUBE_API_KEY");
  });

  it("serve os arquivos estáticos pelo binding ASSETS", () => {
    expect(config.assets).toMatchObject({ directory: ".open-next/assets", binding: "ASSETS" });
  });
});
