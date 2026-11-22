import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  loadingLabel,
  packReady,
  type CastLike,
  type ScreenLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";

const { props, meta, fallback, examples, probes } = components.Dice;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const setup = examples[0];
const address = (part: string) => `home/d1/${part}`;
const roll = { address: "d1/roll", action: "press" };
const hold = (index: number) => ({ address: `d1/r${index}/hold`, action: "toggle" });
const render = (state: StateName) => renderInstance("Dice", setup, state, theme, { component: "d1" });

function controller(state: StateName = "empty", random = vi.fn(() => 3), onAction = vi.fn()) {
  const screen: ScreenLike = { id: "home", components: [{ id: "d1", c: "Dice", state, ...setup }] };
  return createScreenController({ screen, defs: components, random, onAction });
}

describe("Dice contract and boundaries", () => {
  it.each(examples)("parses a real example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("defaults to two six-sided pip dice and accepts the exact limits", () => {
    const parsed = props.parse({});
    expect({ ...parsed }).toEqual({ count: 2, sides: 6, style: "pips", detail: "full" });
    expect(parsed).toHaveProperty("dice", [{}, {}]);
    expect(props.safeParse({ ...parsed }).success).toBe(true);
    for (const sides of [4, 6, 8, 10, 12, 20])
      for (const count of [1, 6])
        expect(props.safeParse({ count, sides, style: "numbers" }).success).toBe(true);
  });

  it.each([
    { count: 0 },
    { count: 7 },
    { count: 1.5 },
    { sides: 5, style: "numbers" },
    { sides: "6" },
    { sides: 8 },
    { sides: 20, style: "pips" },
    { style: "dots" },
    { faces: [1, 2] },
    { held: [true, false] },
    { sum: 3 },
    { dice: [] },
    { color: "red" },
  ])("rejects invalid, derived and unknown props", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });

  it("retains its phone tier and core-first probes without readying the pack", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "Dice" }),
      expect.objectContaining({ kind: "choose", expect: "Counter" }),
      expect.objectContaining({ kind: "write", expect: "Dice" }),
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
      expect.objectContaining({ kind: "write", expectProps: { mod: -3 } }),
      expect.objectContaining({ kind: "write", expectProps: { drop: "low" } }),
      expect.objectContaining({ kind: "write", expectProps: { style: "pool" } }),
      expect.objectContaining({ kind: "read", expect: roll }),
    ]);
    expect(createRegistry({ packs: ["play"] }).ids.includes("Dice")).toBe(packReady("play"));
  });
});

describe("Dice fallback", () => {
  it("uses neutral numeric defaults without inventing rolled or cast-derived faces", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "entry", fields: ["name"] }],
        items: [{ id: "one", type: "entry", sample: true, name: "A round" }],
      },
      { things: [], items: [{ id: "one", type: "entry", sample: false, name: 4 }] },
    ];
    for (const cast of casts) expect(props.parse(fallback({ cast }))).toEqual(props.parse({}));
  });
});

describe("Dice states and parts", () => {
  it.each(["empty", "filled", "success"] as const)(
    "shows blank, stable slots without a result in %s",
    (state) => {
      const html = render(state);
      expect(elementAt(html, address("root"))).toBeDefined();
      expect(elementAt(html, address("dice_1"))).toBeDefined();
      for (const index of [1, 2]) {
        expect(elementAt(html, address(`r${index}/root`))).toBeDefined();
        expect(elementAt(html, address(`r${index}/face`)).attributes).toContain(`Die ${index}, not rolled`);
        expect(html).not.toContain(address(`r${index}/hold`));
      }
      expect(html).not.toContain(address("sum"));
      expect(elementAt(html, address("roll")).attributes).toContain('role="button"');
      expect(elementAt(html, address("roll_label"))).toBeDefined();
      expect(html).toContain("Ready to roll");
      expect(html).not.toContain(emptyLine());
    },
  );

  it("uses the shared cast-specific line when the host names an empty thing", () => {
    expect(renderInstance("Dice", setup, "empty", theme, "round")).toContain(emptyLine("round"));
  });

  it("loads in place without exposing face or action controls", () => {
    const html = render("loading");
    expect(elementAt(html, address("root"))).toBeDefined();
    expect(html).toContain(loadingLabel);
    expect(html).not.toContain(address("roll"));
    expect(html).not.toContain(address("sum"));
    expect(html).not.toMatch(/\/(?:face|hold)"/);
  });
});

describe("Dice read and act", () => {
  it("draws and reads a numbered d20 without inventing an outcome before the roll", () => {
    const screen: ScreenLike = { id: "home", components: [{ id: "d1", c: "Dice", ...examples[1] }] };
    const game = createScreenController({ screen, defs: components, random: () => 19 });
    expect(game.read()).toContain("1 die · 20 sides");
    expect(game.read()).not.toContain("Total");
    expect(game.act(roll).ok).toBe(true);
    expect(game.read()).toContain("Total 20 — Roll again — faces=[20]");
    expect(game.act(hold(1)).ok).toBe(true);
    expect(game.read()).toContain("held=[true]");
    expect(game.act(roll).ok).toBe(false);
  });

  it("rolls from empty, reads the computed result, and keeps a held face on reroll", () => {
    const random = vi
      .fn(() => 3)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(1);
    const onAction = vi.fn();
    const game = controller("empty", random, onAction);
    onAction.mockImplementationOnce(() => expect(game.read()).toContain("faces=[4,6]"));
    expect(game.read()).toContain("Dice (empty) [d1/roll press]");
    expect(game.act(hold(1)).ok).toBe(false);
    expect(game.act(roll).ok).toBe(true);
    expect(game.read()).toContain("Total 10");
    expect(game.read()).toContain("[d1/r1/hold toggle");
    expect(game.read()).toContain("[d1/r2/hold toggle");
    expect(game.act(hold(1)).ok).toBe(true);
    expect(game.act(roll).ok).toBe(true);
    expect(game.read()).toContain("Total 6");
    expect(game.read()).toContain("faces=[4,2] — held=[true,false]");
    expect(game.snapshotScreen().components[0]).not.toHaveProperty("faces");
    expect(random).toHaveBeenCalledTimes(3);
  });

  it("guards all-held and loading rolls; releasing one die restores roll in success", () => {
    const random = vi.fn(() => 5);
    const game = controller("success", random);
    expect(game.act(roll).ok).toBe(true);
    expect(game.act([hold(1), hold(2)]).ok).toBe(true);
    expect(game.read()).not.toContain("[d1/roll press]");
    expect(game.act(roll).ok).toBe(false);
    expect(game.act(hold(3)).ok).toBe(false);
    expect(game.act({ ...hold(2), value: "yes" }).ok).toBe(false);
    game.store.set(address("$state"), "loading");
    expect(game.read()).toBe("screen home\nd1 Dice (loading)");
    expect(game.act(roll).ok).toBe(false);
    expect(game.act(hold(2)).ok).toBe(false);
    expect(random).toHaveBeenCalledTimes(2);
    game.store.set(address("$state"), undefined);
    expect(game.act({ ...hold(2), value: false }).ok).toBe(true);
    expect(game.read()).toContain("[d1/roll press]");
    expect(game.act(roll).ok).toBe(true);
    expect(random).toHaveBeenCalledTimes(3);
  });
});
