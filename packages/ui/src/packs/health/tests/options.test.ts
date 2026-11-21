import { describe, expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Vitals Wave 6 options", () => {
  const { props, meta } = components.Vitals;
  const reading = { label: "Pulse", value: 68, low: 60, high: 100, at: "08:12", unit: "bpm" };
  const input = { readings: [reading], goto: "add_reading" };
  it("distinguishes per-reading contexts and keeps brief history free of times and bands", () => {
    const contexts = {
      resting: "Resting",
      fasting: "Fasting",
      post_meal: "After a meal",
      active: "Active",
    } as const;
    for (const [context, label] of Object.entries(contexts)) {
      const history = props.parse({
        ...input,
        style: "history",
        detail: "brief",
        readings: [{ ...reading, context }],
      });
      const html = renderInstance("Vitals", history, "filled", theme);
      expect(html).toContain(`>${label}</span>`);
      expect(meta.read(history, "filled")[0]).toContain(label);
      expect(html).not.toMatch(/data-testid="home\/c1\/r1\/(?:at|band)"/);
      expect(meta.read(history, "filled")[0]).not.toContain(reading.at);
      expect(elementAt(html, "home/c1/r1/root").attributes).toContain('role="button"');
    }
    expect(props.safeParse({ ...input, readings: [{ ...reading, context: "unknown" }] }).success).toBe(false);
  });
});

describe("Workout Wave 6 options", () => {
  const { props, examples } = components.Workout;
  const input = examples[0]!;
  it("labels timed rounds and preserves addresses and optional session details", () => {
    const example = examples.find((sample) => sample.style === "interval")!;
    for (const interval of ["emom", "amrap", "circuit"] as const) {
      const workout = { ...example, interval };
      const html = renderInstance("Workout", workout, "filled", theme);
      expect(html).toContain("Round 2");
      expect(html).toContain("1:00");
      expect(elementAt(html, "home/c1/r1/done_2").attributes).toContain('role="checkbox"');
      const read = readComponent(components.Workout, workout, "w1").join("\n");
      for (const line of ["Perceived effort · 7/10", "Kept the same pace each minute."]) {
        expect(html).toContain(line);
        expect(read).toContain(line);
      }
    }
    expect(props.parse(input).style).toBe("sets");
    for (const fields of [
      { rpe: 0 },
      { rpe: 11 },
      { rpe: 5.5 },
      { note: "x".repeat(121) },
      { interval: undefined },
    ])
      expect(props.safeParse({ ...example, ...fields }).success).toBe(false);
  });
});
