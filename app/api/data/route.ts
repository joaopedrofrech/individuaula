import { handle, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

export async function GET(request: Request) {
  // devolve todos os dados acadêmicos do aluno logado em uma única leitura.
  return handle("Não foi possível carregar seus dados.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    return Response.json(await study.loadAll(user.id))
  })
}
