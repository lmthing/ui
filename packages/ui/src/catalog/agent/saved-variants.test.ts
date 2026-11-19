import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, planAct, readComponent, readScreen, text, variantProps } from "@lmthing/ui/catalog";
import type { ScreenLike } from "./read";
import type { MigrationOptions } from "../migrations";

vi.mock("../migrations", async (load) => {
  const migrations = await load<typeof import("../migrations")>();
  const options = { variantComponents: ["Card"] };
  return {
    ...migrations,
    migrateLine: (line: Record<string, unknown>, caller?: MigrationOptions) =>
      migrations.migrateLine(line, { ...options, ...caller }),
    migrateScreen: (screen: ScreenLike, caller?: MigrationOptions) =>
      migrations.migrateScreen(screen, { ...options, ...caller }),
  };
});

const card = {
  ...components.Card,
  meta: {
    ...components.Card.meta,
    variants: { surface: ["plain", "outlined"] },
    actions: { parts: { root: ["press"] } },
  },
  props: z.strictObject({
    ...variantProps({ surface: ["plain", "outlined"] }),
    title: text(40),
    goto: z.string(),
  }),
} as const;
const old = { style: "outlined", title: "One", goto: "details" };
const screen = { id: "home", components: [{ c: "c-a_r d", id: "c1", ...old }] };

it("migrates saved Card props through catalog reading and action planning", () => {
  expect(readComponent(card, old, "c1").join("\n")).toContain('"One"');
  expect(readScreen(screen, { Card: card })).toContain("[c1 press→details]");
  expect(planAct(screen, { Card: card }, {}, [{ address: "home/c1", action: "press" }])).toMatchObject({
    ok: true,
    links: [{ address: "home/c1", goto: "details" }],
  });
  expect(screen.components[0]?.style).toBe("outlined");
});

it("recognizes normalized adopted ids even without old style props", () => {
  const saved = { ...screen, components: [{ c: "c-a_r d", id: "c1", title: "One", goto: "details" }] };
  expect(readScreen(saved, { Card: card })).toContain("[c1 press→details]");
  expect(planAct(saved, { Card: card }, {}, [{ address: "c1", action: "press" }]).ok).toBe(true);
});

it("ignores malformed retired lines during reading and action planning", () => {
  const saved = {
    ...screen,
    components: [...screen.components, { c: "DayTimeline", id: "bad", blocks: [null] }],
  };
  const defs = { Card: card, Timeline: components.Timeline };
  expect(planAct(saved, defs, {}, []).ok).toBe(true);
  expect(planAct(saved, defs, {}, [{ address: "c1", action: "press" }]).ok).toBe(true);
  expect(readScreen(saved, defs)).toContain("bad DayTimeline (unknown)");
});

it("does not run retired component migrations while reading and planning variant lines", () => {
  const saved = {
    ...screen,
    components: [...screen.components, { c: "DayTimeline", id: "bad", blocks: [{}] }],
  };
  const defs = { Card: card, Timeline: components.Timeline };
  expect(readScreen(saved, defs)).toContain("bad DayTimeline (unknown)");
  expect(planAct(saved, defs, {}, [{ address: "c1", action: "press" }]).ok).toBe(true);
});
