"use client"

import * as React from "react"
import Script from "next/script"

type TurnstileApi = { render: (element: HTMLElement, options: Record<string, unknown>) => string; reset: (id: string) => void; remove: (id: string) => void }
declare global { interface Window { turnstile?: TurnstileApi } }

// prepara o widget com a chave pública obtida do servidor e renova o token a cada tentativa.
export function useTurnstile(action: string) {
  const [siteKey, setSiteKey] = React.useState<string | null>(null)
  const [token, setToken] = React.useState("")
  const [ready, setReady] = React.useState(false)
  const container = React.useRef<HTMLDivElement>(null)
  const widget = React.useRef<string | null>(null)

  React.useEffect(() => {
    let active = true
    fetch("/api/turnstile-config", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("configuração indisponível")
      return response.json() as Promise<{ siteKey: string | null }>
    }).then((config) => { if (active) setSiteKey(config.siteKey) }).catch(() => { if (active) setSiteKey(null) })
    return () => { active = false }
  }, [])

  React.useEffect(() => {
    if (!siteKey || !ready || !container.current || !window.turnstile) return
    const api = window.turnstile
    const id = api.render(container.current, { sitekey: siteKey, action, callback: setToken, "expired-callback": () => setToken(""), "error-callback": () => setToken("") })
    widget.current = id
    return () => { api.remove(id); widget.current = null }
  }, [siteKey, ready, action])

  // impede que um token já consumido seja reutilizado numa nova tentativa.
  function reset() {
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current)
    setToken("")
  }
  const field = siteKey ? <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} /><div ref={container} /></> : null
  return { token, field, reset, blocked: Boolean(siteKey && !token) }
}
