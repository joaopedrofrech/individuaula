"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  // oferece a troca entre os temas claro e escuro sem piscar na hidratação.
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // espera a montagem no cliente antes de ler o tema resolvido.
    const timer = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? "Usar modo claro" : "Usar modo escuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon data-icon="inline-start" /> : <MoonIcon data-icon="inline-start" />}
      <span className="sr-only">Alternar tema</span>
    </Button>
  )
}
