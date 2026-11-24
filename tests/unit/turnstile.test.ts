// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "@/server/turnstile";

const request = new Request("https://app.example.com/api/auth/login", { method: "POST" });
const config = { siteKey: "public", secret: "secret", hostnames: "app.example.com" };

afterEach(() => vi.unstubAllGlobals());

describe("verificação de segurança", () => {
  it("permite desenvolvimento sem nenhuma chave configurada", async () => {
    await expect(verifyTurnstile(undefined, undefined, "login", request)).resolves.toBeUndefined();
  });

  it("rejeita configuração incompleta e token ausente", async () => {
    await expect(verifyTurnstile({ siteKey: "public" }, "token", "login", request)).rejects.toMatchObject({ status: 503 });
    await expect(verifyTurnstile(config, undefined, "login", request)).rejects.toMatchObject({ status: 403 });
  });

  it("aceita apenas sucesso para a ação e o domínio esperados", async () => {
    const response = { success: true, action: "login", hostname: "app.example.com" };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(response)));
    await expect(verifyTurnstile(config, "token", "login", request)).resolves.toBeUndefined();
    await expect(verifyTurnstile(config, "token", "signup", request)).rejects.toMatchObject({ status: 403 });
    response.hostname = "outro.example.com";
    await expect(verifyTurnstile(config, "token", "login", request)).rejects.toMatchObject({ status: 403 });
  });

  it("fecha o acesso quando a validação externa falha", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    await expect(verifyTurnstile(config, "token", "login", request)).rejects.toMatchObject({ status: 403 });
  });

  it("não aceita um token rejeitado ou já utilizado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] })));
    await expect(verifyTurnstile(config, "token", "login", request)).rejects.toMatchObject({ status: 403 });
  });
});
