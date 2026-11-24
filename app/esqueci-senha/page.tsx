import { AuthLayout } from "@/components/auth/auth-layout"
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form"

// apresenta o formulário para solicitar um link de recuperação.
export default function ForgotPasswordPage() {
  return <AuthLayout title="Recupere sua senha." description="Informe seu e-mail para receber um link seguro."><PasswordRecoveryForm /></AuthLayout>
}
