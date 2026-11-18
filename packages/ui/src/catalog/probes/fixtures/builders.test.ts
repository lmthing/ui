import { expect, it } from "vitest";
import { probesFor } from "./builders";

const { choose, write, read } = probesFor("List");

it("keeps probe values and serialized property order unchanged", () => {
  expect(JSON.stringify(choose("Browse"))).toBe('{"kind":"choose","need":"Browse","expect":"List"}');
  expect(choose("One preview", "Card")).toEqual({ kind: "choose", need: "One preview", expect: "Card" });
  expect(JSON.stringify(write("Three items"))).toBe('{"kind":"write","brief":"Three items","expect":"List"}');
  const expected = { address: "l1/r1", action: "press" };
  expect(JSON.stringify(read("Open", expected))).toBe(
    '{"kind":"read","screen":0,"task":"Open","expect":{"address":"l1/r1","action":"press"}}',
  );
  expect(read("Open", expected, 2)).toEqual({ kind: "read", screen: 2, task: "Open", expect: expected });
});
