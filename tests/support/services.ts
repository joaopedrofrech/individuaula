import { createAuthService } from "@/server/auth-service";
import type { Db } from "@/server/db";
import { createStudyData } from "@/server/study-data";

// monta os mesmos serviços das rotas sobre o banco de teste, com relógio opcional para testar validade.
export function createTestServices(db: Db, { now, youtubeApiKey }: { now?: () => Date; youtubeApiKey?: string } = {}) {
  return {
    auth: createAuthService({ db, now }),
    study: createStudyData(db, now),
    youtubeApiKey,
  };
}
