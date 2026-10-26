import { createAuthService } from "@/server/auth-service";
import { getRuntimeEnv, type RuntimeEnv } from "@/server/context";
import { createDb } from "@/server/db";
import { createStudyData } from "@/server/study-data";

// monta os serviços a partir do ambiente do Worker; é o ponto único que os testes de rota substituem.
function createServices(env: RuntimeEnv) {
  const db = createDb(env.DB);
  return {
    auth: createAuthService({ db }),
    study: createStudyData(db),
    // chave da API do YouTube; sem ela a busca devolve resultados de exemplo.
    youtubeApiKey: env.YOUTUBE_API_KEY,
  };
}

export type Services = ReturnType<typeof createServices>;

export function getServices(): Services {
  return createServices(getRuntimeEnv());
}
