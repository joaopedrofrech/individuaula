import { assessmentCreateSchema } from "@/lib/validators"
import { assertSameOrigin, handle, HttpError, readJson, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

export async function POST(request: Request) {
  // registra uma avaliação em uma disciplina do aluno.
  return handle("Não foi possível criar a avaliação.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    const { id, disciplineId, ...data } = assessmentCreateSchema.parse(await readJson(request))
    const assessment = await study.createAssessment(user.id, disciplineId, id ?? `assessment-${crypto.randomUUID()}`, data)
    if (!assessment) throw new HttpError(404, "Disciplina não encontrada.")
    return Response.json(assessment, { status: 201 })
  })
}
