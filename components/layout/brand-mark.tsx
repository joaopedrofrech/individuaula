import Link from "next/link"
import { cn } from "@/lib/utils"

export function BrandMark({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  // apresenta o monograma e o nome da marca em versões clara, escura e compacta.
  return (
    <Link href="/" className={cn("group flex items-center gap-3", inverse ? "text-sidebar-foreground" : "text-foreground")}>
      <span className="grid size-10 place-items-center border border-current bg-signal font-black tracking-[-0.08em] text-brand transition-transform group-hover:-translate-y-0.5">Au</span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-heading text-lg font-black tracking-[-0.06em]">IndividuAula</span>
          <span className={cn("mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]", inverse ? "text-sidebar-foreground/65" : "text-muted-foreground")}>estude no seu ritmo</span>
        </span>
      )}
    </Link>
  )
}
