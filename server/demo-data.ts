import type { Assessment, Discipline, Note, StudySession } from "@/lib/types";

// monta os dados de exemplo de um usuário; é a mesma carga que o botão "Ver com dados de exemplo" grava no banco.
export function createSampleStudyData(userId: string, now = new Date()) {
  const idFor = (name: string) => `${userId}-demo-${name}`;
  const disciplines: Discipline[] = [
    { id: idFor("web"), userId, name: "Desenvolvimento Web", description: "Projetos, interfaces e prática de código para a web.", color: "lime", icon: "code", createdAt: now, updatedAt: now },
    { id: idFor("math"), userId, name: "Matemática", description: "Funções, raciocínio e resolução de problemas.", color: "coral", icon: "calculator", createdAt: now, updatedAt: now },
  ];
  const assessments: Assessment[] = [
    { id: idFor("web-assessment"), userId, disciplineId: idFor("web"), title: "Projeto parcial", grade: 8.5, weight: 1, createdAt: now, updatedAt: now },
    { id: idFor("math-assessment"), userId, disciplineId: idFor("math"), title: "Lista 01", grade: 7.8, weight: 1, createdAt: now, updatedAt: now },
  ];
  const notes: Note[] = [
    { id: idFor("note-web"), userId, disciplineId: idFor("web"), title: "Estrutura de uma página", content: "<p>Uma interface clara começa com <strong>HTML semântico</strong> e uma hierarquia que ajuda a pessoa a encontrar o que procura.</p>", createdAt: now, updatedAt: now },
    { id: idFor("note-math"), userId, disciplineId: idFor("math"), title: "Como revisar funções", content: "<p>Revisar o conceito, resolver um exemplo e explicar com as próprias palavras ajuda a fixar o assunto.</p>", createdAt: now, updatedAt: now },
  ];

  // a semana de estudo começa na segunda-feira da semana atual.
  const day = now.getDay();
  const monday = new Date(now);
  monday.setHours(9, 0, 0, 0);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  const minutesByDay = [55, 80, 35, 95, 60, 40, 0];
  const studySessions: StudySession[] = minutesByDay.map((minutes, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { id: idFor(`session-${index}`), userId, date, minutes };
  });

  return { disciplines, notes, assessments, studySessions };
}
