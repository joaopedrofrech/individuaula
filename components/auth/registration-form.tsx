"use client"

import * as React from "react"
import Link from "next/link"
import { registrationSchema, type RegistrationInput } from "@/lib/validators"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type RegistrationFormProps = {
  onSubmit: (input: RegistrationInput) => void | Promise<void>
}

export function RegistrationForm({ onSubmit }: RegistrationFormProps) {
  // concentra os dados e o estado de validação do cadastro.
  const [values, setValues] = React.useState({ name: "", email: "", password: "" })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitting, setSubmitting] = React.useState(false)

  function update(field: keyof typeof values, value: string) {
    // atualiza o campo alterado e remove o erro antigo daquele campo.
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: "" }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // valida o cadastro e encaminha os dados somente quando estiverem completos.
    event.preventDefault()
    const parsed = registrationSchema.safeParse(values)
    if (!parsed.success) {
      setErrors({
        name: values.name ? "Informe um nome válido." : "Nome é obrigatório.",
        email: values.email ? "Informe um e-mail válido." : "E-mail é obrigatório.",
        password: values.password ? "A senha precisa ter pelo menos 6 caracteres." : "Senha é obrigatória.",
      })
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(parsed.data)
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Não foi possível criar sua conta." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Nome</FieldLabel>
          <Input id="name" name="name" autoComplete="name" value={values.name} onValueChange={(value) => update("name", value)} aria-invalid={Boolean(errors.name)} />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="registration-email">E-mail</FieldLabel>
          <Input id="registration-email" name="email" type="email" autoComplete="email" value={values.email} onValueChange={(value) => update("email", value)} aria-invalid={Boolean(errors.email)} />
          <FieldError>{errors.email}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="registration-password">Senha</FieldLabel>
          <Input id="registration-password" name="password" type="password" autoComplete="new-password" value={values.password} onValueChange={(value) => update("password", value)} aria-invalid={Boolean(errors.password)} />
          <FieldError>{errors.password}</FieldError>
        </Field>
      </FieldGroup>
      {errors.form && <FieldError>{errors.form}</FieldError>}
      <Button type="submit" className="h-11 w-full rounded-none" disabled={submitting}>
        {submitting ? "Criando conta..." : "Criar conta"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta? <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">Entrar</Link>
      </p>
    </form>
  )
}
