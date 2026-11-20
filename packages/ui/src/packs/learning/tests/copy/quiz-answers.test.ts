import { expect, it } from "vitest";
import { gradeQuiz, projectQuiz, reviseQuiz } from "../../copy";

it("projects only selections applicable to the current round kind and grades normalized text", () => {
  const item = { kind: "type", answer: "Soft light" };
  expect(projectQuiz(item, {})).toMatchObject({
    kind: "type",
    option_indexes: [],
    match_indexes: [],
    has_left: false,
  });
  expect(gradeQuiz(item, {})).toBeUndefined();
  expect(gradeQuiz(item, reviseQuiz({}, "field", " Soft \t LIGHT "))).toBe(true);
});

it("moves a reused right answer rather than counting it twice", () => {
  const item = {
    kind: "match",
    pairs: [
      { left: "One", right: "A" },
      { left: "Two", right: "B" },
      { left: "Three", right: "C" },
    ],
  };
  const withFirst = reviseQuiz(reviseQuiz({}, "left", 0), "right", "H");
  const moved = reviseQuiz(reviseQuiz(withFirst, "left", "B"), "right", "H");
  expect(moved).toMatchObject({ pairs: { 1: 2 }, right: 2 });
  expect(projectQuiz(item, moved).has_left).toBe(false);
  expect(gradeQuiz(item, moved)).toBeUndefined();
});
