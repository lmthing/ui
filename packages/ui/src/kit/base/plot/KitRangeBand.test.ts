import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, size, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitRangeBand, KitText } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const input = { label: "Reading", min: 0, max: 100, low: 30, high: 70, value: 50 };
function render(props: Parameters<typeof KitRangeBand>[0], preset = "calm", mode = "light") {
  const theme = { preset, mode, accent: "moss" } as Parameters<typeof KitProvider>[0]["theme"];
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          createElement(KitRangeBand, props),
        ),
      ),
    ),
  );
}
function drawing(html: string) {
  return elementAt(html, "home/c1/band").children[1]!.children[0]!;
}
describe("KitRangeBand", () => {
  it.each(presets)("draws normal bounds and marker in both tones in $id", ({ id }) => {
    for (const mode of ["light", "dark"])
      for (const tone of ["text", "warn"] as const) {
        const html = render({ ...input, tone, part: "band" }, id, mode);
        expect(html).toContain("Reading");
        expect(styleAt(html, drawing(html).children[0]!)).toContain("left:30%");
        expect(styleAt(html, drawing(html).children[0]!)).toContain("width:40%");
        expect(styleAt(html, drawing(html).children[1]!)).toContain("left:50%");
        expect(styleAt(html, drawing(html).children[1]!)).toContain(`var(--${tone})`);
        expect(html.match(/data-testid=/g)).toHaveLength(1);
        expect(html).not.toContain('role="button"');
      }
  });
  it.each([-100, 0, 100, 200])("clamps outlying reading %s within the track", (value) => {
    const html = render({ ...input, value, part: "band" });
    expect(styleAt(html, drawing(html).children[1]!)).toContain(`left:${value <= 0 ? 0 : 100}%`);
  });
  it("keeps equal, reversed and outlying bounds finite and visible", () => {
    for (const bounds of [
      { low: 50, high: 50 },
      { low: 200, high: -100 },
      { min: 50, max: 50 },
    ]) {
      const html = render({ ...input, ...bounds, part: "band" });
      expect(html).not.toMatch(/NaN|Infinity/);
      expect(styleAt(html, drawing(html).children[0]!)).toMatch(/min-width:(2|12)px/);
    }
  });
  it("keeps loading geometry and draws an empty track without a reading marker", () => {
    const filled = render({ ...input, part: "band" });
    const loading = render({ ...input, part: "band", loading: true });
    expect(styleAt(loading, drawing(loading))).toBe(styleAt(filled, drawing(filled)));
    expect(drawing(loading).children).toHaveLength(drawing(filled).children.length);
    expect(loading).toContain('aria-busy="true"');
    expect(render({ ...input, part: "band", value: NaN, label: "No reading yet" })).toContain(
      "No reading yet",
    );
  });
});

describe("KitRangeBand caller-owned reading", () => {
  const reading = createElement(KitText, { role: "number", part: "value", children: "118 / 76" });
  it("replaces only the default heading while the numeric value still drives the marker", () => {
    const html = render({ ...input, part: "band", reading });
    expect(html).toContain("118 / 76");
    expect(html).not.toContain(">Reading<");
    expect(html).not.toContain(">50<");
    expect(styleAt(html, drawing(html).children[1]!)).toContain("left:50%");
    expect(html.match(/data-testid=/g)).toHaveLength(2);
  });
  it("leaves existing omitted and undefined-slot callers identical", () => {
    for (const preset of presets)
      for (const loading of [false, true]) {
        // A preset's first render can register new CSS classes for its loading shape.
        render({ ...input, loading }, preset.id);
        expect(render({ ...input, loading, reading: undefined }, preset.id)).toBe(
          render({ ...input, loading }, preset.id),
        );
      }
  });
  it("retains custom loading geometry while hiding and disabling its content", () => {
    const filled = render({ ...input, part: "band", reading });
    const loading = render({ ...input, part: "band", reading, loading: true });
    expect(styleAt(loading, drawing(loading))).toBe(styleAt(filled, drawing(filled)));
    expect(loading).toContain('aria-busy="true"');
    const content = elementAt(loading, "home/c1/band").children[0]!.children[0]!;
    expect(content.attributes).toContain('aria-hidden="true"');
    expect(content.attributes).toContain("inert");
    expect(styleAt(loading, content)).toContain("visibility:hidden");
    const bar = elementAt(loading, "home/c1/band").children[0]!.children[1]!;
    expect(styleAt(loading, bar)).toContain(`max-width:${size.control.md * 2}px`);
  });
  it("accepts a zero-valued slot and retains the existing empty reading", () => {
    expect(render({ ...input, reading: 0 })).toContain(">0<");
    expect(render({ ...input, reading, value: NaN, label: "No reading yet" })).toContain("No reading yet");
    expect(render({ ...input, reading, value: NaN })).not.toContain("118 / 76");
  });
  it("omits an explicitly null reading in filled and loading states", () => {
    for (const loading of [false, true]) {
      const html = render({ ...input, part: "band", reading: null, loading });
      const [track, ...rest] = elementAt(html, "home/c1/band").children;
      expect(rest).toEqual([]);
      expect(track?.attributes).toContain('aria-hidden="true"');
      expect(html).not.toContain(">Reading<");
    }
  });
});

const zonesInput = {
  part: "band",
  label: "Reading",
  min: 300,
  max: 800,
  value: 650,
  zones: [
    { label: "First", from: 200, to: 400, tone: "bad" },
    { label: "Middle", from: 400, to: 700, tone: "warn" },
    { label: "Last", from: 700, to: 900, tone: "good" },
  ],
} as const;

describe("KitRangeBand zones", () => {
  it("places all ordered zones and the marker on one scale, with a readable legend", () => {
    const html = render(zonesInput);
    const [layer, marker] = drawing(html).children;
    for (const [index, left, width, tone] of [
      [0, 0, 20, "bad"],
      [1, 20, 60, "warn"],
      [2, 80, 20, "good"],
    ] as const) {
      const style = styleAt(html, layer!.children[index]!);
      expect(Number(style.match(/left:([\d.]+)%/)?.[1])).toBeCloseTo(left);
      expect(Number(style.match(/width:([\d.]+)%/)?.[1])).toBeCloseTo(width);
      expect(style).toContain(`var(--${tone})`);
    }
    expect(styleAt(html, marker!)).toContain("left:70%");
    expect(html).toMatch(/>First \(200–400\)<.*>Middle \(400–700\)<.*>Last \(700–900\)</s);
    expect(html.match(/data-testid=/g)).toHaveLength(1);
  });

  it("keeps zone positions while loading, and hides the legend from accessibility", () => {
    const html = render({ ...zonesInput, loading: true });
    const zones = drawing(html).children[0]!.children;
    expect(zones).toHaveLength(3);
    expect(styleAt(html, zones[1]!)).toContain("var(--line)");
    expect(styleAt(html, zones[1]!)).toContain("left:20%");
    expect(elementAt(html, "home/c1/band").children[2]!.attributes).toContain('aria-hidden="true"');
    expect(render({ ...zonesInput, value: NaN })).not.toContain(">First (");
  });

  it("keeps the old band for an empty list and skips invalid and out-of-scale intervals", () => {
    expect(render({ ...input, zones: [] })).toBe(render(input));
    const zones = [
      { label: "Invalid", from: NaN, to: 500, tone: "bad" },
      { label: "Out of scale", from: 100, to: 200, tone: "accent" },
      { label: "Reversed", from: 600, to: 500, tone: "muted" },
      zonesInput.zones[1],
    ] as const;
    const html = render({ ...zonesInput, zones });
    expect(drawing(html).children[0]!.children).toHaveLength(1);
    expect(html).not.toMatch(/Invalid|Out of scale|Reversed|NaN/);
  });
});

describe("KitRangeBand zone layout", () => {
  it("separates adjacent zones with identical tones and identifies them by bounds", () => {
    const html = render({
      ...zonesInput,
      zones: zonesInput.zones.map((zone) => ({ ...zone, tone: "warn" })),
    });
    const [first, second, third] = drawing(html).children[0]!.children;
    expect(styleAt(html, first!)).not.toContain("border-left-width");
    for (const zone of [second!, third!]) {
      expect(styleAt(html, zone)).toContain("var(--warn)");
      expect(styleAt(html, zone)).toContain(`border-left-width:${component.base.borderWidth}px`);
      expect(styleAt(html, zone)).toContain("border-left-color:var(--bg)");
    }
    expect(html).toContain("Middle (400–700)");
    expect(html).toContain("Last (700–900)");
  });
  it("lets different fills meet without a dark rule and places four legends in two columns", () => {
    const html = render(
      {
        ...zonesInput,
        reading: null,
        max: 1000,
        zones: [...zonesInput.zones, { label: "Fourth", from: 900, to: 1000, tone: "accent" }],
      },
      "calm",
      "dark",
    );
    const [track, legend] = elementAt(html, "home/c1/band").children;
    const [zones, marker] = track!.children[0]!.children;
    expect(zones!.children).toHaveLength(4);
    expect(zones!.children.map((zone) => styleAt(html, zone))).not.toEqual(
      expect.arrayContaining([expect.stringContaining("border-left-width")]),
    );
    expect(styleAt(html, marker!)).toContain("border-left-color:var(--surface)");
    expect(legend!.children.map((row) => row.children.length)).toEqual([2, 2]);
  });
});
