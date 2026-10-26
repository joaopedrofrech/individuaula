import { act, renderHook, waitFor } from "@testing-library/react";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AppProvider, useApp } from "@/components/app-provider";
import { assessments, disciplines, notes, sessions, users } from "@/db/schema";
import { createBrowser } from "../support/api-fetch";
import { createTestServices } from "../support/services";
import { createSqliteTestDatabase } from "../support/sqlite-d1";

const ctx = vi.hoisted(() => ({ services: undefined as unknown }));
vi.mock("@/server/services", () => ({ getServices: () => ctx.services }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

let database: ReturnType<typeof createSqliteTestDatabase>;
let browser: ReturnType<typeof createBrowser>;

beforeAll(() => { database = createSqliteTestDatabase(); });
afterAll(async () => { await database.dispose(); });
beforeEach(async () => {
  await database.reset();
  ctx.services = createTestServices(database.db);
  browser = createBrowser();
  browser.install();
  vi.mocked(toast.error).mockClear();
});
afterEach(() => { vi.unstubAllGlobals(); });

const wrapper = ({ children }: { children: React.ReactNode }) => <AppProvider>{children}</AppProvider>;
type Hook = Awaited<ReturnType<typeof mount>>;

async function mount(timeout = 1000) {
  const hook = renderHook(() => useApp(), { wrapper });
  await waitFor(() => expect(hook.result.current.hydrated).toBe(true), { timeout });
  return hook;
}

const account = { name: "Ana Souza", email: "ana@exemplo.com", password: "segredo123" };

async function signUp(hook: Hook, data = account) {
  await act(async () => { await hook.result.current.register(data); });
}

async function withDiscipline(hook: Hook) {
  await signUp(hook);
  act(() => hook.result.current.addDiscipline({ name: "Matemática", color: "blue", description: "Funções", icon: "calculator" }));
  await waitFor(async () => expect(await database.db.select().from(disciplines)).toHaveLength(1));
  return hook.result.current.state.disciplines[0];
}

const inDb = {
  disciplines: () => database.db.select().from(disciplines),
  notes: () => database.db.select().from(notes),
  assessments: () => database.db.select().from(assessments),
};

describe("AppProvider — sessão", () => {
  it("falha fora do provider com uma mensagem clara", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useApp())).toThrow(/AppProvider/);
    spy.mockRestore();
  });

  it("abre sem usuário quando não há sessão e libera as telas", async () => {
    const hook = await mount();

    expect(hook.result.current.user).toBeNull();
    expect(hook.result.current.hydrated).toBe(true);
  });

  it("cadastra no banco e inicia a sessão", async () => {
    const hook = await mount();
    await signUp(hook, { ...account, email: "  ANA@Exemplo.com " });

    expect(hook.result.current.user).toMatchObject({ name: "Ana Souza", email: "ana@exemplo.com" });
    const [row] = await database.db.select().from(users);
    expect(row.email).toBe("ana@exemplo.com");
    expect(row.passwordHash).toMatch(/^pbkdf2\$/);
  });

  it("recusa e-mail duplicado e dados inválidos", async () => {
    const hook = await mount();
    await signUp(hook);

    await expect(hook.result.current.register(account)).rejects.toThrow(/cadastrado/i);
    await expect(hook.result.current.register({ name: "A", email: "x", password: "1" })).rejects.toThrow();
  });

  it("faz login, carrega os dados do banco e faz logout limpando a memória e a sessão", async () => {
    const first = await mount();
    await withDiscipline(first);
    await act(async () => { await first.result.current.logout(); });
    expect(first.result.current.user).toBeNull();
    expect(first.result.current.state.disciplines).toEqual([]);
    expect(await database.db.select().from(sessions)).toHaveLength(0);

    const second = await mount();
    await act(async () => { await second.result.current.login({ email: account.email, password: account.password }); });

    expect(second.result.current.user?.email).toBe(account.email);
    expect(second.result.current.state.disciplines[0].name).toBe("Matemática");
  });

  it("recusa credenciais erradas com mensagem genérica", async () => {
    const hook = await mount();
    await signUp(hook);
    await act(async () => { await hook.result.current.logout(); });

    await expect(hook.result.current.login({ email: account.email, password: "errada123" })).rejects.toThrow(/credenciais inválidas/i);
    await expect(hook.result.current.login({ email: "outra@exemplo.com", password: "segredo123" })).rejects.toThrow(/credenciais inválidas/i);

  });

  it("restaura a sessão e os dados do banco quando o app é aberto de novo", async () => {
    const first = await mount();
    await withDiscipline(first);
    first.unmount();

    const second = await mount();

    expect(second.result.current.user?.email).toBe(account.email);
    expect(second.result.current.state.disciplines[0]).toMatchObject({ name: "Matemática", description: "Funções", icon: "calculator" });
    expect(second.result.current.state.disciplines[0].createdAt).toBeInstanceOf(Date);
  });

  it("mostra a mesma conta e os mesmos dados em outro navegador depois do login", async () => {
    const mine = await mount();
    await withDiscipline(mine);
    mine.unmount();

    browser.cookie = "";
    const other = await mount();
    expect(other.result.current.user).toBeNull();
    await act(async () => { await other.result.current.login({ email: account.email, password: account.password }); });

    expect(other.result.current.state.disciplines).toHaveLength(1);
  });

  it("atualiza o nome no banco e recusa trocar o e-mail", async () => {
    const hook = await mount();
    await signUp(hook);

    await act(async () => { await hook.result.current.updateProfile({ name: "Ana Silva", email: account.email }); });
    expect(hook.result.current.user?.name).toBe("Ana Silva");
    expect((await database.db.select().from(users))[0].name).toBe("Ana Silva");

    await expect(hook.result.current.updateProfile({ name: "Ana", email: "outro@exemplo.com" })).rejects.toThrow(/e-mail/i);
  });

  it("exige login para editar o perfil", async () => {
    const hook = await mount();

    await expect(hook.result.current.updateProfile({ name: "Ana", email: "ana@exemplo.com" })).rejects.toThrow(/login/i);
  });

  it("nunca usa o armazenamento do navegador para guardar dados ou senha", async () => {
    const hook = await mount();
    await withDiscipline(hook);

    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
  });

  it("limpa o usuário e avisa quando a sessão expira no meio do uso", async () => {
    const hook = await mount();
    await withDiscipline(hook);
    await database.db.delete(sessions);

    act(() => hook.result.current.addDiscipline({ name: "História", color: "coral" }));

    await waitFor(() => expect(hook.result.current.user).toBeNull());
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/sessão expirou/i), expect.anything());
  });
});

describe("AppProvider — encerrar a sessão", () => {
  it("só limpa a tela depois que o servidor confirma e a sessão já terminou no banco", async () => {
    const hook = await mount();
    await signUp(hook);
    let sessionsRightAfter = -1;

    await act(async () => {
      await hook.result.current.logout();
      sessionsRightAfter = (await database.db.select().from(sessions)).length;
    });

    expect(sessionsRightAfter).toBe(0);
    expect(hook.result.current.user).toBeNull();
  });

  it("devolve verdadeiro quando saiu", async () => {
    const hook = await mount();
    await signUp(hook);
    let result: boolean | undefined;

    await act(async () => { result = await hook.result.current.logout(); });

    expect(result).toBe(true);
  });

  it("mantém o aluno logado e avisa quando o servidor não encerra a sessão", async () => {
    const hook = await mount();
    await withDiscipline(hook);
    browser.failWhen((method, path) => method === "POST" && path === "/api/auth/logout");
    let result: boolean | undefined;

    await act(async () => { result = await hook.result.current.logout(); });

    expect(result).toBe(false);
    expect(hook.result.current.user).not.toBeNull();
    expect(hook.result.current.state.disciplines).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/encerrar a sessão/i), expect.anything());
    expect(await database.db.select().from(sessions)).toHaveLength(1);
  });

  it("mantém o aluno logado e avisa quando a rede cai ao sair", async () => {
    const hook = await mount();
    await signUp(hook);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    let result: boolean | undefined;

    await act(async () => { result = await hook.result.current.logout(); });

    expect(result).toBe(false);
    expect(hook.result.current.user).not.toBeNull();
  });
});

describe("AppProvider — falha de rede ao abrir o app", () => {
  // faz as primeiras chamadas falharem como uma queda de rede e deixa as seguintes seguirem normalmente.
  function dropNetwork(times: number) {
    const real = globalThis.fetch;
    let remaining = times;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (remaining > 0) {
        remaining -= 1;
        throw new TypeError("Failed to fetch");
      }
      return real(input, init);
    }));
  }

  it("tenta de novo e mantém o aluno logado quando a rede falha só um instante", async () => {
    const first = await mount();
    await signUp(first);
    first.unmount();
    dropNetwork(1);

    const second = await mount();

    expect(second.result.current.user?.email).toBe(account.email);
  });

  it("não manda para o login por causa de uma falha de rede, só pelo 401 do servidor", async () => {
    const first = await mount();
    await signUp(first);
    await database.db.delete(sessions);
    first.unmount();

    const second = await mount();

    expect(second.result.current.user).toBeNull();
    expect(second.result.current.hydrated).toBe(true);
  });

  it("desiste depois das tentativas e libera a tela em vez de ficar carregando para sempre", async () => {
    dropNetwork(10);

    // as tentativas somam 1,6 s de espera, mais que o prazo padrão dos testes.
    const hook = await mount(4000);

    expect(hook.result.current.hydrated).toBe(true);
    expect(hook.result.current.user).toBeNull();
  });
});

describe("AppProvider — página restaurada do cache do navegador", () => {
  const restoreFromCache = (persisted: boolean) => {
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted }));
  };

  it("limpa a tela quando a sessão já acabou no servidor", async () => {
    const hook = await mount();
    await withDiscipline(hook);
    await database.db.delete(sessions);

    act(() => restoreFromCache(true));

    await waitFor(() => expect(hook.result.current.user).toBeNull());
    expect(hook.result.current.state.disciplines).toEqual([]);
  });

  it("mantém a sessão e atualiza os dados quando ela continua válida", async () => {
    const hook = await mount();
    await withDiscipline(hook);
    const before = browser.calls.length;

    act(() => restoreFromCache(true));

    await waitFor(() => expect(browser.calls.slice(before).map((call) => call.path)).toContain("/api/data"));
    expect(hook.result.current.user).not.toBeNull();
  });

  it("não faz nada em um carregamento normal da página", async () => {
    const hook = await mount();
    await withDiscipline(hook);
    const before = browser.calls.length;

    act(() => restoreFromCache(false));

    expect(browser.calls.length).toBe(before);
    expect(hook.result.current.user).not.toBeNull();
  });

  it("não derruba o usuário por uma falha de rede ao conferir", async () => {
    const hook = await mount();
    await withDiscipline(hook);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));

    act(() => restoreFromCache(true));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(hook.result.current.user).not.toBeNull();
  });
});

describe("AppProvider — disciplinas", () => {
  it("mostra a disciplina na hora e a grava no banco com dono e valores padrão", async () => {
    const hook = await mount();
    await signUp(hook);

    act(() => hook.result.current.addDiscipline({ name: "História", color: "coral" }));
    expect(hook.result.current.state.disciplines[0]).toMatchObject({ name: "História", description: "", icon: "book" });

    await waitFor(async () => expect(await inDb.disciplines()).toHaveLength(1));
    expect((await inDb.disciplines())[0]).toMatchObject({ id: hook.result.current.state.disciplines[0].id, userId: hook.result.current.user!.id });
  });

  it("exige login e dados válidos para criar", async () => {
    const hook = await mount();
    expect(() => hook.result.current.addDiscipline({ name: "História", color: "coral" })).toThrow(/login/i);
    await signUp(hook);
    expect(() => hook.result.current.addDiscipline({ name: "", color: "coral" })).toThrow();
    expect(await inDb.disciplines()).toHaveLength(0);
  });

  it("edita só o nome no banco sem apagar descrição e ícone", async () => {
    const hook = await mount();
    const discipline = await withDiscipline(hook);

    act(() => hook.result.current.updateDiscipline(discipline.id, { name: "Matemática Aplicada" }));

    await waitFor(async () => expect((await inDb.disciplines())[0].name).toBe("Matemática Aplicada"));
    expect((await inDb.disciplines())[0]).toMatchObject({ description: "Funções", icon: "calculator", color: "blue" });
  });

  it("recusa edição inválida sem tocar na tela nem no banco", async () => {
    const hook = await mount();
    const discipline = await withDiscipline(hook);

    expect(() => hook.result.current.updateDiscipline(discipline.id, { name: "" })).toThrow();
    expect(hook.result.current.state.disciplines[0].name).toBe("Matemática");
    expect((await inDb.disciplines())[0].name).toBe("Matemática");
  });

  it("exclui no banco a disciplina com anotações e avaliações", async () => {
    const hook = await mount();
    const discipline = await withDiscipline(hook);
    act(() => hook.result.current.addNote(discipline.id, { title: "Resumo", content: "<p>texto</p>" }));
    act(() => hook.result.current.addAssessment(discipline.id, { title: "Prova", grade: 8, weight: 1 }));
    await waitFor(async () => expect(await inDb.assessments()).toHaveLength(1));

    act(() => hook.result.current.deleteDiscipline(discipline.id));

    expect(hook.result.current.state.notes).toHaveLength(0);
    await waitFor(async () => expect(await inDb.disciplines()).toHaveLength(0));
    expect(await inDb.notes()).toHaveLength(0);
    expect(await inDb.assessments()).toHaveLength(0);
  });

  it("mantém a ordem das gravações quando o aluno cria, edita e exclui em sequência", async () => {
    const hook = await mount();
    await signUp(hook);

    act(() => hook.result.current.addDiscipline({ name: "Rápida", color: "blue" }));
    const id = hook.result.current.state.disciplines[0].id;
    act(() => hook.result.current.updateDiscipline(id, { name: "Rápida editada" }));
    act(() => hook.result.current.addDiscipline({ name: "Outra", color: "green" }));
    act(() => hook.result.current.deleteDiscipline(id));

    await waitFor(async () => expect((await inDb.disciplines()).map((item) => item.name)).toEqual(["Outra"]));
  });

  it("carrega os dados de exemplo gravando no banco uma única vez", async () => {
    const hook = await mount();
    await signUp(hook);

    act(() => hook.result.current.loadDemoData());
    await waitFor(async () => expect(await inDb.disciplines()).toHaveLength(2));
    await waitFor(() => expect(hook.result.current.state.disciplines).toHaveLength(2));
    act(() => hook.result.current.loadDemoData());

    expect(await inDb.disciplines()).toHaveLength(2);
    expect(hook.result.current.state.studySessions).toHaveLength(7);
  });
});

describe("AppProvider — falhas ao gravar", () => {
  it("avisa o aluno e desfaz o que não foi salvo quando o servidor recusa", async () => {
    const hook = await mount();
    await signUp(hook);
    browser.failWhen((method, path) => method === "POST" && path === "/api/disciplines");

    act(() => hook.result.current.addDiscipline({ name: "Não salva", color: "blue" }));
    expect(hook.result.current.state.disciplines).toHaveLength(1);

    await waitFor(() => expect(hook.result.current.state.disciplines).toHaveLength(0));
    expect(toast.error).toHaveBeenCalledWith("Falha simulada.", expect.anything());
    expect(await inDb.disciplines()).toHaveLength(0);
  });

  it("continua gravando as próximas alterações depois de uma falha", async () => {
    const hook = await mount();
    await signUp(hook);
    browser.failWhen((method, path) => method === "POST" && path === "/api/disciplines");
    act(() => hook.result.current.addDiscipline({ name: "Falha", color: "blue" }));
    await waitFor(() => expect(hook.result.current.state.disciplines).toHaveLength(0));
    browser.clearFailures();

    act(() => hook.result.current.addDiscipline({ name: "Funciona", color: "green" }));

    await waitFor(async () => expect((await inDb.disciplines()).map((item) => item.name)).toEqual(["Funciona"]));
  });

  it("não quebra quando a rede cai ao gravar", async () => {
    const hook = await mount();
    await signUp(hook);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));

    act(() => hook.result.current.addDiscipline({ name: "Sem rede", color: "blue" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(hook.result.current.user).not.toBeNull();
  });
});

describe("AppProvider — gravação pendente", () => {
  const beforeUnload = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it("avisa antes de fechar a página enquanto há gravação indo para o banco e deixa sair depois", async () => {
    const hook = await mount();
    await signUp(hook);
    expect(beforeUnload()).toBe(false);

    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const original = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => { await gate; return original(input, init); });

    act(() => hook.result.current.addDiscipline({ name: "Em voo", color: "blue" }));
    expect(beforeUnload()).toBe(true);

    release();
    await waitFor(async () => expect(await inDb.disciplines()).toHaveLength(1));
    await waitFor(() => expect(beforeUnload()).toBe(false));
  });

  it("também libera a saída da página quando a gravação falha", async () => {
    const hook = await mount();
    await signUp(hook);
    browser.failWhen((method, path) => method === "POST" && path === "/api/disciplines");

    act(() => hook.result.current.addDiscipline({ name: "Falha", color: "blue" }));

    await waitFor(() => expect(hook.result.current.state.disciplines).toHaveLength(0));
    await waitFor(() => expect(beforeUnload()).toBe(false));
  });
});

describe("AppProvider — anotações e avaliações", () => {
  it("cria, edita e remove a anotação no banco", async () => {
    const hook = await mount();
    const discipline = await withDiscipline(hook);
    act(() => hook.result.current.addNote(discipline.id, { title: "Resumo", content: "<p>texto</p>" }));
    await waitFor(async () => expect(await inDb.notes()).toHaveLength(1));
    const [note] = hook.result.current.state.notes;

    act(() => hook.result.current.updateNote(note.id, { title: "Resumo revisado" }));
    await waitFor(async () => expect((await inDb.notes())[0].title).toBe("Resumo revisado"));
    expect((await inDb.notes())[0].content).toBe("<p>texto</p>");

    act(() => hook.result.current.deleteNote(note.id));
    await waitFor(async () => expect(await inDb.notes()).toHaveLength(0));
  });

  it("remove a imagem da anotação no banco quando o formulário a retira", async () => {
    const hook = await mount();
    const discipline = await withDiscipline(hook);
    act(() => hook.result.current.addNote(discipline.id, { title: "Com imagem", content: "<p>x</p>", imageDataUrl: "data:image/png;base64,AAAA" }));
    await waitFor(async () => expect((await inDb.notes())[0]?.imageDataUrl).toBe("data:image/png;base64,AAAA"));
    const [note] = hook.result.current.state.notes;

    act(() => hook.result.current.updateNote(note.id, { title: "Sem imagem", imageDataUrl: undefined }));

    await waitFor(async () => expect((await inDb.notes())[0].imageDataUrl).toBeNull());
  });

  it("não cria anotação em disciplina inexistente ou de outro aluno", async () => {
    const hook = await mount();
    const discipline = await withDiscipline(hook);
    await act(async () => { await hook.result.current.logout(); });
    await signUp(hook, { name: "Bia Lima", email: "bia@exemplo.com", password: "segredo456" });

    expect(() => hook.result.current.addNote(discipline.id, { title: "Invasão", content: "x" })).toThrow(/não encontrada/i);
    expect(() => hook.result.current.addNote("inexistente", { title: "Teste", content: "x" })).toThrow(/não encontrada/i);
    expect(await inDb.notes()).toHaveLength(0);
  });

  it("rejeita imagem que não seja PNG, JPG, WEBP ou GIF", async () => {
    const hook = await mount();
    const discipline = await withDiscipline(hook);

    expect(() => hook.result.current.addNote(discipline.id, { title: "SVG", content: "x", imageDataUrl: "data:image/svg+xml;base64,PHN2Zz4=" })).toThrow();
  });

  it("grava a avaliação convertendo nota e peso para número, edita e remove", async () => {
    const hook = await mount();
    const discipline = await withDiscipline(hook);

    act(() => hook.result.current.addAssessment(discipline.id, { title: "Prova", grade: "7.5" as never, weight: "2" as never }));
    await waitFor(async () => expect((await inDb.assessments())[0]).toMatchObject({ grade: 7.5, weight: 2 }));
    const [assessment] = hook.result.current.state.assessments;

    act(() => hook.result.current.updateAssessment(assessment.id, { grade: 9 }));
    await waitFor(async () => expect((await inDb.assessments())[0]).toMatchObject({ title: "Prova", grade: 9, weight: 2 }));
    expect(() => hook.result.current.updateAssessment(assessment.id, { grade: 11 })).toThrow();

    act(() => hook.result.current.deleteAssessment(assessment.id));
    await waitFor(async () => expect(await inDb.assessments()).toHaveLength(0));
  });

  it("um aluno não consegue editar nem excluir registros de outro", async () => {
    const hook = await mount();
    const discipline = await withDiscipline(hook);
    act(() => hook.result.current.addNote(discipline.id, { title: "Resumo", content: "x" }));
    act(() => hook.result.current.addAssessment(discipline.id, { title: "Prova", grade: 6, weight: 1 }));
    await waitFor(async () => expect(await inDb.assessments()).toHaveLength(1));
    const note = hook.result.current.state.notes[0];
    const assessment = hook.result.current.state.assessments[0];
    await act(async () => { await hook.result.current.logout(); });
    await signUp(hook, { name: "Bia Lima", email: "bia@exemplo.com", password: "segredo456" });

    act(() => {
      hook.result.current.updateDiscipline(discipline.id, { name: "Invadida" });
      hook.result.current.updateNote(note.id, { title: "Invadida" });
      hook.result.current.updateAssessment(assessment.id, { grade: 0 });
      hook.result.current.deleteNote(note.id);
      hook.result.current.deleteAssessment(assessment.id);
      hook.result.current.deleteDiscipline(discipline.id);
    });
    await waitFor(() => expect(browser.calls.filter((call) => call.method === "DELETE")).toHaveLength(3));

    expect((await inDb.disciplines())[0].name).toBe("Matemática");
    expect((await inDb.notes())[0].title).toBe("Resumo");
    expect((await inDb.assessments())[0].grade).toBe(6);
  });

  it("sem login, as operações de edição não fazem nada nem chamam o servidor", async () => {
    const hook = await mount();
    const before = browser.calls.length;

    act(() => {
      hook.result.current.updateDiscipline("x", { name: "Nome" });
      hook.result.current.updateNote("x", { title: "Nome" });
      hook.result.current.updateAssessment("x", { grade: 5 });
      hook.result.current.deleteDiscipline("x");
      hook.result.current.deleteNote("x");
      hook.result.current.deleteAssessment("x");
      hook.result.current.loadDemoData();
    });

    expect(hook.result.current.state.disciplines).toHaveLength(0);
    expect(browser.calls.length).toBe(before);
    expect(await database.db.select({ id: users.id }).from(users).where(eq(users.id, "x"))).toEqual([]);
  });
});
