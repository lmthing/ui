import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, readScreen, text, type Definition, type Meta } from "@lmthing/ui/catalog";

const meta = {
  id: "Details",
  group: "content",
  purpose: "Inspect details",
  pick: "Inspect details",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local details",
  items: { key: "rows", parts: ["root"], visibleWhen: { expanded: true } },
  actions: {
    parts: { root: ["check"], show: ["toggle", "check"], inspect: ["press"] },
    items: { root: ["press"] },
    when: { inspect: { inspectable: true } },
  },
  live: {
    toggles: { root: { prop: "fixed", initial: true }, show: { prop: "expanded", initial: false } },
    derive: (props) => ({ inspectable: props.fixed === true && props.expanded === true }),
  },
  read: (input) => ((input as { inspectable: boolean }).inspectable ? ["details visible"] : []),
} satisfies Meta;
const props = z.strictObject({
  unrelated: z.boolean(),
  expanded: z.boolean().optional(),
  rows: z.array(z.strictObject({ label: text(20) })),
});
const seed = { unrelated: true, rows: [{ label: "Details row" }] };
const defs = { Details: { meta, props, fallback: () => seed, examples: [], probes: [] } } satisfies Record<
  string,
  Definition
>;
const screen = { id: "home", components: [{ id: "details", c: "Details", ...seed }] };
const toggle = { address: "home/details/show", action: "toggle" };
const check = { address: toggle.address, action: "check" };
const root = { address: "home/details/root", action: "check" };
const inspect = { address: "home/details/inspect", action: "press" };

it("reads each named boolean instead of the first prop and honors a parsed seed", () => {
  const before = readScreen(screen, defs);
  expect(before).toContain("[details check:done]");
  expect(before).toContain("[details/show toggle:off] [details/show check:todo]");
  expect(before).not.toContain("Details row");
  const seeded = { ...screen, components: [{ ...screen.components[0]!, expanded: true }] };
  expect(readScreen(seeded, defs)).toContain("details visible");
});

it("shares a check and toggle value, including root, and updates offers within a batch", () => {
  const result = planAct(screen, defs, {}, [{ ...check, value: true }, inspect]);
  if (!result.ok) throw new Error(result.code);
  const after = readScreen(screen, defs, result.values);
  expect(after).toContain("details visible");
  expect(after).toContain('r1 "Details row" [details/r1 press]');
  expect(after).toContain("[details/show toggle:on] [details/show check:done]");
  expect(planAct(screen, defs, result.values, [root, inspect])).toMatchObject({
    ok: false,
    at: 1,
    code: "not_actionable",
  });
  const twice = planAct(screen, defs, result.values, [toggle, toggle, inspect]);
  if (!twice.ok) throw new Error(twice.code);
  expect(readScreen(screen, defs, twice.values)).toBe(after);
  expect(planAct(screen, defs, twice.values, [toggle, inspect])).toMatchObject({
    ok: false,
    at: 1,
    code: "not_actionable",
  });
  expect(screen.components[0]).not.toHaveProperty("expanded");
});
