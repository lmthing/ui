import { describe, expect, it } from "vitest";
import { categoryGrade, courseGrade, gradeItemCopy } from "../../copy";

const scored = (earned: number, possible: number) => ({ title: "Lab", earned, possible });

describe("Gradebook calculations", () => {
  it("uses total points per category, then weighted category ratios", () => {
    const lab = { label: "Labs", weight: 25, items: [scored(10, 10), scored(45, 90)] };
    const exams = { label: "Exams", weight: 75, items: [scored(95, 100)] };
    expect(categoryGrade(lab)).toEqual({ label: "Labs · 25%", ratio: 0.55, amount: "55%" });
    expect(courseGrade({ categories: [lab, exams] })).toEqual({ primary: "85%", secondary: "B · 3.00 GPA" });
  });

  it("renormalizes assessed weights, keeps a zero earned score, and ignores ungraded and zero-weight work", () => {
    const empty = { label: "Final", weight: 60, items: [{ title: "Final", possible: 100 }] };
    const audit = { label: "Audit", weight: 0, items: [scored(100, 100)] };
    expect(courseGrade({ categories: [empty, audit] })).toBeUndefined();
    expect(
      courseGrade({ categories: [empty, { label: "Labs", weight: 40, items: [scored(0, 10)] }, audit] }),
    ).toEqual({ primary: "0%", secondary: "F · 0.00 GPA" });
  });

  it.each([
    [100, "A", "4.00"],
    [90, "A", "4.00"],
    [89.99, "B", "3.00"],
    [80, "B", "3.00"],
    [70, "C", "2.00"],
    [60, "D", "1.00"],
    [59, "F", "0.00"],
  ])("converts %s raw percent to %s and %s GPA", (earned, letter, gpa) => {
    const categories = [{ label: "Exams", weight: 100, items: [scored(earned, 100)] }];
    expect(courseGrade({ categories, scale: "letter" })?.primary).toBe(letter);
    expect(courseGrade({ categories, scale: "gpa" })?.primary).toBe(`${gpa} GPA`);
  });

  it("keeps finite ratios when raw totals exceed the floating-point range", () => {
    const item = scored(Number.MAX_VALUE / 2, Number.MAX_VALUE);
    expect(categoryGrade({ label: "Exams", weight: 100, items: Array(12).fill(item) }).ratio).toBe(0.5);
  });

  it("localizes score digits and hides the date only in brief detail", () => {
    const item = { ...scored(7.5, 10), date: "2026-10-12" };
    expect(gradeItemCopy(item, "full", "de").score).toBe("7,5 / 10");
    expect(gradeItemCopy(item, "full", "de").date).toContain("Okt");
    expect(gradeItemCopy(item, "brief", "de").date).toBeUndefined();
  });
});
