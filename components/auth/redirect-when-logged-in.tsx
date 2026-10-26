"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/app-provider"

// quem já está logado não precisa ver login nem cadastro: segue direto para o painel.
export function RedirectWhenLoggedIn() {
  const router = useRouter()
  const { hydrated, user } = useApp()

  React.useEffect(() => {
    if (hydrated && user) {
      router.replace("/dashboard")
    }
  }, [hydrated, router, user])

  return null
}
