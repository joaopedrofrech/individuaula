import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectWhenLoggedIn } from "@/components/auth/redirect-when-logged-in";
import { HeaderActions, HeroActions } from "@/components/layout/home-actions";

const ctx = vi.hoisted(() => ({ app: { hydrated: true, user: null as null | { id: string; name: string } }, replace: vi.fn() }));

vi.mock("@/components/app-provider", () => ({ useApp: () => ctx.app }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: ctx.replace, push: vi.fn() }) }));

const logged = { id: "u1", name: "Ana" };

beforeEach(() => {
  ctx.app = { hydrated: true, user: null };
  ctx.replace.mockClear();
});

describe("redirecionamento de quem já está logado", () => {
  it("leva para o painel quando a sessão está ativa", () => {
    ctx.app = { hydrated: true, user: logged };

    render(<RedirectWhenLoggedIn />);

    expect(ctx.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("não redireciona quem não está logado", () => {
    render(<RedirectWhenLoggedIn />);

    expect(ctx.replace).not.toHaveBeenCalled();
  });

  it("espera a sessão ser verificada antes de decidir, para não mandar ninguém ao painel por engano", () => {
    ctx.app = { hydrated: false, user: logged };

    render(<RedirectWhenLoggedIn />);

    expect(ctx.replace).not.toHaveBeenCalled();
  });
});

describe("botões da página inicial", () => {
  it("mostram entrar e criar conta para quem não está logado", () => {
    render(<><HeaderActions /><HeroActions /></>);

    expect(screen.getAllByRole("link", { name: /^entrar$/i })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /criar espaço/i })).toHaveAttribute("href", "/cadastro");
    expect(screen.getByRole("link", { name: /começar agora/i })).toHaveAttribute("href", "/cadastro");
    expect(screen.getByRole("link", { name: /já tenho uma conta/i })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: /painel/i })).not.toBeInTheDocument();
  });

  it("levam direto ao painel para quem já está logado, sem oferecer login", () => {
    ctx.app = { hydrated: true, user: logged };

    render(<><HeaderActions /><HeroActions /></>);

    const links = screen.getAllByRole("link", { name: /painel/i });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: /entrar|já tenho uma conta|começar agora|criar espaço/i })).not.toBeInTheDocument();
  });

  it("mostram o padrão enquanto a sessão ainda é verificada", () => {
    ctx.app = { hydrated: false, user: logged };

    render(<><HeaderActions /><HeroActions /></>);

    expect(screen.getByRole("link", { name: /começar agora/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /painel/i })).not.toBeInTheDocument();
  });
});
