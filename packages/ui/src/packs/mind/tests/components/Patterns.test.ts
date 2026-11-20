import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  themeName,
  type CastLike,
  type DeviceData,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, config } from "../../../../../test/render";
import { createScreenController, PhoneScreen, type PhoneScreenProps } from "../../../../kit";
import { Patterns } from "../../components";

const def = components.Patterns;
const { props, meta, fallback, examples, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const input = { factors: ["Outdoors", "Slept well"] };
const screen = (value: object, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...value, id: "p1", c: "Patterns", state }],
});

function draw(value: object, deviceData?: DeviceData, state?: StateName, lang?: string) {
  const phoneProps: PhoneScreenProps = {
    defs: components,
    renderers: { Patterns: Patterns.Patterns },
    theme,
    screen: screen(value, state),
    deviceData,
    lang,
    interactive: false,
  };
  const phone = createElement(PhoneScreen, phoneProps);
  const html = renderToStaticMarkup(
    createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) }, phone),
  );
  const addresses = [...addressedElements(html).keys()]
    .filter((part) => part.startsWith("home/p1/"))
    .map((part) => part.slice("home/p1/".length));
  return { html, addresses };
}

describe("Patterns schema and boundaries", () => {
  it.each(examples)("parses a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims labels and defaults to a two-week wait and visible bars", () => {
    expect(props.parse({ factors: [" Outdoors "] })).toMatchObject({
      factors: ["Outdoors"],
      minDays: 14,
      surface: "card",
      detail: "full",
    });
  });
  it.each([
    {},
    { factors: [] },
    { factors: Array(5).fill("Music") },
    { factors: [" "] },
    { factors: ["a".repeat(15)] },
    ...[13, 61, 14.5, "21"].map((minDays) => ({ ...input, minDays })),
    ...[
      { journal_entries: [] },
      { findings: [] },
      { daysLeft: 2 },
      { withAverage: 4 },
      { color: "red" },
      { detail: "tiny" },
      { density: "huge" },
      { surface: "solid" },
    ].map((patch) => ({ ...input, ...patch })),
  ])("rejects invalid or host-owned props", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts four maximum-length labels and a 60-day threshold without exposing findings in props", () => {
    expect(props.safeParse({ factors: Array(4).fill("a".repeat(14)), minDays: 60 }).success).toBe(true);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["factors"]>().toEqualTypeOf<string[]>();
    expectTypeOf<View>().not.toHaveProperty("findings");
  });
});

describe("Patterns fallback and metadata", () => {
  it("uses cast labels, bounded text and neutral placeholders", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "factor", fields: ["name"] }],
      items: [
        { id: "a", type: "factor", sample: true, name: "Fresh air" },
        { id: "b", type: "factor", sample: true, name: "x".repeat(80) },
        { id: "c", type: "factor", sample: true, name: 40 },
      ],
    };
    for (const value of [empty, cast]) expect(props.safeParse(fallback({ cast: value })).success).toBe(true);
    expect(fallback({ cast: empty }).factors).toEqual(["Item one"]);
    expect(fallback({ cast }).factors).toEqual(["Fresh air", "x".repeat(14), "Item three"]);
  });
  it("keeps the phone tier, nearest core probes and live pack gate", () => {
    expect(meta).toMatchObject({
      tier: "phone",
      states: ["filled", "empty"],
      deviceData: ["journal_entries"],
    });
    expect(meta.realPath).toContain("stored entries");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Patterns" }),
        expect.objectContaining({ kind: "choose", expect: "Bars" }),
        expect.objectContaining({ kind: "choose", expect: "Sparkline" }),
        expect.objectContaining({ kind: "write", expect: "Patterns" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
      ]),
    );
    expect(createRegistry({ packs: ["mind"], includeDrafts: true }).schema("Patterns")).toBe(props);
    expect(createRegistry({ packs: ["mind"] }).ids.includes("Patterns")).toBe(packReady("mind"));
  });
});

describe("Patterns states, parts and reading", () => {
  const data = meta.previewDeviceData({ input, state: "filled" });
  it("draws both averages in each finding scope and reads the localized visible numbers", () => {
    const { html, addresses } = draw(input, data, "filled", "fr-FR");
    expect(addresses).toEqual(
      "root title r1/root r1/finding r1/with r1/without r2/root r2/finding r2/with r2/without".split(" "),
    );
    const read = readComponent(def, input, "p1", "filled", {}, "fr-FR", data).join("\n");
    for (const text of [
      "Mood patterns",
      "Higher mood with Outdoors",
      "Lower mood with Slept well",
      "With factor",
      "Without factor",
      "4,1",
      "2,1",
    ]) {
      expect(html).toContain(text);
      expect(read).toContain(text);
    }
    expect(read).toContain("With factor: 2");
    expect(read).toContain("Without factor: 4");
  });
  it("changes no addresses for finish variants and hides only pair parts for brief", () => {
    const before = draw(input, data).addresses;
    expect(draw({ ...input, density: "compact", surface: "outlined" }, data).addresses).toEqual(before);
    const brief = { ...input, detail: "brief" };
    expect(draw(brief, data).addresses).toEqual(before.filter((part) => !/\/with(?:out)?$/.test(part)));
    expect(readComponent(def, brief, "p1", "filled", {}, "en", data).join("\n")).not.toContain("With factor");
  });
  it("reports missing days instead of substituting preview data for a live or explicit empty state", () => {
    const { html, addresses } = draw(input);
    expect(html).toContain("Log 14 more days.");
    expect(addresses).toEqual(["root", "days_left"]);
    expect(readComponent(def, input, "p1").join("\n")).toContain("Log 14 more days");
    const emptyData = meta.previewDeviceData({ input, state: "empty" });
    expect(draw(input, emptyData, "empty").html).toContain("Log 3 more days");
    expect(draw(input, data, "empty").addresses).toEqual(["root", "empty"]);
    expect(draw({ factors: ["Absent"] }, data).html).toContain("Not enough days with and without");
  });
  it("does not renumber a comparable factor when a preceding factor has no comparison", () => {
    expect(draw({ factors: ["Absent", "Outdoors"] }, data).addresses).toEqual([
      "root",
      "title",
      "r2/root",
      "r2/finding",
      "r2/with",
      "r2/without",
    ]);
  });
});

describe("Patterns acts", () => {
  it("does not offer or dispatch actions on the chart, findings or empty state", () => {
    expect(affordancesOf(meta, props.parse(input), "p1")).toEqual([]);
    const deviceData = meta.previewDeviceData({ input, state: "filled" });
    const runtime = createScreenController({ screen: screen(input), defs: components, deviceData });
    try {
      for (const part of ["root", "title", "days_left", "empty", "r1", "r1/finding", "r1/with", "r1/without"])
        expect(runtime.press(`p1/${part}`).ok).toBe(false);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
});
