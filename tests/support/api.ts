// chama os route handlers reais com Request/Response, como o Next faz, sem subir servidor.
type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

type CallOptions = { body?: unknown; rawBody?: string; cookie?: string; headers?: Record<string, string>; id?: string };

export async function call(handler: Handler, method: string, path: string, { body, rawBody, cookie, headers = {}, id }: CallOptions = {}) {
  const hasBody = body !== undefined || rawBody !== undefined;
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: { ...(hasBody ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const response = await handler(request, { params: Promise.resolve({ id: id ?? "" }) });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : null,
    // devolve só "nome=valor" do cookie, no formato que o navegador reenviaria.
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
