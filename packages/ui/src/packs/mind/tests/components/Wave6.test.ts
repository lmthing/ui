import { describe, expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const instance = "home/c1/";

describe("Breathe grounding", () => {
  const input = { rounds: 1, style: "grounding" } as const;

  it("opens on the first sense without a clock or round count", () => {
    const html = renderInstance("Breathe", input, "filled", theme);
    expect([...addressedElements(html).keys()]).toEqual(
      ["root", "phase", "grounding", "step", "next"].map((part) => instance + part),
    );
    expect(html).toContain("Look for five things.");
    expect(elementAt(html, instance + "next").attributes).toContain('aria-label="Next sense"');
    const completed = renderInstance("Breathe", input, "success", theme);
    expect(completed).toContain("Grounding complete");
    expect(addressedElements(completed).has(instance + "next")).toBe(false);
  });

  it("advances all five cues only by pressing Next, then closes the action", () => {
    let now = 0;
    const screen = { id: "home", components: [{ id: "c1", c: "Breathe", ...input }] };
    const controller = createScreenController({ screen, defs: components, now: () => now });
    try {
      expect(controller.act({ address: "c1/circle", action: "play" }).ok).toBe(false);
      now += 600_000;
      controller.tick();
      for (const [index, cue] of [
        "five things",
        "four things",
        "three sounds",
        "two things",
        "one thing",
      ].entries()) {
        expect(controller.read()).toContain(`Step ${index + 1} of 5`);
        expect(controller.read()).toContain(cue);
        expect(controller.press("c1/next").ok).toBe(true);
      }
      expect(controller.read()).toContain("Grounding complete");
      expect(controller.read()).not.toContain("c1/next");
      expect(controller.press("c1/next").ok).toBe(false);
    } finally {
      controller.dispose();
    }
  });
});

describe("Entries options", () => {
  const entry = {
    date: "2026-10-02",
    text: "Breakfast by the open window.",
    mood: 4,
    tags: ["Quiet"],
    photo: "lib:parks",
    goto: "oct_02",
  };
  const base = { entries: [entry] };
  const prompt = "Small joys";

  it("keeps link addresses and stored photos while compact hides the thumbnail", () => {
    const render = (input: unknown) => addressedElements(renderInstance("Entries", input, "filled", theme));
    expect([...render({ ...base, media: "thumb" }).keys()]).toEqual([...render(base).keys()]);
    const compact = { ...base, media: "none", prompt };
    const parts = render(compact);
    expect(parts.has(instance + "r1/photo")).toBe(false);
    expect(parts.get(instance + "r1/root")?.attributes).toContain('role="link"');
    expect(parts.has(instance + "r1/mood")).toBe(true);
    expect(parts.has(instance + "r1/tags")).toBe(true);
    expect(parts.has(instance + "prompt")).toBe(true);
    expect(components.Entries.props.parse(compact).entries[0]?.photo).toBe(entry.photo);
    const read = readComponent(components.Entries, compact, "c1").join("\n");
    expect(read).toContain(prompt);
    expect(read.match(/Small joys/g)).toHaveLength(1);
    expect(read).not.toContain("photo:parks");
    expect(read).toContain("[c1/r1 press");
  });

  it("does not expose authored prompt copy in empty or loading", () => {
    for (const state of ["empty", "loading"] as const) {
      const html = renderInstance("Entries", { ...base, prompt }, state, theme);
      expect(html).not.toContain(prompt);
      expect(html).not.toContain('role="link"');
    }
    expect(components.Entries.props.safeParse({ ...base, prompt: " " }).success).toBe(false);
  });
});

describe("SleepLog options", () => {
  const base = { bed: "22:45", wake: "06:45", goto: "sleep_log" };
  const stages = { deep: 80, rem: 110, light: 260, awake: 30 };
  const input = { ...base, style: "stages", stages, hrAvg: 61, hrv: 48 };

  it("renders addressed stage shares and wearable timings with the same agent reading", () => {
    const html = renderInstance("SleepLog", input, "filled", theme);
    const parts = addressedElements(html);
    for (const part of ["stages", "hr_avg", "hrv", "r1/label", "r2/label", "r3/label", "r4/label"])
      expect(parts.has(instance + part), part).toBe(true);
    expect(parts.get(instance + "r2/label")?.text).toEqual(["REM"]);
    const read = readComponent(components.SleepLog, input, "c1").join("\n");
    for (const value of ["7 h 30 min", "61 bpm", "48 ms"]) {
      expect(html).toContain(value);
      expect(read).toContain(value);
    }
    expect(read).toContain("r2/label REM: 110 min (23%)");
    expect(html).toContain("23%");
    expect(read).toContain("[c1/edit press");
  });

  it("keeps the summary useful with partial wearable data, without fabricating stages", () => {
    const html = renderInstance("SleepLog", { ...base, style: "stages", hrv: 0 }, "filled", theme);
    const parts = addressedElements(html);
    expect(parts.has(instance + "stages")).toBe(false);
    expect(parts.has(instance + "hr_avg")).toBe(false);
    expect(html).toContain("0 ms");
    expect(parts.has(instance + "night")).toBe(true);
  });

  it.each([
    { stages: { ...stages, light: 261 } },
    { stages: { ...stages, light: 259 } },
    { stages: { ...stages, rem: -1 } },
    { awake: 31 },
    { hrv: -1 },
    { hrAvg: 0 },
  ])("rejects inconsistent or out-of-range values: %j", (override) => {
    expect(components.SleepLog.props.safeParse({ ...input, ...override }).success).toBe(false);
  });
});

describe("Soundscape saved mixes", () => {
  const sounds = [
    { label: "Rain", icon: "cloud_rain", level: 6 },
    { label: "Wind", icon: "wind", level: 2 },
  ];
  const presets = [
    { label: "Night rain", levels: [3, 0] },
    { label: "Day rain", levels: [10, 4] },
  ];
  const input = { sounds, presets, timer: 10 };

  it("offers the named mixes as unselected chips", () => {
    const html = renderInstance("Soundscape", input, "filled", theme);
    expect(elementAt(html, instance + "presets").attributes).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Night rain"');
    expect(html).toContain('aria-label="Day rain"');
  });

  it("applies each mix atomically, supports subsequent sliders, and leaves timer and sibling alone", () => {
    const screen = { id: "home", components: ["c1", "c2"].map((id) => ({ id, c: "Soundscape", ...input })) };
    const controller = createScreenController({ screen, defs: components });
    const mix = (value: string) => controller.act({ address: "c1/presets", action: "select", value });
    const volume = (value: number) => controller.act({ address: "c1/r1/mix_level", action: "set", value });
    const line = () =>
      controller
        .read()
        .split("\n")
        .find((line) => line.startsWith("c1 Soundscape"));
    try {
      expect(mix("Not a preset").ok).toBe(false);
      expect(controller.act({ address: "c1/r1/level", action: "set", value: 2 }).ok).toBe(false);
      expect(controller.press("c1/mix").ok).toBe(true);
      expect(mix("Night rain").ok).toBe(true);
      expect(line()).toContain('10 min — Pause mix — "Rain": 3 — "Wind": 0');
      expect(line()).toContain('Selected mix: "Night rain"');
      expect(volume(6).ok).toBe(true);
      expect(line()).toContain('"Rain": 6 — "Wind": 0');
      expect(line()).not.toContain("Selected mix");
      expect(mix("Day rain").ok).toBe(true);
      expect(line()).toContain('"Rain": 10 — "Wind": 4');
      expect(controller.read()).toContain(
        'c2 Soundscape Sleep timer — 10 min — Play mix — "Rain": 6 — "Wind": 2',
      );
      expect(mix("Night rain").ok).toBe(true);
      expect(line()).toContain('"Rain": 3 — "Wind": 0');
    } finally {
      controller.dispose();
    }
  });

  it.each([
    { presets: [] },
    { presets: [{ label: "Too few", levels: [1] }] },
    { presets: [{ label: "Too high", levels: [1, 11] }] },
    { presets: [...presets, { label: "night rain", levels: [3, 0] }] },
    { presets: [{ label: "Too many", levels: [1, 0, 1] }] },
  ])("rejects invalid preset lists: %j", ({ presets }) => {
    expect(components.Soundscape.props.safeParse({ ...input, presets }).success).toBe(false);
  });
});
