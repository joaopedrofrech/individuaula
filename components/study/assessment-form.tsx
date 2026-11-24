"use client"

import * as React from "react"
import { assessmentSchema, type AssessmentInput } from "@/lib/validators"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useTurnstile } from "@/components/auth/turnstile-field"

type AssessmentFormProps = {
  initialValues?: Partial<AssessmentInput>
  onSubmit: (input: AssessmentInput & { turnstileToken?: string }) => void | Promise<void>
  submitLabel?: string
}

export function AssessmentForm({ initialValues, onSubmit, submitLabel = "Salvar avaliação" }: AssessmentFormProps) {
  // controla os campos da avaliação e prepara os dados para o domínio acadêmico.
  const [values, setValues] = React.useState({ title: initialValues?.title ?? "", grade: initialValues?.grade?.toString() ?? "" })
  const [error, setError] = React.useState("")
  const challenge = useTurnstile("assessment")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // valida o nome e a nota antes de atualizar o histórico da disciplina.
    event.preventDefault()
    const parsed = assessmentSchema.safeParse({ ...values, grade: values.grade === "" ? undefined : values.grade })
    if (!parsed.success) {
      setError("Informe o nome e uma nota entre 0 e 10.")
      return
    }
    setError("")
    try { await onSubmit({ ...parsed.data, turnstileToken: challenge.token || undefined }) } finally { challenge.reset() }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="assessment-title">Nome da avaliação</FieldLabel>
          <Input id="assessment-title" value={values.title} onValueChange={(value) => setValues((current) => ({ ...current, title: value }))} placeholder="Ex.: Prova 1" />
        </Field>
          <Field>
            <FieldLabel htmlFor="assessment-grade">Nota</FieldLabel>
            <Input id="assessment-grade" type="number" inputMode="decimal" min="0" max="10" step="0.1" value={values.grade} onValueChange={(value) => setValues((current) => ({ ...current, grade: value }))} />
          </Field>
        <FieldError>{error}</FieldError>
      </FieldGroup>
      {challenge.field}
      <Button type="submit" className="rounded-none" disabled={challenge.blocked}>{submitLabel}</Button>
    </form>
  )
}
