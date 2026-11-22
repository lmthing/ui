import { expect, it, vi } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { visibleTexts } from "../../../../../test/variants";
import { Funnel } from "../../components";

const { examples, fallback, probes, props } = Funnel;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, title: "x".repeat(33) },
  { ...valid, stages: [] },
  { ...valid, stages: Array.from({ length: 7 }, () => ({ label: "x", count: 0 })) },
  { ...valid, unit: "x".repeat(13) },
  { ...valid, style: "not-a-choice!" },
  { ...valid, stages: [{ label: "Open", count: 5 }] },
  ...[
    { label: "x".repeat(21) },
    { count: -1 },
    { count: Infinity },
    { value: -1 },
    { goto: "Bad route" },
    { ratio: 1 },
  ].map((change) => ({ ...valid, stages: [{ ...valid.stages[0], ...change }, valid.stages[1]] })),
];

it.each(examples)("accepts a real example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("defaults to bars and accepts six stages and exact text limits", () => {
  const stages = Array.from({ length: 6 }, () => ({ label: "x".repeat(20), count: 0, value: 0 }));
  expect(props.parse({ title: "x".repeat(32), unit: "x".repeat(12), stages }).style).toBe("bars");
});

it.each(invalid)("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  expect(valid.stages.map(({ label }) => label)).toEqual(["Item one", "Item two"]);
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(
      props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } }))
        .success,
    ).toBe(true);
  }
  expect(fallback({ cast: { things, items } }).stages[0]?.label).toBe("Sample");
});

it("declares the core near miss, write variant and a linked-stage read", () => {
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "write", "read"]);
  expect(probes[1]).toMatchObject({ expect: "Bars" });
  expect(probes[3]).toMatchObject({ variant: { axis: "detail", value: "brief" } });
  expect(probes[4]).toMatchObject({ expect: { address: "f1/r3", action: "press" } });
});

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
it("draws addressed rows and conversions in both layouts, hiding only value for brief detail", () => {
  for (const style of ["bars", "summary"] as const) {
    const input = { ...examples[1], style };
    const html = renderInstance("Funnel", input, "filled", theme);
    const parts = addressedElements(html);
    expect(parts.get("home/c1/overall")?.text).toEqual(["38%"]);
    expect(visibleTexts(html)).toContain("Overall conversion");
    expect(parts.has("home/c1/r2/step")).toBe(true);
    expect(visibleTexts(html)).toContain("From previous: 50%");
    expect(parts.get("home/c1/r3/count")?.text).toEqual(["30"]);
    expect(parts.has("home/c1/r3/value")).toBe(true);
    const brief = addressedElements(renderInstance("Funnel", { ...input, detail: "brief" }, "filled", theme));
    expect(brief.has("home/c1/r3/value")).toBe(false);
    expect(brief.has("home/c1/r3/step")).toBe(true);
  }
});

it("only offers a drill-down on the linked stage and never offers it in empty or loading", () => {
  const input = examples[0]!;
  const def = components.Funnel;
  const active = readComponent(def, input, "f1").join("\n");
  expect(active).toContain("Overall conversion: 30%");
  expect(active.match(/\[[^\]]+ press[^\]]*\]/g)).toEqual(["[f1/r3 press→reminders]"]);
  for (const state of ["empty", "loading"] as const) {
    expect(readComponent(def, input, "f1", state).join("\n")).not.toContain(" press");
    expect(renderInstance("Funnel", input, state, theme)).not.toContain('role="link"');
  }
  const onLink = vi.fn();
  const screen = { id: "home", components: [{ id: "f1", c: "Funnel", ...input }] };
  const controller = createScreenController({ screen, defs: components, onLink });
  try {
    expect(controller.act({ address: "f1/r1", action: "press" }).ok).toBe(false);
    expect(controller.act({ address: "f1/r3", action: "press" }).ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("reminders", "home/f1/r3");
  } finally {
    controller.dispose();
  }
});
