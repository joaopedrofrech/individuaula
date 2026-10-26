import { assessmentUpdateSchema } from "@/lib/validators"
import { assertSameOrigin, handle, HttpError, readJson, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Context) {
  // atualiza nota, peso ou título de uma avaliação do aluno.
  return handle("Não foi possível atualizar a avaliação.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    const data = assessmentUpdateSchema.parse(await readJson(request))
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
