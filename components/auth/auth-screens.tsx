"use client"

import { LoginForm } from "@/components/auth/login-form"
import { RegistrationForm } from "@/components/auth/registration-form"
import { useApp } from "@/components/app-provider"

// depois de entrar ou cadastrar, quem leva o aluno ao painel é o RedirectWhenLoggedIn (que usa `replace`),
// assim a tela de login não fica no histórico e o botão "voltar" não prende o aluno num vaivém.

export function LoginScreen() {
  // conecta o formulário de login ao estado da aplicação.
  const { login } = useApp()

  return <LoginForm onSubmit={async (input) => { await login(input) }} />
}

export function RegistrationScreen() {
  // conecta o cadastro à criação da conta e ao primeiro acesso.
  const { register } = useApp()

  return <RegistrationForm onSubmit={async (input) => { await register(input) }} />
}
