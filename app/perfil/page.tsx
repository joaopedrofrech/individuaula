"use client"

import { UserRoundIcon } from "lucide-react"
import { ProfileForm } from "@/components/auth/profile-form"
import { useApp } from "@/components/app-provider"
import { ProtectedLayout } from "@/components/layout/protected-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function ProfileContent() {
  // mostra os dados pessoais do usuário e conecta o formulário ao provider.
  const { user, updateProfile } = useApp()
  if (!user) return null
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-8"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Conta</p><h1 className="mt-2 font-heading text-4xl font-black tracking-[-0.07em] text-brand">Meu perfil</h1><p className="mt-3 text-muted-foreground">Mantenha seus dados pessoais atualizados.</p></div><Card className="rounded-none shadow-none"><CardHeader><div className="grid size-12 place-items-center border border-border bg-signal text-brand"><UserRoundIcon /></div><CardTitle className="font-heading text-2xl font-black tracking-[-0.05em]">Dados pessoais</CardTitle><CardDescription><span className="font-semibold text-brand">{user.name}</span> · essas informações aparecem apenas no seu espaço.</CardDescription></CardHeader><CardContent><ProfileForm initialValues={{ name: user.name, email: user.email }} onSubmit={updateProfile} /></CardContent></Card></div>
}

export default function ProfilePage() {
  // mantém o perfil protegido pela mesma estrutura das demais áreas privadas.
  return <ProtectedLayout><ProfileContent /></ProtectedLayout>
}
