import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";
import { RegistrationForm } from "@/components/auth/registration-form";
import { AssessmentForm } from "@/components/study/assessment-form";
import { DisciplineForm } from "@/components/study/discipline-form";
import { NoteForm } from "@/components/study/note-form";

describe("contratos de acessibilidade e validação dos formulários", () => {
  it("identifica campos de login por rótulo e mostra erros sem enviar dados inválidos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(screen.getByText(/e-mail.*obrigatório/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantém o cadastro acessível e valida senha antes do envio", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RegistrationForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/nome/i), "Ana Souza");
    await user.type(screen.getByLabelText(/e-mail/i), "ana@exemplo.com");
    await user.type(screen.getByLabelText(/^senha$/i), "123");
    await user.click(screen.getByRole("button", { name: /criar conta|cadastrar/i }));

    expect(screen.getByText(/senha.*6|senha.*curta/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("valida disciplina, anotação e avaliação com campos identificados", async () => {
    const user = userEvent.setup();
    const onDisciplineSubmit = vi.fn();
    const onNoteSubmit = vi.fn();
    const onAssessmentSubmit = vi.fn();

    render(
      <>
        <DisciplineForm onSubmit={onDisciplineSubmit} />
        <NoteForm onSubmit={onNoteSubmit} />
        <AssessmentForm onSubmit={onAssessmentSubmit} />
      </>,
    );

    expect(screen.getByLabelText(/nome da disciplina/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/conteúdo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nota/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/peso/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /salvar disciplina/i }));
    await user.click(screen.getByRole("button", { name: /salvar anotação/i }));
    await user.click(screen.getByRole("button", { name: /salvar avaliação/i }));

    expect(onDisciplineSubmit).not.toHaveBeenCalled();
    expect(onNoteSubmit).not.toHaveBeenCalled();
    expect(onAssessmentSubmit).not.toHaveBeenCalled();
  });
});
