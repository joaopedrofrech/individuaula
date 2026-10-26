import { createSessionCookie, isSecureRequest } from "@/lib/session"
import { assertSameOrigin, enforceRateLimit, handle, readJson } from "@/server/api"
import { loginLimiter } from "@/server/rate-limit"
import { getServices } from "@/server/services"

export async function POST(request: Request) {
  // autentica o usuário e devolve a sessão em um cookie protegido.
  return handle("Não foi possível entrar.", async () => {
    assertSameOrigin(request)
    enforceRateLimit(request, loginLimiter)
    const result = await getServices().auth.login(await readJson(request))
    return Response.json({ user: result.user }, { headers: { "set-cookie": createSessionCookie({ token: result.token, expiresAt: result.expiresAt, secure: isSecureRequest(request) }) } })
  })
}
