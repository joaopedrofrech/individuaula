import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createDb } from "@/server/db";

// o `node:sqlite` não passa pelo resolvedor do Vite; carregá-lo por require evita o erro de módulo desconhecido.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

type Params = unknown[];

// adaptador mínimo da interface D1 sobre o SQLite nativo do Node, só com o que o driver do Drizzle usa.
// serve aos testes que precisam de DOM (jsdom), onde o miniflare não roda; os testes de servidor usam o D1 real.
function createD1(database: InstanceType<typeof DatabaseSync>) {
  function statement(sql: string, params: Params = []) {
    const run = () => database.prepare(sql).run(...(params as never[]));
    return {
      bind: (...next: Params) => statement(sql, next),
      async all() {
        return { results: database.prepare(sql).all(...(params as never[])), success: true, meta: {} };
      },
      async run() {
        const result = run();
        return { results: [], success: true, meta: { changes: Number(result.changes) } };
      },
      async raw() {
        const prepared = database.prepare(sql);
        prepared.setReturnArrays(true);
        return prepared.all(...(params as never[]));
      },
      async first() {
        return database.prepare(sql).get(...(params as never[])) ?? null;
      },
    };
  }

  return {
    prepare: (sql: string) => statement(sql),
    // como no D1, o lote roda inteiro ou nada acontece.
    async batch(statements: Array<ReturnType<typeof statement>>) {
      database.exec("BEGIN");
      try {
        const results = [];
        for (const item of statements) results.push(await item.all());
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

const migrationsDir = path.resolve(__dirname, "../../drizzle");
const tables = ["study_sessions", "assessments", "notes", "disciplines", "sessions", "users"];

export function createSqliteTestDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
    for (const statement of readFileSync(path.join(migrationsDir, file), "utf8").split("--> statement-breakpoint")) {
      if (statement.trim()) database.exec(statement);
    }
  }
  return {
    db: createDb(createD1(database) as never),
    async reset() {
      for (const table of tables) database.exec(`DELETE FROM ${table}`);
    },
    async dispose() {
      database.close();
    },
  };
}
