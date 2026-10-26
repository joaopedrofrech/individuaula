import { describe, expect, it } from "vitest";
import { createYoutubeSearchResponse } from "@/server/youtube-search";

describe("contrato da rota de busca", () => {
  it("rejeita busca sem termo", async () => {
    const response = await createYoutubeSearchResponse(
      new Request("http://localhost/api/youtube/search?q="),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Informe um termo de busca." });
  });

  it("não expõe chave e usa fallback local sem configuração", async () => {
    const response = await createYoutubeSearchResponse(
      new Request("http://localhost/api/youtube/search?q=css+grid"),
      { apiKey: "" },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).items.length).toBeGreaterThan(0);
  });

  it("normaliza o termo e encaminha a pesquisa para a API somente no servidor", async () => {
    const calls: string[] = [];
    const response = await createYoutubeSearchResponse(
      new Request("http://localhost/api/youtube/search?q=%20CSS%20Grid%20"),
      {
        apiKey: "chave-secreta-de-teste",
        fetcher: async (input: RequestInfo | URL) => {
          calls.push(String(input));
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        },
      },
    );

    expect(response.status).toBe(200);
    expect(new URL(calls[0]).searchParams.get("q")).toBe("CSS Grid");
    expect((await response.text())).not.toContain("chave-secreta-de-teste");
  });

  it("retorna uma mensagem clara quando o YouTube está indisponível", async () => {
    const response = await createYoutubeSearchResponse(
      new Request("http://localhost/api/youtube/search?q=funções"),
      {
        apiKey: "chave-secreta-de-teste",
        fetcher: async (input: RequestInfo | URL) => {
          void input;
          throw new Error("network unavailable");
        },
      },
    );

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/indisponível|tente novamente/i);
  });

  it("não aceita uma pesquisa vinculada a disciplina inexistente", async () => {
    const response = await createYoutubeSearchResponse(
      new Request("http://localhost/api/youtube/search?q=funções&disciplineId=disciplina-inexistente"),
      {
        apiKey: "",
        validateDiscipline: async () => false,
      },
    );

    expect(response.status).toBe(404);
  });

  it("pede 12 vídeos por página e devolve o token da próxima", async () => {
    const calls: string[] = [];
    const response = await createYoutubeSearchResponse(new Request("http://localhost/api/youtube/search?q=funcoes"), {
      apiKey: "chave",
      fetcher: async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return Response.json({ items: [], nextPageToken: "CAwQAA" });
      },
    });

    expect(new URL(calls[0]).searchParams.get("maxResults")).toBe("12");
    expect(new URL(calls[0]).searchParams.has("pageToken")).toBe(false);
    expect((await response.json()).nextPageToken).toBe("CAwQAA");
  });

  it("encaminha o token da página pedida ao YouTube", async () => {
    const calls: string[] = [];
    await createYoutubeSearchResponse(new Request("http://localhost/api/youtube/search?q=funcoes&pageToken=CAwQAA"), {
      apiKey: "chave",
      fetcher: async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return Response.json({ items: [] });
      },
    });

    expect(new URL(calls[0]).searchParams.get("pageToken")).toBe("CAwQAA");
  });

  it("recusa token de página fora do formato, sem consultar o YouTube", async () => {
    const fetcher = async () => { throw new Error("não deveria chamar o YouTube"); };

    for (const token of ["a b", "x&key=outra", "../../etc", "a".repeat(101), ""]) {
      const response = await createYoutubeSearchResponse(
        new Request(`http://localhost/api/youtube/search?q=funcoes&pageToken=${encodeURIComponent(token)}`),
        { apiKey: "chave", fetcher },
      );
      expect(response.status).toBe(400);
    }
  });

  it("não repassa ao navegador um token estranho vindo do YouTube", async () => {
    const response = await createYoutubeSearchResponse(new Request("http://localhost/api/youtube/search?q=funcoes"), {
      apiKey: "chave",
      fetcher: async () => Response.json({ items: [], nextPageToken: "<script>alert(1)</script>" }),
    });

    expect((await response.json()).nextPageToken).toBeUndefined();
  });

  it("omite o token quando o YouTube não tem mais páginas", async () => {
    const response = await createYoutubeSearchResponse(new Request("http://localhost/api/youtube/search?q=funcoes&pageToken=CAwQAA"), {
      apiKey: "chave",
      fetcher: async () => Response.json({ items: [] }),
    });

    expect(await response.json()).toMatchObject({ source: "youtube" });
    expect((await createYoutubeSearchResponse(new Request("http://localhost/api/youtube/search?q=x"), { apiKey: "chave", fetcher: async () => Response.json({ items: [] }) }).then((r) => r.json())).nextPageToken).toBeUndefined();
  });

  it("sem chave, o resultado de exemplo não tem próxima página", async () => {
    const first = await (await createYoutubeSearchResponse(new Request("http://localhost/api/youtube/search?q=funcoes"))).json();
    const second = await (await createYoutubeSearchResponse(new Request("http://localhost/api/youtube/search?q=funcoes&pageToken=CAwQAA"))).json();

    expect(first.items).toHaveLength(1);
    expect(first.nextPageToken).toBeUndefined();
    expect(second.items).toEqual([]);
  });
});
