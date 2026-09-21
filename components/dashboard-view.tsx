"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRightIcon,
  BookOpenTextIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  Clock3Icon,
  Code2Icon,
  FlaskConicalIcon,
  LanguagesIcon,
  ListChecksIcon,
  Music2Icon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react"
import { calculateGeneralAverage, getPerformanceLabel } from "@/lib/academics"
import type { DisciplineInput } from "@/lib/validators"
import { DisciplineForm } from "@/components/study/discipline-form"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export type DashboardDiscipline = {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  average: number
  noteCount?: number
}

export type DashboardData = {
  userName: string
  disciplines: DashboardDiscipline[]
  weeklyHours: number[]
  completedTasks: number
  totalTasks: number
}

export const defaultDashboardData: DashboardData = {
  userName: "Ana Souza",
  disciplines: [
    { id: "math", name: "Matemática", description: "Funções e resolução de problemas.", color: "coral", icon: "calculator", average: 7.8, noteCount: 4 },
    { id: "web", name: "Desenvolvimento Web", description: "Interfaces, projetos e prática de código.", color: "lime", icon: "code", average: 8.5, noteCount: 7 },
  ],
  weeklyHours: [2, 3.5, 1.5, 4, 2.5, 1, 0],
  completedTasks: 7,
  totalTasks: 10,
}

const weekdayLabels = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

const disciplineIconMap = {
  book: BookOpenTextIcon,
  calculator: CalculatorIcon,
  code: Code2Icon,
  flask: FlaskConicalIcon,
  language: LanguagesIcon,
  music: Music2Icon,
}

const disciplineColorMap: Record<string, string> = {
  lime: "border-signal bg-signal text-brand",
  coral: "border-coral bg-coral text-coral-foreground",
  blue: "border-sky-400 bg-sky-400/15 text-sky-700 dark:border-sky-300 dark:text-sky-200",
  violet: "border-violet-400 bg-violet-400/15 text-violet-700 dark:border-violet-300 dark:text-violet-200",
  slate: "border-slate-400 bg-slate-400/15 text-slate-700 dark:border-slate-300 dark:text-slate-200",
  green: "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:border-emerald-300 dark:text-emerald-200",
}

// transforma o número em uma leitura curta e humana para o cabeçalho.
function firstName(name: string) {
  return name.split(" ")[0] || "estudante"
}

function formatAverage(value: number) {
  // mantém a média com uma casa decimal no padrão brasileiro.
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function formatHours(value: number) {
  // exibe as horas sem casas desnecessárias para o gráfico semanal.
  return value.toLocaleString("pt-BR", { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 1 })
}

function DisciplineIcon({ name, className }: { name?: string; className?: string }) {
  // escolhe o ícone da matéria e usa livro como fallback seguro.
  const Icon = disciplineIconMap[name as keyof typeof disciplineIconMap] ?? BookOpenTextIcon
  return <Icon className={className} aria-hidden="true" />
}

type DashboardViewProps = {
  data?: DashboardData
  onAddDiscipline?: (input: DisciplineInput) => void
  onLoadDemoData?: () => void
}

export function DashboardView({ data = defaultDashboardData, onAddDiscipline, onLoadDemoData }: DashboardViewProps) {
  // compõe os indicadores, disciplinas e ritmo da semana em uma única visão.
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const generalAverage = calculateGeneralAverage(data.disciplines.map((discipline) => discipline.average || null))
  const performance = getPerformanceLabel(generalAverage)
  const progress = data.totalTasks ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0
  const maxHours = Math.max(...data.weeklyHours, 1)
  const hasStudyData = data.weeklyHours.some((hours) => hours > 0)

  function handleAddDiscipline(input: DisciplineInput) {
    // salva a nova disciplina e fecha o construtor quando a ação termina.
    onAddDiscipline?.(input)
    setDialogOpen(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
      <section className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="grid size-7 place-items-center border border-border text-brand"><SparklesIcon className="size-4" /></span>
            <span>Resumo da semana</span>
          </div>
          <h1 className="font-heading text-4xl font-black tracking-[-0.07em] text-brand md:text-6xl">Bom dia, {firstName(data.userName)}.</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">Disciplinas, notas e próximos passos em um só lugar.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="h-11 rounded-none bg-brand text-brand-foreground hover:bg-brand/90" />}>
            <PlusIcon data-icon="inline-start" />
            Adicionar disciplina
          </DialogTrigger>
          <DialogContent className="max-h-[90svh] overflow-y-auto rounded-none sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova disciplina</DialogTitle>
              <DialogDescription>Monte um espaço com nome, cor, ícone e uma descrição curta para orientar seus estudos.</DialogDescription>
            </DialogHeader>
            <DisciplineForm onSubmit={handleAddDiscipline} />
          </DialogContent>
        </Dialog>
      </section>

      <section className="grid gap-px border border-border bg-border md:grid-cols-3">
        <Card className="rounded-none border-0 bg-background shadow-none">
          <CardHeader className="pb-3"><CardDescription>Média geral</CardDescription><CardTitle className="font-heading text-4xl font-black tracking-[-0.06em] text-brand">{formatAverage(generalAverage)}</CardTitle></CardHeader>
          <CardFooter className="gap-2 text-xs text-muted-foreground"><span className="size-2 bg-signal" /> desempenho {performance}</CardFooter>
        </Card>
        <Card className="rounded-none border-0 bg-background shadow-none">
          <CardHeader className="pb-3"><CardDescription>Disciplinas ativas</CardDescription><CardTitle className="font-heading text-4xl font-black tracking-[-0.06em] text-brand">{data.disciplines.length.toString().padStart(2, "0")}</CardTitle></CardHeader>
          <CardFooter className="gap-2 text-xs text-muted-foreground"><BookOpenTextIcon className="size-4" /> acompanhamento por matéria</CardFooter>
        </Card>
        <Card className="rounded-none border-0 bg-background shadow-none">
          <CardHeader className="pb-3"><CardDescription>Registros concluídos</CardDescription><CardTitle className="font-heading text-4xl font-black tracking-[-0.06em] text-brand">{data.completedTasks}<span className="text-lg font-medium text-muted-foreground">/{data.totalTasks}</span></CardTitle></CardHeader>
          <CardFooter className="flex-col items-stretch gap-2"><Progress value={progress} className="h-1 bg-muted" /><span className="text-xs text-muted-foreground">{progress}% do seu combinado</span></CardFooter>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Organização</p>
            <h2 className="mt-2 font-heading text-2xl font-black tracking-[-0.05em] text-brand">Minhas disciplinas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Abra uma matéria para continuar de onde parou.</p>
          </div>
          <Link href="/disciplinas" className="hidden items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline sm:flex">Ver todas <ArrowUpRightIcon className="size-4" /></Link>
        </div>
        {data.disciplines.length === 0 ? (
          <Empty className="min-h-72 rounded-none border border-dashed border-border bg-muted/20">
            <EmptyHeader><EmptyMedia variant="icon"><BookOpenTextIcon /></EmptyMedia><EmptyTitle>Comece cadastrando sua primeira disciplina</EmptyTitle><EmptyDescription>A partir dela você poderá registrar notas, anotações e conteúdos.</EmptyDescription></EmptyHeader>
            <EmptyContent className="flex-col gap-2 sm:flex-row">
              <Button className="rounded-none" onClick={() => setDialogOpen(true)}>Adicionar disciplina</Button>
              {onLoadDemoData && <Button variant="outline" className="rounded-none" onClick={onLoadDemoData}>Ver com dados de exemplo</Button>}
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-px border border-border bg-border md:grid-cols-2">
            {data.disciplines.map((discipline) => (
              <Card key={discipline.id} className="rounded-none border-0 border-t-4 bg-background shadow-none transition-colors hover:bg-muted/30" style={{ borderTopColor: discipline.color === "coral" ? "var(--coral)" : discipline.color === "lime" ? "var(--signal)" : "var(--border)" }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className={cn("grid size-11 place-items-center border", disciplineColorMap[discipline.color] ?? disciplineColorMap.slate)}><DisciplineIcon name={discipline.icon} className="size-5" /></div>
                    <div className="text-right"><div className="font-heading text-3xl font-black tracking-[-0.06em] text-brand">{formatAverage(discipline.average)}</div><div className="text-xs text-muted-foreground">média atual</div></div>
                  </div>
                  <Link href={`/disciplinas/${discipline.id}`} className="pt-2 font-heading text-xl font-black tracking-[-0.04em] text-brand underline-offset-4 hover:underline">{discipline.name}</Link>
                  <CardDescription className="line-clamp-2 min-h-10">{discipline.description || "Espaço para reunir seus estudos, notas e próximos passos."}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Progress value={discipline.average * 10} className="h-1 bg-muted" />
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{discipline.noteCount ?? 0} anotações</span><Link href={`/disciplinas/${discipline.id}`} className="font-semibold text-brand underline-offset-4 hover:underline">Abrir disciplina <ArrowUpRightIcon className="ml-1 inline size-3" /></Link></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-none border-border bg-card shadow-none">
          <CardHeader className="border-b border-border pb-5">
            <div className="flex items-start justify-between gap-4"><div><CardDescription>Ritmo da semana</CardDescription><CardTitle className="font-heading text-2xl font-black tracking-[-0.05em] text-brand">Sessões curtas, avanço constante.</CardTitle></div><CalendarDaysIcon className="size-5 text-muted-foreground" /></div>
          </CardHeader>
          <CardContent className="pt-6">
            {hasStudyData ? (
              <div className="flex h-44 items-end gap-3 border-b border-l border-border px-2 pb-0 pt-3 sm:gap-5" aria-label="Gráfico de horas estudadas por dia">
                {data.weeklyHours.map((hours, index) => (
                  <div key={weekdayLabels[index]} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div className="relative flex h-full w-full flex-1 items-end justify-center"><div className={cn("w-full max-w-10 bg-brand transition-all", hours === 0 ? "h-px bg-border" : "min-h-2")} style={{ height: `${hours === 0 ? 1 : (hours / maxHours) * 100}%` }} title={`${formatHours(hours)} horas`} /></div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{weekdayLabels[index]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-44 flex-col items-center justify-center border border-dashed border-border text-center"><Clock3Icon className="mb-3 size-6 text-muted-foreground" /><p className="text-sm font-semibold text-brand">Nenhuma sessão registrada nesta semana.</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Use os dados de exemplo ou registre seu ritmo quando a rotina começar.</p></div>
            )}
            <div className="mt-5 flex items-center justify-between text-sm"><span className="text-muted-foreground">Total estudado</span><span className="font-bold text-brand">{formatHours(data.weeklyHours.reduce((total, value) => total + value, 0))}h nesta semana</span></div>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border bg-brand text-brand-foreground shadow-none dark:bg-card dark:text-foreground">
          <CardHeader><CardDescription className="text-brand-foreground/60 dark:text-muted-foreground">Próximo passo</CardDescription><CardTitle className="font-heading text-2xl font-black tracking-[-0.05em]">Volte para uma nota antes de abrir outra aba.</CardTitle></CardHeader>
          <CardContent className="flex flex-1 flex-col justify-end gap-6"><Separator className="bg-brand-foreground/20 dark:bg-border" /><p className="max-w-sm text-sm leading-relaxed text-brand-foreground/70 dark:text-muted-foreground">Revisar uma anotação antiga por cinco minutos também conta como progresso.</p><Link href="/disciplinas" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-fit rounded-none bg-signal text-brand hover:bg-signal/90 dark:text-primary-foreground")}><ListChecksIcon data-icon="inline-start" />Abrir disciplinas</Link></CardContent>
        </Card>
      </section>

      <section className="grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center border border-border bg-signal text-brand"><CheckCircle2Icon className="size-5" /></span><div><h3 className="font-semibold text-brand">Estudo que cabe na rotina</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Anote, revise e acompanhe sua evolução sem transformar sua agenda em uma planilha.</p></div></div>
        <div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center border border-border bg-coral text-coral-foreground"><Clock3Icon className="size-5" /></span><div><h3 className="font-semibold text-brand">Seu histórico importa</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Cada nota e cada anotação constroem uma leitura mais honesta do seu caminho.</p></div></div>
      </section>
    </div>
  )
}
