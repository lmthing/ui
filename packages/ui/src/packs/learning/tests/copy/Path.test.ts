import { expect, it } from "vitest";
import { pathUnitCopy, readPath } from "../../copy";
import { learningWordsFor, registerLearningWords } from "../../lang";

const unit = { title: "Map reading", state: "current" } as const;

it("shares unit labels with the reader, without exposing hidden status text in brief detail", () => {
  expect(pathUnitCopy(unit, false)).toEqual({ status: "Start unit", label: "Map reading · Start unit" });
  expect(readPath([unit], [0], false)).toEqual(["Map reading · Start unit · Badge"]);
  expect(readPath([unit], [0], true)).toEqual(["Map reading · Badge"]);
  expect(readPath([unit], [], true)).toEqual([]);
});

it("uses the registered pack language and falls back to English", () => {
  const words = learningWordsFor();
  const unregister = registerLearningWords("fr", {
    ...words,
    path: {
      ...words.path,
      status: { done: "Terminé", current: "Commencer", locked: "Verrouillé" },
      milestone: "Jalon",
    },
  });
  try {
    expect(pathUnitCopy(unit, true, "fr-CA").label).toBe("Map reading · Commencer · Jalon");
    expect(readPath([unit], [0], false, "fr-CA")).toEqual(["Map reading · Commencer · Jalon"]);
    expect(readPath([unit], [0], false, "de")).toEqual(["Map reading · Start unit · Badge"]);
  } finally {
    unregister();
  }
});
