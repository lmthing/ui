import { expect, it } from "vitest";
import { z } from "zod";
import { components } from "@lmthing/ui/catalog";
import type { Definition } from "../../../catalog";
import { createScreenController } from "../index";

it("draws from a live clock input and retains the result in the snapshot", () => {
  const fixture: Definition = {
    meta: {
      ...components.Button.meta,
      id: "ChanceFixture",
      actions: { parts: { roll: ["press"] } },
      emptyActions: ["roll.press"],
      draw: { kind: "faces", press: "roll", count: "count", sides: "sides" },
      clocks: [{ kind: "up", id: "count", from: "count", prop: "count", max: 3 }],
    },
    props: z.strictObject({ count: z.int().min(1), sides: z.int().min(2) }),
    examples: [],
    fallback: () => ({ count: 2, sides: 6 }),
    probes: [],
  };
  let now = 0;
  const runtime = createScreenController({
    defs: { ChanceFixture: fixture },
    screen: { id: "s", components: [{ c: "ChanceFixture", id: "c1", state: "empty", count: 2, sides: 6 }] },
    now: () => now,
    random: () => 4,
  });
  try {
    now = 1000;
    expect(runtime.canPress("c1/roll")).toBe(true);
    expect(runtime.press("c1/roll").ok).toBe(true);
    expect(runtime.snapshotScreen().components[0]).toMatchObject({ count: 3, state: "filled" });
    expect(runtime.read()).toContain("faces=[5,5,5]");
  } finally {
    runtime.dispose();
  }
});
