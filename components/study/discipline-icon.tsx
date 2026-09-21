import { BookOpenTextIcon, CalculatorIcon, Code2Icon, FlaskConicalIcon, LanguagesIcon, Music2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

const disciplineIcons = {
  book: BookOpenTextIcon,
  calculator: CalculatorIcon,
  code: Code2Icon,
  flask: FlaskConicalIcon,
  language: LanguagesIcon,
  music: Music2Icon,
}

// mantém a representação visual da disciplina igual no dashboard e no caderno.
export function DisciplineIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = disciplineIcons[name as keyof typeof disciplineIcons] ?? BookOpenTextIcon
  return <Icon className={cn(className)} aria-hidden="true" />
}
