import { describe, expect, it } from "vitest";
import { createSampleStudyData } from "@/server/demo-data";

describe("dados de exemplo", () => {
  it("vincula todos os registros ao usuário informado", () => {
    const { disciplines, notes, assessments, studySessions } = createSampleStudyData("user-1");

    for (const record of [...disciplines, ...notes, ...assessments, ...studySessions]) {
      expect(record.userId).toBe("user-1");
    }
    const disciplineIds = new Set(disciplines.map((item) => item.id));
    expect(notes.every((note) => disciplineIds.has(note.disciplineId))).toBe(true);
    expect(assessments.every((assessment) => disciplineIds.has(assessment.disciplineId))).toBe(true);
  });

  it("monta a semana completa de estudos de segunda a domingo", () => {
    const { studySessions } = createSampleStudyData("user-1", new Date("2026-10-28T12:00:00"));

    expect(studySessions).toHaveLength(7);
    expect(studySessions[0].date.getDay()).toBe(1);
    expect(studySessions[6].date.getDay()).toBe(0);
  });

  it("começa a semana na segunda anterior mesmo quando hoje é domingo", () => {
    const { studySessions } = createSampleStudyData("user-1", new Date("2026-11-01T12:00:00"));

    expect(studySessions[0].date.getDate()).toBe(26);
    expect(studySessions[6].date.getDate()).toBe(1);
  });

  it("não compartilha ids entre usuários diferentes", () => {
    const first = createSampleStudyData("user-1").disciplines.map((item) => item.id);
    const second = createSampleStudyData("user-2").disciplines.map((item) => item.id);

    expect(first.some((id) => second.includes(id))).toBe(false);
  });
});
