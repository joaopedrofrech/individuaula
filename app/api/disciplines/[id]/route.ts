import { disciplineUpdateSchema } from "@/lib/validators"
import { assertSameOrigin, handle, HttpError, readJson, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Context) {
  // atualiza só os campos enviados; outro aluno nunca encontra a disciplina.
  return handle("Não foi possível atualizar a disciplina.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    const data = disciplineUpdateSchema.parse(await readJson(request))
    const discipline = await study.updateDiscipline(user.id, (await params).id, data)
    if (!discipline) throw new HttpError(404, "Disciplina não encontrada.")
    return Response.json(discipline)
  })
}

export async function DELETE(request: Request, { params }: Context) {
  // exclui a disciplina com suas anotações e avaliações.
  return handle("Não foi possível excluir a disciplina.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    if (!(await study.deleteDiscipline(user.id, (await params).id))) throw new HttpError(404, "Disciplina não encontrada.")
    return new Response(null, { status: 204 })
  })
}
