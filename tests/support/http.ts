// centraliza a criação de requisições para os testes dos route handlers.
export function jsonRequest(url: string, body: unknown, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    method: init.method ?? "POST",
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
    body: JSON.stringify(body),
  });
}

// mantém os cookies explícitos para validar autorização sem depender de navegador.
export function authenticatedJsonRequest(url: string, body: unknown, sessionId: string, init: RequestInit = {}) {
  return jsonRequest(url, body, {
    ...init,
    headers: {
      cookie: `session=${sessionId}`,
      ...init.headers,
    },
  });
}
