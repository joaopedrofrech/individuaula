import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "@/server/rate-limit";

describe("limite de tentativas", () => {
  it("permite até o limite e bloqueia a tentativa seguinte", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });

    expect([1, 2, 3].map(() => limiter.check("ip").allowed)).toEqual([true, true, true]);
    expect(limiter.check("ip").allowed).toBe(false);
  });

  it("informa em quantos segundos o cliente pode tentar de novo", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => now });
    limiter.check("ip");
    now = 15_000;

    expect(limiter.check("ip")).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it("libera o cliente quando a janela termina", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    limiter.check("ip");
    expect(limiter.check("ip").allowed).toBe(false);

    now = 1_000;

    expect(limiter.check("ip").allowed).toBe(true);
  });

  it("conta cada cliente separadamente", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.check("a");

    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("descarta contadores vencidos e permite zerar tudo", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    limiter.check("a");
    now = 2_000;
    limiter.prune();
    expect(limiter.check("a").allowed).toBe(true);

    limiter.reset();
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("identifica o cliente pelo cabeçalho da Cloudflare antes de qualquer outro", () => {
    const request = new Request("http://localhost", { headers: { "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" } });
    expect(clientKey(request)).toBe("1.1.1.1");
    expect(clientKey(new Request("http://localhost", { headers: { "x-forwarded-for": "2.2.2.2, 3.3.3.3" } }))).toBe("2.2.2.2");
    expect(clientKey(new Request("http://localhost"))).toBe("local");
  });
});
