import { assertSameOrigin, handle, readJson, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

export async function GET(request: Request) {
  // devolve os dados do usuário autenticado.
  return handle("Não foi possível ler o perfil.", async () => {
    const user = await requireUser(request, getServices().auth)
    return Response.json({ user })
  })
}

export async function PATCH(request: Request) {
  // valida e atualiza os dados do perfil autenticado.
  return handle("Não foi possível atualizar o perfil.", async () => {
    const { auth } = getServices()
    const current = await requireUser(request, auth)
    assertSameOrigin(request)
    const user = await auth.updateProfile(current.id, await readJson(request))
    return Response.json({ user })
  })
}
