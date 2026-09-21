"use client"

import { calculateWeightedAverage, getWeeklyStudyHours } from "@/lib/academics"
import { DashboardView, type DashboardData } from "@/components/dashboard-view"
import { useApp } from "@/components/app-provider"

export function DashboardScreen() {
  // transforma o estado acadêmico em métricas prontas para a visão do dashboard.
  const { state, user, addDiscipline, loadDemoData } = useApp()
  const disciplines = state.disciplines.filter((item) => item.userId === user?.id)
  const notes = state.notes.filter((item) => item.userId === user?.id)
  const assessments = state.assessments.filter((item) => item.userId === user?.id)
  const sessions = state.studySessions.filter((item) => item.userId === user?.id)
  const data: DashboardData = {
    userName: user?.name ?? "estudante",
    disciplines: disciplines.map((discipline) => {
      const assessments = state.assessments.filter((item) => item.disciplineId === discipline.id && item.userId === user?.id)
      return {
        id: discipline.id,
        name: discipline.name,
        description: discipline.description,
        color: discipline.color,
        icon: discipline.icon,
        average: assessments.length ? calculateWeightedAverage(assessments) : 0,
        noteCount: state.notes.filter((item) => item.disciplineId === discipline.id && item.userId === user?.id).length,
      }
    }),
    weeklyHours: getWeeklyStudyHours(sessions),
    completedTasks: notes.length + assessments.length,
    totalTasks: Math.max(notes.length + assessments.length + 3, 3),
  }

  return <DashboardView data={data} onAddDiscipline={addDiscipline} onLoadDemoData={loadDemoData} />
}
