"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BookOpenTextIcon, LayoutDashboardIcon, LogOutIcon, MenuIcon, SearchIcon, Settings2Icon, UserRoundIcon } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { BrandMark } from "@/components/layout/brand-mark"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboardIcon },
  { href: "/disciplinas", label: "Disciplinas", icon: BookOpenTextIcon },
  { href: "/conteudos", label: "Conteúdos", icon: SearchIcon },
]

// reduz o nome do aluno para o avatar sem criar uma nova regra visual.
function getInitials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

export function AppShell({ children }: { children: React.ReactNode }) {
  // monta a navegação persistente e o conteúdo protegido da aplicação.
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useApp()

  function handleLogout() {
    // encerra a sessão local e devolve o aluno para a tela de entrada.
    logout()
    router.push("/login")
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-sidebar-border">
        <SidebarHeader className="gap-5 p-5">
          <BrandMark inverse />
          <div className="border-l border-sidebar-foreground/25 pl-3 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-sidebar-foreground/60">
            CE Marechal<br />
            Souza Dantas · Resende
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <nav aria-label="Navegação principal" className="flex min-h-full flex-col">
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50">Estudos</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    const Icon = item.icon
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.label}
                          render={<Link href={item.href} />}
                          className={cn("h-11 rounded-none px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground", isActive && "bg-signal font-bold text-brand")}
                        >
                          <Icon data-icon="inline-start" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel className="text-sidebar-foreground/50">Conta</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith("/perfil")}
                      tooltip="Meu perfil"
                      render={<Link href="/perfil" />}
                      className="h-11 rounded-none px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    >
                      <UserRoundIcon data-icon="inline-start" />
                      <span>Meu perfil</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Sair"
                      onClick={handleLogout}
                      className="h-11 rounded-none px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    >
                      <LogOutIcon data-icon="inline-start" />
                      <span>Sair</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </nav>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="border border-sidebar-foreground/20 bg-sidebar-foreground/5 p-3 text-xs text-sidebar-foreground/70">
            <div className="font-semibold text-sidebar-foreground">Seu espaço de estudo.</div>
            <div className="mt-1 leading-relaxed">Organize a rotina, acompanhe a média e avance uma aula por vez.</div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="rounded-none">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" aria-label="Abrir menu" />
            <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <MenuIcon className="size-4" />
              <span>Área do aluno</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button nativeButton={false} variant="outline" size="sm" className="hidden gap-2 sm:inline-flex" render={<Link href="/conteudos" />}>
              <SearchIcon data-icon="inline-start" />
              Buscar conteúdo
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu do usuário" />}>
                <Avatar className="size-8 border border-border">
                  <AvatarFallback className="bg-signal text-xs font-bold text-brand">{user ? getInitials(user.name) : "Au"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="font-semibold">{user?.name}</div>
                    <div className="font-normal text-muted-foreground">{user?.email}</div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/perfil" />}>
                  <Settings2Icon data-icon="inline-start" />
                  Editar perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOutIcon data-icon="inline-start" />
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="min-h-[calc(100svh-4rem)] bg-background px-4 py-8 md:px-8 lg:px-12">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
