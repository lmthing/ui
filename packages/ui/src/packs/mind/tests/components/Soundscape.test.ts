import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readScreen,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const def = components.Soundscape;
const { props, meta, examples, fallback, probes } = def;
const sample = examples[0]!;
const sound = sample.sounds[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = { id: "home", components: [{ id: "s1", c: "Soundscape", ...sample }] };
const defs = { Soundscape: def };

describe("Soundscape schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it.each([2, 6])("accepts %i sounds with 14-character labels and inclusive bounds", (count) => {
    const label = "a".repeat(14);
    const raw = { timer: 120, sounds: Array(count).fill({ ...sound, label: ` ${label} `, level: 10 }) };
    expect(props.parse(raw)).toMatchObject({
      arrange: "grid",
      surface: "card",
      sounds: Array(count).fill({ ...sound, label, level: 10 }),
      timer: 120,
    });
  });

  it.each([
    {},
    { ...sample, sounds: [sound] },
    { ...sample, sounds: Array(7).fill(sound) },
    { ...sample, timer: -1 },
    { ...sample, timer: 121 },
    { ...sample, timer: 0.5 },
    { ...sample, color: "blue" },
    { ...sample, running: true },
    { ...sample, arrange: "strip" },
    ...[
      { id: "r1" },
      { label: " " },
      { label: "a".repeat(15) },
      { icon: "unknown" },
      { level: -1 },
      { level: 11 },
      { level: 0.5 },
    ].map((overrides) => ({ ...sample, sounds: [sound, { ...sound, ...overrides }] })),
  ])("rejects invalid wire props", (input) => expect(props.safeParse(input).success).toBe(false));

  it("adds validator IDs only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["sounds"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("running");
  });
});

describe("Soundscape fallback and metadata", () => {
  it("builds silent loops from cast titles and fills the minimum with neutral placeholders", () => {
    const empty: CastLike = { things: [], items: [] };
    const matching: CastLike = {
      things: [{ type: "sound", fields: ["first"] }],
      items: [{ id: "sample", type: "sound", sample: true, first: "A very long placeholder title" }],
    };
    const malformed: CastLike = { ...matching, items: [{ ...matching.items[0]!, first: 7 }] };
    const neutral = [0, 1].map((i) => ({ label: placeholderTitle(i), icon: "music", level: 0 }));
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty })).toEqual({ sounds: neutral, timer: 0 });
    expect(fallback({ cast: malformed })).toEqual({ sounds: neutral, timer: 0 });
    expect(fallback({ cast: matching }).sounds).toEqual([
      { ...neutral[0], label: "A very long" },
      neutral[1],
    ]);
  });

  it("stays behind the pack readiness gate and keeps the phone tier and core-first probes", () => {
    expect(createRegistry({ packs: ["mind"] }).ids.includes("Soundscape")).toBe(packReady("mind"));
    expect(createRegistry({ packs: ["mind"], includeDrafts: true }).schema("Soundscape")).toBe(props);
    expect(meta).toMatchObject({ status: "ready", tier: "phone", states: ["filled"] });
    expect(meta).not.toHaveProperty("confirmParts");
    expect(meta.realPath).not.toBe("");
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Soundscape",
      "Player",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "arrange", value: "rows" } }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "s1/r2/level", action: "set" } }),
    );
  });
});

describe("Soundscape state and parts", () => {
  it.each([sample, { ...sample, arrange: "rows" }])(
    "keeps all parts and exact slider values in both layouts",
    (example) => {
      const html = renderInstance("Soundscape", example, "filled", theme, { component: "s1" });
      const base = "home/s1";
      const parts = [
        ...["root", "mix", "mix_label", "mix_icon", "timer", "timer_label"].map((part) => `${base}/${part}`),
        ...example.sounds.flatMap((_, i) =>
          ["root", "label", "icon", "level"].map((part) => `${base}/r${i + 1}/${part}`),
        ),
      ];
      expect([...addressedElements(html).keys()].sort()).toEqual(parts.sort());
      const attributes = (part: string) => elementAt(html, `${base}/${part}`).attributes;
      expect(attributes("timer")).toContain('role="slider"');
      expect(attributes("timer")).toContain(`aria-valuenow="${example.timer}"`);
      expect(attributes("timer")).toContain('aria-valuemax="120"');
      expect(attributes("mix")).toContain('aria-label="Play mix"');
      example.sounds.forEach(({ label, level }, i) => {
        const slider = attributes(`r${i + 1}/level`);
        expect(slider).toContain('role="slider"');
        expect(slider).toContain(`aria-label="${label} volume"`);
        expect(slider).toContain(`aria-valuenow="${level}"`);
        expect(slider).toContain('aria-valuemax="10"');
      });
    },
  );
});

describe("Soundscape read and act", () => {
  // prettier-ignore
  it("preserves wire-backed volume edits when reopening a mix without presets", () => {
    const runtime = createScreenController({ screen, defs });
    try {
      expect(runtime.act({ address: "s1/r1/level", action: "set", value: 1 }).ok).toBe(true);
      expect(runtime.act({ address: "s1/r1/mix_level", action: "set", value: 5 }).ok).toBe(false);
      const snapshot = runtime.snapshotScreen();
      expect(snapshot.components[0]?.sounds).toMatchObject([{ ...sound, level: 1 }, ...sample.sounds.slice(1)]);
      expect(readScreen(snapshot, defs)).toContain('"Rain": 1');
    } finally { runtime.dispose(); }
  });

  it("sets independent levels and the timer without changing sound identity or order", () => {
    const steps = [
      { address: "s1/r2/level", action: "set", value: 10 },
      { address: "s1/timer", action: "set", value: 0 },
    ];
    const result = planAct(screen, defs, {}, steps);
    if (!result.ok) throw new Error(result.code);
    const reading = readScreen(screen, defs, result.values);
    expect(reading).toContain('Sleep timer — Off — Play mix — "Rain": 6 — "Wind": 10 — "Fire": 0');
    for (const part of ["timer", "r1/level", "r2/level", "r3/level"])
      expect(reading).toContain(`[s1/${part} set`);
  });

  it("switches the same play button to pause, expires live, then plays again without losing levels", () => {
    let now = 0;
    const runtime = createScreenController({ screen, defs, now: () => now, requireMounted: true });
    for (const part of ["mix", "timer", "r2/level"]) runtime.registerPart(`home/s1/${part}`);
    try {
      expect(runtime.press("s1/mix").ok).toBe(true);
      expect(runtime.read()).toContain("Pause mix");
      expect(runtime.read()).toContain("[s1/mix pause]");
      expect(runtime.act({ address: "s1/mix", action: "play" }).ok).toBe(false);
      expect(runtime.act({ address: "s1/r2/level", action: "set", value: 0 }).ok).toBe(true);
      expect(runtime.act({ address: "s1/timer", action: "set", value: 1 }).ok).toBe(true);
      expect(runtime.act({ address: "s1/mix", action: "pause" }, { agent: true }).ok).toBe(true);
      expect(runtime.read()).toContain("Play mix");
      expect(runtime.press("s1/mix").ok).toBe(true);
      now = 60000;
      runtime.tick();
      expect(runtime.read()).toContain('Sleep timer — 1 min — Play mix — "Rain": 6 — "Wind": 0 — "Fire": 0');
      expect(runtime.act({ address: "s1/mix", action: "pause" }).ok).toBe(false);
      expect(runtime.press("s1/mix").ok).toBe(true);
      expect(runtime.store.get("home/s1/$sleep")).toMatchObject({ running: true, seconds: 0 });
    } finally {
      runtime.dispose();
    }
  });

  it.each([
    { address: "s1/timer", value: -1, code: "invalid_value" },
    { address: "s1/timer", value: 121, code: "invalid_value" },
    { address: "s1/timer", value: 2.5, code: "invalid_value" },
    { address: "s1/r1/level", value: 11, code: "invalid_value" },
    { address: "s1/r1/level", value: -1, code: "invalid_value" },
    { address: "s1/r1/level", value: 1.5, code: "invalid_value" },
    { address: "s1/r4/level", value: 0, code: "not_actionable" },
    { address: "s1/r1/label", value: 0, code: "not_actionable" },
  ])("rejects $address set to $value", ({ address, value, code }) => {
    expect(planAct(screen, defs, {}, [{ address, action: "set", value }])).toMatchObject({
      ok: false,
      code,
    });
  });
});
