import { AuthLayout } from "@/components/auth/auth-layout"
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form"

// apresenta o formulário que usa o link temporário enviado por e-mail.
export default function ResetPasswordPage() {
  return <AuthLayout title="Crie uma nova senha." description="Escolha uma senha para voltar ao seu espaço."><PasswordRecoveryForm reset /></AuthLayout>
}
