import { DisciplineDetailScreen } from "@/components/study/discipline-detail-screen"
import { ProtectedLayout } from "@/components/layout/protected-layout"

export default async function DisciplinePage({ params }: { params: Promise<{ id: string }> }) {
  // resolve o identificador da rota e abre o espaço de estudo correspondente.
  const { id } = await params
  return <ProtectedLayout><DisciplineDetailScreen disciplineId={id} /></ProtectedLayout>
}
