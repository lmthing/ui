import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  themeName,
  type DeviceData,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { addressedElements, config } from "../../../../../test/render";

const def = components.Weather;
const { examples, fallback, meta, props, probes } = def;
const [forecast, typical] = examples;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
type Input = Record<string, unknown>;
const preview = (input: Input, state: StateName = "filled") => meta.previewDeviceData({ input, state });

function render(input: Input, state: StateName, deviceData?: DeviceData) {
  const screen = { id: "home", components: [{ ...input, id: "w1", c: "Weather", state }] };
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(PhoneScreen, { screen, theme, deviceData }),
    ),
  );
}

const parts = (html: string) => [...addressedElements(html).keys()].map((path) => path.split("/").at(-1));

describe("Weather contract", () => {
  it.each(examples)("accepts a domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it("trims the place, accepts both endpoints and accepts either date independently", () => {
    const place = "a".repeat(24);
    expect(props.parse({ place: ` ${place} ` })).toMatchObject({
      place,
      detail: "full",
      surface: "card",
    });
    for (const dates of [
      { from: "2028-02-29" },
      { to: "2028-02-29" },
      { from: "2028-02-29", to: "2028-02-29" },
    ])
      expect(props.safeParse({ place, ...dates }).success).toBe(true);
  });

  it.each([
    {},
    { place: "  " },
    { place: "a".repeat(25) },
    { place: "Rome", from: "2027-02-29" },
    { place: "Rome", to: "tomorrow" },
    { place: "Rome", from: "2027-03-13", to: "2027-03-04" },
    { place: "Rome", density: "small" },
    { place: "Rome", detail: "hidden" },
    { place: "Rome", color: "red" },
    { place: "Rome", high: 24 },
    { place: "Rome", weather: [] },
  ])("rejects invalid wire props: %j", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });

  it("uses localized neutral fallback or a bounded cast label, never guessed weather", () => {
    const empty = { things: [], items: [] };
    const populated = {
      things: [{ type: "place", fields: ["name"] }],
      items: [{ id: "p1", type: "place", sample: true, name: "Edinburgh" }],
    };
    const malformed = { ...populated, items: [{ ...populated.items[0]!, name: 4 }] };
    expect(fallback({ cast: populated })).toEqual({ place: "Edinburgh" });
    for (const cast of [empty, malformed]) {
      expect(fallback({ cast, lang: "en" })).toEqual({ place: placeholderTitle(0, "en") });
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    }
  });
});

describe("Weather states and affordances", () => {
  it("shows today and next days, hiding only the summary condition in brief", () => {
    const data = preview(forecast!);
    const html = render(forecast!, "filled", data);
    expect(parts(html)).toEqual(["root", "place", "today", "condition", "forecast"]);
    expect(html).toContain("85% rain");
    expect(html).toContain("Sample forecast");
    const brief = render({ ...forecast, detail: "brief" }, "filled", data);
    expect(parts(brief)).toEqual(["root", "place", "today", "forecast"]);
    expect(brief).toContain("85% rain");
  });

  it("shows the month’s typical weather without a daily prediction", () => {
    const html = render(typical!, "filled", preview(typical!));
    expect(parts(html)).toEqual(["root", "place", "today", "condition"]);
    expect(html).toContain("March averages");
    expect(html).not.toContain("% rain");
  });

  it("renders busy, offline and generic failure treatments without exposing stale weather", () => {
    const data = preview(forecast!);
    const loading = render(forecast!, "loading", data);
    expect(parts(loading)).toEqual(["root"]);
    expect(loading).toContain('aria-busy="true"');
    const offline = render(forecast!, "error", preview(forecast!, "error"));
    expect(parts(offline)).toEqual(["root", "message", "sub"]);
    expect(offline).toContain("You’re offline");
    const failure = render(forecast!, "error", data);
    expect(parts(failure)).toEqual(["root", "message", "sub"]);
    expect(failure).toContain("Weather unavailable");
    const missing = render(forecast!, "filled");
    expect(parts(missing)).toEqual(["root", "place", "message", "sub"]);
    expect(missing).toContain(forecast!.place);
    expect(missing).not.toContain("Sample forecast");
  });
});

describe("Weather reading and probes", () => {
  it("keeps the reader aligned with host data and offers no actions in any state", () => {
    const input = props.parse(forecast);
    const data = preview(forecast!);
    const read = readComponent(def, input, "w1", "filled", {}, "en", data).join(" ");
    expect(read).toContain("Today · Sample forecast");
    expect(read).toContain("7° / 2°C · Cloudy");
    expect(read).toContain("Fri · Rain · 6° / 2° · 85% rain");
    expect(readComponent(def, input, "w1").join(" ")).toContain("Weather unavailable");
    for (const state of meta.states) expect(affordancesOf(meta, input, "w1", {}, state)).toEqual([]);
    expect(readComponent(def, input, "w1", "error", {}, "en", data)).toEqual(["w1 Weather (error)"]);
  });

  it("reads the typical range without the summary condition in brief", () => {
    const brief = readComponent(
      def,
      { ...typical, detail: "brief" },
      "w1",
      "filled",
      {},
      "en",
      preview(typical!),
    ).join(" ");
    expect(brief).toContain("Sample · March averages");
    expect(brief).toContain("14° / 5°C");
    expect(brief).not.toContain("Cloudy");
  });

  it("is a service entry with a core near miss and a variant-specific write probe", () => {
    expect(meta.tier).toBe("service");
    expect(meta.realPath).not.toBe("");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Weather" }),
        expect.objectContaining({ kind: "choose", expect: "Stats" }),
        expect.objectContaining({ kind: "write", expect: "Weather" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
      ]),
    );
    expect(createRegistry({ packs: ["trips"] }).ids.includes("Weather")).toBe(packReady("trips"));
  });
});
