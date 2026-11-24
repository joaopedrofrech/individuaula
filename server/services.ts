import { createAuthService } from "@/server/auth-service";
import { getRuntimeEnv, type RuntimeEnv } from "@/server/context";
import { createDb } from "@/server/db";
import { createStudyData } from "@/server/study-data";
import { sendEmail } from "@/server/email";

// monta os serviços a partir do ambiente do Worker; é o ponto único que os testes de rota substituem.
function createServices(env: RuntimeEnv) {
  const db = createDb(env.DB);
  return {
    auth: createAuthService({ db }),
    study: createStudyData(db),
    // chave da API do YouTube; sem ela a busca devolve resultados de exemplo.
    youtubeApiKey: env.YOUTUBE_API_KEY,
    turnstile: { siteKey: env.TURNSTILE_SITE_KEY, secret: env.TURNSTILE_SECRET, hostnames: env.TURNSTILE_HOSTNAMES },
    // usa somente um endereço público configurado, sem confiar no Host da requisição.
    email: env.RESEND_API_KEY && env.RESEND_FROM && env.APP_URL ? {
      appUrl: env.APP_URL,
      send: (message: { to: string; subject: string; text: string }) => sendEmail({ apiKey: env.RESEND_API_KEY!, from: env.RESEND_FROM! }, message),
    } : undefined,
  };
}

export type Services = ReturnType<typeof createServices>;

export function getServices(): Services {
  return createServices(getRuntimeEnv());
}
