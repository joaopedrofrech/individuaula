import { noteText, sanitizeNoteHtml } from "@/lib/notes"
import { noteUpdateRequestSchema } from "@/lib/validators"
import { assertSameOrigin, handle, HttpError, readJson, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Context) {
  // atualiza a anotação do aluno; `imageDataUrl: null` remove a imagem.
  return handle("Não foi possível atualizar a anotação.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    const data = noteUpdateRequestSchema.parse(await readJson(request))
    if (data.content !== undefined) {
      data.content = sanitizeNoteHtml(data.content)
      if (!noteText(data.content)) throw new HttpError(422, "Escreva o conteúdo da anotação.")
    }
    const note = await study.updateNote(user.id, (await params).id, data)
    if (!note) throw new HttpError(404, "Anotação não encontrada.")
    return Response.json(note)
  })
}

export async function DELETE(request: Request, { params }: Context) {
  // exclui uma anotação do aluno.
  return handle("Não foi possível excluir a anotação.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    if (!(await study.deleteNote(user.id, (await params).id))) throw new HttpError(404, "Anotação não encontrada.")
    return new Response(null, { status: 204 })
  })
}
