import { authService } from "@/lib/auth"
import { createSessionCookie } from "@/lib/session"

export async function POST(request: Request) {
  // cria a conta e inicia a primeira sessão do usuário.
  try {
    const input = await request.json()
    const user = await authService.register(input)
    const session = await authService.login(input)
    return Response.json({ user }, { status: 201, headers: { "set-cookie": createSessionCookie({ sessionId: session.session.id, expiresAt: session.session.expiresAt }) } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar a conta."
    const status = /cadastrado/i.test(message) ? 409 : 422
    return Response.json({ error: message }, { status })
  }
}
