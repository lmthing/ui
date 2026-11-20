import { expect, it } from "vitest";
import { assignmentDue, assignmentSubjectTone, assignmentToday } from "../../copy";

it("uses the local calendar date with padded month and day", () => {
  expect(assignmentToday(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
});

it("distinguishes past, current, near and distant deadlines", () => {
  const line = (due: string) => assignmentDue(due, "todo", "en-GB", "2026-03-07");
  expect(line("2026-03-06")).toBe("Deadline passed · 6 Mar 2026");
  expect(line("2026-03-07")).toBe("Today · 7 Mar 2026");
  expect(line("2026-03-08")).toBe("In 1\u00a0day · 8 Mar 2026");
  expect(line("2026-03-09")).toBe("In 2\u00a0days · 9 Mar 2026");
  expect(line("2026-03-15")).toBe("Due 15 Mar 2026");
});

it("preserves the original deadline for handed-in and graded work and formats it in the app locale", () => {
  expect(assignmentDue("2026-01-02", "graded", "en-GB", "2026-01-03")).toBe("Due 2 Jan 2026");
  expect(assignmentDue("2026-01-02", "done", "en-US", "2026-01-03")).toBe("Deadline passed · Jan 2, 2026");
});

it("keeps a subject mark stable without making it a status colour", () => {
  expect(assignmentSubjectTone(" Geography ")).toBe(assignmentSubjectTone("GEOGRAPHY"));
  expect(assignmentSubjectTone("B")).not.toBe(assignmentSubjectTone("A"));
});
