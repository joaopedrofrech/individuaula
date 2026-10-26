import { noteText, sanitizeNoteHtml } from "@/lib/notes"
import { noteCreateSchema } from "@/lib/validators"
import { assertSameOrigin, handle, HttpError, readJson, requireUser } from "@/server/api"
import { getServices } from "@/server/services"

export async function POST(request: Request) {
  // cria uma anotação em uma disciplina do aluno; o HTML é higienizado também no servidor.
  return handle("Não foi possível criar a anotação.", async () => {
    const { auth, study } = getServices()
    const user = await requireUser(request, auth)
    assertSameOrigin(request)
    const { id, disciplineId, ...data } = noteCreateSchema.parse(await readJson(request))
    const content = sanitizeNoteHtml(data.content)
    if (!noteText(content)) throw new HttpError(422, "Escreva o conteúdo da anotação.")
    const note = await study.createNote(user.id, disciplineId, id ?? `note-${crypto.randomUUID()}`, { ...data, content })
    if (!note) throw new HttpError(404, "Disciplina não encontrada.")
    return Response.json(note, { status: 201 })
  })
}
