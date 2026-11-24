import { createSessionCookie, isSecureRequest } from "@/lib/session"
import { assertSameOrigin, enforceRateLimit, handle, readJson } from "@/server/api"
import { registerLimiter } from "@/server/rate-limit"
import { getServices } from "@/server/services"
import { verifyTurnstile } from "@/server/turnstile"

export async function POST(request: Request) {
  // cria a conta e já abre a primeira sessão do aluno.
  return handle("Não foi possível criar a conta.", async () => {
    assertSameOrigin(request)
    enforceRateLimit(request, registerLimiter)
    const { auth, email, turnstile } = getServices()
    const input = await readJson(request)
    await verifyTurnstile(turnstile, (input as { turnstileToken?: unknown })?.turnstileToken, "signup", request)
    const user = await auth.register(input)
    const session = await auth.login(input)
    // a falha do e-mail não desfaz uma conta que já foi criada.
    if (email) {
      try {
        await email.send({ to: user.email, subject: "Bem-vindo ao IndividuAula", text: `Olá, ${user.name}! Seu espaço de estudos está pronto. Acesse ${email.appUrl}` })
      } catch {
        console.error("Não foi possível enviar o e-mail de boas-vindas.")
      }
    }
    return Response.json({ user }, { status: 201, headers: { "set-cookie": createSessionCookie({ token: session.token, expiresAt: session.expiresAt, secure: isSecureRequest(request) }) } })
  })
}
