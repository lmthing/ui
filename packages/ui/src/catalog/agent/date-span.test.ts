import { expect, it } from "vitest";
import { z } from "zod";
import { readScreen, planAct, type ActStep, type ScreenLike } from "./index";
import { isoDate } from "../props";
import type { Definition } from "../probes";

const definition = {
  meta: {
    id: "SpanFixture",
    group: "input",
    tier: "phone",
    weight: 1,
    region: "body",
    purpose: "Pick dates.",
    pick: "Date range fixture.",
    realPath: "Local picks.",
    items: { key: "days", parts: ["root"] },
    parts: ["clear"],
    actions: { items: { root: ["select"] }, parts: { clear: ["press"] } },
    dateSpan: {
      start: "arrival",
      end: "departure",
      date: "date",
      available: "open",
      minNights: "min",
      clear: "clear",
    },
    read: (props) => {
      const { arrival, departure } = props as { arrival?: string; departure?: string };
      return [arrival ?? "No arrival", departure ?? "No departure"];
    },
  },
  props: z.strictObject({
    arrival: isoDate.optional(),
    departure: isoDate.optional(),
    min: z.int().min(1).max(30),
    days: z.array(z.strictObject({ date: isoDate, open: z.boolean() })),
  }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const defs = { SpanFixture: definition };
const days = ["07", "08", "09", "10", "11", "12", "13"].map((day) => ({
  date: `2026-03-${day}`,
  open: day !== "08",
}));
const input = { id: "fares", components: [{ c: "SpanFixture", id: "c1", min: 2, days }] };
const select = (item: number, value?: string) => ({ address: `c1/r${item}`, action: "select", value });
const clear = { address: "c1/clear", action: "press" };

it("keeps the reader and staged batch in step before the first pick, mid-span, after completion and clear", () => {
  const initial = readScreen(input, defs);
  expect(initial).not.toContain("[c1/clear press]");
  expect(initial).not.toContain("[c1/r2 select");
  const first = planAct(input, defs, {}, [select(3)]);
  expect(first.ok).toBe(true);
  if (!first.ok) throw Error(first.code);
  const pending = readScreen(input, defs, first.values);
  expect(pending).toContain("2026-03-09");
  expect(pending).toContain("[c1/clear press]");
  expect(pending).not.toContain("[c1/r4 select");
  expect(pending).toContain("[c1/r5 select");
  const result = planAct(input, defs, {}, [select(3), select(5)]);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(result.code);
  expect(readScreen(input, defs, result.values)).toContain("2026-03-11");
  expect(readScreen(input, defs, result.values)).toContain("[c1/r4 select");
  const reset = planAct(input, defs, result.values, [clear]);
  expect(reset.ok).toBe(true);
  if (!reset.ok) throw Error(reset.code);
  expect(readScreen(input, defs, reset.values)).toBe(initial);
});

it("rejects blocked or missing intermediate availability, short spans and mismatched explicit dates", () => {
  for (const [screen, second] of [
    [input, select(3)],
    [input, select(2)],
    [
      { ...input, components: [{ ...input.components[0]!, days: days.filter((_, at) => at !== 1) }] },
      select(2),
    ],
  ] satisfies [ScreenLike, ActStep][]) {
    expect(planAct(screen, defs, {}, [select(1), second])).toMatchObject({ ok: false, at: 1 });
  }
  expect(planAct(input, defs, {}, [select(1, "2026-03-09")])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
});
