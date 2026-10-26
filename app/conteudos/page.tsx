import { ContentSearch } from "@/components/study/content-search"
import { ProtectedLayout } from "@/components/layout/protected-layout"

export default function ContentPage() {
  // disponibiliza a busca de conteúdos para usuários autenticados.
  return <ProtectedLayout><div className="mx-auto w-full max-w-5xl"><div className="mb-10 border-b border-border pb-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">biblioteca aberta</p><h1 className="mt-3 font-heading text-4xl font-black tracking-[-0.07em] text-brand md:text-5xl">Conteúdos</h1><p className="mt-3 max-w-2xl text-muted-foreground">Complementos para você destravar o próximo assunto sem sair do seu espaço.</p></div><ContentSearch /></div></ProtectedLayout>
}
