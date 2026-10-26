import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Binding } from "@/server/db";

// o que o Worker recebe do ambiente: o banco D1 e, como segredo opcional, a chave do YouTube.
export type RuntimeEnv = {
  DB: D1Binding;
  YOUTUBE_API_KEY?: string;
};

export function getRuntimeEnv() {
  return getCloudflareContext().env as unknown as RuntimeEnv;
}
