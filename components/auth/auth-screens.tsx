"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { RegistrationForm } from "@/components/auth/registration-form"
import { useApp } from "@/components/app-provider"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { passwordResetRequestSchema } from "@/lib/validators"

export function LoginScreen() {
  // conecta o formulário de login ao estado da aplicação e à navegação.
  const router = useRouter()
  const { login } = useApp()

  // direciona o aluno para o painel depois que as credenciais são aceitas.
  async function handleLogin(input: React.ComponentProps<typeof LoginForm>["onSubmit"] extends (value: infer Value) => unknown ? Value : never) {
    await login(input)
    router.push("/dashboard")
  }

  return <LoginForm onSubmit={handleLogin} />
}

export function RegistrationScreen() {
  // conecta o cadastro à criação da conta local e ao primeiro acesso.
  const router = useRouter()
  const { register } = useApp()

  // abre o painel assim que o cadastro termina com sucesso.
  async function handleRegistration(input: React.ComponentProps<typeof RegistrationForm>["onSubmit"] extends (value: infer Value) => unknown ? Value : never) {
    await register(input)
    router.push("/dashboard")
  }

  return <RegistrationForm onSubmit={handleRegistration} />
}

export function PasswordRecoveryScreen() {
  // mantém o pedido de recuperação neutro para não revelar contas existentes.
  const [email, setEmail] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [error, setError] = React.useState("")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // valida o e-mail e apresenta sempre uma resposta segura ao usuário.
    event.preventDefault()
    const parsed = passwordResetRequestSchema.safeParse({ email })
    if (!parsed.success) {
      setError(email ? "Informe um e-mail válido." : "E-mail é obrigatório.")
      return
    }
    setError("")
    setMessage("Se o e-mail estiver cadastrado, você receberá as instruções para recuperar sua senha.")
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="recovery-email">E-mail</FieldLabel>
          <Input id="recovery-email" type="email" autoComplete="email" value={email} onValueChange={(value) => { setEmail(value); setError("") }} />
          <FieldError>{error}</FieldError>
          <FieldDescription>Não revelamos se o endereço está cadastrado.</FieldDescription>
        </Field>
      </FieldGroup>
      <Button type="submit" className="h-11 rounded-none">Enviar instruções</Button>
      {message && <p role="status" className="border border-signal bg-signal/20 p-3 text-sm leading-relaxed text-brand">{message}</p>}
    </form>
  )
}
