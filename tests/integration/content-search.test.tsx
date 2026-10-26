import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContentSearch } from "@/components/study/content-search";
import { MAX_PAGES } from "@/hooks/use-video-search";

// o jsdom não tem IntersectionObserver; esta versão deixa o teste decidir quando o fim da lista aparece.
const observers: Array<{ callback: IntersectionObserverCallback; target?: Element; disconnected: boolean }> = [];

class FakeObserver {
  entry: (typeof observers)[number];
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, disconnected: false };
    observers.push(this.entry);
  }
  observe(target: Element) { this.entry.target = target; }
  disconnect() { this.entry.disconnected = true; }
  unobserve() {}
  takeRecords() { return []; }
}

// simula o aluno rolando até o fim da lista: dispara o observador ativo mais recente.
async function scrollToEnd() {
  const active = [...observers].reverse().find((observer) => !observer.disconnected && observer.target);
  expect(active, "o fim da lista deveria estar sendo observado").toBeDefined();
  await act(async () => { active!.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); });
}

const video = (id: string) => ({ id, title: `Vídeo ${id}`, channel: "Canal", description: "Descrição", thumbnailUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg", videoUrl: `https://www.youtube.com/watch?v=${id}` });
const page = (ids: string[], nextPageToken?: string) => ({ items: ids.map(video), nextPageToken, source: "youtube" });

let fetcher: ReturnType<typeof vi.fn>;

function respondWith(...responses: Array<unknown | Error | (() => Promise<unknown>)>) {
  fetcher = vi.fn(async () => {
    const next = responses.shift();
    if (next instanceof Error) return Response.json({ error: next.message }, { status: 503 });
    const body = typeof next === "function" ? await (next as () => Promise<unknown>)() : next;
    return Response.json(body);
  });
  vi.stubGlobal("fetch", fetcher);
}

async function search(term = "funções") {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: /buscar conteúdo/i }), term);
  await user.click(screen.getByRole("button", { name: /pesquisar/i }));
}

const requestedPageTokens = () => fetcher.mock.calls.map(([url]) => new URL(String(url), "http://localhost").searchParams.get("pageToken"));

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});
afterEach(() => vi.unstubAllGlobals());

describe("pesquisa de conteúdos com rolagem infinita", () => {
  it("mostra a primeira página e só pede a próxima quando o fim da lista aparece", async () => {
    respondWith(page(["a", "b"], "T2"), page(["c", "d"]));
    render(<ContentSearch />);

    await search();
    await screen.findByText("2 conteúdos encontrados");
    expect(fetcher).toHaveBeenCalledTimes(1);

    await scrollToEnd();

    await screen.findByText("4 conteúdos encontrados");
    expect(requestedPageTokens()).toEqual([null, "T2"]);
  });

  it("acrescenta os vídeos novos sem tirar os que já estavam na tela", async () => {
    respondWith(page(["a", "b"], "T2"), page(["c"]));
    render(<ContentSearch />);

    await search();
    await screen.findByText("Vídeo a");
    await scrollToEnd();

    await screen.findByText("Vídeo c");
    expect(screen.getByText("Vídeo a")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /assistir vídeo/i })).toHaveLength(3);
  });

  it("não repete um vídeo que o YouTube devolveu em duas páginas", async () => {
    respondWith(page(["a", "b"], "T2"), page(["b", "c"]));
    render(<ContentSearch />);

    await search();
    await screen.findByText("2 conteúdos encontrados");
    await scrollToEnd();

    await screen.findByText("3 conteúdos encontrados");
    expect(screen.getAllByText("Vídeo b")).toHaveLength(1);
  });

  it("avisa que a lista acabou quando não há próxima página e para de observar", async () => {
    respondWith(page(["a"], "T2"), page(["b"]));
    render(<ContentSearch />);

    await search();
    await screen.findByText("1 conteúdos encontrados");
    await scrollToEnd();

    await screen.findByText(/você chegou ao fim dos resultados/i);
    await waitFor(() => expect(observers.filter((observer) => !observer.disconnected && observer.target)).toHaveLength(0));
  });

  it("não busca mais nada quando já é o fim logo na primeira página", async () => {
    respondWith(page(["a"]));
    render(<ContentSearch />);

    await search();

    await screen.findByText(/você chegou ao fim dos resultados/i);
    expect(observers.filter((observer) => observer.target && !observer.disconnected)).toHaveLength(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("não dispara duas cargas ao mesmo tempo quando o fim da lista aparece várias vezes", async () => {
    let release: (value: unknown) => void = () => undefined;
    const slow = () => new Promise((resolve) => { release = resolve; });
    respondWith(page(["a"], "T2"), slow, page(["c"]));
    render(<ContentSearch />);

    await search();
    await screen.findByText("1 conteúdos encontrados");
    await scrollToEnd();
    const staleObserver = [...observers].reverse().find((observer) => observer.target)!;
    await act(async () => { staleObserver.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); });

    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => { release(page(["b"])); });
    await screen.findByText("2 conteúdos encontrados");
  });

  it("mostra um indicador enquanto a próxima página carrega", async () => {
    let release: (value: unknown) => void = () => undefined;
    respondWith(page(["a"], "T2"), () => new Promise((resolve) => { release = resolve; }));
    const { container } = render(<ContentSearch />);

    await search();
    await screen.findByText("1 conteúdos encontrados");
    await scrollToEnd();

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    await act(async () => { release(page(["b"])); });
    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).toBeNull());
  });

  it("mantém os vídeos e oferece tentar de novo quando a próxima página falha", async () => {
    respondWith(page(["a"], "T2"), new Error("O serviço de vídeos está indisponível."), page(["b"]));
    render(<ContentSearch />);

    await search();
    await screen.findByText("1 conteúdos encontrados");
    await scrollToEnd();

    expect(await screen.findByRole("alert")).toHaveTextContent(/indisponível/i);
    expect(screen.getByText("Vídeo a")).toBeInTheDocument();
    const callsAfterError = fetcher.mock.calls.length;
    expect(observers.filter((observer) => observer.target && !observer.disconnected)).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: /tentar de novo/i }));

    await screen.findByText("2 conteúdos encontrados");
    expect(fetcher.mock.calls.length).toBe(callsAfterError + 1);
    expect(requestedPageTokens().slice(1)).toEqual(["T2", "T2"]);
  });

  it("uma busca nova começa do zero e ignora a resposta atrasada da busca anterior", async () => {
    let releaseOld: (value: unknown) => void = () => undefined;
    respondWith(page(["velho1"], "T2"), () => new Promise((resolve) => { releaseOld = resolve; }), page(["novo1"]));
    render(<ContentSearch />);
    const user = userEvent.setup();

    await search("primeira");
    await screen.findByText("Vídeo velho1");
    await scrollToEnd();
    const box = screen.getByRole("textbox", { name: /buscar conteúdo/i });
    await user.clear(box);
    await user.type(box, "segunda");
    await user.click(screen.getByRole("button", { name: /pesquisar/i }));
    await screen.findByText("Vídeo novo1");
    await act(async () => { releaseOld(page(["velho2"])); });

    expect(screen.queryByText("Vídeo velho1")).not.toBeInTheDocument();
    expect(screen.queryByText("Vídeo velho2")).not.toBeInTheDocument();
    expect(screen.getByText("1 conteúdos encontrados")).toBeInTheDocument();
    expect(requestedPageTokens()[2]).toBeNull();
  });

  it(`para em ${MAX_PAGES} páginas para proteger a cota e sugere refinar a busca`, async () => {
    const pages = Array.from({ length: MAX_PAGES }, (_, index) => page([`p${index}`], `T${index + 2}`));
    respondWith(...pages);
    render(<ContentSearch />);

    await search();
    for (let index = 1; index < MAX_PAGES; index += 1) {
      await screen.findByText(`Vídeo p${index - 1}`);
      await scrollToEnd();
    }

    await screen.findByText(new RegExp(`Mostramos os ${MAX_PAGES} primeiros resultados`));
    expect(fetcher).toHaveBeenCalledTimes(MAX_PAGES);
    expect(observers.filter((observer) => observer.target && !observer.disconnected)).toHaveLength(0);
  });

  it("envia a disciplina junto em todas as páginas da busca", async () => {
    respondWith(page(["a"], "T2"), page(["b"]));
    render(<ContentSearch disciplineId="discipline-1" />);

    await search();
    await screen.findByText("1 conteúdos encontrados");
    await scrollToEnd();
    await screen.findByText("2 conteúdos encontrados");

    for (const [url] of fetcher.mock.calls) {
      expect(new URL(String(url), "http://localhost").searchParams.get("disciplineId")).toBe("discipline-1");
    }
  });

  it("mostra o estado vazio e o erro da primeira busca sem tentar paginar", async () => {
    respondWith({ items: [] });
    const first = render(<ContentSearch />);
    await search("nada");
    await screen.findByText(/nenhum conteúdo encontrado/i);
    first.unmount();

    respondWith(new Error("Cota esgotada."));
    render(<ContentSearch />);
    await search("erro");
    expect(await screen.findByRole("alert")).toHaveTextContent(/cota esgotada/i);
  });

  it("não pesquisa com o campo em branco", async () => {
    respondWith(page(["a"]));
    render(<ContentSearch />);

    await userEvent.type(screen.getByRole("textbox", { name: /buscar conteúdo/i }), "   ");
    await userEvent.click(screen.getByRole("button", { name: /pesquisar/i }));

    expect(fetcher).not.toHaveBeenCalled();
  });
});
