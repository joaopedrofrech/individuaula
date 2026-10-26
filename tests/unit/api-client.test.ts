import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "@/lib/api-client";

function stubFetch(response: Response) {
  const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => response);
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

afterEach(() => vi.unstubAllGlobals());

describe("cliente da API", () => {
  it("envia JSON com o cookie da mesma origem e devolve o corpo", async () => {
    const fetcher = stubFetch(Response.json({ ok: true }));

    const data = await apiRequest("/api/x", { method: "POST", body: { a: 1 } });

    const init = fetcher.mock.calls[0][1]!;
    expect(data).toEqual({ ok: true });
    expect(init.credentials).toBe("same-origin");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(init.body).toBe('{"a":1}');
  });

  it("nunca reaproveita uma resposta guardada, em leituras e em gravações", async () => {
    const fetcher = stubFetch(Response.json({}));

    await apiRequest("/api/auth/session");
    await apiRequest("/api/disciplines", { method: "POST", body: { name: "x" } });

    expect(fetcher.mock.calls.map((call) => call[1]!.cache)).toEqual(["no-store", "no-store"]);
  });

  it("não envia corpo nem cabeçalho de conteúdo em leituras", async () => {
    const fetcher = stubFetch(Response.json({}));

    await apiRequest("/api/data");

    const init = fetcher.mock.calls[0][1]!;
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.headers).toBeUndefined();
    expect(init.keepalive).toBe(false);
  });

  it("usa keepalive nas gravações pequenas para que sobrevivam a um recarregamento da página", async () => {
    const fetcher = stubFetch(Response.json({}));

    await apiRequest("/api/disciplines", { method: "POST", body: { name: "Matemática" } });
    await apiRequest("/api/disciplines/x", { method: "DELETE" });

    expect(fetcher.mock.calls.map((call) => call[1]!.keepalive)).toEqual([true, true]);
  });

  it("não usa keepalive em gravações grandes, que o navegador recusaria", async () => {
    const fetcher = stubFetch(Response.json({}));

    await apiRequest("/api/notes", { method: "POST", body: { imageDataUrl: "A".repeat(70_000) } });

    expect(fetcher.mock.calls[0][1]!.keepalive).toBe(false);
  });

  it("trata 204 como sucesso sem corpo", async () => {
    stubFetch(new Response(null, { status: 204 }));

    await expect(apiRequest("/api/x", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("lança ApiError com a mensagem, o status e o código do servidor", async () => {
    stubFetch(Response.json({ error: "Confirme seu e-mail.", code: "EMAIL_NOT_VERIFIED" }, { status: 403 }));

    const error = await apiRequest("/api/auth/login", { method: "POST", body: {} }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Confirme seu e-mail.", status: 403, code: "EMAIL_NOT_VERIFIED" });
  });

  it("usa uma mensagem padrão quando a resposta de erro não é JSON", async () => {
    stubFetch(new Response("<html>erro</html>", { status: 502 }));

    const error = await apiRequest("/api/x").catch((caught: unknown) => caught);

    expect(error).toMatchObject({ status: 502, message: expect.stringMatching(/não foi possível/i) });
  });
});
