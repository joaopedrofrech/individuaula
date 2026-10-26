import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { createDb, type D1Binding } from "@/server/db";

const migrationsDir = path.resolve(__dirname, "../../drizzle");

// as migrações reais do projeto são aplicadas no banco de teste, então o schema testado é o de produção.
function migrationStatements() {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .flatMap((file) => readFileSync(path.join(migrationsDir, file), "utf8").split("--> statement-breakpoint"))
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const tables = ["study_sessions", "assessments", "notes", "disciplines", "sessions", "users"];

// sobe um D1 em memória (SQLite do workerd) com o schema aplicado; use um por arquivo de teste.
export async function createTestDatabase() {
  const proxy = await getPlatformProxy<{ DB: D1Binding }>({ configPath: path.resolve(__dirname, "wrangler.test.jsonc"), persist: false });
  const binding = proxy.env.DB;
  for (const statement of migrationStatements()) {
    await binding.prepare(statement).run();
  }
  return {
    binding,
    db: createDb(binding as never),
    // esvazia as tabelas entre os cenários para que um teste nunca dependa de outro.
    async reset() {
      await binding.batch(tables.map((table) => binding.prepare(`DELETE FROM ${table}`)));
    },
    dispose: () => proxy.dispose(),
  };
}
