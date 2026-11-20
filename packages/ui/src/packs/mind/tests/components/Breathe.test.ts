import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.Breathe;
const custom = { pattern: "custom", rounds: 20, inhale: 0, hold: 10, exhale: 10, rest: 0 };

describe("Breathe schema", () => {
  it.each(examples)("accepts a mind example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("uses a box pattern and the default finishes when omitted", () => {
    expect(props.parse({ rounds: 1 })).toEqual({
      pattern: "box",
      rounds: 1,
      surface: "card",
      emphasis: "normal",
    });
    expectTypeOf<Props<typeof props, typeof meta>["rounds"]>().toEqualTypeOf<number>();
  });

  it("accepts exact duration and round limits", () => {
    expect(props.parse(custom)).toMatchObject(custom);
  });

  it.each([
    {},
    { rounds: 0 },
    { rounds: 21 },
    { rounds: 1.5 },
    { rounds: 1, pattern: "slow" },
    { rounds: 1, pattern: "calm", rest: 0 },
    { ...custom, inhale: -1 },
    { ...custom, hold: 11 },
    { ...custom, exhale: 1.5 },
    { ...custom, rest: null },
    { ...custom, rest: undefined },
    { ...custom, hold: 0, exhale: 0 },
    { ...custom, color: "red" },
    { ...custom, elapsed: 5 },
  ])("rejects invalid or runtime-only fields", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Breathe fallback and metadata", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "routine", fields: ["name"] }],
      items: [{ id: "routine_1", type: "routine", sample: true, name: "Evening wind-down" }],
    },
    { things: [], items: [{ id: "routine_1", type: "routine", sample: true, name: 7 }] },
  ];
  it.each(casts)("seeds a valid single box round without requiring cast text", (cast) => {
    expect(props.parse(fallback({ cast }))).toMatchObject({ pattern: "box", rounds: 1 });
  });

  it("preserves the core-first probe, phone tier, root and the pack readiness gate", () => {
    expect(meta).toMatchObject({
      tier: "phone",
      states: ["filled", "success"],
      parts: ["root", "circle", "phase", "rounds"],
    });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Timer");
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Breathe" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timer" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "Breathe" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", screen: 0, expect: { address: "b1/circle", action: "play" } }),
    );
    expect(createRegistry({ packs: ["mind"] }).ids.includes("Breathe")).toBe(packReady("mind"));
    expect(createRegistry({ packs: ["mind"], includeDrafts: true }).ids).toContain("Breathe");
  });
});

describe("Breathe reading", () => {
  it("reports the initial cue, rounds and stable action addresses", () => {
    const reading = readComponent(components.Breathe, { rounds: 4 }, "b1").join("\n");
    for (const text of ["Breathe in", "4 rounds left", "[b1/circle play", "[b1/circle pause"])
      expect(reading).toContain(text);
  });

  it("reads completion without offering play or pause", () => {
    const reading = readComponent(components.Breathe, { rounds: 1 }, "b1", "success").join("\n");
    expect(reading).toContain("Exercise complete");
    expect(reading).toContain("0 rounds left");
    expect(reading).not.toContain("[b1/circle");
  });
});
