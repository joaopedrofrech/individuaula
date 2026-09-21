"use client"

import * as React from "react"
import { profileSchema, type ProfileInput } from "@/lib/validators"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function ProfileForm({ initialValues, onSubmit }: { initialValues: ProfileInput; onSubmit: (input: ProfileInput) => void | Promise<unknown> }) {
  // controla a edição dos dados pessoais e o retorno de salvamento.
  const [values, setValues] = React.useState(initialValues)
  const [error, setError] = React.useState("")
  const [saved, setSaved] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // valida e persiste o perfil antes de exibir a confirmação.
    event.preventDefault()
    const parsed = profileSchema.safeParse(values)
    if (!parsed.success) {
      setError("Confira seu nome e e-mail.")
      return
    }
    setError("")
    await onSubmit(parsed.data)
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(error)}><FieldLabel htmlFor="profile-name">Nome</FieldLabel><Input id="profile-name" value={values.name} onValueChange={(value) => { setSaved(false); setValues((current) => ({ ...current, name: value })) }} /><FieldError>{error}</FieldError></Field>
        <Field><FieldLabel htmlFor="profile-email">E-mail</FieldLabel><Input id="profile-email" type="email" value={values.email} onValueChange={(value) => { setSaved(false); setValues((current) => ({ ...current, email: value })) }} /></Field>
      </FieldGroup>
      <div className="flex items-center gap-4"><Button type="submit" className="rounded-none">Salvar alterações</Button>{saved && <span role="status" className="text-sm font-semibold text-brand">Alterações salvas.</span>}</div>
    </form>
  )
}
