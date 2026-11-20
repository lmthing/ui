import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  loadingLabel,
  packReady,
  placeholderTitle,
  readComponent,
  themeName,
  wordsFor,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController, PhoneScreen } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, renderInstance } from "../../../../../test/render";

const def = components.Collection;
const { props, meta, examples, fallback, probes } = def;
const series = examples[0]!;
const list = components.Playlist.examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const screen = { id: "home", components: [{ ...series, id: "c1", c: "Collection" }] };
const prefix = "home/c1/";

describe("Collection schema", () => {
  it.each(examples)("accepts a domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it("trims text and keeps the exact limits and shared defaults", () => {
    const title = "t".repeat(40),
      by = "b".repeat(32),
      about = "a".repeat(200);
    expect(props.parse({ title: ` ${title} `, by, about, photo: "local:1", followed: false })).toMatchObject({
      title,
      by,
      about,
      aspect: "square",
      detail: "full",
    });
    expectTypeOf<Props<typeof props, typeof meta>["followed"]>().toEqualTypeOf<boolean>();
    expect(props.safeParse({ ...series, about: undefined }).success).toBe(true);
  });

  // prettier-ignore
  it.each([
    {}, ...[
      { title: "" }, { title: "t".repeat(41) }, { by: "b".repeat(33) }, { about: "a".repeat(201) },
      { by: undefined }, { photo: undefined }, { photo: "https://example.org/cover.png" },
      { followed: "true" }, { followed: undefined }, { aspect: "tall" }, { detail: "hidden" },
      { density: "tiny" }, { color: "red" }, { count: 3 }, { duration: 900 }, { summary: "3 tracks" },
    ].map((patch) => ({ ...series, ...patch })),
  ])("rejects invalid wire props: %j", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Collection fallback and metadata", () => {
  it("uses bounded cast text and a cast artwork reference", () => {
    const cast: CastLike = {
      things: [{ type: "recording", fields: ["name", "credit"] }],
      items: [{ id: "a", type: "recording", sample: true, name: "T".repeat(80), credit: "Noor Martin" }],
    };
    const result = fallback({ cast, lang: "en" });
    expect(result).toMatchObject({ by: "Noor Martin", photo: "lib:recording", followed: false });
    expect(result.title).toHaveLength(40);
    expect(props.safeParse(result).success).toBe(true);
  });

  it.each([
    { things: [], items: [] },
    { things: [], items: [{ id: "a", type: "bad type", sample: true, title: 4 }] },
  ])("falls back to neutral text and artwork when the cast has no usable data", (cast) => {
    const result = fallback({ cast, lang: "en" });
    expect(result).toEqual({
      title: placeholderTitle(0, "en"),
      by: wordsFor("en").placeholderLabel,
      photo: "lib:item",
      followed: false,
    });
    expect(props.safeParse(result).success).toBe(true);
  });

  // prettier-ignore
  it("preserves the phone tier, pack gate, core near miss and variant write", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", weight: 2 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: ["media"] }).ids.includes(meta.id)).toBe(packReady("media"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual(["Collection", "Hero"]);
    expect(probes).toContainEqual(expect.objectContaining({
      kind: "write", expect: "Collection", variant: { axis: "detail", value: "brief" },
    }));
    for (const [part, action] of [
      ["play", "press"],
      ["follow", "toggle"],
    ])
      expect(probes).toContainEqual(expect.objectContaining({ kind: "read", expect: { address: `c1/${part}`, action } }));
  });
});

describe("Collection states and parts", () => {
  // prettier-ignore
  it("renders all supplied parts and keeps finish variants addressed", () => {
    const html = renderInstance("Collection", series, "filled", theme);
    const alternate = renderInstance("Collection", { ...series, aspect: "wide", density: "compact" }, "filled", theme);
    expect([...addressedElements(html).keys()].sort()).toEqual(
      meta.parts.map((part) => prefix + part).sort(),
    );
    expect([...addressedElements(alternate).keys()]).toEqual([...addressedElements(html).keys()]);
    for (const [part, label] of [["play", "Play all"], ["follow", "Follow"]]) {
      expect(elementAt(html, prefix + part).attributes).toContain('role="button"');
      expect(elementAt(html, prefix + part).attributes).toContain(`aria-label="${label}"`);
    }
  });

  it("hides only the about part in brief and omits missing descriptions or summaries", () => {
    const full = addressedElements(renderInstance("Collection", series, "filled", theme));
    const brief = { ...series, detail: "brief" };
    const reduced = addressedElements(renderInstance("Collection", brief, "filled", theme));
    expect([...reduced.keys()]).toEqual([...full.keys()].filter((part) => part !== prefix + "about"));
    expect(readComponent(def, brief, "c1").join("\n")).not.toContain(series.about);
    const bare = renderInstance("Collection", { ...series, about: undefined }, "filled", theme, {
      deviceData: {},
    });
    expect(addressedElements(bare).has(prefix + "about")).toBe(false);
    expect(addressedElements(bare).has(prefix + "summary")).toBe(false);
  });

  it("shows inert placeholders rather than content or controls during loading", () => {
    const html = renderInstance("Collection", series, "loading", theme);
    expect([...addressedElements(html).keys()]).toEqual([prefix + "root"]);
    expect(html).toContain(loadingLabel);
    expect(html).not.toContain('role="button"');
    expect(readComponent(def, series, "c1", "loading")).toEqual(["c1 Collection (loading)"]);
  });

  it("derives totals from the actual Playlist on the phone screen", () => {
    const withPlaylist = {
      ...screen,
      components: [...screen.components, { ...list, id: "p1", c: "Playlist" }],
    };
    const html = renderToStaticMarkup(
      createElement(
        TamaguiProvider,
        { config, defaultTheme: themeName(theme) },
        createElement(PhoneScreen, { screen: withPlaylist, theme }),
      ),
    );
    expect(addressedElements(html).get(prefix + "summary")?.text).toEqual(["2 tracks · 10 min"]);
  });
});

describe("Collection read and act", () => {
  // prettier-ignore
  it.each([false, true])("shows and toggles the follow state seeded as %s", (followed) => {
    const input = { ...series, followed };
    const icon = (value: boolean) => elementAt(renderInstance("Collection", { ...input, followed: value }, "filled", theme), prefix + "follow_icon");
    expect(icon(followed).children).not.toEqual(icon(!followed).children);
    const current = { ...screen, components: [{ ...screen.components[0]!, followed }] };
    const runtime = createScreenController({ screen: current, defs: components, deviceData: { playlist: [list] } });
    expect(runtime.read()).toContain("2 tracks · 10 min");
    expect(runtime.read()).toContain(`[c1/follow toggle:${followed ? "on" : "off"}]`);
    expect(runtime.press("c1/follow")).toMatchObject({ ok: true });
    expect(runtime.store.get(prefix + "follow")).toBe(!followed);
    expect(runtime.read()).toContain(`[c1/follow toggle:${followed ? "off" : "on"}]`);
    expect(runtime.press("c1/follow")).toMatchObject({ ok: true });
    expect(runtime.store.get(prefix + "follow")).toBe(followed);
  });

  it("dispatches play-all through the host without changing follow or navigating", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    expect(runtime.read()).toContain("Play all");
    expect(runtime.read()).toContain("[c1/play press]");
    expect(runtime.act({ address: "c1/play", action: "press" })).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: prefix + "play", action: "press" });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.store.get(prefix + "follow")).toBeUndefined();
  });

  it("rejects decorative targets and both controls during loading", () => {
    const loading = { ...screen, components: [{ ...screen.components[0]!, state: "loading" as const }] };
    const runtime = createScreenController({ screen, defs: components });
    const inert = createScreenController({ screen: loading, defs: components });
    for (const part of meta.parts.filter((part) => part !== "play" && part !== "follow"))
      expect(runtime.press(prefix + part)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(inert.press("c1/play")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(inert.press("c1/follow")).toMatchObject({ ok: false, code: "not_actionable" });
  });
});
