"use client"

import * as React from "react"
import { assessmentSchema, type AssessmentInput } from "@/lib/validators"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type AssessmentFormProps = {
  initialValues?: Partial<AssessmentInput>
  onSubmit: (input: AssessmentInput) => void | Promise<void>
  submitLabel?: string
}

export function AssessmentForm({ initialValues, onSubmit, submitLabel = "Salvar avaliação" }: AssessmentFormProps) {
  // controla os campos da avaliação e prepara os dados para o domínio acadêmico.
  const [values, setValues] = React.useState({ title: initialValues?.title ?? "", grade: initialValues?.grade?.toString() ?? "", weight: initialValues?.weight?.toString() ?? "" })
  const [error, setError] = React.useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // valida nota e peso antes de atualizar o histórico da disciplina.
    event.preventDefault()
    const parsed = assessmentSchema.safeParse(values)
    if (!parsed.success) {
      setError("Informe nome, nota entre 0 e 10 e peso maior que zero.")
      return
    }
    setError("")
    await onSubmit(parsed.data)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="assessment-title">Nome da avaliação</FieldLabel>
          <Input id="assessment-title" value={values.title} onValueChange={(value) => setValues((current) => ({ ...current, title: value }))} placeholder="Ex.: Prova 1" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="assessment-grade">Nota</FieldLabel>
            <Input id="assessment-grade" type="number" inputMode="decimal" min="0" max="10" step="0.1" value={values.grade} onValueChange={(value) => setValues((current) => ({ ...current, grade: value }))} />
          </Field>
          <Field>
            <FieldLabel htmlFor="assessment-weight">Peso</FieldLabel>
            <Input id="assessment-weight" type="number" inputMode="decimal" min="0.1" max="100" step="0.1" value={values.weight} onValueChange={(value) => setValues((current) => ({ ...current, weight: value }))} />
          </Field>
        </div>
        <FieldError>{error}</FieldError>
      </FieldGroup>
      <Button type="submit" className="rounded-none">{submitLabel}</Button>
    </form>
  )
}
