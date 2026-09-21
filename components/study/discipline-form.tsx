"use client"

import * as React from "react"
import { BookOpenTextIcon, CalculatorIcon, Code2Icon, FlaskConicalIcon, LanguagesIcon, Music2Icon } from "lucide-react"
import { disciplineSchema, type DisciplineInput } from "@/lib/validators"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type DisciplineFormProps = {
  initialValues?: Partial<DisciplineInput>
  onSubmit: (input: DisciplineInput) => void | Promise<void>
  submitLabel?: string
}

const colorOptions = [
  { value: "lime", label: "Lima", className: "bg-signal" },
  { value: "coral", label: "Coral", className: "bg-coral" },
  { value: "blue", label: "Azul", className: "bg-sky-400" },
  { value: "violet", label: "Violeta", className: "bg-violet-400" },
  { value: "slate", label: "Ardósia", className: "bg-slate-500" },
] as const

const iconOptions = [
  { value: "book", label: "Livro", Icon: BookOpenTextIcon },
  { value: "calculator", label: "Calculadora", Icon: CalculatorIcon },
  { value: "code", label: "Código", Icon: Code2Icon },
  { value: "flask", label: "Laboratório", Icon: FlaskConicalIcon },
  { value: "language", label: "Idiomas", Icon: LanguagesIcon },
  { value: "music", label: "Música", Icon: Music2Icon },
] as const

// cria uma prévia simples para a pessoa entender o espaço antes de salvar.
function DisciplinePreview({ values }: { values: DisciplineInput }) {
  const selectedColor = colorOptions.find((option) => option.value === values.color) ?? colorOptions[0]
  const selectedIcon = iconOptions.find((option) => option.value === values.icon) ?? iconOptions[0]
  const description = values.description ?? ""
  const Icon = selectedIcon.Icon

  return (
    <div className="border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"><span>prévia do espaço</span><span>como aparece no painel</span></div>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center border border-border", selectedColor.className)}><Icon className="size-5" /></span>
        <div className="min-w-0"><p className="truncate font-heading text-lg font-black tracking-[-0.04em] text-brand">{values.name.trim() || "Nome da disciplina"}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description.trim() || "Uma descrição curta ajuda a lembrar o foco desta matéria."}</p></div>
      </div>
    </div>
  )
}

export function DisciplineForm({ initialValues, onSubmit, submitLabel = "Salvar disciplina" }: DisciplineFormProps) {
  // reúne os dados visuais e textuais usados para criar ou editar uma disciplina.
  const [values, setValues] = React.useState<DisciplineInput>({
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    color: (initialValues?.color as DisciplineInput["color"]) ?? "lime",
    icon: (initialValues?.icon as DisciplineInput["icon"]) ?? "book",
  })
  const [error, setError] = React.useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // valida a configuração da disciplina antes de enviá-la ao estado principal.
    event.preventDefault()
    const parsed = disciplineSchema.safeParse(values)
    if (!parsed.success) {
      setError(values.name.trim() ? "Confira os dados da disciplina." : "Nome da disciplina é obrigatório.")
      return
    }
    setError("")
    await onSubmit(parsed.data)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(error && !values.name.trim())}>
          <FieldLabel htmlFor="discipline-name">Nome da disciplina</FieldLabel>
          <Input id="discipline-name" value={values.name} onValueChange={(value) => setValues((current) => ({ ...current, name: value }))} placeholder="Ex.: Desenvolvimento Web" aria-invalid={Boolean(error && !values.name.trim())} />
          <FieldError>{error && !values.name.trim() ? error : ""}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="discipline-description">Descrição curta</FieldLabel>
          <Textarea id="discipline-description" value={values.description ?? ""} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} placeholder="Ex.: projetos, conceitos e exercícios da matéria" maxLength={280} className="min-h-20 resize-none" />
          <FieldDescription>Use uma frase para lembrar o foco desta disciplina.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Cor de destaque</FieldLabel>
          <div role="radiogroup" aria-label="Cor de destaque" className="flex flex-wrap gap-2">
            {colorOptions.map((option) => <Button key={option.value} type="button" variant="outline" size="sm" aria-label={option.label} aria-pressed={values.color === option.value} onClick={() => setValues((current) => ({ ...current, color: option.value }))} className={cn("h-9 rounded-none gap-2", values.color === option.value && "border-brand bg-muted font-bold")}><span className={cn("size-3 border border-current", option.className)} />{option.label}</Button>)}
          </div>
        </Field>
        <Field>
          <FieldLabel>Ícone da disciplina</FieldLabel>
          <div role="radiogroup" aria-label="Ícone da disciplina" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {iconOptions.map(({ value, label, Icon }) => <Button key={value} type="button" variant="outline" aria-label={label} aria-pressed={values.icon === value} onClick={() => setValues((current) => ({ ...current, icon: value }))} className={cn("h-16 rounded-none flex-col gap-1 text-xs", values.icon === value && "border-brand bg-muted text-brand")}><Icon className="size-5" /><span>{label}</span></Button>)}
          </div>
        </Field>
      </FieldGroup>
      <DisciplinePreview values={values} />
      <Button type="submit" className="rounded-none">{submitLabel}</Button>
    </form>
  )
}
