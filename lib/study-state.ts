import { calculateWeightedAverage } from "@/lib/academics"
import { createClientId } from "@/lib/client-store"
import { noteText } from "@/lib/notes"
import type { Assessment, Discipline, Note } from "@/lib/types"
import type { z } from "zod"
import type { assessmentSchema, assessmentUpdateSchema, disciplineSchema, disciplineUpdateSchema, noteSchema, noteUpdateSchema } from "@/lib/validators"

// os dados acadêmicos que as regras abaixo transformam; qualquer estado maior (com conta e sessão) também serve.
export type StudyData = { disciplines: Discipline[]; notes: Note[]; assessments: Assessment[] }

// os dados já passaram pelos schemas do Zod, então estas funções só aplicam as regras de domínio e de posse.
type DisciplineData = z.output<typeof disciplineSchema>
type NoteData = z.output<typeof noteSchema>
type AssessmentData = z.output<typeof assessmentSchema>

const isOwnedBy = (userId: string) => (record: { userId: string }) => record.userId === userId

// confirma que a disciplina existe e pertence ao usuário antes de vincular qualquer registro a ela.
export function ownsDiscipline(state: StudyData, userId: string, disciplineId: string) {
  return state.disciplines.some((item) => item.id === disciplineId && item.userId === userId)
}

export function addDiscipline<S extends StudyData>(state: S, userId: string, data: DisciplineData, now = new Date(), id = createClientId("discipline")): S {
  const discipline: Discipline = { id, userId, ...data, createdAt: now, updatedAt: now }
  return { ...state, disciplines: [...state.disciplines, discipline] }
}

export function patchDiscipline<S extends StudyData>(state: S, userId: string, id: string, data: z.output<typeof disciplineUpdateSchema>, now = new Date()): S {
  return { ...state, disciplines: state.disciplines.map((item) => (item.id === id && item.userId === userId ? { ...item, ...data, updatedAt: now } : item)) }
}

// remove a disciplina e, junto com ela, as anotações e avaliações do mesmo dono, sem deixar registros órfãos.
export function removeDiscipline<S extends StudyData>(state: S, userId: string, id: string): S {
  if (!ownsDiscipline(state, userId, id)) {
    return state
  }
  return {
    ...state,
    disciplines: state.disciplines.filter((item) => item.id !== id),
    notes: state.notes.filter((item) => item.disciplineId !== id),
    assessments: state.assessments.filter((item) => item.disciplineId !== id),
  }
}

export function addNote<S extends StudyData>(state: S, userId: string, disciplineId: string, data: NoteData, now = new Date(), id = createClientId("note")): S {
  const note: Note = { id, userId, disciplineId, ...data, createdAt: now, updatedAt: now }
  return { ...state, notes: [...state.notes, note] }
}

export function patchNote<S extends StudyData>(state: S, userId: string, id: string, data: z.output<typeof noteUpdateSchema>, now = new Date()): S {
  return { ...state, notes: state.notes.map((item) => (item.id === id && item.userId === userId ? { ...item, ...data, updatedAt: now } : item)) }
}

export function removeNote<S extends StudyData>(state: S, userId: string, id: string): S {
  return { ...state, notes: state.notes.filter((item) => !(item.id === id && item.userId === userId)) }
}

export function addAssessment<S extends StudyData>(state: S, userId: string, disciplineId: string, data: AssessmentData, now = new Date(), id = createClientId("assessment")): S {
  const assessment: Assessment = { id, userId, disciplineId, ...data, createdAt: now, updatedAt: now }
  return { ...state, assessments: [...state.assessments, assessment] }
}

export function patchAssessment<S extends StudyData>(state: S, userId: string, id: string, data: z.output<typeof assessmentUpdateSchema>, now = new Date()): S {
  return { ...state, assessments: state.assessments.map((item) => (item.id === id && item.userId === userId ? { ...item, ...data, updatedAt: now } : item)) }
}

export function removeAssessment<S extends StudyData>(state: S, userId: string, id: string): S {
  return { ...state, assessments: state.assessments.filter((item) => !(item.id === id && item.userId === userId)) }
}

export function listDisciplines(state: StudyData, userId: string) {
  return state.disciplines.filter(isOwnedBy(userId))
}

export function listNotes(state: StudyData, userId: string, disciplineId: string) {
  return state.notes.filter((note) => note.userId === userId && note.disciplineId === disciplineId)
}

export function listAssessments(state: StudyData, userId: string, disciplineId: string) {
  return state.assessments.filter((item) => item.userId === userId && item.disciplineId === disciplineId)
}

// pesquisa título e conteúdo sem considerar a marcação HTML do editor nem maiúsculas.
export function searchNotes(state: StudyData, userId: string, disciplineId: string, query: string) {
  const normalized = query.trim().toLocaleLowerCase()
  const notes = listNotes(state, userId, disciplineId)
  if (!normalized) {
    return notes
  }
  return notes.filter((note) => `${note.title} ${noteText(note.content)}`.toLocaleLowerCase().includes(normalized))
}

export function disciplineAverage(state: StudyData, userId: string, disciplineId: string) {
  return calculateWeightedAverage(listAssessments(state, userId, disciplineId))
}
