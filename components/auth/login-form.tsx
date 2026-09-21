"use client"

import * as React from "react"
import Link from "next/link"
import { loginSchema, type LoginInput } from "@/lib/validators"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type LoginFormProps = {
  onSubmit: (input: LoginInput) => void | Promise<void>
  submitLabel?: string
}

export function LoginForm({ onSubmit, submitLabel = "Entrar" }: LoginFormProps) {
  // mantém os campos, erros e estado de envio da tela de login.
  const [values, setValues] = React.useState({ email: "", password: "" })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitting, setSubmitting] = React.useState(false)

  function update(field: "email" | "password", value: string) {
    // atualiza um campo e limpa somente o erro relacionado a ele.
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: "" }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // valida os dados antes de chamar a ação externa do formulário.
    event.preventDefault()
    const parsed = loginSchema.safeParse(values)
    if (!parsed.success) {
      setErrors({
        email: values.email ? "Informe um e-mail válido." : "E-mail é obrigatório.",
        password: values.password ? "Confira sua senha." : "Senha é obrigatória.",
      })
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(parsed.data)
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Não foi possível entrar." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" value={values.email} onValueChange={(value) => update("email", value)} aria-invalid={Boolean(errors.email)} />
          <FieldError>{errors.email}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <Link href="/recuperar-senha" className="text-xs font-semibold text-brand underline-offset-4 hover:underline">Esqueci minha senha</Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" value={values.password} onValueChange={(value) => update("password", value)} aria-invalid={Boolean(errors.password)} />
          <FieldError>{errors.password}</FieldError>
        </Field>
      </FieldGroup>
      {errors.form && <FieldError>{errors.form}</FieldError>}
      <Button type="submit" className="h-11 w-full rounded-none" disabled={submitting}>
        {submitting ? "Entrando..." : submitLabel}
      </Button>
      <FieldDescription className="text-center">Seus dados ficam associados somente ao seu espaço de estudos.</FieldDescription>
    </form>
  )
}
