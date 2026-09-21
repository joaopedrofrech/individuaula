import Link from "next/link"
import { ArrowUpRightIcon, BookOpenTextIcon, ChartNoAxesCombinedIcon, NotebookPenIcon } from "lucide-react"
import { BrandMark } from "@/components/layout/brand-mark"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export function AuthLayout({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  // organiza a moldura compartilhada pelas telas de entrada e recuperação.
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[0.82fr_1.18fr]">
      <section className="relative hidden overflow-hidden bg-brand p-10 text-brand-foreground lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute right-[-10%] bottom-[-12%] size-[30rem] border-[3rem] border-signal/15" />
        <div className="relative"><BrandMark inverse /><div className="mt-20 max-w-md"><p className="text-sm leading-relaxed text-brand-foreground/60">Uma rotina de estudos mais clara começa com um espaço que entende o seu ritmo.</p><h2 className="mt-6 font-heading text-5xl font-black leading-[0.95] tracking-[-0.08em]">Aprender também é perceber o caminho.</h2></div></div>
        <div className="relative grid gap-4 text-sm text-brand-foreground/70">
          <div className="flex items-center gap-3"><span className="grid size-9 place-items-center border border-brand-foreground/20 bg-brand-foreground/10"><BookOpenTextIcon className="size-4" /></span><span>disciplinas no seu lugar</span></div>
          <div className="flex items-center gap-3"><span className="grid size-9 place-items-center border border-brand-foreground/20 bg-brand-foreground/10"><NotebookPenIcon className="size-4" /></span><span>anotações que não se perdem</span></div>
          <div className="flex items-center gap-3"><span className="grid size-9 place-items-center border border-brand-foreground/20 bg-brand-foreground/10"><ChartNoAxesCombinedIcon className="size-4" /></span><span>médias que contam uma história</span></div>
        </div>
      </section>
      <section className="flex min-h-svh flex-col px-5 py-6 sm:px-10 lg:px-20 xl:px-28">
        <div className="flex items-center justify-between lg:justify-end"><div className="lg:hidden"><BrandMark compact /></div><ThemeToggle /></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="mb-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">IndividuAula</p><h1 className="mt-4 font-heading text-4xl font-black tracking-[-0.07em] text-brand">{title}</h1><p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p></div>
          {children}
          <Link href="/" className="mt-10 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-brand hover:underline">Voltar para a apresentação <ArrowUpRightIcon className="size-3" /></Link>
        </div>
      </section>
    </main>
  )
}
