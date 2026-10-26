"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const primary = "rounded-none bg-brand text-brand-foreground hover:bg-brand/90"

export function HeaderActions() {
  // no cabeçalho da home, quem já está logado vai direto ao painel em vez de ver "Entrar".
  const { hydrated, user } = useApp()

  if (hydrated && user) {
    return <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }), primary)}>Ir para o painel</Link>
  }
  return (
    <>
      <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden rounded-none sm:inline-flex")}>Entrar</Link>
      <Link href="/cadastro" className={cn(buttonVariants({ size: "sm" }), primary)}>Criar espaço</Link>
    </>
  )
}

export function HeroActions() {
  // nos botões principais, o aluno logado vê um único atalho para o painel.
  const { hydrated, user } = useApp()

  if (hydrated && user) {
    return (
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), primary, "h-12 px-6")}>Ir para o meu painel <ArrowRightIcon data-icon="inline-end" /></Link>
      </div>
    )
  }
  return (
    <div className="mt-9 flex flex-col gap-3 sm:flex-row">
      <Link href="/cadastro" className={cn(buttonVariants({ size: "lg" }), primary, "h-12 px-6")}>Começar agora <ArrowRightIcon data-icon="inline-end" /></Link>
      <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-none px-6")}>Já tenho uma conta</Link>
    </div>
  )
}
