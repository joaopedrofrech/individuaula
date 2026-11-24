"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { apiRequest } from "@/lib/api-client"
import { useTurnstile } from "@/components/auth/turnstile-field"

// conduz o pedido e a redefinição sem revelar se um endereço está cadastrado.
export function PasswordRecoveryForm({ reset = false }: { reset?: boolean }) {
  const [value, setValue] = React.useState("")
  const [confirmation, setConfirmation] = React.useState("")
  const [error, setError] = React.useState("")
  const [done, setDone] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const challenge = useTurnstile(reset ? "reset_password" : "forgot_password")

  // envia o formulário e mantém erros compreensíveis sem expor detalhes internos.
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reset && value !== confirmation) { setError("As senhas não coincidem."); return }
    setError("")
    setLoading(true)
    try {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""
      await apiRequest(reset ? "/api/auth/reset-password" : "/api/auth/forgot-password", {
        method: "POST", body: reset ? { token, password: value, turnstileToken: challenge.token || undefined } : { email: value, turnstileToken: challenge.token || undefined },
      })
      setDone(true)
      if (reset) window.history.replaceState(null, "", "/redefinir-senha")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir. Tente novamente.")
    } finally { setLoading(false); challenge.reset() }
  }

  if (done) return <div className="space-y-5"><p className="text-sm text-foreground">{reset ? "Senha atualizada. Entre com sua nova senha." : "Se houver uma conta com esse e-mail, você receberá um link de recuperação."}</p><Link href="/login" className="text-sm font-semibold text-brand underline">Voltar para entrar</Link></div>
  return <form onSubmit={submit} className="flex flex-col gap-5">
    <Field><FieldLabel htmlFor="recovery-value">{reset ? "Nova senha" : "E-mail"}</FieldLabel><Input id="recovery-value" type={reset ? "password" : "email"} autoComplete={reset ? "new-password" : "email"} required minLength={reset ? 6 : undefined} value={value} onValueChange={setValue} /></Field>
    {reset && <Field><FieldLabel htmlFor="recovery-confirmation">Confirme a senha</FieldLabel><Input id="recovery-confirmation" type="password" autoComplete="new-password" required value={confirmation} onValueChange={setConfirmation} /></Field>}
    {challenge.field}
    {error && <FieldError>{error}</FieldError>}
    <Button disabled={loading || challenge.blocked} className="h-11 w-full rounded-none" type="submit">{loading ? "Aguarde..." : reset ? "Salvar nova senha" : "Enviar link"}</Button>
    <Link href="/login" className="text-center text-sm font-semibold text-brand underline-offset-4 hover:underline">Voltar para entrar</Link>
  </form>
}
