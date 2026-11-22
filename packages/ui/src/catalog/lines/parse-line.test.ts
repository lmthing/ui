import { expect, it } from "vitest";
import { lineCodes as code, parseLine } from "./index";

// Minimized from Archetypes/deepseek-flash.json (the home_feed fence with a trailing comma)
// and Note/deepseek-flash.json (the invalid suffix). The single-quote and truncation cases
// are syntax mutations of the same Header reply.
const header = { c: "Header", title: "My Plants" };
it.each([
  [code.fence, '```json\n{"c":"Header","title":"My Plants"}\n```', header],
  [code.quotes, "{'c':'Header','title':'My Plants'}", header],
  [code.comma, '{"c":"Header","title":"My Plants",}', header],
  [code.close, '{"c":"Header","title":"My Plants"', header],
  [code.parseDrop, '{"c":"Note","icon":"warning"}"}}', undefined],
])("%s repairs or drops only the recorded defect", (kind, input, line) => {
  expect(parseLine(input)).toEqual({ ...(line === undefined ? {} : { line }), codes: [kind] });
});

it("combines repairs without altering punctuation or escapes inside strings", () => {
  expect(parseLine("```json\n{'rows':[{'title':'It\\'s \"quoted\", [here]'}," + "\n```")).toEqual({
    line: { rows: [{ title: 'It\'s "quoted", [here]' }] },
    codes: [code.fence, code.quotes, code.comma, code.close],
  });
  const value = { title: 'It\'s [fine,] }, and "quoted".', rows: [1, 2] };
  expect(parseLine(JSON.stringify(value))).toEqual({ line: value, codes: [] });
});

it.each(['{"x":[}', '{"x":"unfinished', "[,]", "[1,,]", 'prefix {"ok":true}', "{} {}"])(
  "drops unrecoverable syntax: %s",
  (input) => expect(parseLine(input)).toEqual({ codes: [code.parseDrop] }),
);
