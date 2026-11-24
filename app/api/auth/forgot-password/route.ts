import { z } from "zod";
import { assertSameOrigin, enforceRateLimit, handle, HttpError, readJson } from "@/server/api";
import { passwordResetLimiter } from "@/server/rate-limit";
import { getServices } from "@/server/services";
import { verifyTurnstile } from "@/server/turnstile";

// recebe o pedido de recuperação sem informar se o endereço possui uma conta.
export async function POST(request: Request) {
  return handle("Não foi possível solicitar a recuperação.", async () => {
    assertSameOrigin(request);
    enforceRateLimit(request, passwordResetLimiter);
    const input = z.object({ email: z.string().trim().email().max(254), turnstileToken: z.string().max(2048).optional() }).parse(await readJson(request));
    const { auth, email, turnstile } = getServices();
    await verifyTurnstile(turnstile, input.turnstileToken, "forgot_password", request);
    if (!email) throw new HttpError(503, "A recuperação de senha ainda não está configurada.");
    let base: URL;
    try { base = new URL(email.appUrl); } catch { throw new HttpError(503, "A recuperação de senha ainda não está configurada."); }
    if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) {
      throw new HttpError(503, "A recuperação de senha ainda não está configurada.");
    }
    const reset = await auth.createPasswordReset(input.email);
    if (reset) {
      const link = new URL("/redefinir-senha", base);
      // o fragmento não é enviado nos acessos e evita registrar o token no servidor.
      link.hash = `token=${reset.token}`;
      try {
        await email.send({ to: reset.email, subject: "Redefina sua senha no IndividuAula", text: `Use este link para criar uma nova senha. Ele vale por 30 minutos e pode ser usado uma vez:\n\n${link.toString()}\n\nSe você não fez este pedido, ignore este e-mail.` });
      } catch {
        // não informa ao navegador se o endereço existe ou se houve uma falha de entrega.
        console.error("Não foi possível enviar o e-mail de recuperação.");
      }
    }
    return Response.json({ ok: true });
  });
}
