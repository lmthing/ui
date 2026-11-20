import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";
import { actSchema, offered, resolveAnswer } from "./act";

const screen: ScreenLike = {
  id: "home",
  components: [{ id: "l1", c: "List", ...components.List.examples[0]! }],
};

describe("act", () => {
  it("offers and resolves List row actions without a phantom disclosure", () => {
    const pairs = offered(screen).map(({ address, action }) => ({ address, action }));
    expect(pairs).toEqual([
      { address: "l1/r1", action: "press" },
      { address: "l1/r1/trail", action: "toggle" },
      { address: "l1/r2", action: "press" },
      { address: "l1/r3", action: "press" },
    ]);
    expect(actSchema(offered(screen)).anyOf).toHaveLength(pairs.length);
    for (const pair of pairs) {
      const got = resolveAnswer(screen, JSON.stringify(pair));
      expect(got.ok, got.message).toBe(true);
    }
  });
  it("offers a real disclosure when List is in peek mode", () => {
    const peek: ScreenLike = {
      ...screen,
      components: [{ ...screen.components[0]!, overflow: "peek" }],
    };
    const pair = { address: "l1/more", action: "toggle" };
    expect(offered(peek)).toContainEqual(expect.objectContaining(pair));
    const got = resolveAnswer(peek, JSON.stringify(pair));
    expect(got.ok, got.message).toBe(true);
  });
  it("rejects an invented address or malformed answer", () => {
    expect(resolveAnswer(screen, JSON.stringify({ address: "l1/nope", action: "press" })).ok).toBe(false);
    expect(resolveAnswer(screen, "not json").ok).toBe(false);
  });
});
