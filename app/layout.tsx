import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "IndividuAula · seu espaço de estudos",
  description: "Uma plataforma simples para organizar disciplinas, anotações e desempenho.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // envolve todas as páginas com tema, contexto global e mensagens acessíveis.
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <AppProvider>{children}</AppProvider>
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
