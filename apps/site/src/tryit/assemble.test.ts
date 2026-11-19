import { describe, expect, it } from "vitest";
import { checkLine, closedLines } from "./assemble";

describe("closedLines", () => {
  it("returns only objects that have closed, in order", () => {
    const text = '{"lines":[{"c":"Header","title":"A } brace"},{"c":"List","rows":[{"title":"x"}]},{"c":"Bu';
    expect(closedLines(text)).toEqual([
      '{"c":"Header","title":"A } brace"}',
      '{"c":"List","rows":[{"title":"x"}]}',
    ]);
  });
  it("is empty before the lines array opens", () => {
    expect(closedLines('{"li')).toEqual([]);
  });
});

describe("checkLine", () => {
  const allowed = ["Header", "Button"];
  it("accepts a valid line and stamps an id", () => {
    const out = checkLine('{"c":"Header","style":"large","title":"Plants"}', allowed, 0, new Set());
    expect(out.line).toMatchObject({ c: "Header", id: "header1" });
  });
  it("rejects a component outside the scope", () => {
    const out = checkLine('{"c":"Canvas"}', allowed, 0, new Set());
    expect(out.line).toBeNull();
    expect(out.notes[0]).toContain("not in this catalog");
  });
  it("snaps a near-miss enum value and says so", () => {
    const out = checkLine('{"c":"Button","label":"Go","kind":"primry"}', allowed, 1, new Set());
    expect(out.line).toMatchObject({ kind: "primary" });
    expect(out.notes[0]).toContain("repaired");
  });
  it("drops unknown fields and null optionals", () => {
    const out = checkLine('{"c":"Button","label":"Go","colour":"red","icon":null}', allowed, 2, new Set());
    expect(out.line).not.toBeNull();
    expect(out.line).not.toHaveProperty("colour");
  });
  it("rejects text that is not JSON", () => {
    expect(checkLine("nonsense", allowed, 0, new Set()).notes[0]).toContain("not valid JSON");
  });
});
