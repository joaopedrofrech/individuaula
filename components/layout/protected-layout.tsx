"use client"

import { useRouter } from "next/navigation"
import * as React from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useApp } from "@/components/app-provider"
import { Skeleton } from "@/components/ui/skeleton"

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // bloqueia áreas privadas até que a sessão local tenha sido hidratada.
  const router = useRouter()
  const { hydrated, user } = useApp()

  React.useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login")
    }
  }, [hydrated, router, user])

  if (!hydrated || !user) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Skeleton className="h-10 w-32 rounded-none" />
          <Skeleton className="h-24 w-full rounded-none" />
        </div>
      </main>
    )
  }

  return <AppShell>{children}</AppShell>
}
