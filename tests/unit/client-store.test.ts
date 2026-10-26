import { describe, expect, it } from "vitest";
import { createClientId, emptyClientState, reviveStudyPayload, reviveUser } from "@/lib/client-store";

describe("estado em memória", () => {
  it("começa vazio e sem usuário", () => {
    expect(emptyClientState).toEqual({ user: null, disciplines: [], notes: [], assessments: [], studySessions: [] });
  });

  it("não guarda contas nem senhas no estado do cliente", () => {
    expect(Object.keys(emptyClientState)).not.toContain("accounts");
    expect(JSON.stringify(emptyClientState)).not.toMatch(/password|hash/i);
  });

  it("gera ids únicos com o prefixo informado", () => {
    const first = createClientId("note");
    const second = createClientId("note");

    expect(first).toMatch(/^note-[0-9a-f-]{36}$/);
    expect(first).not.toBe(second);
  });
});

describe("reconstrução dos dados vindos da API", () => {
  const iso = "2026-10-01T10:00:00.000Z";

  it("transforma as datas em objetos Date", () => {
    const payload = reviveStudyPayload({
      disciplines: [{ id: "d", userId: "u", name: "Web", description: "", color: "blue", icon: "book", createdAt: iso, updatedAt: iso }],
      notes: [{ id: "n", userId: "u", disciplineId: "d", title: "t", content: "c", imageDataUrl: undefined, createdAt: iso, updatedAt: iso }],
      assessments: [{ id: "a", userId: "u", disciplineId: "d", title: "p", grade: 8, weight: 1, createdAt: iso, updatedAt: iso }],
      studySessions: [{ id: "s", userId: "u", date: iso, minutes: 30 }],
    });

    expect(payload.disciplines[0].createdAt).toEqual(new Date(iso));
    expect(payload.notes[0].updatedAt).toBeInstanceOf(Date);
    expect(payload.assessments[0].createdAt).toBeInstanceOf(Date);
    expect(payload.studySessions[0].date).toEqual(new Date(iso));
  });

  it("converte a imagem nula do banco em ausente", () => {
    const payload = reviveStudyPayload({ disciplines: [], assessments: [], studySessions: [], notes: [{ id: "n", userId: "u", disciplineId: "d", title: "t", content: "c", imageDataUrl: null as never, createdAt: iso, updatedAt: iso }] });

    expect(payload.notes[0].imageDataUrl).toBeUndefined();
  });

  it("aceita listas ausentes sem quebrar", () => {
    expect(reviveStudyPayload({} as never)).toEqual({ disciplines: [], notes: [], assessments: [], studySessions: [] });
  });

  it("reconstrói a data de criação do usuário", () => {
    const user = reviveUser({ id: "u", name: "Ana", email: "ana@exemplo.com", createdAt: iso });

    expect(user.createdAt).toEqual(new Date(iso));
  });
});
