import { describe, expect, it } from "vitest";
import { components, createRegistry, packReady, placeholderTitle } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { examples, fallback, meta, probes, props } = components.LifeCounter;

describe("LifeCounter", () => {
  it.each(examples)("accepts each example", (example) => expect(props.safeParse(example).success).toBe(true));

  it("uses neutral defaults and cast titles", () => {
    const neutral = fallback({ cast: { items: [], things: [] } });
    expect(props.parse(neutral)).toMatchObject({ startingLife: 20, flipTop: true, style: "table" });
    expect(neutral.players.map(({ name }) => name)).toEqual([placeholderTitle(0), placeholderTitle(1)]);
    const thing = { type: "seat", fields: ["name"] };
    const item = { id: "north", type: "seat", sample: true, name: "North" };
    expect(fallback({ cast: { things: [thing], items: [item] } }).players[0]?.name).toBe("North");
    expect(
      props.safeParse(fallback({ cast: { things: [thing], items: [{ ...item, name: 9 }] } })).success,
    ).toBe(true);
  });

  it("bounds seats, totals and sub-counters without accepting runtime fields", () => {
    const player = {
      name: "n".repeat(16),
      life: 9999,
      counters: Array.from({ length: 3 }, () => ({ label: "x".repeat(12), value: 99 })),
    };
    expect(props.safeParse({ players: Array(6).fill(player), startingLife: 999 }).success).toBe(true);
    for (const input of [
      { players: [player] },
      { players: Array(7).fill(player) },
      { players: [player, { ...player, life: -1000 }] },
      { players: [player, { ...player, counters: [...player.counters, player.counters[0]] }] },
      { players: [player, { ...player, colour: "#ffffff" }] },
      { players: [player, player], startingLife: 0 },
      { players: [player, player], style: "other" },
      { players: [player, player], winner: 1 },
    ])
      expect(props.safeParse(input).success).toBe(false);
  });

  it("declares bounded states, the core near miss and confirmation for reset", () => {
    expect(meta.states).toEqual(["filled", "loading", "success"]);
    expect(meta.confirmParts).toEqual(["reset"]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Counter" }));
    expect(probes.some(({ kind }) => kind === "write")).toBe(true);
    expect(probes.some(({ kind }) => kind === "read")).toBe(true);
    expect(createRegistry({ packs: ["play"] }).ids.includes(meta.id)).toBe(packReady("play"));
  });
});

const input = {
  startingLife: 25,
  players: [
    {
      name: "North",
      counters: [
        { label: "Tokens", value: 0 },
        { label: "Mana", value: 99 },
      ],
    },
    { name: "South", life: 6, counters: [{ label: "Tokens", value: 2 }] },
  ],
};
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
function setup(state: "filled" | "loading" = "filled") {
  const screen = { id: "home", components: [{ c: meta.id, id: "c1", state, ...input }] };
  return createScreenController({ screen, defs: components });
}

it("draws addressable pads, reserves no control for absent sub-counters, and hides loading actions", () => {
  const parts = addressedElements(renderInstance(meta.id, input, "filled", theme));
  for (const part of [
    "r1/name",
    "r1/life",
    "r1/life_minus_5",
    "r1/life_plus_5",
    "r1/less_2",
    "r2/more_1",
    "reset",
  ])
    expect(parts.has(`home/c1/${part}`), part).toBe(true);
  expect(parts.get("home/c1/r1/total")?.text).toEqual(["25"]);
  expect(parts.get("home/c1/r2/total")?.text).toEqual(["6"]);
  expect(parts.has("home/c1/r2/counter_2")).toBe(false);
  const pending = addressedElements(renderInstance(meta.id, input, "loading", theme));
  expect(pending.has("home/c1/reset")).toBe(false);
  expect(pending.has("home/c1/r1/life")).toBe(false);
  const controller = setup("loading");
  try {
    expect(controller.read()).not.toMatch(/North|Tokens|\/life|\/reset/);
    expect(controller.press("c1/reset").ok).toBe(false);
    expect(controller.act({ address: "c1/r1/life", action: "increment" }).ok).toBe(false);
  } finally {
    controller.dispose();
  }
});

it("shares fixed steps per seat, clamps each resource, and restores overrides only after confirmation", () => {
  const controller = setup();
  const step = (part: string, action: "increment" | "decrement") =>
    controller.act({ address: `c1/${part}`, action }).ok;
  try {
    expect(step("r1/less_1", "decrement")).toBe(false);
    expect(step("r1/more_2", "increment")).toBe(false);
    expect(step("r2/more_2", "increment")).toBe(false);
    expect(step("r1/more_1", "increment")).toBe(true);
    expect(step("r2/less_1", "decrement")).toBe(true);
    expect(step("r2/life_minus_5", "decrement")).toBe(true);
    expect(step("r1/life_plus_5", "increment")).toBe(true);
    expect(step("r1/life", "decrement")).toBe(true);
    expect(controller.read()).toContain("North: 29 life — Tokens: 1 — Mana: 99 — South: 1 life — Tokens: 1");
    expect(step("r2/life", "decrement")).toBe(true);
    expect(controller.read()).toContain("(success) North wins");
    expect(step("r1/life_plus_5", "increment")).toBe(false);
    expect(controller.press("c1/reset").ok).toBe(true);
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(controller.read()).toContain("North: 29 life");
    expect(controller.press("c1/reset").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(controller.read()).toContain("North: 25 life — Tokens: 0 — Mana: 99 — South: 6 life — Tokens: 2");
    expect(controller.read()).not.toContain("North wins");
    expect(controller.snapshotScreen().components[0]?.players).toEqual(input.players);
  } finally {
    controller.dispose();
  }
});
