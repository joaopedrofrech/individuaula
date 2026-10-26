import { createSessionCookie, isSecureRequest } from "@/lib/session"
import { assertSameOrigin, enforceRateLimit, handle, readJson } from "@/server/api"
import { registerLimiter } from "@/server/rate-limit"
import { getServices } from "@/server/services"

export async function POST(request: Request) {
  // cria a conta e já abre a primeira sessão do aluno.
  return handle("Não foi possível criar a conta.", async () => {
    assertSameOrigin(request)
    enforceRateLimit(request, registerLimiter)
    const { auth } = getServices()
    const input = await readJson(request)
    const user = await auth.register(input)
    const session = await auth.login(input)
    return Response.json({ user }, { status: 201, headers: { "set-cookie": createSessionCookie({ token: session.token, expiresAt: session.expiresAt, secure: isSecureRequest(request) }) } })
  })
}
