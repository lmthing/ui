import { expect, it } from "vitest";
import { z } from "zod";
import type { Definition } from "../../probes";
import { planAct, readScreen, visibleItems, type ScreenLike } from "../index";

const def: Definition = {
  meta: {
    id: "FilteredRows",
    group: "data",
    purpose: "Filter addressed rows.",
    pick: "Show a filtered list.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Use local rows.",
    items: {
      key: "rows",
      parts: ["root", "child_1"],
      prefix: "q",
      visibleWhen: { shown: true },
      nested: { key: "children", parts: { child: { action: "toggle", prop: "on" } } },
    },
    actions: { parts: { retry: ["press"] }, items: { root: ["press"] }, when: { retry: { state: "error" } } },
    errorActions: ["retry.press"],
    read: (props) =>
      visibleItems(def.meta, props as Record<string, unknown>).map(({ id }) => `visible ${id}`),
  },
  props: z.strictObject({
    rows: z.array(
      z.strictObject({ shown: z.boolean(), children: z.array(z.strictObject({ on: z.boolean() })) }),
    ),
  }),
  fallback: () => ({}),
  examples: [],
  probes: [],
};
const defs = { [def.meta.id]: def };
const screen: ScreenLike = {
  id: "s",
  components: [
    { id: "c1", c: def.meta.id, rows: [false, true].map((shown) => ({ shown, children: [{ on: false }] })) },
  ],
};

it("omits inactive rows and their nested actions without renumbering the visible row", () => {
  const read = readScreen(screen, defs);
  expect(read).not.toContain("q1");
  expect(read.split("\n").slice(1)).toEqual([
    "c1 FilteredRows visible q2",
    "  q2 [c1/q2 press] [c1/q2/child_1 toggle:off]",
  ]);
  expect(planAct(screen, defs, {}, [{ address: "c1/q1/child_1", action: "toggle" }])).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
});

it("offers retry only in the resolved error state on the pure read and act paths", () => {
  const retry = { address: "c1/retry", action: "press" };
  for (const state of ["filled", "empty", "loading", "success", "error"] as const) {
    const next = { ...screen, components: [{ ...screen.components[0]!, state }] };
    expect(readScreen(next, defs).includes("[c1/retry press]")).toBe(state === "error");
    expect(planAct(next, defs, {}, [retry]).ok).toBe(state === "error");
  }
  expect(planAct(screen, defs, { "s/c1/$state": "error" }, [retry]).ok).toBe(true);
});
