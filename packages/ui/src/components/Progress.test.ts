import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Progress;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const bar = { label: "Protein", value: 62, of: 120, unit: "g" };

describe("Progress schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives root presence", () => {
    expect(props.parse({ bars: [{ label: " Protein ", value: 1, of: 2 }] })).toEqual({
      figures: "exact",
      style: "bars",
      emphasis: "normal",
      detail: "full",
      bars: [{ label: "Protein", value: 1, of: 2, tone: "warn", root: undefined }],
    });
    expect((props.parse({ bars: [{ ...bar, goto: "macros" }] }).bars[0] as { root?: string }).root).toBe(
      "macros",
    );
  });
  it.each([
    {},
    { bars: Array.from({ length: 6 }, () => bar) },
    { bars: [{ ...bar, label: "" }] },
    { bars: [{ ...bar, label: "a".repeat(21) }] },
    { bars: [{ ...bar, value: -1 }] },
    { bars: [{ ...bar, of: 0 }] },
    { bars: [{ ...bar, of: -5 }] },
    { bars: [{ ...bar, value: "3" }] },
    { bars: [{ ...bar, value: NaN }] },
    { bars: [{ ...bar, unit: "a".repeat(17) }] },
    { bars: [{ ...bar, due: "2026-02-30" }] },
    { bars: [{ ...bar, unit: undefined, due: "2026-12-05" }] },
    { bars: [{ ...bar, over: "warn" }] },
    { bars: [{ ...bar, tone: "neutral" }] },
    { bars: [bar], density: "thin" },
    { bars: [bar], figures: "rounded" },
    { bars: [{ ...bar, goto: "Bad ID" }] },
    { bars: [{ ...bar, root: "x" }] },
    { bars: [{ ...bar, color: "red" }] },
    { bars: [bar], pixels: 4 },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts one to five bars at the exact limits, including a bar past its target", () => {
    const full = { label: "a".repeat(20), value: 1e6, of: 0.5, unit: "a".repeat(8), goto: "a".repeat(64) };
    for (let count = 1; count <= 5; count++)
      expect(props.safeParse({ bars: Array.from({ length: count }, () => full) }).success).toBe(true);
  });
  it("adds item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["bars"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("density");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Progress fallback and metadata", () => {
  it("validates with empty, full and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "x", type: "plant", sample: true, name: 4 }],
      },
    ];
    for (const cast of casts) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
      expect(fallback({ cast })).toEqual({ bars: [] });
    }
  });
  it("declares item parts, states and press only on linked bars", () => {
    expect(meta).toMatchObject({ id: "Progress", group: "data", region: "body", weight: 2, tier: "phone" });
    expect(meta.items).toMatchObject({
      key: "bars",
      parts: ["root", "label", "amount", "deadline"],
      variants: { tone: ["warn", "good", "bad"] },
    });
    expect(meta.states).toEqual(["filled", "empty", "loading", "error"]);
    const linked = props.parse({ bars: [{ ...bar, goto: "macros" }, bar] });
    expect(affordancesOf(meta, stampItemIds(meta, linked), "p1")).toEqual([
      { address: "p1/r1", part: "root", action: "press", detail: "→macros" },
    ]);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse({ bars: [bar] })), "p1")).toEqual([]);
  });
  it("reads each bar as its amount against its target", () => {
    const read = readComponent(
      components.Progress,
      { bars: [bar, { label: "Carbs", value: 180, of: 200 }] },
      "p1",
    );
    expect(read.join("\n")).toContain("62 of 120 g");
    expect(read.join("\n")).toContain("180 of 200");
    expect(readComponent(components.Progress, { bars: [bar] }, "p1", "loading")[0]).not.toContain("62");
  });
});

describe("Progress fallback and metadata", () => {
  it("has a real path and well-formed choose, write and read probes", () => {
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const near of ["ActivityRings", "Bars", "Stats", "Steps"]) expect(meta.pick).toContain(near);
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Progress",
      "Progress",
      "Progress",
      "Stats",
      "Steps",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Progress" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 1,
      expect: { address: "p1/r2", action: "press" },
    });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : "";
      for (const name of [meta.id]) expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
  });
  it("does not expose the retired id in the live registry", () => {
    const registry = createRegistry();
    expect(registry.resolve("progress")).toBe("Progress");
    expect(registry.resolve("p-r-o-g-r-e-s-s")).toBe("Progress");
    expect(registry.resolve("r-i-n-g")).toBeUndefined();
  });
});

describe("Progress ring", () => {
  const goal = { label: "A".repeat(24), value: 8, of: 5 };
  const ring = { style: "ring", bars: [goal], sub: "Two to go" } as const;

  it("accepts one long label, rejects row actions and preserves the stored caption", () => {
    const brief = { ...ring, detail: "brief" };
    expect(props.parse(brief).sub).toBe(ring.sub);
    expect(props.safeParse({ ...ring, figures: "short" }).success).toBe(false);
    expect(props.safeParse({ ...ring, bars: [{ ...goal, tone: "warn" }] }).success).toBe(true);
    for (const bars of [
      [goal, goal],
      [{ ...goal, goto: "details" }],
      [{ ...goal, tone: "good" }],
      [{ ...goal, label: "A".repeat(25) }],
    ]) {
      expect(props.safeParse({ ...ring, bars }).success).toBe(false);
    }
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(brief)), "p1")).toEqual([]);
    expect(readComponent(components.Progress, brief, "p1")).toEqual([
      `p1 Progress[ring] 8 of 5 — Over by 3 — "${goal.label}"`,
    ]);
  });

  it.each(["filled", "empty", "loading"] as const)("draws only the applicable parts in %s", (state) => {
    const html = renderInstance("Progress", ring, state, theme);
    expect(html).toContain('data-testid="home/c1/root"');
    expect(html).not.toContain("home/c1/r1/");
    expect(html).not.toMatch(/role="(?:link|button)"/);
    for (const part of ["ring", "value", "label", "sub"])
      expect(html.includes(`data-testid="home/c1/${part}"`)).toBe(state === "filled");
    if (state === "filled") {
      const [filled, total] = html.match(/stroke-dasharray="([^"]+)"/)?.[1]?.split(" ") ?? [];
      expect(Number(filled) / Number(total)).toBeCloseTo(1);
    }
  });

  it("offers no linked bar in the empty state", () => {
    const input = { bars: [{ ...bar, goto: "details" }] };
    expect(renderInstance("Progress", input, "empty", theme)).not.toMatch(/role="link"/);
    expect(readComponent(components.Progress, input, "p1", "empty")).toEqual([
      "p1 Progress (empty) No progress recorded",
    ]);
  });
});

it.each(["bars", "ring"] as const)("distinguishes measured zero, missing data and failure in %s", (style) => {
  const input = { style, bars: [{ label: "Meals packed", value: 0, of: 24, unit: "meals" }] };
  const filled = renderInstance("Progress", input, "filled", theme);
  expect(filled).toContain("of 24 meals");
  expect(readComponent(components.Progress, input, "p1").join("\n")).toContain("0 of 24 meals");
  for (const [state, source, message] of [
    ["filled", { style, bars: [] }, "No progress recorded"],
    ["empty", input, "No progress recorded"],
    ["error", input, "Couldn’t load progress"],
  ] as const) {
    const html = renderInstance("Progress", source, state, theme);
    expect(html.includes('data-testid="home/c1/status"')).toBe(true);
    expect(html.includes(message)).toBe(true);
    expect(html.includes("of 24 meals")).toBe(false);
    expect(html.includes('role="alert"')).toBe(state === "error");
    expect(readComponent(components.Progress, source, "p1", state).join("\n")).toContain(message);
  }
});

it.each(["bars", "ring"])("renders and reads the supplied units, target, and deadline for %s", (style) => {
  for (const [value, total, remaining] of [
    [8, 12, 4],
    [12, 12, 0],
    [15, 12, 0],
    [11.5, 12, 0.5],
    [0.1, 0.3, 0.2],
    [2e-8, 3e-8, 1e-8],
  ] as const) {
    const input = {
      style,
      bars: [{ label: "Material used", value, of: total, unit: "m", due: "2026-12-05" }],
    };
    const html = renderInstance("Progress", input, "filled", theme);
    const reading = readComponent(components.Progress, input, "p1").join(" ");
    expect(reading).toContain(`${value} of ${total} m`);
    for (const text of [`of ${total} m`, `Due 5 Dec 2026 · ${remaining} m remaining`]) {
      expect(html).toContain(text);
      expect(reading).toContain(text);
    }
  }
  const empty = { style, bars: [] };
  expect(renderInstance("Progress", empty, "filled", theme)).toContain("No progress recorded");
  expect(readComponent(components.Progress, empty, "p1").join(" ")).not.toContain("0 of 1");
});

describe("Progress rendering", () => {
  it("uses the same abbreviated figures in the view and reader without changing stored targets", () => {
    const raw = { figures: "short", bars: [{ ...bar, value: 4200, of: 6000, goto: "totals" }] };
    const html = renderInstance("Progress", raw, "filled", theme);
    const line = readComponent(components.Progress, raw, "p1").join(" ");
    expect(html).toContain("4.2K of 6K g");
    expect(line).toContain("4.2K of 6K g");
    expect(line).toContain("4200 of 6000 g");
    expect(html).toContain('data-testid="home/c1/r1/amount"');
    expect(props.parse(raw).bars[0]).toMatchObject({ value: 4200, of: 6000 });
  });
  it.each(["comfortable", "compact"] as const)("draws one addressable item per bar in %s", (density) => {
    const input = { bars: [bar, { ...bar, label: "Carbs", value: 300, of: 200, tone: "bad" }] };
    const html = renderInstance("Progress", input, "filled", { ...theme, density });
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    for (const index of [1, 2])
      for (const part of ["root", "label", "amount"])
        expect(html.match(new RegExp(`data-testid="home/c1/r${index}/${part}"`, "g"))).toHaveLength(1);
    expect(html).toContain("62 of 120 g");
    expect(html).toContain("300 of 200 g");
  });
});
