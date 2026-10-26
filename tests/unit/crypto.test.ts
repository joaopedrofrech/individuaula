// @vitest-environment node
import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword, HASH_ITERATIONS, randomHex, safeEqual, sha256Hex } from "@/server/crypto";

describe("criptografia do servidor", () => {
  it("gera hashes PBKDF2 com sal diferente a cada chamada", async () => {
    const [first, second] = await Promise.all([hashPassword("segredo123"), hashPassword("segredo123")]);

    expect(first).toMatch(/^pbkdf2\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain("segredo123");
  });

  it("confere a senha certa e recusa a errada", async () => {
    const hash = await hashPassword("segredo123");

    await expect(comparePassword("segredo123", hash)).resolves.toBe(true);
    await expect(comparePassword("segredo124", hash)).resolves.toBe(false);
    await expect(comparePassword("", hash)).resolves.toBe(false);
  });

  it("usa o teto de iterações aceito pelo Workers", () => {
    expect(HASH_ITERATIONS).toBe(100_000);
  });

  it("gera valores aleatórios do tamanho pedido e sem repetição", () => {
    const values = new Set(Array.from({ length: 50 }, () => randomHex(32)));

    expect(values.size).toBe(50);
    expect([...values][0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("calcula o SHA-256 conhecido", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("compara textos em tempo constante com o resultado correto", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
