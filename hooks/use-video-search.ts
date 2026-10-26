"use client"

import * as React from "react"
import { apiRequest } from "@/lib/api-client"
import type { YoutubeVideo } from "@/lib/types"

// limite de páginas por busca: protege a cota diária da API (cada página custa 100 unidades) sem tirar a sensação de lista infinita.
export const MAX_PAGES = 8

type SearchResponse = { items: YoutubeVideo[]; nextPageToken?: string }

// pesquisa vídeos e carrega as páginas seguintes sob demanda, como a lista do próprio YouTube.
export function useVideoSearch(disciplineId?: string) {
  const [videos, setVideos] = React.useState<YoutubeVideo[]>([])
  const [nextPageToken, setNextPageToken] = React.useState<string>()
  const [pages, setPages] = React.useState(0)
  const [searched, setSearched] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState("")
  const [loadMoreError, setLoadMoreError] = React.useState("")

  // cada busca nova ganha um número; respostas de buscas antigas que chegam atrasadas são descartadas.
  const searchId = React.useRef(0)
  const query = React.useRef("")
  const busy = React.useRef(false)

  const fetchPage = React.useCallback((term: string, pageToken?: string) => {
    const params = new URLSearchParams({ q: term })
    if (disciplineId) params.set("disciplineId", disciplineId)
    if (pageToken) params.set("pageToken", pageToken)
    return apiRequest<SearchResponse>(`/api/youtube/search?${params.toString()}`)
  }, [disciplineId])

  const search = React.useCallback(async (term: string) => {
    const id = ++searchId.current
    query.current = term
    busy.current = true
    setLoading(true)
    setLoadingMore(false)
    setError("")
    setLoadMoreError("")
    try {
      const body = await fetchPage(term)
      if (id !== searchId.current) return
      setVideos(body.items ?? [])
      setNextPageToken(body.nextPageToken)
      setPages(1)
    } catch (caught) {
      if (id !== searchId.current) return
      setError(caught instanceof Error ? caught.message : "Não foi possível buscar conteúdos.")
      setVideos([])
      setNextPageToken(undefined)
      setPages(0)
    } finally {
      if (id === searchId.current) {
        setSearched(true)
        setLoading(false)
        busy.current = false
      }
    }
  }, [fetchPage])

  const loadMore = React.useCallback(async () => {
    if (busy.current || !nextPageToken || pages >= MAX_PAGES) return
    const id = searchId.current
    busy.current = true
    setLoadingMore(true)
    setLoadMoreError("")
    try {
      const body = await fetchPage(query.current, nextPageToken)
      if (id !== searchId.current) return
      // o YouTube às vezes repete um vídeo entre páginas; o id evita cartões duplicados.
      setVideos((current) => {
        const seen = new Set(current.map((video) => video.id))
        return [...current, ...(body.items ?? []).filter((video) => !seen.has(video.id))]
      })
      setNextPageToken(body.nextPageToken)
      setPages((current) => current + 1)
    } catch (caught) {
      if (id !== searchId.current) return
      setLoadMoreError(caught instanceof Error ? caught.message : "Não foi possível carregar mais resultados.")
    } finally {
      if (id === searchId.current) {
        setLoadingMore(false)
        busy.current = false
      }
    }
  }, [fetchPage, nextPageToken, pages])

  const hasMore = Boolean(nextPageToken) && pages < MAX_PAGES
  const reachedLimit = Boolean(nextPageToken) && pages >= MAX_PAGES

  return { videos, searched, loading, loadingMore, error, loadMoreError, hasMore, reachedLimit, search, loadMore }
}
