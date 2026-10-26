import { describe, expect, it } from "vitest";
import { calculateGeneralAverage, calculateWeightedAverage, getPerformanceLabel, getWeeklyStudyHours } from "@/lib/academics";

describe("regras acadêmicas", () => {
  it("calcula a média ponderada quando os pesos estão em percentual", () => {
    expect(
      calculateWeightedAverage([
        { grade: 8, weight: 30 },
        { grade: 9.5, weight: 30 },
        { grade: 8, weight: 40 },
      ]),
    ).toBeCloseTo(8.45, 2);
  });

  it("normaliza pesos que não somam cem por cento", () => {
    expect(
      calculateWeightedAverage([
        { grade: 6, weight: 2 },
        { grade: 8, weight: 1 },
      ]),
    ).toBeCloseTo(6.67, 2);
  });

  it("retorna zero quando ainda não há notas", () => {
    expect(calculateWeightedAverage([])).toBe(0);
    expect(calculateGeneralAverage([])).toBe(0);
  });

  it("considera a nota zero como uma nota válida", () => {
    expect(calculateGeneralAverage([0, 10])).toBe(5);
  });

  it("ignora disciplinas sem média ao calcular a média geral", () => {
    expect(calculateGeneralAverage([8.5, null, 7.5])).toBe(8);
  });

  it("não calcula média quando não existe peso positivo", () => {
    expect(() => calculateWeightedAverage([{ grade: 8, weight: 0 }])).toThrow();
  });

  it("organiza as sessões de estudo nos sete dias da semana", () => {
    const monday = new Date(2026, 8, 21, 12);
    const sessions = [
      { id: "one", userId: "user", date: new Date(2026, 8, 21, 9), minutes: 90 },
      { id: "two", userId: "user", date: new Date(2026, 8, 22, 14), minutes: 30 },
      { id: "outside", userId: "user", date: new Date(2026, 8, 28, 9), minutes: 120 },
    ];

    expect(getWeeklyStudyHours(sessions, monday)).toEqual([1.5, 0.5, 0, 0, 0, 0, 0]);
  });

  it.each([
    [10, "excelente"],
    [8, "bom"],
    [6, "atenção"],
    [0, "sem dados"],
  ] as const)("classifica a média %s como %s", (average, expected) => {
    expect(getPerformanceLabel(average)).toBe(expected);
  });
});
