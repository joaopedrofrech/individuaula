import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export type Db = DrizzleD1Database<typeof schema>;

// tipo do binding D1 vindo do próprio Drizzle, sem trazer os tipos globais do runtime do Workers.
export type D1Binding = Parameters<typeof drizzle>[0];

// envolve o binding D1 com o Drizzle usando o schema do projeto.
export function createDb(binding: D1Binding): Db {
  return drizzle(binding, { schema });
}
