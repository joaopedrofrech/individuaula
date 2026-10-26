"use client"

import * as React from "react"
import Image from "next/image"
import { CirclePlayIcon, ExternalLinkIcon, SearchIcon } from "lucide-react"
import { useVideoSearch } from "@/hooks/use-video-search"
import type { YoutubeVideo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

function VideoCard({ video }: { video: YoutubeVideo }) {
  // mostra a miniatura, o título, o canal e o link para assistir no YouTube.
  return (
    <Card className="rounded-none border-border shadow-none">
      <div className="relative aspect-video overflow-hidden border-b border-border bg-muted">
        <Image src={video.thumbnailUrl} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" unoptimized />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-2 font-heading text-lg font-black tracking-[-0.04em] text-brand">{video.title}</CardTitle>
        <CardDescription>Canal: {video.channel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">Descrição: {video.description}</p>
        <a href={video.videoUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-brand underline-offset-4 hover:underline">
          Assistir vídeo <ExternalLinkIcon className="size-4" />
        </a>
      </CardContent>
    </Card>
  )
}

export function ContentSearch({ disciplineId }: { disciplineId?: string }) {
  // organiza a pesquisa externa e seus estados de carregamento, sucesso, erro e rolagem infinita.
  const [query, setQuery] = React.useState("")
  const { videos, searched, loading, loadingMore, error, loadMoreError, hasMore, reachedLimit, search, loadMore } = useVideoSearch(disciplineId)
  const sentinel = React.useRef<HTMLDivElement>(null)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    // consulta a rota server-side e mostra a primeira página de resultados.
    event.preventDefault()
    if (query.trim()) void search(query.trim())
  }

  React.useEffect(() => {
    // observa o fim da lista e carrega a próxima página quando o aluno chega perto dele.
    // o observador é recriado a cada página nova: assim, se o fim ainda estiver visível, ele dispara de novo.
    const element = sentinel.current
    if (!element || !hasMore || loadMoreError) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore()
    }, { rootMargin: "400px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loadMoreError, videos.length])

  return (
    <section className="flex flex-col gap-6">
      <div className="border-b border-border pb-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"><CirclePlayIcon className="size-4 text-coral" /> pesquisa de apoio</div>
        <h2 className="font-heading text-3xl font-black tracking-[-0.06em] text-brand">Encontre uma explicação que destrave o assunto.</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Busque por tema, conceito ou exercício e role a página para ver mais resultados.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FieldGroup className="flex-1">
          <Field>
            <FieldLabel htmlFor="content-query">Buscar conteúdo</FieldLabel>
            <Input id="content-query" aria-label="Buscar conteúdo" value={query} onValueChange={(value) => setQuery(value)} placeholder="Ex.: funções do segundo grau" />
          </Field>
        </FieldGroup>
        <Button type="submit" className="h-11 rounded-none bg-brand text-brand-foreground hover:bg-brand/90" disabled={loading}>
          <SearchIcon data-icon="inline-start" />{loading ? "Pesquisando..." : "Pesquisar"}
        </Button>
      </form>

      {loading && <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40 rounded-none" /><Skeleton className="h-40 rounded-none" /></div>}
      {error && <p role="alert" className="border border-destructive bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      {!loading && searched && videos.length === 0 && !error && (
        <Empty className="rounded-none border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><SearchIcon /></EmptyMedia>
            <EmptyTitle>Nenhum conteúdo encontrado</EmptyTitle>
            <EmptyDescription>Tente uma expressão diferente ou mais específica.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!loading && videos.length > 0 && (
        <div className="flex flex-col gap-4">
          <p role="status" className="text-sm font-semibold text-brand">{videos.length} conteúdos encontrados</p>
          <div className="grid gap-4 md:grid-cols-2">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div>

          {loadingMore && <div aria-busy="true" className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40 rounded-none" /><Skeleton className="h-40 rounded-none" /></div>}
          {loadMoreError && (
            <div role="alert" className="flex flex-col items-start gap-3 border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              <p>{loadMoreError}</p>
              <Button type="button" variant="outline" className="rounded-none" onClick={() => void loadMore()}>Tentar de novo</Button>
            </div>
          )}
          {hasMore && <div ref={sentinel} aria-hidden="true" className="h-px" />}
          {!hasMore && !loadMoreError && (
            <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
              {reachedLimit ? `Mostramos os ${videos.length} primeiros resultados. Refine a busca para ver outros.` : "Você chegou ao fim dos resultados."}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
