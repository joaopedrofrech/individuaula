import { HttpError, readJson } from "@/server/api";

type TurnstileConfig = { siteKey?: string; secret?: string; hostnames?: string };

// valida o token no servidor e exige a ação e o domínio configurados para este ambiente.
export async function verifyTurnstile(config: TurnstileConfig | undefined, token: unknown, action: string, request: Request) {
  if (!config || (!config.siteKey && !config.secret && !config.hostnames)) return;
  const hosts = (config.hostnames ?? "").split(",").map((host) => host.trim()).filter(Boolean);
  if (!config.siteKey || !config.secret || !hosts.length) throw new HttpError(503, "Verificação de segurança indisponível.");
  if (typeof token !== "string" || !token || token.length > 2048) throw new HttpError(403, "Conclua a verificação de segurança.");
  try {
    const body = new URLSearchParams({ secret: config.secret, response: token });
    const ip = request.headers.get("cf-connecting-ip");
    if (ip) body.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(10_000) });
    const result = await response.json() as { success?: boolean; action?: string; hostname?: string };
    if (!response.ok || result.success !== true || result.action !== action || !result.hostname || !hosts.includes(result.hostname)) throw new Error("verification failed");
  } catch {
    throw new HttpError(403, "Não foi possível validar a verificação de segurança. Tente novamente.");
  }
}

// lê o corpo uma só vez e valida o token antes das regras do formulário.
export async function readTurnstileJson(request: Request, config: TurnstileConfig | undefined, action: string) {
  const input = await readJson(request);
  await verifyTurnstile(config, (input as { turnstileToken?: unknown })?.turnstileToken, action, request);
  return input;
}
