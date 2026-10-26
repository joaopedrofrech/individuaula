import { cn } from "@/lib/utils"

export function SchoolCrest({ className }: { className?: string }) {
  // exibe o brasão do Colégio Estadual Marechal Souza Dantas com texto alternativo acessível.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- imagem estática pequena, sem necessidade do otimizador.
    <img src="/souza-dantas.png" alt="Brasão do Colégio Estadual Marechal Souza Dantas" width={640} height={640} className={cn("h-auto w-full object-contain", className)} />
  )
}
