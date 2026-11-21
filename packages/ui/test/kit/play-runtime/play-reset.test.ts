import { expect, it } from "vitest";
import { z } from "zod";
import type { Definition, Values } from "@lmthing/ui/catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "@lmthing/ui/kit";

const def = {
  meta: {
    id: "ResetFixture",
    group: "input",
    purpose: "Track optional counts.",
    pick: "Test fixture.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Counts on this device.",
    items: {
      key: "rows",
      parts: ["root", "plus_1"],
      adjust: { "root.increment": { prop: "life", delta: 1, max: 10 } },
      reset: "reset",
      nested: {
        key: "counters",
        parts: { plus: { action: "increment", prop: "value", min: 0, max: 5, step: 1 } },
      },
    },
    select: { prop: "on", value: "index", mode: "flags", runtime: true },
    actions: { parts: { reset: ["press"] }, items: { root: ["select", "increment"] } },
    read: (props) => [JSON.stringify((props as Values).rows)],
  },
  props: z.strictObject({
    rows: z
      .array(z.strictObject({ life: z.int(), counters: z.array(z.strictObject({ value: z.int() })) }))
      .default([{ life: 5, counters: [{ value: 2 }] }]),
  }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;

it.each(["mounted", "standalone"])(
  "%s reset restores default rows without clearing a shared selection",
  (mode) => {
    const screen = { id: "s", components: [{ id: "counters", c: def.meta.id }] };
    const defs = { [def.meta.id]: def };
    const store = createInteractionStore();
    const access =
      mode === "mounted"
        ? createScreenController({ screen, defs, store })
        : createAgentAccess({ current: () => screen, defs, store });
    const select = { address: "counters/r1", action: "select", value: 0 };
    const plus = { address: "counters/r1/plus_1", action: "increment" };
    const reset = { address: "counters/reset", action: "press" };
    const confirm = { address: "confirm/confirm", action: "press" };
    expect(access.act([select, plus, reset]).ok).toBe(true);
    expect(access.read()).toContain("confirm/confirm");
    expect(store.get("s/counters/r1")).toBe(true);
    expect(access.act(confirm).ok).toBe(true);
    expect(access.read()).toContain('"value":2');
    expect(access.read()).toContain('"on":true');
    expect(access.act(plus).ok).toBe(true);
    expect(access.read()).toContain('"value":3');
  },
);
