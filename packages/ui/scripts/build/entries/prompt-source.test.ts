import { expect, it } from "vitest";
import { parsePrompt, renderPrompt } from "./prompt-source";

const file = "Example.prompt.md";

it.each(
  [undefined, [], [`Use \`null\`, not “none”.`, `Keep the trailing space. `]].map((writeHints) => ({
    writeHints,
  })),
)("round-trips prompt text with Writer guidance %j", ({ writeHints }) => {
  const text = { purpose: "An example.", pick: "Use as an example. Not a fixture (Fixture)." };
  const expected = writeHints === undefined ? text : { ...text, writeHints };
  const markdown = renderPrompt(file, expected);
  expect(parsePrompt(file, markdown)).toEqual(expected);
  expect(parsePrompt(file, markdown.replace(/\n/g, "\r\n"))).toEqual(expected);
});

it("rejects Markdown that would silently change prompt bytes", () => {
  expect(() => parsePrompt(file, "## Purpose\n\nMissing the pick section.")).toThrow(file);
  expect(() => renderPrompt(file, { purpose: "One\nTwo", pick: "An example." })).toThrow(file);
});
