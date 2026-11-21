import { describe, expect, it } from "vitest";
import { components, placeholderTitle, readComponent } from "@lmthing/ui/catalog";

const { props, fallback, examples, meta, probes } = components.BuzzerPad;

describe("BuzzerPad draft", () => {
  it.each(examples)("accepts each example", (example) => expect(props.safeParse(example).success).toBe(true));
  it("uses cast names, neutral placeholders and distinct default swatches", () => {
    const neutral = fallback({ cast: { things: [], items: [] } });
    expect(neutral.players.map(({ name }) => name)).toEqual([placeholderTitle(0), placeholderTitle(1)]);
    expect(new Set(neutral.players.map(({ swatch }) => swatch)).size).toBe(2);
    const things = [{ type: "team", fields: ["name"] }];
    const item = { id: "team", type: "team", sample: true, name: "First team" };
    expect(fallback({ cast: { things, items: [item] } }).players[0]?.name).toBe("First team");
    expect(props.safeParse(fallback({ cast: { things, items: [{ ...item, name: 5 }] } })).success).toBe(true);
  });
  it("bounds players, swatches and prompt without accepting timing state", () => {
    const player = { name: "x".repeat(16), swatch: "grey" };
    const players = Array.from({ length: 4 }, () => player);
    expect(props.safeParse({ players, prompt: "x".repeat(48) }).success).toBe(true);
    for (const invalid of [
      { players: [player] },
      { players: [...players, player] },
      { players: [player, { name: "Player" }] },
      { players: [player, { ...player, swatch: "#123456" }] },
      { players: [player, { ...player, name: "x".repeat(17) }] },
      { prompt: "x".repeat(49) },
      { style: "other" },
      { winner: 0 },
      { deltas: [0, 5] },
    ])
      expect(props.safeParse({ players, ...invalid }).success).toBe(false);
  });
  it("reads the public prompt and exposes a separate buzz address for each player", () => {
    const lines = readComponent(components.BuzzerPad, examples[0], "b1").join("\n");
    expect(lines).toContain("Name that leaf");
    expect(lines).toContain("[b1/r1/buzz press]");
    expect(lines).toContain("[b1/r2/buzz press]");
  });
  it("keeps late buzzes and the host reset offered after a winner locks", () => {
    const lines = readComponent(components.BuzzerPad, examples[0], "b1", "success").join("\n");
    expect(meta.parts).toContain("winner");
    expect(lines).toContain("[b1/r2/buzz press]");
    expect(lines).toContain("[b1/reset press]");
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timer" }));
  });
});
