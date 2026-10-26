import { defineConfig } from "drizzle-kit";

// gera as migrações SQL em ./drizzle; quem as aplica é o `wrangler d1 migrations apply`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./drizzle",
});
