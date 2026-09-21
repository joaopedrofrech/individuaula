"use client"

import * as React from "react"
import { assessmentSchema, disciplineSchema, loginSchema, noteSchema, profileSchema, registrationSchema } from "@/lib/validators"
import {
  CLIENT_STORAGE_KEY,
  createClientId,
  emptyClientState,
  parseClientState,
  serializeClientState,
  createSampleStudyData,
  type ClientState,
} from "@/lib/client-store"
import type { AssessmentInput, DisciplineInput, LoginInput, NoteInput, ProfileInput, RegistrationInput } from "@/lib/validators"
import type { User } from "@/lib/types"

type AppContextValue = {
  state: ClientState
  user: User | null
  hydrated: boolean
  register: (input: RegistrationInput) => Promise<User>
  login: (input: LoginInput) => Promise<User>
  logout: () => void
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

const encoder = new TextEncoder()

// mantém a credencial fora do estado visível da aplicação e pronta para a troca por Better Auth.
async function hashClientPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// cria estado imutável para que os componentes derivados renderizem só quando necessário.
function updateCurrentState(
  setState: React.Dispatch<React.SetStateAction<ClientState>>,
  update: (current: ClientState) => ClientState,
) {
  setState((current) => update(current))
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // centraliza autenticação, persistência local e operações acadêmicas do protótipo.
  const [state, setState] = React.useState<ClientState>(emptyClientState)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    // hidrata o estado salvo depois da montagem para evitar acesso ao localStorage no servidor.
    const timer = window.setTimeout(() => {
      const persistedState = parseClientState(window.localStorage.getItem(CLIENT_STORAGE_KEY))
      setState((current) => {
        // preserva uma ação feita antes do término da hidratação do armazenamento.
        if (current.user || current.accounts.length || current.disciplines.length || current.notes.length || current.assessments.length) {
          return current
        }
        return persistedState
      })
      setHydrated(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  React.useEffect(() => {
    // persiste cada alteração somente depois que a hidratação inicial terminou.
    if (hydrated) {
      window.localStorage.setItem(CLIENT_STORAGE_KEY, serializeClientState(state))
    }
  }, [hydrated, state])

  const value = React.useMemo<AppContextValue>(() => ({
    state,
    user: state.user,
    hydrated,
    // cria uma conta local e inicia a sessão do novo usuário.
    async register(input) {
      const data = registrationSchema.parse(input)
      const email = data.email.toLowerCase()
      if (state.accounts.some((account) => account.user.email === email)) {
        throw new Error("E-mail já cadastrado.")
      }
      const user: User = { id: createClientId("user"), name: data.name, email, createdAt: new Date() }
      const passwordHash = await hashClientPassword(data.password)
      updateCurrentState(setState, (current) => ({ ...current, user, accounts: [...current.accounts, { user, passwordHash }] }))
      return user
    },
    // confere credenciais locais e recupera a conta associada.
    async login(input) {
      const data = loginSchema.parse(input)
      const email = data.email.toLowerCase()
      const passwordHash = await hashClientPassword(data.password)
      const account = state.accounts.find((candidate) => candidate.user.email === email && candidate.passwordHash === passwordHash)
      if (!account) {
        throw new Error("Credenciais inválidas.")
      }
      updateCurrentState(setState, (current) => ({ ...current, user: account.user }))
      return account.user
    },
    // encerra a sessão sem remover os dados acadêmicos salvos.
    logout() {
      updateCurrentState(setState, (current) => ({ ...current, user: null }))
    },
    // atualiza os dados pessoais e mantém a conta sincronizada.
    async updateProfile(input) {
      const data = profileSchema.parse(input)
      if (!state.user) {
        throw new Error("Faça login para continuar.")
      }
      const email = data.email.toLowerCase()
      if (state.accounts.some((account) => account.user.id !== state.user?.id && account.user.email === email)) {
        throw new Error("E-mail já cadastrado.")
      }
      const updatedUser = { ...state.user, name: data.name, email }
      updateCurrentState(setState, (current) => ({
        ...current,
        user: updatedUser,
        accounts: current.accounts.map((account) => account.user.id === updatedUser.id ? { ...account, user: updatedUser } : account),
      }))
      return updatedUser
    },
    // carrega dados demonstrativos apenas quando o usuário ainda não tem disciplinas.
    loadDemoData() {
      if (!state.user || state.disciplines.some((item) => item.userId === state.user?.id)) {
        return
      }
      const sample = createSampleStudyData(state.user)
      updateCurrentState(setState, (current) => ({
        ...current,
        disciplines: [...current.disciplines, ...sample.disciplines],
        notes: [...current.notes, ...sample.notes],
        assessments: [...current.assessments, ...sample.assessments],
        studySessions: [...current.studySessions, ...sample.studySessions],
      }))
    },
    // adiciona uma disciplina validada ao espaço do usuário.
    addDiscipline(input) {
      const data = disciplineSchema.parse(input)
      if (!state.user) throw new Error("Faça login para continuar.")
      const timestamp = new Date()
      updateCurrentState(setState, (current) => ({
        ...current,
        disciplines: [...current.disciplines, { id: createClientId("discipline"), userId: state.user!.id, ...data, createdAt: timestamp, updatedAt: timestamp }],
      }))
    },
    // atualiza os dados visuais e textuais de uma disciplina existente.
    updateDiscipline(id, input) {
      if (!state.user) return
      updateCurrentState(setState, (current) => ({
        ...current,
        disciplines: current.disciplines.map((item) => item.id === id && item.userId === state.user?.id ? { ...item, ...input, updatedAt: new Date() } : item),
      }))
    },
    // remove a disciplina e também seus registros dependentes.
    deleteDiscipline(id) {
      if (!state.user) return
      updateCurrentState(setState, (current) => ({
        ...current,
        disciplines: current.disciplines.filter((item) => !(item.id === id && item.userId === state.user?.id)),
        notes: current.notes.filter((item) => item.disciplineId !== id),
        assessments: current.assessments.filter((item) => item.disciplineId !== id),
      }))
    },
    // cria uma anotação vinculada a uma disciplina do usuário atual.
    addNote(disciplineId, input) {
      const data = noteSchema.parse(input)
      if (!state.user || !state.disciplines.some((item) => item.id === disciplineId && item.userId === state.user?.id)) throw new Error("Disciplina não encontrada.")
      const timestamp = new Date()
      updateCurrentState(setState, (current) => ({ ...current, notes: [...current.notes, { id: createClientId("note"), userId: state.user!.id, disciplineId, ...data, createdAt: timestamp, updatedAt: timestamp }] }))
    },
    // altera o conteúdo de uma anotação sem afetar outras disciplinas.
    updateNote(id, input) {
      if (!state.user) return
      updateCurrentState(setState, (current) => ({ ...current, notes: current.notes.map((item) => item.id === id && item.userId === state.user?.id ? { ...item, ...input, updatedAt: new Date() } : item) }))
    },
    // remove uma anotação específica do espaço atual.
    deleteNote(id) {
      if (!state.user) return
      updateCurrentState(setState, (current) => ({ ...current, notes: current.notes.filter((item) => !(item.id === id && item.userId === state.user?.id)) }))
    },
    // registra uma avaliação e normaliza nota e peso para o cálculo acadêmico.
    addAssessment(disciplineId, input) {
      const data = assessmentSchema.parse(input)
      if (!state.user || !state.disciplines.some((item) => item.id === disciplineId && item.userId === state.user?.id)) throw new Error("Disciplina não encontrada.")
      const timestamp = new Date()
      updateCurrentState(setState, (current) => ({ ...current, assessments: [...current.assessments, { id: createClientId("assessment"), userId: state.user!.id, disciplineId, ...data, grade: Number(data.grade), weight: Number(data.weight), createdAt: timestamp, updatedAt: timestamp }] }))
    },
    // edita uma avaliação mantendo os valores antigos que não foram enviados.
    updateAssessment(id, input) {
      if (!state.user) return
      updateCurrentState(setState, (current) => ({ ...current, assessments: current.assessments.map((item) => item.id === id && item.userId === state.user?.id ? { ...item, ...input, grade: input.grade === undefined ? item.grade : Number(input.grade), weight: input.weight === undefined ? item.weight : Number(input.weight), updatedAt: new Date() } : item) }))
    },
    // remove a avaliação e deixa a média pronta para ser recalculada.
    deleteAssessment(id) {
      if (!state.user) return
      updateCurrentState(setState, (current) => ({ ...current, assessments: current.assessments.filter((item) => !(item.id === id && item.userId === state.user?.id)) }))
    },
  }), [hydrated, state, setState])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  // expõe o contexto e informa rapidamente quando o provider não foi configurado.
  const context = React.useContext(AppContext)
  if (!context) throw new Error("useApp precisa estar dentro de AppProvider.")
  return context
}
