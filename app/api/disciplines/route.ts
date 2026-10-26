import { disciplineCreateSchema } from "@/lib/validators"
import { assertSameOrigin, handle, readJson, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

export async function POST(request: Request) {
  // cria uma disciplina no espaço do aluno logado.
  return handle("Não foi possível criar a disciplina.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    const { id, ...data } = disciplineCreateSchema.parse(await readJson(request))
    return Response.json(await study.createDiscipline(user.id, id ?? `discipline-${crypto.randomUUID()}`, data), { status: 201 })
  })
}
