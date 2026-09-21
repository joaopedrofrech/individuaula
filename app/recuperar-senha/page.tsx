import { AuthLayout } from "@/components/auth/auth-layout"
import { PasswordRecoveryScreen } from "@/components/auth/auth-screens"

export default function PasswordRecoveryPage() {
  // disponibiliza o fluxo neutro de recuperação de acesso.
  return <AuthLayout title="Vamos recuperar o acesso." description="Digite seu e-mail e enviaremos os próximos passos, sem expor seus dados."><PasswordRecoveryScreen /></AuthLayout>
}
