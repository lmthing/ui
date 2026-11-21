import { describe, expect, it } from "vitest";
import { components, placeholderTitle, readComponent, wordsFor } from "@lmthing/ui/catalog";

const { props, fallback, examples, meta, probes } = components.PassReveal;

describe("PassReveal draft", () => {
  it.each(examples)("accepts each example", (example) => expect(props.safeParse(example).success).toBe(true));
  it("builds up to three cast names without treating cast details as secrets", () => {
    const thing = { type: "guest", fields: ["name", "detail"] };
    const item = {
      id: "guest",
      type: "guest",
      sample: true,
      name: "Guest",
      detail: "Unrelated private data",
    };
    expect(fallback({ cast: { things: [thing], items: [item] } }).players).toEqual(
      ["Guest", placeholderTitle(1), placeholderTitle(2)].map((name) => ({
        name,
        role: wordsFor().placeholderDetail,
      })),
    );
    for (const items of [[], [{ ...item, name: 1 }]]) {
      expect(props.safeParse(fallback({ cast: { things: [thing], items } })).success).toBe(true);
    }
  });
  it("bounds private cards and refuses to seed runtime progress", () => {
    const player = { name: "n".repeat(24), role: "r".repeat(32), detail: "d".repeat(120) };
    const players = Array.from({ length: 12 }, () => player);
    expect(props.safeParse({ players, prompt: "p".repeat(48) }).success).toBe(true);
    for (const input of [
      { players: players.slice(0, 2) },
      { players: [...players, player] },
      { players: [...players.slice(1), { ...player, role: "r".repeat(33) }] },
      { players: [...players.slice(1), { ...player, detail: "d".repeat(121) }] },
      { players, prompt: "p".repeat(49) },
      { players, style: "other" },
      { players, seen: 1 },
    ])
      expect(props.safeParse(input).success).toBe(false);
  });
  it("never includes a veiled secret or a later player's name in the initial reading", () => {
    const lines = readComponent(components.PassReveal, examples[0], "p1").join("\n");
    expect(lines).toContain("Anna");
    expect(lines).toContain("Find your garden role");
    for (const hidden of ["Seed keeper", "Save a seed", "Rain maker", "Trail finder", "Ben", "Sam"]) {
      expect(lines).not.toContain(hidden);
    }
    expect(lines).toContain("[p1/reveal flip]");
  });
  it("declares confirmation, loading and round-ready states", () => {
    expect(meta.confirmParts).toEqual(["restart"]);
    expect(meta.states).toEqual(["filled", "empty", "loading", "success"]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Choice" }));
  });
});
