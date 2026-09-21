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
});
