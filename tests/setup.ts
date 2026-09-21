import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// limpa a árvore renderizada entre os cenários para evitar interferência entre testes.
afterEach(() => {
  cleanup();
});

// mantém o armazenamento do navegador isolado entre os cenários.
beforeEach(() => {
  window.localStorage.clear();
});
