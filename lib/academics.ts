import type { StudySession } from "@/lib/types";

export type WeightedGrade = {
  grade: number;
  weight: number;
};

// arredonda resultados acadêmicos para a mesma precisão exibida na interface.
function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateWeightedAverage(grades: WeightedGrade[]) {
  // valida os pesos e calcula a média proporcional de cada avaliação.
  if (grades.length === 0) {
    return 0;
  }

  const validGrades = grades.filter((item) => item.weight > 0);
  const totalWeight = validGrades.reduce((total, item) => total + item.weight, 0);

  if (totalWeight === 0) {
    throw new Error("A média precisa de pelo menos um peso positivo.");
  }

  const total = validGrades.reduce((sum, item) => sum + item.grade * item.weight, 0);
  return roundToTwo(total / totalWeight);
}

export function calculateGeneralAverage(averages: Array<number | null | undefined>) {
  // remove disciplinas sem nota e consolida o resultado geral do aluno.
  const validAverages = averages.filter((average): average is number => average !== null && average !== undefined);

  if (validAverages.length === 0) {
    return 0;
  }

  return roundToTwo(validAverages.reduce((total, average) => total + average, 0) / validAverages.length);
}

export function getPerformanceLabel(average: number) {
  // traduz a média num estado curto para os indicadores do painel.
  if (average <= 0) {
    return "sem dados";
  }

  if (average >= 9) {
    return "excelente";
  }

  if (average >= 7) {
    return "bom";
  }

  return "atenção";
}

// agrupa as sessões da semana atual para alimentar o gráfico do dashboard.
export function getWeeklyStudyHours(sessions: StudySession[], referenceDate = new Date()) {
  const reference = new Date(referenceDate)
  const day = reference.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(reference)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(reference.getDate() + mondayOffset)

  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(monday)
    start.setDate(monday.getDate() + index)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    const minutes = sessions
      .filter((session) => session.date >= start && session.date < end)
      .reduce((total, session) => total + session.minutes, 0)
    return Math.round((minutes / 60) * 10) / 10
  })
}
