import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, placeholderTitle, wordsFor } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance, styleAt } from "../../test/render";
import { visibleTexts } from "../../test/variants";

const { props, meta, examples, fallback, probes } = components.Article;
const sample = examples[0]!;
const theme = { preset: "calm", accent: "moss", mode: "light" } as const;
const prefix = "home/c1";

describe("Article schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it("trims text and accepts the exact field bounds and both photo reference forms", () => {
    const title = "t".repeat(80);
    const by = "b".repeat(32);
    const body = "x".repeat(2000);
    for (const photo of ["lib:reading", "local:1"]) {
      expect(props.parse({ title: ` ${title} `, by, body: ` ${body} `, photo })).toMatchObject({
        title,
        by,
        body,
        photo,
        detail: "full",
        links: [],
      });
    }
    const goto = "s".repeat(64);
    expect(props.parse({ title, body: `[Open](screen:${goto})` })).toMatchObject({
      links: [{ title: "Open", goto }],
    });
  });

  // prettier-ignore
  it.each([
    { title: undefined }, { title: " " }, { title: "t".repeat(81) },
    { body: undefined }, { body: " " }, { body: "x".repeat(2001) },
    { by: "" }, { by: "b".repeat(33) }, { date: "2026-02-29" },
    { photo: "https://example.org/cover.png" }, { detail: "article" }, { density: "tiny" },
    { links: [{ title: "Open", goto: "there" }] }, { reading_time: 3 }, { color: "red" },
    { style: "page" }, { paper: "#ffffff" }, { fontScale: 2 },
  ])("rejects invalid wire props: %j", (patch) => {
    expect(props.safeParse({ ...sample, ...patch }).success).toBe(false);
  });
});

describe("Article fallback and contract", () => {
  it.each([
    { things: [], items: [] },
    { things: [], items: [{ id: "a", type: "recording", title: 4, sample: true }] },
  ])("falls back to shared neutral copy without usable cast data", (cast) => {
    const lang = "en";
    expect(props.parse(fallback({ cast, lang }))).toMatchObject({
      title: placeholderTitle(0, lang),
      body: wordsFor(lang).placeholderDetail,
      links: [],
    });
  });

  it("takes and bounds the first cast item's title and detail", () => {
    const cast = {
      things: [{ type: "recording", fields: ["name", "description"] }],
      items: [
        { id: "saved", type: "recording", sample: true, name: "t".repeat(85), description: "d".repeat(2100) },
      ],
    };
    expect(props.parse(fallback({ cast }))).toMatchObject({ title: "t".repeat(80), body: "d".repeat(2000) });
  });

  it("preserves the phone tier, core registration and choose/write/read probes", () => {
    expect(meta).toMatchObject({ tier: "phone", region: "body", weight: 2 });
    expect(meta).not.toHaveProperty("confirmParts");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(createRegistry().ids).toContain(meta.id);
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect: id }) => id)).toEqual([
      "Article",
      "Note",
    ]);
    expect(probes.filter(({ kind }) => kind === "write")).toEqual([
      expect.objectContaining({ expect: "Article" }),
      expect.objectContaining({ expect: "Article", variant: { axis: "detail", value: "brief" } }),
    ]);
    expect(probes.find(({ kind }) => kind === "read")).toMatchObject({
      expect: { address: "a1/r1", action: "press" },
    });
  });
});

describe("Article states and parts", () => {
  it.each([
    [{}, ["title", "by", "date", "reading_time", "photo"]],
    [{}, ["title", "by", "date", "reading_time", "photo"]],
    [{ by: undefined, date: undefined, photo: undefined }, ["title", "reading_time"]],
    [{ detail: "brief" }, []],
  ] as const)("draws the expected header and stable body addresses for %j", (options, header) => {
    const html = renderInstance("Article", { ...sample, ...options }, "filled", theme, { lang: "en-US" });
    const parts = addressedElements(html);
    expect([...parts.keys()].sort()).toEqual(
      ["root", ...header, "body", "r1/root"].map((part) => `${prefix}/${part}`).sort(),
    );
    expect(parts.get(`${prefix}/r1/root`)?.attributes).toContain('role="link"');
    expect(parts.get(`${prefix}/r1/root`)?.children[0]?.text).toEqual(["fern care schedule"]);
    const text = visibleTexts(html);
    expect(text).toEqual(
      expect.arrayContaining(["Pick a spot", "indirect light", "“Check the pot before you water.”"]),
    );
    expect(text).not.toContain("## Pick a spot");
    if (header.length) expect(parts.get(`${prefix}/reading_time`)?.text).toEqual(["1 min read"]);
    if ("detail" in options) expect(text).not.toContain(sample.title);
  });

  it.each(["full", "brief"] as const)("loads without content or actions in %s detail", (detail) => {
    const html = renderInstance("Article", { ...sample, detail }, "loading", theme);
    expect([...addressedElements(html).keys()]).toEqual([`${prefix}/root`]);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('role="link"');
    expect(visibleTexts(html)).toEqual([]);
  });
});

it.each(["comfortable", "compact"] as const)("scales prose on fixed papers at %s density", (density) => {
  const sizes = ["small", "normal", "large"] as const;
  const papers = ["light", "sepia", "dark"] as const;
  const swatches = ["white", "beige", "black"] as const;
  const fonts = sizes.map((fontScale, index) => {
    const html = renderInstance("Article", { ...sample, paper: papers[index], fontScale }, "filled", {
      ...theme,
      density,
    });
    const parts = addressedElements(html);
    expect(parts.get(`${prefix}/root`)?.attributes).toContain(`kit-swatch-${swatches[index]}`);
    expect(parts.get(`${prefix}/r1/root`)?.attributes).toContain('role="link"');
    const label = parts.get(`${prefix}/r1/root`)!.children[0]!;
    return Number(/font-size:(\d+)px/.exec(styleAt(html, label))?.[1]);
  });
  expect(fonts[0]).toBeLessThan(fonts[1]!);
  expect(fonts[1]).toBeLessThan(fonts[2]!);
});

it("preserves a callout and places response attribution after its body", () => {
  const input = {
    title: "Answer",
    style: "response",
    by: "Noor",
    body: "A long answer.\n\n> [!NOTE] Do not overwater.",
  };
  const html = renderInstance("Article", input, "filled", theme);
  expect(visibleTexts(html)).toEqual([
    "Answer",
    "1 min read",
    "A long answer.",
    "Note: Do not overwater.",
    "By Noor",
  ]);
  const screen = { id: "home", components: [{ ...input, id: "c1", c: "Article" }] };
  const runtime = createScreenController({ screen, defs: components });
  expect(runtime.read()).toContain(
    "Answer — 1 min read — A long answer. — Note: Do not overwater. — By Noor",
  );
  runtime.dispose();
});

describe("Article read and act", () => {
  it.each(["full", "brief"] as const)("presses only the addressed internal link in %s detail", (detail) => {
    const onLink = vi.fn();
    const onAction = vi.fn();
    const body =
      "See [the route](screen:route) or [the checklist](screen:checklist), not [the web](https://example.org).";
    const screen = { id: "home", components: [{ ...sample, body, detail, id: "c1", c: "Article" }] };
    const runtime = createScreenController({ screen, defs: components, onLink, onAction });
    const read = runtime.read();
    expect(read.includes(sample.title)).toBe(detail === "full");
    expect(read.includes("8 Nov 2026 · 1 min read")).toBe(detail === "full");
    expect(read).toContain("See the route or the checklist");
    expect(read).toContain("[c1/r1 press→route]");
    expect(read).toContain("[c1/r2 press→checklist]");
    for (const part of ["c1", "c1/body", "c1/r3"]) expect(runtime.press(part).ok).toBe(false);
    expect(runtime.press("c1/r2").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("checklist", `${prefix}/r2`);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `${prefix}/r2`, action: "press" });
  });

  it("offers no navigation while loading or when no internal link exists", () => {
    const onLink = vi.fn();
    const screen = {
      id: "home",
      components: [
        { ...sample, id: "c1", c: "Article", state: "loading" as const },
        { ...sample, id: "c2", c: "Article", body: "No navigation." },
      ],
    };
    const runtime = createScreenController({ screen, defs: components, onLink });
    expect(runtime.read()).not.toContain("press→");
    for (const address of ["c1/r1", "c2/r1"]) expect(runtime.press(address).ok).toBe(false);
    expect(onLink).not.toHaveBeenCalled();
  });
});
