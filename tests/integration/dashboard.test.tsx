import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardView, type DashboardData } from "@/components/dashboard-view";

describe("contrato de interação do dashboard", () => {
  it("exibe saudação, média e disciplinas do aluno", () => {
    render(<DashboardView />);

    expect(screen.getByRole("heading", { name: /bom dia/i })).toBeInTheDocument();
    expect(screen.getByText("Minhas disciplinas")).toBeInTheDocument();
    expect(screen.getByText("Matemática")).toBeInTheDocument();
    expect(screen.getByText("7,8")).toBeInTheDocument();
  });

  it("abre o formulário de nova disciplina com campos acessíveis", async () => {
    const user = userEvent.setup();
    render(<DashboardView />);

    await user.click(screen.getByRole("button", { name: /adicionar disciplina/i }));

    expect(screen.getByRole("dialog", { name: /nova disciplina/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome da disciplina/i)).toBeInTheDocument();
  });

  it("oferece dados de exemplo quando o painel ainda está vazio", async () => {
    const user = userEvent.setup();
    const onLoadDemoData = vi.fn();
    const emptyData: DashboardData = {
      userName: "Ana Souza",
      disciplines: [],
      weeklyHours: [0, 0, 0, 0, 0, 0, 0],
      completedTasks: 0,
      totalTasks: 0,
    };

    render(<DashboardView data={emptyData} onLoadDemoData={onLoadDemoData} />);

    await user.click(screen.getByRole("button", { name: /ver com dados de exemplo/i }));

    expect(onLoadDemoData).toHaveBeenCalledOnce();
  });
});
