import { handle, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

export async function GET(request: Request) {
  // informa quem está logado; o cliente usa para restaurar a sessão ao abrir o app.
  return handle("Não foi possível ler a sessão.", async () => {
    const user = await requireUser(request, getServices().auth)
    return Response.json({ user })
  })
}
