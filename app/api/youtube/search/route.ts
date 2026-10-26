import { createYoutubeSearchResponse } from "@/server/youtube-search"
import { enforceRateLimit, errorResponse, requireUser } from "@/server/api"
import { searchLimiter } from "@/server/rate-limit"
import { getServices } from "@/server/services"

export async function GET(request: Request) {
  // só alunos logados pesquisam; assim ninguém de fora consome a cota da API do YouTube.
  const { auth, study, youtubeApiKey } = getServices()
  let userId: string
  try {
    userId = (await requireUser(request, auth)).id
    enforceRateLimit(request, searchLimiter)
  } catch (error) {
    return errorResponse(error, "Não foi possível buscar conteúdos.")
  }
  return createYoutubeSearchResponse(request, {
    apiKey: youtubeApiKey,
    // a busca "dentro de uma disciplina" só vale para disciplinas do próprio aluno.
    validateDiscipline: (disciplineId) => study.ownsDiscipline(userId, disciplineId),
  })
}
