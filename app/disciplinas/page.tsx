import { DisciplineListScreen } from "@/components/study/discipline-list-screen"
import { ProtectedLayout } from "@/components/layout/protected-layout"

export default function DisciplinesPage() {
  // renderiza a lista de disciplinas dentro da área autenticada.
  return <ProtectedLayout><DisciplineListScreen /></ProtectedLayout>
}
