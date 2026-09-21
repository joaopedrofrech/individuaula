"use client"

import * as React from "react"
import Image from "next/image"
import { CirclePlayIcon, ExternalLinkIcon, SearchIcon } from "lucide-react"
import type { YoutubeVideo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

export function ContentSearch({ disciplineId }: { disciplineId?: string }) {
  // organiza a pesquisa externa e seus estados de carregamento, sucesso e erro.
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<YoutubeVideo[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)
  const [error, setError] = React.useState("")

  async function search(event: React.FormEvent<HTMLFormElement>) {
    // consulta a rota server-side e normaliza a resposta para os cards de vídeo.
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ q: query.trim() })
      if (disciplineId) params.set("disciplineId", disciplineId)
      const response = await fetch(`/api/youtube/search?${params.toString()}`)
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "Não foi possível buscar conteúdos.")
      setResults(body.items ?? [])
      setSearched(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível buscar conteúdos.")
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  return <section className="flex flex-col gap-6"><div className="border-b border-border pb-6"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"><CirclePlayIcon className="size-4 text-coral" /> pesquisa de apoio</div><h2 className="font-heading text-3xl font-black tracking-[-0.06em] text-brand">Encontre uma explicação que destrave o assunto.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Busque por tema, conceito ou exercício. A chave do YouTube fica somente no servidor quando a integração estiver ativa.</p></div><form onSubmit={search} className="flex flex-col gap-4 sm:flex-row sm:items-end"><FieldGroup className="flex-1"><Field><FieldLabel htmlFor="content-query">Buscar conteúdo</FieldLabel><Input id="content-query" aria-label="Buscar conteúdo" value={query} onValueChange={(value) => setQuery(value)} placeholder="Ex.: funções do segundo grau" /></Field></FieldGroup><Button type="submit" className="h-11 rounded-none bg-brand text-brand-foreground hover:bg-brand/90" disabled={loading}><SearchIcon data-icon="inline-start" />{loading ? "Pesquisando..." : "Pesquisar"}</Button></form>{loading && <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40 rounded-none" /><Skeleton className="h-40 rounded-none" /></div>}{error && <p role="alert" className="border border-destructive bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}{!loading && searched && results.length === 0 && !error && <Empty className="rounded-none border border-dashed border-border"><EmptyHeader><EmptyMedia variant="icon"><SearchIcon /></EmptyMedia><EmptyTitle>Nenhum conteúdo encontrado</EmptyTitle><EmptyDescription>Tente uma expressão diferente ou mais específica.</EmptyDescription></EmptyHeader></Empty>}{!loading && results.length > 0 && <div className="flex flex-col gap-4"><p role="status" className="text-sm font-semibold text-brand">{results.length} conteúdos encontrados</p><div className="grid gap-4 md:grid-cols-2">{results.map((video) => <Card key={video.id} className="rounded-none border-border shadow-none"><div className="relative aspect-video overflow-hidden border-b border-border bg-muted"><Image src={video.thumbnailUrl} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" unoptimized /></div><CardHeader className="pb-2"><CardTitle className="line-clamp-2 font-heading text-lg font-black tracking-[-0.04em] text-brand">{video.title}</CardTitle><CardDescription>Canal: {video.channel}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">Descrição: {video.description}</p><a href={video.videoUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-brand underline-offset-4 hover:underline">Assistir vídeo <ExternalLinkIcon className="size-4" /></a></CardContent></Card>)}</div></div>}</section>
}
