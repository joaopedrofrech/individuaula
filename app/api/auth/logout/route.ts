import { authService } from "@/lib/auth"
import { clearSessionCookie, readSessionId } from "@/lib/session"

export async function POST(request: Request) {
  // invalida a sessão atual e limpa o cookie no navegador.
  const sessionId = readSessionId(request)
  if (sessionId) {
    await authService.logout(sessionId)
  }
  return new Response(null, { status: 204, headers: { "set-cookie": clearSessionCookie() } })
}
