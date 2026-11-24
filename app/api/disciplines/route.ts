import { disciplineCreateSchema } from "@/lib/validators"
import { assertSameOrigin, handle, requireUser } from "@/server/api"
import { readTurnstileJson } from "@/server/turnstile"
import { getServices } from "@/server/services"

export async function POST(request: Request) {
  // cria uma disciplina no espaço do aluno logado.
  return handle("Não foi possível criar a disciplina.", async () => {
    const { auth, study, turnstile } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    const { id, ...data } = disciplineCreateSchema.parse(await readTurnstileJson(request, turnstile, "discipline"))
    return Response.json(await study.createDiscipline(user.id, id ?? `discipline-${crypto.randomUUID()}`, data), { status: 201 })
  })
}
