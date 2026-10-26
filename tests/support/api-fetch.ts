import { vi } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as session } from "@/app/api/auth/session/route";
import { GET as readProfile, PATCH as patchProfile } from "@/app/api/auth/profile/route";
import { GET as loadData } from "@/app/api/data/route";
import { POST as seedDemo } from "@/app/api/demo-data/route";
import { POST as createDiscipline } from "@/app/api/disciplines/route";
import { PATCH as patchDiscipline, DELETE as deleteDiscipline } from "@/app/api/disciplines/[id]/route";
import { POST as createNote } from "@/app/api/notes/route";
import { PATCH as patchNote, DELETE as deleteNote } from "@/app/api/notes/[id]/route";
import { POST as createAssessment } from "@/app/api/assessments/route";
import { PATCH as patchAssessment, DELETE as deleteAssessment } from "@/app/api/assessments/[id]/route";

type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

const table: Array<[string, RegExp, Handler]> = [
  ["POST", /^\/api\/auth\/register$/, register],
  ["POST", /^\/api\/auth\/login$/, login],
  ["POST", /^\/api\/auth\/logout$/, logout],
  ["GET", /^\/api\/auth\/session$/, session],
  ["GET", /^\/api\/auth\/profile$/, readProfile],
  ["PATCH", /^\/api\/auth\/profile$/, patchProfile],
  ["GET", /^\/api\/data$/, loadData],
  ["POST", /^\/api\/demo-data$/, seedDemo],
  ["POST", /^\/api\/disciplines$/, createDiscipline],
  ["PATCH", /^\/api\/disciplines\/([^/]+)$/, patchDiscipline],
  ["DELETE", /^\/api\/disciplines\/([^/]+)$/, deleteDiscipline],
  ["POST", /^\/api\/notes$/, createNote],
  ["PATCH", /^\/api\/notes\/([^/]+)$/, patchNote],
  ["DELETE", /^\/api\/notes\/([^/]+)$/, deleteNote],
  ["POST", /^\/api\/assessments$/, createAssessment],
  ["PATCH", /^\/api\/assessments\/([^/]+)$/, patchAssessment],
  ["DELETE", /^\/api\/assessments\/([^/]+)$/, deleteAssessment],
];

// um "navegador" de teste: mantém os cookies e entrega as chamadas de fetch aos route handlers reais.
export function createBrowser() {
  let cookie = "";
  const calls: Array<{ method: string; path: string }> = [];
  const overrides: Array<(method: string, path: string) => Response | undefined> = [];

  async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const path = new URL(String(input), "http://localhost:3000").pathname;
    const method = (init.method ?? "GET").toUpperCase();
    calls.push({ method, path });
    for (const override of overrides) {
      const forced = override(method, path);
      if (forced) return forced;
    }
    const match = table.find(([verb, pattern]) => verb === method && pattern.test(path));
    if (!match) return new Response(JSON.stringify({ error: "Rota inexistente." }), { status: 404 });
    const [, pattern, handler] = match;
    const headers = new Headers(init.headers);
    if (cookie) headers.set("cookie", cookie);
    const request = new Request(`http://localhost:3000${path}`, { method, headers, body: init.body as string | undefined });
    const response = await handler(request, { params: Promise.resolve({ id: path.match(pattern)?.[1] ?? "" }) });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = /max-age=0/i.test(setCookie) ? "" : setCookie.split(";")[0];
    return response;
  }

  return {
    calls,
    install: () => vi.stubGlobal("fetch", apiFetch),
    // faz o fetch devolver uma resposta pronta para um caminho, simulando falhas do servidor.
    failWhen: (match: (method: string, path: string) => boolean, status = 500, error = "Falha simulada.") =>
      overrides.push((method, path) => (match(method, path) ? new Response(JSON.stringify({ error }), { status }) : undefined)),
    clearFailures: () => { overrides.length = 0; },
    get cookie() { return cookie; },
    set cookie(value: string) { cookie = value; },
  };
}
