import { expect, it } from "vitest";
import { libraryProgress, libraryReading } from "../../copy";

it("formats fractional progress using the requested locale", () => {
  expect(libraryProgress(0.424, "en")).toBe("42%");
  expect(libraryProgress(1, "fr-FR")).toBe("100\u00a0%");
});

it("reads progress only for tiles that have it, including zero", () => {
  expect(libraryReading([{ title: "First", progress: 0 }, { title: "Second" }], "en")).toEqual([
    "First · Progress: 0%",
  ]);
});
