import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  themeName,
  type CastLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, renderers, Screen } from "@lmthing/ui/kit";
import { addressedElements, config, hasStepTarget, renderInstance } from "../../../../../test/render";

const def = components.Scoreboard;
const { meta, props, examples, fallback, probes } = def;
const keeper = examples[0]!;
const display = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/s1/${part}`;
const render = (input: unknown, state: StateName = "filled", lang = "en") =>
  addressedElements(renderInstance("Scoreboard", input, state, theme, { component: "s1", lang }));
const step = (address: string, action: string) => ({ address, action });

function renderedScreen(controller: ReturnType<typeof createScreenController>) {
  return addressedElements(
    renderToStaticMarkup(
      createElement(
        TamaguiProvider,
        { config, defaultTheme: themeName(theme) },
        createElement(KitProvider, {
          theme,
          controller,
          children: createElement(Screen, { controller, renderers }),
        }),
      ),
    ),
  );
}

describe("Scoreboard contract", () => {
  it.each(examples)("accepts example %j", (example) => expect(props.safeParse(example).success).toBe(true));

  // prettier-ignore
  it.each([
    { home: "x".repeat(21) }, { away: "" }, { period: "x".repeat(13) },
    { homeScore: -1 }, { awayScore: 0.5 }, { awayScore: Number.MAX_SAFE_INTEGER + 1 },
    { status: "paused" }, { style: "compact" }, { detail: "minimal" },
    { running: true }, { elapsed: 30 }, { $liveClock: true }, { color: "#000" },
  ])("rejects %j", (patch) => expect(props.safeParse({ ...keeper, ...patch }).success).toBe(false));

  it("defaults to display and accepts exact bounds", () => {
    expect(
      props.parse({ ...display, home: "x".repeat(20), period: "x".repeat(12), awayScore: 0 }).style,
    ).toBe("display");
    expect(props.safeParse({ ...display, homeScore: Number.MAX_SAFE_INTEGER }).success).toBe(true);
  });

  it("keeps readiness, tiers, confirmations and the Counter near miss", () => {
    expect(createRegistry({ packs: ["sports"] }).ids.includes("Scoreboard")).toBe(packReady("sports"));
    expect(meta.tier).toBe("phone");
    expect(meta.partTiers).toEqual({ root: "people" });
    expect(meta.confirmParts).toEqual(["home", "away"]);
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Scoreboard",
      "Counter",
    ]);
    expect(probes.filter(({ kind }) => kind === "read")).toHaveLength(3);
  });
});

describe("Scoreboard fallback", () => {
  it("uses the cast, clips its labels and uses placeholders for absent titles", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast = {
      things: [{ type: "team", fields: ["name"] }],
      items: ["First", "a".repeat(30)].map((name, i) => ({
        id: `team${i}`,
        type: "team",
        sample: true,
        name,
      })),
    };
    const malformed = { ...cast, items: [{ id: "team", type: "team", sample: true, name: false }] };
    expect(fallback({ cast: empty })).toEqual({
      home: placeholderTitle(0),
      away: placeholderTitle(1),
      homeScore: 0,
      awayScore: 0,
      status: "upcoming",
    });
    expect(fallback({ cast })).toMatchObject({ home: "First", away: "a".repeat(20) });
    expect(fallback({ cast: malformed })).toMatchObject({
      home: placeholderTitle(0),
      away: placeholderTitle(1),
    });
    for (const candidate of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: candidate })).success);
  });
});

describe("Scoreboard states and parts", () => {
  it.each([
    ["upcoming", "Not started"],
    ["live", "Live"],
    ["break", "Half time"],
    ["final", "Full time"],
  ])("shows %s with both scores and a read-only clock in display", (status, label) => {
    const keys = render({ ...display, status });
    expect(keys.get(address("status"))?.text).toEqual([label]);
    expect(keys.get(address("clock"))?.text).toEqual(["0:00"]);
    expect(keys.get(address("clock"))?.attributes).not.toContain('role="button"');
    expect(keys.get(address("home_score"))?.text).toEqual(["3"]);
    expect(keys.get(address("away_score"))?.text).toEqual(["3"]);
    for (const part of ["home", "away", "period", "clock_icon"]) expect(keys.has(address(part))).toBe(false);
  });

  it("draws all keeper parts, localizes the figures and keeps finish-only addresses", () => {
    const keys = render(keeper, "filled", "ar-EG");
    const optional = ["sport", "periods", "possession", "outs", "balls", "strikes", "bases"];
    expect([...keys.keys()].sort()).toEqual(
      meta.parts
        .filter((part) => !optional.includes(part))
        .map(address)
        .sort(),
    );
    expect(keys.get(address("home_score"))?.text).toEqual(["٢"]);
    expect(keys.get(address("clock_value"))?.text).toEqual(["٠:٠٠"]);
    expect(keys.get(address("clock"))?.attributes).toContain('aria-label="Start clock"');
    for (const side of ["home", "away"])
      for (const action of ["increment", "decrement"])
        expect(hasStepTarget(keys.get(address(side))!, action)).toBe(true);
    expect([...render({ ...keeper, density: "compact", emphasis: "quiet" }).keys()]).toEqual([
      ...keys.keys(),
    ]);
    expect([...render({ ...keeper, detail: "brief" }).keys()]).toEqual(
      [...keys.keys()].filter((key) => key !== address("period")),
    );
  });

  it("keeps the root and score frame but no actionable parts while loading", () => {
    const keys = render(keeper, "loading");
    expect([...keys.keys()]).toEqual([address("root"), address("scores")]);
    expect(keys.get(address("root"))?.attributes).toContain('aria-label="Loading"');
    expect(keys.get(address("scores"))?.attributes).toContain('aria-busy="true"');
    expect(readComponent(def, keeper, "s1", "loading")).toEqual(["s1 Scoreboard[keeper] (loading)"]);
  });
});

describe("Scoreboard reading and actions", () => {
  it.each(["filled", "loading"] as const)("rejects display actions while %s", (state) => {
    const runtime = createScreenController({
      defs: components,
      screen: { id: "home", components: [{ ...display, c: "Scoreboard", id: "s1", state }] },
    });
    try {
      for (const [part, actions] of Object.entries(meta.actions.parts))
        for (const action of actions) expect(runtime.act(step(address(part), action)).ok).toBe(false);
    } finally {
      runtime.dispose();
    }
  });

  it("changes the offered clock action, keeps elapsed time on stop, and blocks a zero undo", () => {
    let now = 0;
    const runtime = createScreenController({
      defs: components,
      now: () => now,
      screen: { id: "home", components: [{ ...keeper, awayScore: 0, c: "Scoreboard", id: "s1" }] },
    });
    try {
      expect(runtime.actionsAt("s1/away")).toEqual(["increment"]);
      expect(runtime.act(step("s1/away", "decrement")).ok).toBe(false);
      expect(runtime.read()).toContain("[s1/clock start]");
      expect(runtime.act(step("s1/clock", "stop")).ok).toBe(false);
      expect(runtime.act(step("s1/clock", "start")).ok).toBe(true);
      now = 63000;
      runtime.tick();
      expect(runtime.snapshotScreen().components[0]).toEqual({
        ...keeper,
        awayScore: 0,
        c: "Scoreboard",
        id: "s1",
      });
      expect(renderedScreen(runtime).get(address("clock_value"))?.text).toEqual(["1:03"]);
      expect(renderedScreen(runtime).get(address("clock"))?.attributes).toContain('aria-label="Stop clock"');
      expect(runtime.read()).toContain("[s1/clock stop]");
      expect(runtime.act(step("s1/clock", "start")).ok).toBe(false);
      expect(runtime.act(step("s1/clock", "stop")).ok).toBe(true);
      now += 20000;
      expect(runtime.read()).toContain("1:03");
      expect(runtime.read()).toContain("[s1/clock start]");
    } finally {
      runtime.dispose();
    }
  });
});

describe("Scoreboard sport details", () => {
  it("renders and reads the period breakdown and possession without adding an action", () => {
    const input = {
      ...display,
      sport: "basketball",
      possession: "away",
      periods: [
        { label: "Q1", home: 12, away: 9 },
        { label: "Q2", home: 0, away: 11 },
      ],
    };
    const parts = render(input);
    expect(parts.get(address("sport"))?.text).toEqual(["Basketball"]);
    expect(parts.get(address("possession"))?.text).toEqual(["Possession: River Rovers"]);
    expect(parts.get(address("periods"))?.text).toContain("Score by period");
    expect(readComponent(def, input, "s1").join("\n")).toContain("Q2: 0–11");
    expect(render(input, "loading").has(address("possession"))).toBe(false);
    expect(readComponent(def, input, "s1").join("\n")).not.toContain(" press]");
  });

  it("handles zero counts and distinguishes empty bases from unspecified bases", () => {
    const input = { ...display, sport: "baseball", outs: 0, balls: 3, strikes: 2, bases: [] };
    const parts = render(input);
    expect(parts.get(address("outs"))?.text).toEqual(["Outs: 0"]);
    expect(parts.get(address("balls"))?.text).toEqual(["Balls: 3"]);
    expect(parts.get(address("strikes"))?.text).toEqual(["Strikes: 2"]);
    expect(parts.get(address("bases"))?.text).toEqual(["Bases empty"]);
    expect(render({ ...input, bases: undefined }).has(address("bases"))).toBe(false);
    expect(readComponent(def, { ...input, bases: ["third", "first"] }, "s1").join("\n")).toContain(
      "Runners on first, third",
    );
  });

  it("rejects invalid sports options and baseball data in other sports", () => {
    const input = { ...display, sport: "baseball" };
    for (const patch of [
      { sport: "other" },
      { outs: 3 },
      { balls: 4 },
      { strikes: 3 },
      { bases: ["first", "first"] },
      { sport: "football", outs: 0 },
      { possession: "neutral" },
      { periods: [] },
      { periods: [{ label: "Q1", home: 1, away: -1 }] },
    ])
      expect(props.safeParse({ ...input, ...patch }).success).toBe(false);
  });
});
