"use client"

import * as React from "react"
import { toast } from "sonner"
import { ApiError, apiRequest } from "@/lib/api-client"
import { createClientId, emptyClientState, reviveStudyPayload, reviveUser, type ClientState, type StudyPayloadRaw } from "@/lib/client-store"
import { addAssessment, addDiscipline, addNote, ownsDiscipline, patchAssessment, patchDiscipline, patchNote, removeAssessment, removeDiscipline, removeNote } from "@/lib/study-state"
import type { User } from "@/lib/types"
import {
  assessmentSchema,
  assessmentUpdateSchema,
  disciplineSchema,
  disciplineUpdateSchema,
  noteSchema,
  noteUpdateSchema,
  type AssessmentInput,
  type DisciplineInput,
  type LoginInput,
  type NoteInput,
  type ProfileInput,
  type RegistrationInput,
} from "@/lib/validators"

type AppContextValue = {
  state: ClientState
  user: User | null
  hydrated: boolean
  register: (input: RegistrationInput) => Promise<User>
  login: (input: LoginInput) => Promise<User>
  logout: () => Promise<boolean>
  updateProfile: (input: ProfileInput) => Promise<User>
  loadDemoData: () => void
  addDiscipline: (input: DisciplineInput) => void
  updateDiscipline: (id: string, input: Partial<DisciplineInput>) => void
  deleteDiscipline: (id: string) => void
  addNote: (disciplineId: string, input: NoteInput) => void
  updateNote: (id: string, input: Partial<NoteInput>) => void
  deleteNote: (id: string) => void
  addAssessment: (disciplineId: string, input: AssessmentInput) => void
  updateAssessment: (id: string, input: Partial<AssessmentInput>) => void
  deleteAssessment: (id: string) => void
}

const AppContext = React.createContext<AppContextValue | null>(null)

// garante um usuário logado antes de qualquer operação de escrita.
function requireUser(state: ClientState) {
  if (!state.user) throw new Error("Faça login para continuar.")
  return state.user
}

// garante que a disciplina existe e pertence ao usuário logado antes de vincular registros a ela.
function requireOwnedDiscipline(state: ClientState, disciplineId: string) {
  const user = state.user
  if (!user || !ownsDiscipline(state, user.id, disciplineId)) throw new Error("Disciplina não encontrada.")
  return user
}

const SESSION_RETRY_DELAYS = [400, 1200]

// consulta a sessão; só um erro de rede é tentado de novo, porque um 401 é a resposta certa do servidor ("não há sessão").
async function fetchSession() {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await apiRequest<{ user: User }>("/api/auth/session")
    } catch (error) {
      const delay = SESSION_RETRY_DELAYS[attempt]
      if (error instanceof ApiError || delay === undefined) throw error
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // centraliza a sessão e os dados do aluno; a fonte da verdade é o banco, acessado pela API do app.
  const [state, setState] = React.useState<ClientState>(emptyClientState)
  const [hydrated, setHydrated] = React.useState(false)
  // as gravações seguem em fila para que "criar" sempre chegue ao banco antes de "editar" o mesmo registro.
  const queue = React.useRef<Promise<void>>(Promise.resolve())
  const pending = React.useRef(0)

  React.useEffect(() => {
    // pede confirmação antes de fechar ou recarregar a página enquanto ainda há alterações indo para o banco.
    function warnWhileSaving(event: BeforeUnloadEvent) {
      if (pending.current > 0) event.preventDefault()
    }
    window.addEventListener("beforeunload", warnWhileSaving)
    return () => window.removeEventListener("beforeunload", warnWhileSaving)
  }, [])

  const loadStudyData = React.useCallback(async () => {
    const payload = await apiRequest<StudyPayloadRaw>("/api/data")
    setState((current) => ({ ...current, ...reviveStudyPayload(payload) }))
  }, [])

  React.useEffect(() => {
    // restaura a sessão a partir do cookie e carrega os dados do aluno antes de liberar as telas.
    let active = true
    async function restore() {
      try {
        const { user } = await fetchSession()
        if (!active) return
        setState((current) => ({ ...current, user: reviveUser(user as never) }))
        await loadStudyData()
      } catch {
        // sem sessão válida (ou sem rede) o aluno simplesmente vê a tela de login.
      } finally {
        if (active) setHydrated(true)
      }
    }
    void restore()
    return () => {
      active = false
    }
  }, [loadStudyData])

  React.useEffect(() => {
    // o botão "voltar" pode restaurar a página inteira do cache do navegador, com os dados antigos ainda na tela.
    // nesse caso a sessão é conferida de novo no servidor: se acabou (logout em outra aba, expirou), a tela é limpa.
    async function recheckSession(event: PageTransitionEvent) {
      if (!event.persisted) return
      try {
        await apiRequest("/api/auth/session")
        await loadStudyData()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) setState(emptyClientState)
      }
    }
    window.addEventListener("pageshow", recheckSession)
    return () => window.removeEventListener("pageshow", recheckSession)
  }, [loadStudyData])

  // grava a alteração no banco; se falhar, avisa e volta a mostrar o que realmente está salvo.
  const persist = React.useCallback((operation: () => Promise<unknown>) => {
    pending.current += 1
    queue.current = queue.current.then(async () => {
      try {
        await operation()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setState(emptyClientState)
          toast.error("Sua sessão expirou. Entre novamente.", { id: "session-expired" })
          return
        }
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar a alteração.", { id: "save-error" })
        await loadStudyData().catch(() => undefined)
      } finally {
        pending.current -= 1
      }
    })
  }, [loadStudyData])

  const value = React.useMemo<AppContextValue>(() => ({
    state,
    user: state.user,
    hydrated,
    // cria a conta no servidor, que já abre a sessão do aluno.
    async register(input) {
      const { user: raw } = await apiRequest<{ user: User }>("/api/auth/register", { method: "POST", body: input })
      const user = reviveUser(raw as never)
      setState({ ...emptyClientState, user })
      return user
    },
    // confere as credenciais no servidor e carrega os dados do aluno.
    async login(input) {
      const { user: raw } = await apiRequest<{ user: User }>("/api/auth/login", { method: "POST", body: input })
      const user = reviveUser(raw as never)
      setState({ ...emptyClientState, user })
      await loadStudyData()
      return user
    },
    // encerra a sessão no servidor e só então limpa a tela; se o servidor não confirmar, o aluno continua logado e é avisado,
    // porque sair "só na tela" deixaria a sessão valendo e o botão voltar poderia reabrir o painel.
    async logout() {
      try {
        await apiRequest("/api/auth/logout", { method: "POST" })
      } catch {
        toast.error("Não foi possível encerrar a sessão. Confira a conexão e tente sair de novo.", { id: "logout-error" })
        return false
      }
      setState(emptyClientState)
      return true
    },
    // atualiza o nome; o e-mail identifica a conta e não pode mudar por enquanto.
    async updateProfile(input) {
      const current = requireUser(state)
      if (input.email.toLowerCase() !== current.email) {
        throw new Error("O e-mail não pode ser alterado por enquanto.")
      }
      const { user: raw } = await apiRequest<{ user: User }>("/api/auth/profile", { method: "PATCH", body: { name: input.name } })
      const user = reviveUser(raw as never)
      setState((previous) => ({ ...previous, user }))
      return user
    },
    // pede ao servidor que grave os dados de exemplo e substitui o que está na tela pelo que foi salvo.
    loadDemoData() {
      if (!state.user || state.disciplines.some((item) => item.userId === state.user?.id)) return
      persist(async () => {
        const payload = await apiRequest<StudyPayloadRaw>("/api/demo-data", { method: "POST" })
        setState((current) => ({ ...current, ...reviveStudyPayload(payload) }))
      })
    },
    // adiciona uma disciplina validada ao espaço do usuário.
    addDiscipline(input) {
      const data = disciplineSchema.parse(input)
      const owner = requireUser(state)
      const id = createClientId("discipline")
      setState((current) => addDiscipline(current, owner.id, data, new Date(), id))
      persist(() => apiRequest("/api/disciplines", { method: "POST", body: { ...data, id } }))
    },
    // atualiza os dados visuais e textuais de uma disciplina existente.
    updateDiscipline(id, input) {
      if (!state.user) return
      const data = disciplineUpdateSchema.parse(input)
      const ownerId = state.user.id
      setState((current) => patchDiscipline(current, ownerId, id, data))
      persist(() => apiRequest(`/api/disciplines/${id}`, { method: "PATCH", body: data }))
    },
    // remove a disciplina e também seus registros dependentes.
    deleteDiscipline(id) {
      if (!state.user) return
      const ownerId = state.user.id
      setState((current) => removeDiscipline(current, ownerId, id))
      persist(() => apiRequest(`/api/disciplines/${id}`, { method: "DELETE" }))
    },
    // cria uma anotação vinculada a uma disciplina do usuário atual.
    addNote(disciplineId, input) {
      const data = noteSchema.parse(input)
      const owner = requireOwnedDiscipline(state, disciplineId)
      const id = createClientId("note")
      setState((current) => addNote(current, owner.id, disciplineId, data, new Date(), id))
      persist(() => apiRequest("/api/notes", { method: "POST", body: { ...data, id, disciplineId } }))
    },
    // altera o conteúdo de uma anotação sem afetar outras disciplinas.
    updateNote(id, input) {
      if (!state.user) return
      const data = noteUpdateSchema.parse(input)
      const ownerId = state.user.id
      setState((current) => patchNote(current, ownerId, id, data))
      // `undefined` some no JSON; `null` diz ao servidor para remover a imagem.
      const body = "imageDataUrl" in input ? { ...data, imageDataUrl: data.imageDataUrl ?? null } : data
      persist(() => apiRequest(`/api/notes/${id}`, { method: "PATCH", body }))
    },
    // remove uma anotação específica do espaço atual.
    deleteNote(id) {
      if (!state.user) return
      const ownerId = state.user.id
      setState((current) => removeNote(current, ownerId, id))
      persist(() => apiRequest(`/api/notes/${id}`, { method: "DELETE" }))
    },
    // registra uma avaliação; o schema já converte nota e peso para número.
    addAssessment(disciplineId, input) {
      const data = assessmentSchema.parse(input)
      const owner = requireOwnedDiscipline(state, disciplineId)
      const id = createClientId("assessment")
      setState((current) => addAssessment(current, owner.id, disciplineId, data, new Date(), id))
      persist(() => apiRequest("/api/assessments", { method: "POST", body: { ...data, id, disciplineId } }))
    },
    // edita uma avaliação mantendo os valores antigos que não foram enviados.
    updateAssessment(id, input) {
      if (!state.user) return
      const data = assessmentUpdateSchema.parse(input)
      const ownerId = state.user.id
      setState((current) => patchAssessment(current, ownerId, id, data))
      persist(() => apiRequest(`/api/assessments/${id}`, { method: "PATCH", body: data }))
    },
    // remove a avaliação e deixa a média pronta para ser recalculada.
    deleteAssessment(id) {
      if (!state.user) return
      const ownerId = state.user.id
      setState((current) => removeAssessment(current, ownerId, id))
      persist(() => apiRequest(`/api/assessments/${id}`, { method: "DELETE" }))
    },
  }), [hydrated, loadStudyData, persist, state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  // expõe o contexto e informa rapidamente quando o provider não foi configurado.
  const context = React.useContext(AppContext)
  if (!context) throw new Error("useApp precisa estar dentro de AppProvider.")
  return context
}
