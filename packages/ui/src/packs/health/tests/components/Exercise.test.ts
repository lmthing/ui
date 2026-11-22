import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";
import { exerciseLabels } from "../../copy";

const { props, meta, examples, fallback, probes } = components.Exercise;
const minimal = { name: "Squat", photo: "local:1", muscles: ["Quads"], cues: ["Keep heels down"] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const invalid = [
  {},
  { ...minimal, color: "#ff0000" },
  { ...minimal, id: "e1" },
  ...[
    { name: "" },
    { name: "   " },
    { name: "a".repeat(29) },
    { photo: "https://example.org/image.png" },
    { photo: `lib:${"a".repeat(65)}` },
    { muscles: [] },
    { muscles: ["a", "b", "c", "d"] },
    { muscles: [""] },
    { muscles: ["a".repeat(17)] },
    { cues: [] },
    { cues: ["a", "b", "c", "d"] },
    { cues: [""] },
    { cues: [" ".repeat(60)] },
    { cues: ["a".repeat(61)] },
    { equipment: "" },
    { equipment: "a".repeat(21) },
    { best: "" },
    { best: "a".repeat(17) },
    { last: "" },
    { last: "a".repeat(17) },
    { style: "video" },
    { pixels: 4 },
    { start: "other" },
  ].map((fields) => ({ ...minimal, ...fields })),
];

describe("Exercise contract and boundaries", () => {
  it.each(examples)("accepts each domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each(invalid)("rejects missing, unbounded, unknown and runtime props", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("accepts exact maximum lengths and counts and trims all authored text", () => {
    const input = {
      name: "a".repeat(28),
      photo: "lib:exercise",
      muscles: Array.from({ length: 3 }, () => "a".repeat(16)),
      cues: Array.from({ length: 3 }, () => "a".repeat(60)),
      equipment: "a".repeat(20),
      best: "a".repeat(16),
      last: "a".repeat(16),
    };
    expect(props.safeParse(input).success).toBe(true);
    expect(
      props.parse({
        ...minimal,
        name: " Squat ",
        muscles: [" Quads "],
        cues: [" Keep heels down "],
      }),
    ).toEqual({ ...minimal, media: "cover" });
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
    expectTypeOf<Props<typeof props, typeof meta>["name"]>().toEqualTypeOf<string>();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("color");
  });
});

describe("Exercise fallback and metadata", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "plant", fields: ["name", "room"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
    },
    { things: [], items: [{ id: "bad", type: "record", sample: true, name: 4 }] },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: [{ id: "long", type: "record", sample: false, title: "a".repeat(200) }],
    },
  ];
  it.each(casts)("validates empty, useful, malformed and overlong casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("preserves neutral seeds and uses cast titles instead of domain defaults", () => {
    expect(fallback({ cast: casts[0]! })).toEqual({
      name: "Item one",
      photo: "local:1",
      muscles: ["Details"],
      cues: ["Details"],
    });
    expect(fallback({ cast: casts[1]! }).name).toBe("Fern");
    expect(fallback({ cast: casts[2]! }).name).toBe("Item one");
    expect(fallback({ cast: casts[3]! }).name.length).toBeLessThanOrEqual(28);
  });
  it("retains the core-first boundary, phone tier, probes, states and pack readiness gate", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", states: ["filled", "loading"] });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Player");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Player")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Exercise" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "e1/start", action: "press" },
    });
    expect(createRegistry({ packs: ["health"] }).ids.includes("Exercise")).toBe(packReady("health"));
    expect(createRegistry({ packs: ["health"], includeDrafts: true }).ids).toContain("Exercise");
  });
});

describe("Exercise states, parts and read/act", () => {
  it.each([undefined, "Barbell"])("draws optional equipment only when supplied: %s", (equipment) => {
    for (const best of [undefined, "50 kg × 8"])
      for (const last of [undefined, "40 kg × 8"]) {
        const input = { ...minimal, equipment, best, last };
        const html = renderInstance("Exercise", input, "filled", theme);
        for (const part of ["root", "name", "photo", "muscles", "cues", "start"])
          expect(html).toContain(`data-testid="home/c1/${part}"`);
        for (const part of ["equipment", "best", "last"] as const)
          expect(html.includes(`data-testid="home/c1/${part}"`)).toBe(Boolean(input[part]));
        expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
        expect(elementAt(html, "home/c1/start").attributes).toContain('role="button"');
        expect(html).not.toMatch(/role="(?:checkbox|radio|tab)"/);
        expect(affordancesOf(meta, props.parse(input), "e1")).toEqual([
          { address: "e1/start", part: "start", action: "press", detail: "" },
        ]);
        const reading = readComponent(components.Exercise, input, "e1").join("\n");
        for (const text of [minimal.name, minimal.muscles[0]!, minimal.cues[0]!, exerciseLabels.start])
          expect(reading).toContain(text);
        if (best) expect(reading).toContain(`Best: ${best}`);
        if (last) expect(reading).toContain(`Last: ${last}`);
      }
  });
  it.each(examples)("draws every cue and muscle and reads the same content", (input) => {
    const html = renderInstance("Exercise", input, "filled", theme);
    const reading = readComponent(components.Exercise, input, "e1").join("\n");
    for (const value of [...input.muscles, ...input.cues]) {
      expect(html).toContain(value);
      expect(reading).toContain(value);
    }
  });
  it("keeps loading media and text shapes but exposes no action or visible exercise content", () => {
    const html = renderInstance("Exercise", examples[0], "loading", theme);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('role="image"');
    expect(elementAt(html, "home/c1/start").attributes).toContain('aria-disabled="true"');
    expect(readComponent(components.Exercise, examples[0], "e1", "loading")).toEqual([
      "e1 Exercise (loading)",
    ]);
  });
});

describe("Exercise actions", () => {
  it.each(["filled", "loading"] as const)("dispatches only the visible start in %s", (state) => {
    const onAction = vi.fn();
    const runtime = createScreenController({
      screen: { id: "home", components: [{ id: "e1", c: "Exercise", ...minimal, state }] },
      defs: components,
      onAction,
    });
    expect(runtime.press("e1/start")).toMatchObject({ ok: state === "filled" });
    expect(runtime.act({ address: "e1/muscles", action: "toggle" })).toMatchObject({ ok: false });
    expect(runtime.press("e1/unknown")).toMatchObject({ ok: false });
    expect(onAction).toHaveBeenCalledTimes(Number(state === "filled"));
    if (state === "filled")
      expect(onAction).toHaveBeenCalledWith({
        address: "home/e1/start",
        action: "press",
      });
    expect(runtime.confirmation).toBeUndefined();
    runtime.dispose();
  });
});
