import { authService } from "@/lib/auth"
import { readSessionId } from "@/lib/session"

async function requireSession(request: Request) {
  // centraliza a leitura da sessão para as operações do perfil.
  const sessionId = readSessionId(request)
  return sessionId ? authService.getSession(sessionId) : null
}

export async function GET(request: Request) {
  // devolve os dados do usuário autenticado.
  const result = await requireSession(request)
  if (!result) return Response.json({ error: "Sessão inválida." }, { status: 401 })
  return Response.json({ user: result.user })
}

export async function PATCH(request: Request) {
  // valida e atualiza os dados do perfil autenticado.
  const result = await requireSession(request)
  if (!result) return Response.json({ error: "Sessão inválida." }, { status: 401 })
  try {
    const user = await authService.updateProfile(result.user.id, await request.json())
    return Response.json({ user })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o perfil." }, { status: 422 })
  }
}
