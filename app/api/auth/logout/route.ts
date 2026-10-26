import { clearSessionCookie, isSecureRequest, readSessionToken } from "@/lib/session"
import { assertSameOrigin, handle } from "@/server/api"
import { getServices } from "@/server/services"

export async function POST(request: Request) {
  // invalida a sessão no banco e limpa o cookie no navegador.
  return handle("Não foi possível sair.", async () => {
    assertSameOrigin(request)
    const token = readSessionToken(request)
    if (token) {
      await getServices().auth.logout(token)
    }
    return new Response(null, { status: 204, headers: { "set-cookie": clearSessionCookie(isSecureRequest(request)) } })
  })
}
