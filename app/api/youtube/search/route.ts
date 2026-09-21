import { createYoutubeSearchResponse } from "@/server/youtube-search"

export async function GET(request: Request) {
  // encaminha a busca para o serviço server-side sem expor a chave da API.
  return createYoutubeSearchResponse(request, { apiKey: process.env.YOUTUBE_API_KEY })
}
