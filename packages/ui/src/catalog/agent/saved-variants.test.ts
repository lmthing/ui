import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, planAct, readComponent, readScreen, text, variantProps } from "@lmthing/ui/catalog";
import type { ScreenLike } from "./read";

vi.mock("../migrations", async (load) => {
  const migrations = await load<typeof import("../migrations")>();
  const options = { variantComponents: ["Card"] };
  return {
    ...migrations,
    migrateLine: (line: Record<string, unknown>) => migrations.migrateLine(line, options),
    migrateScreen: (screen: ScreenLike) => migrations.migrateScreen(screen, options),
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
  expect(planAct(saved, { Card: card }, {}, []).ok).toBe(true);
  expect(planAct(saved, { Card: card }, {}, [{ address: "c1", action: "press" }]).ok).toBe(true);
  expect(readScreen(saved, { Card: card })).toContain("bad DayTimeline (unknown)");
});
