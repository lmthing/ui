import { expect, it } from "vitest";
import { checkLanguage } from "./language";

it("rejects locale literals, including non-English Intl arguments, outside language files", () => {
  const code = 'new Intl.NumberFormat("de"); const fallback = "en-GB"; new Intl.DateTimeFormat(tag);';
  const issues = checkLanguage("/repo/src/catalog/copy/time.ts", code);
  expect(issues.map(({ rule }) => rule)).toEqual(["language-locale", "language-locale"]);
  expect(checkLanguage("/repo/src/catalog/lang/en.ts", code)).toEqual([]);
});

it("rejects exported text and label objects but allows dictionaries, protocol values and functions", () => {
  const code = `
    export const title = "Ready";
    export const labels = { inner: { reset: "Reset" } } as const;
    export const { words } = wordsFor();
    export const defaults = { from: "09:00" };
    export const defaultCurrency = "USD";
    export const render = () => "Ignore function bodies in this heuristic";
  `;
  const issues = checkLanguage("/repo/src/catalog/copy/labels.ts", code);
  expect(issues.map(({ rule }) => rule)).toEqual(["language-copy", "language-copy"]);
});
