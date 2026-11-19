import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";
import { actSchema, offered, resolveAnswer } from "./act";

const list = (components as unknown as Record<string, { examples: object[] }>).List!;
const screen = {
  id: "home",
  components: [{ id: "l1", c: "List", ...list.examples[0] }],
} as unknown as ScreenLike;

describe("act", () => {
  it("offers only real address and action pairs", () => {
    const affordances = offered(screen);
    expect(affordances.length).toBeGreaterThan(0);
    expect(actSchema(affordances).anyOf).toHaveLength(affordances.length);
  });
  it("resolves a real answer and rejects an invented one", () => {
    const first = offered(screen).find((a) => a.action === "toggle" || a.action === "press")!;
    const got = resolveAnswer(screen, JSON.stringify({ address: first.address, action: first.action }));
    expect(got.message).toBeTruthy();
    expect(got.ok, got.message).toBe(true);
    expect(resolveAnswer(screen, JSON.stringify({ address: "l1/nope", action: "press" })).ok).toBe(false);
    expect(resolveAnswer(screen, "not json").ok).toBe(false);
  });
});
