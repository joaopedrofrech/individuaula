import { z } from "zod";
import { passwordSchema } from "@/lib/validators";
import { assertSameOrigin, enforceRateLimit, handle, HttpError, readJson } from "@/server/api";
import { passwordResetLimiter } from "@/server/rate-limit";
import { getServices } from "@/server/services";
import { verifyTurnstile } from "@/server/turnstile";

// valida e consome o código antes de aceitar a nova senha.
export async function POST(request: Request) {
  return handle("Não foi possível redefinir a senha.", async () => {
    assertSameOrigin(request);
    enforceRateLimit(request, passwordResetLimiter);
    const input = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema, turnstileToken: z.string().max(2048).optional() }).parse(await readJson(request));
    const services = getServices();
    await verifyTurnstile(services.turnstile, input.turnstileToken, "reset_password", request);
    if (!await services.auth.resetPassword(input.token, input.password)) throw new HttpError(400, "Link inválido ou expirado. Solicite outro link.");
    return Response.json({ ok: true });
  });
}
