import { expect, it } from "vitest";
import { estimateTokens } from "./index";

it.each([
  ["", 0],
  ["a", 1],
  ["four", 1],
  ["five!", 2],
  ["hello world", 3],
  ["😀😀😀😀", 1],
  ["a\nb\nc", 2],
])("estimates %j as %i tokens", (text, tokens) => {
  expect(estimateTokens(text)).toBe(tokens);
});
