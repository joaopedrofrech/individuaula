import { assertSameOrigin, handle, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

export async function POST(request: Request) {
  // grava os dados de exemplo para o aluno logado, uma única vez.
  return handle("Não foi possível carregar os dados de exemplo.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    return Response.json(await study.seedDemoData(user.id))
  })
}
