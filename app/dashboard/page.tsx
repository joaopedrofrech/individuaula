import { DashboardScreen } from "@/components/dashboard/dashboard-screen"
import { ProtectedLayout } from "@/components/layout/protected-layout"

export default function DashboardPage() {
  // entrega o painel principal protegido pela sessão do aluno.
  return <ProtectedLayout><DashboardScreen /></ProtectedLayout>
}
