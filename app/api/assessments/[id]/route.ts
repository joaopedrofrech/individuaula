import { assessmentUpdateSchema } from "@/lib/validators"
import { assertSameOrigin, handle, HttpError, requireUser } from "@/server/api"
import { readTurnstileJson } from "@/server/turnstile"
import { getServices } from "@/server/services"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Context) {
  // atualiza os dados de uma avaliação sem apagar valores antigos.
  return handle("Não foi possível atualizar a avaliação.", async () => {
    const { auth, study, turnstile } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    const data = assessmentUpdateSchema.parse(await readTurnstileJson(request, turnstile, "assessment"))
    const assessment = await study.updateAssessment(user.id, (await params).id, data)
    if (!assessment) throw new HttpError(404, "Avaliação não encontrada.")
    return Response.json(assessment)
  })
}

export async function DELETE(request: Request, { params }: Context) {
  // exclui uma avaliação do aluno.
  return handle("Não foi possível excluir a avaliação.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    if (!(await study.deleteAssessment(user.id, (await params).id))) throw new HttpError(404, "Avaliação não encontrada.")
    return new Response(null, { status: 204 })
  })
}
