import { describe, expect, it } from "vitest";
import { calculateAssessmentAverage } from "@/lib/academics";

describe("média simples", () => {
  it("considera todas as notas igualmente, inclusive notas antigas com pesos diferentes", () => {
    const assessments = [{ grade: 6, weight: 9 }, { grade: 10, weight: 1 }];
    expect(calculateAssessmentAverage(assessments)).toBe(8);
    expect(calculateAssessmentAverage([])).toBe(0);
  });
});
