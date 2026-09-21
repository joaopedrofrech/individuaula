import { authService } from "@/lib/auth"
import { createSessionCookie } from "@/lib/session"

export async function POST(request: Request) {
  // autentica o usuário e devolve a sessão em um cookie protegido.
  try {
    const result = await authService.login(await request.json())
    return Response.json({ user: result.user }, { status: 200, headers: { "set-cookie": createSessionCookie({ sessionId: result.session.id, expiresAt: result.session.expiresAt }) } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Credenciais inválidas."
    const status = /credenciais/i.test(message) ? 401 : 422
    return Response.json({ error: status === 401 ? "Credenciais inválidas." : message }, { status })
  }
}
