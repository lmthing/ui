import { describe, expect, it } from "vitest";
import { components, placeholderTitle } from "@lmthing/ui/catalog";

const { examples, fallback, meta, probes, props } = components.LifeCounter;

describe("LifeCounter draft", () => {
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

  it("declares bounded draft states, the core near miss and confirmation for reset", () => {
    expect(meta.states).toEqual(["filled", "loading", "success"]);
    expect(meta.confirmParts).toEqual(["reset"]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Counter" }));
    expect(probes.some(({ kind }) => kind === "write")).toBe(true);
    expect(probes.some(({ kind }) => kind === "read")).toBe(true);
  });
});
