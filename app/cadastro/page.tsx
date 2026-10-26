import { AuthLayout } from "@/components/auth/auth-layout"
import { RegistrationScreen } from "@/components/auth/auth-screens"

export default function RegistrationPage() {
  // renderiza a tela de criação de conta dentro da moldura de autenticação.
  return <AuthLayout title="Comece pelo seu ritmo." description="Crie seu espaço gratuito e tire seus estudos da cabeça para um lugar que você consegue acompanhar."><RegistrationScreen /></AuthLayout>
}
