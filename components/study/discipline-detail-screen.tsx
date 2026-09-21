"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, CalendarDaysIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react"
import { calculateWeightedAverage } from "@/lib/academics"
import { noteText, sanitizeNoteHtml } from "@/lib/notes"
import { useApp } from "@/components/app-provider"
import { AssessmentForm } from "@/components/study/assessment-form"
import { ContentSearch } from "@/components/study/content-search"
import { DisciplineForm } from "@/components/study/discipline-form"
import { NoteForm } from "@/components/study/note-form"
import { DisciplineIcon } from "@/components/study/discipline-icon"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function formatDate(value: Date) {
  // exibe datas do histórico no formato curto usado pelo caderno.
  return value.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatAverage(value: number) {
  // mantém a média detalhada com duas casas para a tela da disciplina.
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function DisciplineDetailScreen({ disciplineId }: { disciplineId: string }) {
  // coordena anotações, avaliações e conteúdos dentro de uma disciplina.
  const router = useRouter()
  const { state, user, updateDiscipline, deleteDiscipline, addNote, updateNote, deleteNote, addAssessment, updateAssessment, deleteAssessment } = useApp()
  const [disciplineDialogOpen, setDisciplineDialogOpen] = React.useState(false)
  const [disciplineDeleteOpen, setDisciplineDeleteOpen] = React.useState(false)
  const [noteEditorOpen, setNoteEditorOpen] = React.useState(false)
  const [assessmentDialogOpen, setAssessmentDialogOpen] = React.useState(false)
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null)
  const [editingAssessmentId, setEditingAssessmentId] = React.useState<string | null>(null)
  const [deletingNoteId, setDeletingNoteId] = React.useState<string | null>(null)
  const [deletingAssessmentId, setDeletingAssessmentId] = React.useState<string | null>(null)
  const [noteSearch, setNoteSearch] = React.useState("")

  const discipline = state.disciplines.find((item) => item.id === disciplineId && item.userId === user?.id)
  const allNotes = state.notes.filter((item) => item.disciplineId === disciplineId && item.userId === user?.id)
  const notes = allNotes.filter((item) => `${item.title} ${noteText(item.content)}`.toLocaleLowerCase().includes(noteSearch.trim().toLocaleLowerCase()))
  const assessments = state.assessments.filter((item) => item.disciplineId === disciplineId && item.userId === user?.id)
  const average = assessments.length ? calculateWeightedAverage(assessments) : 0
  const editingNote = allNotes.find((item) => item.id === editingNoteId)
  const editingAssessment = assessments.find((item) => item.id === editingAssessmentId)

  if (!discipline) {
    return <div className="mx-auto max-w-3xl border border-border p-8"><h1 className="font-heading text-3xl font-black text-brand">Disciplina não encontrada</h1><Link href="/disciplinas" className="mt-4 inline-block font-semibold text-brand underline">Voltar para disciplinas</Link></div>
  }

  const activeDiscipline = discipline

  // fecha o editor e mantém a disciplina atualizada na lista compartilhada.
  function saveDiscipline(input: Parameters<typeof updateDiscipline>[1]) {
    // persiste os campos editados e fecha o diálogo da disciplina.
    updateDiscipline(activeDiscipline.id, input)
    setDisciplineDialogOpen(false)
  }

  // remove o espaço de estudo e retorna para a visão geral das disciplinas.
  function confirmDisciplineDeletion() {
    // remove a disciplina e redireciona para a lista principal.
    deleteDiscipline(activeDiscipline.id)
    setDisciplineDeleteOpen(false)
    router.push("/disciplinas")
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
      <div>
        <Link href="/disciplinas" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-brand hover:underline">
          <ArrowLeftIcon className="size-4" /> voltar para disciplinas
        </Link>
        <div className="mt-8 flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center border border-border bg-muted text-brand"><DisciplineIcon name={discipline.icon} className="size-5" /></span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">espaço de estudo</span>
            </div>
            <h1 className="font-heading text-4xl font-black tracking-[-0.07em] text-brand md:text-5xl">{discipline.name}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{discipline.description || "Anotações, avaliações e conteúdos no mesmo lugar."}</p>
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <div className="text-left md:text-right">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">média atual</div>
              <div className="mt-1 font-heading text-5xl font-black tracking-[-0.08em] text-brand">{formatAverage(average)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-none" aria-label="Editar disciplina" onClick={() => setDisciplineDialogOpen(true)}>
                <PencilIcon data-icon="inline-start" /> editar disciplina
              </Button>
              <Button variant="ghost" className="rounded-none text-destructive hover:text-destructive" aria-label="Excluir disciplina" onClick={() => setDisciplineDeleteOpen(true)}>
                <Trash2Icon data-icon="inline-start" /> excluir disciplina
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="notes" className="flex flex-col gap-6">
        <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent px-0 py-3 data-active:border-brand data-active:bg-transparent data-active:text-brand">Anotações</TabsTrigger>
          <TabsTrigger value="assessments" className="rounded-none border-b-2 border-transparent px-0 py-3 data-active:border-brand data-active:bg-transparent data-active:text-brand">Avaliações e notas</TabsTrigger>
          <TabsTrigger value="content" className="rounded-none border-b-2 border-transparent px-0 py-3 data-active:border-brand data-active:bg-transparent data-active:text-brand">Conteúdos</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-0 flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-heading text-2xl font-black tracking-[-0.05em] text-brand">Seu caderno</h2>
              <p className="mt-1 text-sm text-muted-foreground">Monte uma anotação com texto, formatação e imagens de apoio.</p>
            </div>
            <Button className="rounded-none bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => { setEditingNoteId(null); setNoteEditorOpen(true) }}>
              <PlusIcon data-icon="inline-start" /> {noteEditorOpen ? "continuar anotando" : "adicionar anotação"}
            </Button>
          </div>
          {noteEditorOpen && <section aria-label="Construtor de anotação" className="border border-border bg-card p-5 md:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">mini-construtor</p><h3 className="mt-2 font-heading text-2xl font-black tracking-[-0.05em] text-brand">{editingNote ? "Editar anotação" : "Nova anotação"}</h3><p className="mt-1 text-sm text-muted-foreground">Organize uma ideia antes que ela se perca.</p></div><span className="hidden border border-signal bg-signal/10 px-2 py-1 text-xs font-semibold text-brand sm:inline-flex">rascunho local</span></div><NoteForm key={editingNote?.id ?? "new-note"} initialValues={editingNote ? { title: editingNote.title, content: editingNote.content, imageDataUrl: editingNote.imageDataUrl } : undefined} onCancel={() => { setNoteEditorOpen(false); setEditingNoteId(null) }} onSubmit={(input) => { if (editingNoteId) updateNote(editingNoteId, input); else addNote(discipline.id, input); setNoteEditorOpen(false); setEditingNoteId(null) }} /></section>}
          <div className="relative max-w-md">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Pesquisar anotações" placeholder="Pesquisar anotações" value={noteSearch} onValueChange={(value) => setNoteSearch(value)} className="rounded-none pl-9" />
          </div>
          {notes.length === 0 ? <div className="border border-dashed border-border p-8 text-sm text-muted-foreground">{noteSearch ? "Nenhuma anotação corresponde à busca." : "Ainda não há anotações nesta disciplina."}</div> : <div className="grid gap-4 lg:grid-cols-2">{notes.map((note) => <Card key={note.id} className="rounded-none border-border shadow-none"><CardHeader><CardTitle className="font-heading text-xl font-black tracking-[-0.04em] text-brand">{note.title}</CardTitle><CardDescription className="flex items-center gap-2"><CalendarDaysIcon className="size-4" /> criada em {formatDate(note.createdAt)} · atualizada em {formatDate(note.updatedAt)}</CardDescription></CardHeader><CardContent className="flex flex-col gap-5"><div className="prose prose-sm max-w-none text-muted-foreground [&_blockquote]:border-l-2 [&_blockquote]:border-signal [&_blockquote]:pl-3 [&_blockquote]:italic [&_p]:leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(note.content) }} />{note.imageDataUrl && <Image src={note.imageDataUrl} alt="Imagem anexada à anotação" width={960} height={540} unoptimized className="max-h-64 w-full border border-border object-cover" />}<div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" className="rounded-none" aria-label="Editar anotação" onClick={() => { setEditingNoteId(note.id); setNoteEditorOpen(true) }}><PencilIcon data-icon="inline-start" /> editar anotação</Button><Button variant="ghost" size="sm" className="rounded-none text-destructive hover:text-destructive" aria-label="Excluir anotação" onClick={() => setDeletingNoteId(note.id)}><Trash2Icon data-icon="inline-start" /> excluir anotação</Button></div></CardContent></Card>)}</div>}
        </TabsContent>

        <TabsContent value="assessments" className="mt-0 flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-heading text-2xl font-black tracking-[-0.05em] text-brand">Avaliações e notas</h2>
              <p className="mt-1 text-sm text-muted-foreground">A média ponderada se atualiza a cada novo registro.</p>
            </div>
            <Button className="rounded-none bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => { setEditingAssessmentId(null); setAssessmentDialogOpen(true) }}>
              <PlusIcon data-icon="inline-start" /> adicionar avaliação
            </Button>
          </div>
          {assessments.length === 0 ? <div className="border border-dashed border-border p-8 text-sm text-muted-foreground">Ainda não há notas cadastradas. Adicione uma avaliação para acompanhar seu desempenho.</div> : <section aria-label="Histórico de avaliações" className="border border-border"><Table><TableHeader><TableRow><TableHead>Avaliação</TableHead><TableHead>Nota</TableHead><TableHead>Peso</TableHead><TableHead>Atualizada</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{assessments.map((assessment) => <TableRow key={assessment.id}><TableCell className="font-semibold text-brand">{assessment.title}</TableCell><TableCell>{assessment.grade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell><TableCell>{assessment.weight}</TableCell><TableCell>{formatDate(assessment.updatedAt)}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label="Editar avaliação" onClick={() => { setEditingAssessmentId(assessment.id); setAssessmentDialogOpen(true) }}><PencilIcon /></Button><Button variant="ghost" size="icon-sm" aria-label="Excluir avaliação" onClick={() => setDeletingAssessmentId(assessment.id)}><Trash2Icon /></Button></div></TableCell></TableRow>)}</TableBody></Table></section>}
        </TabsContent>

        <TabsContent value="content" className="mt-0"><ContentSearch disciplineId={discipline.id} /></TabsContent>
      </Tabs>

      <Dialog open={disciplineDialogOpen} onOpenChange={setDisciplineDialogOpen}>
        {disciplineDialogOpen && <DialogContent className="rounded-none sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar disciplina</DialogTitle><DialogDescription>Atualize o nome, a descrição, a cor ou o ícone deste espaço.</DialogDescription></DialogHeader>
          <DisciplineForm key={`${discipline.id}-${discipline.updatedAt.getTime()}`} initialValues={{ name: discipline.name, description: discipline.description, color: discipline.color as "lime" | "coral" | "blue" | "violet" | "slate" | "green", icon: discipline.icon as "book" | "calculator" | "code" | "flask" | "language" | "music" }} onSubmit={saveDiscipline} />
        </DialogContent>}
      </Dialog>

      <AlertDialog open={disciplineDeleteOpen} onOpenChange={setDisciplineDeleteOpen}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader><AlertDialogTitle>Excluir disciplina?</AlertDialogTitle><AlertDialogDescription>As anotações e avaliações vinculadas também serão removidas deste espaço.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="rounded-none" onClick={confirmDisciplineDeletion}>Confirmar exclusão</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={assessmentDialogOpen} onOpenChange={(open) => { setAssessmentDialogOpen(open); if (!open) setEditingAssessmentId(null) }}>
        <DialogContent className="rounded-none sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingAssessment ? "Editar avaliação" : "Nova avaliação"}</DialogTitle><DialogDescription>Registre a nota e o peso para atualizar sua média.</DialogDescription></DialogHeader>
          <AssessmentForm key={editingAssessment?.id ?? "new-assessment"} initialValues={editingAssessment ? { title: editingAssessment.title, grade: editingAssessment.grade, weight: editingAssessment.weight } : undefined} onSubmit={(input) => { if (editingAssessmentId) updateAssessment(editingAssessmentId, input); else addAssessment(discipline.id, input); setAssessmentDialogOpen(false); setEditingAssessmentId(null) }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingNoteId)} onOpenChange={(open) => { if (!open) setDeletingNoteId(null) }}>
        <AlertDialogContent className="rounded-none"><AlertDialogHeader><AlertDialogTitle>Excluir anotação?</AlertDialogTitle><AlertDialogDescription>Esta anotação será removida da disciplina.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="rounded-none" onClick={() => { if (deletingNoteId) deleteNote(deletingNoteId); setDeletingNoteId(null) }}>Confirmar exclusão</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deletingAssessmentId)} onOpenChange={(open) => { if (!open) setDeletingAssessmentId(null) }}>
        <AlertDialogContent className="rounded-none"><AlertDialogHeader><AlertDialogTitle>Excluir avaliação?</AlertDialogTitle><AlertDialogDescription>O cálculo da média será atualizado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="rounded-none" onClick={() => { if (deletingAssessmentId) deleteAssessment(deletingAssessmentId); setDeletingAssessmentId(null) }}>Confirmar exclusão</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
