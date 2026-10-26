import Link from "next/link"
import { AuthLayout } from "@/components/auth/auth-layout"
import { LoginScreen } from "@/components/auth/auth-screens"

export default function LoginPage() {
  // renderiza a entrada de usuário e o atalho para criar uma conta.
  return (
    <AuthLayout title="Que bom ver você." description="Entre para continuar organizando sua jornada de estudos.">
      <LoginScreen />
      <p className="mt-8 text-center text-sm text-muted-foreground">Ainda não tem uma conta? <Link href="/cadastro" className="font-semibold text-brand underline-offset-4 hover:underline">Criar agora</Link></p>
    </AuthLayout>
  )
}
