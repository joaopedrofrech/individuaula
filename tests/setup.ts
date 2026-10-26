import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { resetRateLimiters } from "@/server/rate-limit";

// limpa a árvore renderizada entre os cenários para evitar interferência entre testes.
afterEach(() => {
  cleanup();
});

// zera os contadores de tentativas para que um cenário não bloqueie o seguinte.
beforeEach(() => {
  resetRateLimiters();
});
