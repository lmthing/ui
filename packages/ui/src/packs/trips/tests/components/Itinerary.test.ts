import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  stampItemIds,
  themeName,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { addressedElements, config, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const { Itinerary } = components;
const { meta, props, examples, fallback, probes } = Itinerary;
const first = examples[0]!;
const day = first.days[0]!;
const stop = day.stops[0]!;
const inputWith = (patch: object) => ({ days: [{ ...day, stops: [{ ...stop, ...patch }] }] });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = { id: "home", components: [{ id: "i1", c: "Itinerary", ...first }] };

function phoneAddresses(now: Date) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  try {
    return addressedElements(
      renderToStaticMarkup(
        createElement(
          TamaguiProvider,
          { config, defaultTheme: themeName(theme) },
          createElement(PhoneScreen, { theme, screen }),
        ),
      ),
    );
  } finally {
    vi.useRealTimers();
  }
}

describe("Itinerary contract", () => {
  it.each(examples)("parses a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it.each([
    {},
    { days: [] },
    { days: Array(15).fill(day) },
    { days: [{ ...day, stops: [] }] },
    { days: [{ ...day, stops: Array(7).fill(stop) }] },
    { days: [{ ...day, place: "a".repeat(25) }] },
    { days: [{ ...day, date: "2027-02-29" }] },
    { days: [{ ...day, id: "r1" }] },
    { days: [{ ...day, stop_1: stop }] },
    { ...first, surface: "tinted" },
    { ...first, color: "red" },
    inputWith({ title: " " }),
    inputWith({ title: "a".repeat(33) }),
    inputWith({ kind: "ferry" }),
    inputWith({ time: "24:00" }),
    inputWith({ goto: "Bad ID" }),
    inputWith({ goto: undefined }),
    inputWith({ id: "r1" }),
    inputWith({ minutes: 1 }),
    inputWith({ kind: "travel", minutes: 0 }),
    inputWith({ kind: "travel", minutes: 1.5 }),
    inputWith({ kind: "travel", minutes: 10081 }),
  ])("rejects invalid or code-owned wire data", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
  it("accepts maximum day and stop counts and validator-owned view ids", () => {
    const travel = { ...stop, title: "a".repeat(32), goto: "a".repeat(64), kind: "travel", minutes: 10080 };
    const days = Array(14).fill({ ...day, place: "a".repeat(24), stops: Array(6).fill(travel) });
    expect(props.safeParse({ days }).success).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["days"][number]["id"]>().toEqualTypeOf<string>();
    expect(stampItemIds(meta, props.parse(first)).days[1]).toMatchObject({ id: "r2" });
  });
  it("preserves ready pack gating and model probes", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta.tier).toBe("phone");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Itinerary" }),
        expect.objectContaining({ kind: "choose", expect: "Timeline" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "i1/r1/stop_1", action: "press" } }),
      ]),
    );
  });
});

describe("Itinerary fallback and states", () => {
  it("uses relevant cast fields and neutral placeholders for unusable input", () => {
    const empty: CastLike = { things: [], items: [] };
    const valid: CastLike = {
      things: [{ type: "place", fields: ["name", "region"] }],
      items: [{ id: "garden", type: "place", sample: true, name: "Garden", region: "North" }],
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "Bad ID", type: "place", sample: true, name: 3 }],
    };
    for (const cast of [empty, valid, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).days[0]!.stops[0]!.title).toBe(placeholderTitle(0));
    expect(fallback({ cast: valid }).days[0]).toMatchObject({
      place: "North",
      stops: [{ title: "Garden", goto: "garden" }],
    });
    expect(fallback({ cast: malformed }).days[0]!.stops[0]!.goto).toBe("detail");
  });
  it("draws the shared empty state without day or stop actions", () => {
    const html = renderInstance("Itinerary", first, "empty", theme);
    expect(html).toContain(emptyLine());
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/root", "home/c1/title"]);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(first)), "i1", {}, "empty")).toEqual([]);
  });
});

describe("Itinerary parts and read/act", () => {
  it.each([
    [4, 1, 2],
    [5, 2, 1],
    [6, 1, 2],
  ])("opens the right day on the phone on March %i", (date, open, closed) => {
    const parts = phoneAddresses(new Date(2027, 2, date));
    expect(parts.get(`home/i1/r${open}/root`)?.attributes).toContain('aria-expanded="true"');
    expect(parts.get(`home/i1/r${closed}/root`)?.attributes).toContain('aria-expanded="false"');
    expect(parts.has(`home/i1/r${open}/stop_1`)).toBe(true);
    expect(parts.has(`home/i1/r${closed}/stop_1`)).toBe(false);
  });
  it("keeps finish addresses and hides only durations in brief detail", () => {
    const addresses = (axes = {}) =>
      addressedElements(renderInstance("Itinerary", { ...first, ...axes }, "filled", theme));
    const full = addresses();
    const duration = "home/c1/r1/duration_2";
    expect(full.get("home/c1/r1/root")?.attributes).toContain('role="button"');
    expect(full.get("home/c1/r1/stop_1")?.attributes).toContain('role="link"');
    expect(full.get("home/c1/r1/date")?.text.join("")).toMatch(/Thu,? 4 Mar/);
    expect(full.get("home/c1/r1/place")?.text).toContain("Tokyo");
    expect(full.get("home/c1/r2/stop_2_time")?.text).toContain("Time TBD");
    expect(full.get(duration)?.text).toContain("2 h 10 min");
    expect([...addresses({ surface: "outlined", density: "compact" }).keys()]).toEqual([...full.keys()]);
    expect([...addresses({ detail: "brief" }).keys()]).toEqual(
      [...full.keys()].filter((key) => key !== duration),
    );
    expect(readComponent(Itinerary, first, "i1").join("\n")).toContain('16:00 "Train to Kyoto" 2 h 10 min');
    expect(readComponent(Itinerary, { ...first, detail: "brief" }, "i1").join("\n")).not.toContain(
      "2 h 10 min",
    );
  });
  it("toggles days independently, links stops and rejects a missing stop", () => {
    const steps = [
      { address: "i1/r1", action: "toggle" },
      { address: "i1/r2", action: "toggle" },
      { address: "i1/r1", action: "toggle" },
      { address: "i1/r2/stop_2", action: "press" },
    ];
    expect(planAct(screen, { Itinerary }, {}, steps)).toMatchObject({
      ok: true,
      values: { "home/i1/r1": false, "home/i1/r2": true },
      links: [{ address: "home/i1/r2/stop_2", goto: "inn" }],
    });
    expect(planAct(screen, { Itinerary }, {}, [{ address: "i1/r2/stop_6", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});
