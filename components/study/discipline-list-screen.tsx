"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRightIcon, BookOpenTextIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { calculateWeightedAverage } from "@/lib/academics"
import { useApp } from "@/components/app-provider"
import { DisciplineForm } from "@/components/study/discipline-form"
import { DisciplineIcon } from "@/components/study/discipline-icon"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

function formatAverage(value: number) {
  // mantém a média da lista com uma casa decimal.
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

const colorClasses: Record<string, string> = {
  lime: "border-signal bg-signal text-brand",
  coral: "border-coral bg-coral text-coral-foreground",
  blue: "border-sky-400 bg-sky-400/15 text-sky-700 dark:border-sky-300 dark:text-sky-200",
  violet: "border-violet-400 bg-violet-400/15 text-violet-700 dark:border-violet-300 dark:text-violet-200",
  slate: "border-slate-400 bg-slate-400/15 text-slate-700 dark:border-slate-300 dark:text-slate-200",
  green: "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:border-emerald-300 dark:text-emerald-200",
}

// mantém o estado de edição isolado para que cada disciplina possa evoluir sem recarregar a página.
export function DisciplineListScreen() {
  // organiza a criação, edição, exclusão e navegação das disciplinas.
  const { state, user, addDiscipline, updateDiscipline, deleteDiscipline } = useApp()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const disciplines = state.disciplines.filter((item) => item.userId === user?.id)
  const editing = disciplines.find((item) => item.id === editingId)

  function submitDiscipline(input: Parameters<typeof addDiscipline>[0]) {
    // decide entre criar ou atualizar e fecha o diálogo ao concluir.
    if (editingId) {
      updateDiscipline(editingId, input)
    } else {
      addDiscipline(input)
    }
    setDialogOpen(false)
    setEditingId(null)
  }

  function closeDialog(open: boolean) {
    // limpa o modo de edição quando o diálogo é fechado.
    setDialogOpen(open)
    if (!open) setEditingId(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
      <section className="flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Organização acadêmica</p>
          <h1 className="mt-3 font-heading text-4xl font-black tracking-[-0.07em] text-brand md:text-5xl">Disciplinas</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Tudo o que você estuda, separado por contexto para sua cabeça respirar.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={closeDialog}>
          <DialogTrigger render={<Button className="h-11 rounded-none bg-brand text-brand-foreground hover:bg-brand/90" />}><PlusIcon data-icon="inline-start" />Adicionar disciplina</DialogTrigger>
          {dialogOpen && <DialogContent className="max-h-[90svh] overflow-y-auto rounded-none sm:max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Editar disciplina" : "Nova disciplina"}</DialogTitle><DialogDescription>{editing ? "Atualize o nome, a descrição, a cor ou o ícone deste espaço." : "Crie um espaço para suas anotações e avaliações."}</DialogDescription></DialogHeader>
            <DisciplineForm key={editing?.id ?? "new-discipline"} initialValues={editing ? { name: editing.name, description: editing.description, color: editing.color as "lime" | "coral" | "blue" | "violet" | "slate" | "green", icon: editing.icon as "book" | "calculator" | "code" | "flask" | "language" | "music" } : undefined} onSubmit={submitDiscipline} />
          </DialogContent>}
        </Dialog>
      </section>

      {disciplines.length === 0 ? (
        <Empty className="min-h-80 rounded-none border border-dashed border-border bg-muted/20">
          <EmptyHeader><EmptyMedia variant="icon"><BookOpenTextIcon /></EmptyMedia><EmptyTitle>Nenhuma disciplina ainda</EmptyTitle><EmptyDescription>Comece com uma disciplina que faça parte da sua rotina hoje.</EmptyDescription></EmptyHeader>
          <EmptyContent><Button className="rounded-none" onClick={() => setDialogOpen(true)}>Criar primeira disciplina</Button></EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {disciplines.map((discipline) => {
            const assessments = state.assessments.filter((item) => item.disciplineId === discipline.id && item.userId === user?.id)
            const notes = state.notes.filter((item) => item.disciplineId === discipline.id && item.userId === user?.id)
            const average = calculateWeightedAverage(assessments)
            return (
              <Card key={discipline.id} className="rounded-none border-border shadow-none transition-colors hover:bg-muted/20">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className={cn("grid size-11 place-items-center border", colorClasses[discipline.color] ?? colorClasses.slate)}><DisciplineIcon name={discipline.icon} className="size-5" /></div>
                    <CardAction><div className="text-right"><div className="font-heading text-3xl font-black tracking-[-0.06em] text-brand">{formatAverage(average)}</div><div className="text-xs text-muted-foreground">média atual</div></div></CardAction>
                  </div>
                  <Link href={`/disciplinas/${discipline.id}`} className="pt-2 font-heading text-2xl font-black tracking-[-0.05em] text-brand underline-offset-4 hover:underline">{discipline.name}</Link>
                  <CardDescription className="line-clamp-2 min-h-10">{discipline.description || "Espaço para suas anotações e avaliações."}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5"><Progress value={average * 10} className="h-1" /><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{notes.length} anotações · {assessments.length} avaliações</span><div className="flex items-center gap-1"><Link href={`/disciplinas/${discipline.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}><ArrowUpRightIcon data-icon="inline-start" />Abrir</Link><Button variant="ghost" size="icon-sm" aria-label="Editar disciplina" onClick={() => { setEditingId(discipline.id); setDialogOpen(true) }}><PencilIcon /></Button><Button variant="ghost" size="icon-sm" aria-label="Excluir disciplina" onClick={() => setDeletingId(discipline.id)}><Trash2Icon /></Button><Button variant="ghost" size="icon-sm" aria-label="Mais ações"><MoreHorizontalIcon /></Button></div></div></CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={Boolean(deletingId)} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
        <AlertDialogContent className="rounded-none"><AlertDialogHeader><AlertDialogTitle>Excluir disciplina?</AlertDialogTitle><AlertDialogDescription>As anotações e avaliações vinculadas também serão removidas deste espaço demo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="rounded-none" onClick={() => { if (deletingId) deleteDiscipline(deletingId); setDeletingId(null) }}>Confirmar exclusão</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
