import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  scoreComposition,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const { meta, props, fallback, examples, probes } = components.Entries;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
// prettier-ignore
const note = { date: "2024-02-29", mood: 5, text: "I sat by the open window.", tags: ["Quiet"], goto: "leap_day" };
const plain = { date: "2024-01-31", text: "A quieter evening.", tags: [], goto: "january" };
const input = { entries: [plain, { ...note, photo: "lib:parks" }] };

describe("Entries schema and boundaries", () => {
  it.each(examples)("parses the domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults the finish, trims content and sorts newest first with stable ordering on ties", () => {
    expect(props.parse({ entries: [plain, { ...note, text: " First " }, note] })).toMatchObject({
      surface: "card",
      detail: "full",
      entries: [{ ...note, text: "First" }, note, plain],
    });
  });
  it.each([
    {},
    { entries: [] },
    { entries: Array(7).fill(note) },
    ...[0, 6, 2.5, "3"].map((mood) => ({ entries: [{ ...note, mood }] })),
    ...["2023-02-29", "2024-2-29", "2024-04-31"].map((date) => ({ entries: [{ ...note, date }] })),
    ...[" ", "x".repeat(161)].map((text) => ({ entries: [{ ...note, text }] })),
    ...[[""], ["x".repeat(13)], Array(4).fill("tag")].map((tags) => ({ entries: [{ ...note, tags }] })),
    { entries: [{ ...note, photo: "https://example.com/photo" }] },
    { entries: [{ ...note, goto: "Bad ID" }] },
    { entries: [{ ...note, goto: "x".repeat(65) }] },
    { entries: [{ ...note, goto: undefined }] },
    { entries: [{ ...note, id: "r1" }] },
    { entries: [note], color: "red" },
    { entries: [note], detail: "large" },
    { entries: [note], style: "compact" },
  ])("rejects invalid or presentation-owned input", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("accepts all maximum lengths, all six rows and both reference forms", () => {
    const max = { ...note, text: "x".repeat(160), tags: Array(3).fill("y".repeat(12)), goto: "z".repeat(64) };
    expect(props.safeParse({ entries: Array(6).fill({ ...max, photo: "lib:parks" }) }).success).toBe(true);
    expect(props.safeParse({ entries: [{ ...max, mood: 1, photo: "local:1" }] }).success).toBe(true);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["entries"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
  });
});

describe("Entries fallback and metadata", () => {
  const empty: CastLike = { things: [], items: [] };
  const matches: CastLike = {
    things: [{ type: "record", fields: ["a", "b"] }],
    items: [{ id: "leap_day", type: "record", sample: true, a: note.date, b: note.text }],
  };
  const malformed: CastLike = {
    ...matches,
    items: [{ ...matches.items[0]!, id: "Not valid", a: 7, b: true }],
  };
  it("takes date and excerpt from cast text, clips long text and falls back to neutral copy", () => {
    const many = {
      ...matches,
      items: Array.from({ length: 8 }, (_, i) => ({
        id: `row_${i}`,
        type: "record",
        sample: true,
        b: "x".repeat(170),
      })),
    };
    for (const cast of [empty, matches, malformed, many])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: matches }).entries).toEqual([
      { date: note.date, text: note.text, tags: [], goto: note.goto },
    ]);
    expect(fallback({ cast: empty }).entries).toEqual([
      { date: "1970-01-01", text: "Details", tags: [], goto: "entry" },
    ]);
    expect(fallback({ cast: malformed }).entries[0]).toMatchObject({ text: "Item one", goto: "entry" });
    expect(fallback({ cast: many }).entries).toHaveLength(6);
    expect(fallback({ cast: many }).entries[0]!.text).toHaveLength(160);
  });
  it("keeps the core-first probes, phone tier, density and pack readiness gate", () => {
    expect(meta).toMatchObject({
      states: ["filled", "empty", "loading"],
      tier: "phone",
      weight: 3,
      dense: true,
    });
    expect(meta.realPath).toContain("on the device");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Entries" }),
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "write", expect: "Entries" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "e1/r2", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["mind"], includeDrafts: true }).schema("Entries")).toBe(props);
    expect(createRegistry({ packs: ["mind"] }).ids.includes("Entries")).toBe(packReady("mind"));
  });
});

describe("Entries states, parts and read", () => {
  it("renders localized month headings and stamps only the parts present on each row", () => {
    const html = renderInstance("Entries", input, "filled", theme, { component: "e1", lang: "fr-FR" });
    expect([...addressedElements(html).keys()].map((key) => key.replace("home/e1/", ""))).toEqual(
      "root month r1/root r1/mood r1/date r1/text r1/tags r1/photo r2/root r2/date r2/text".split(" "),
    );
    expect(elementAt(html, "home/e1/r1/root").attributes).toContain('role="link"');
    expect(elementAt(html, "home/e1/r1/mood").attributes).toContain('aria-label="Very good"');
    expect(html.indexOf("février 2024")).toBeLessThan(html.indexOf("janvier 2024"));
    const read = readComponent(components.Entries, input, "e1", "filled", {}, "fr-FR").join("\n");
    for (const visible of ["février 2024", "29 févr. 2024", "Very good", "Quiet", note.text, plain.text]) {
      expect(html).toContain(visible);
      expect(read).toContain(visible);
    }
  });
  it("hides only the tags in brief mode and retains them in stored props", () => {
    const brief = { ...input, detail: "brief" } as const;
    const render = (value: unknown) => [
      ...addressedElements(renderInstance("Entries", value, "filled", theme)).keys(),
    ];
    expect(render(brief)).toEqual(render(input).filter((part) => !part.endsWith("/tags")));
    expect(render({ ...input, density: "compact", surface: "outlined" })).toEqual(render(input));
    expect(props.parse(brief).entries[0]!.tags).toEqual(note.tags);
    expect(readComponent(components.Entries, brief, "e1").join("\n")).not.toContain("Quiet");
  });
  it.each(["empty", "loading"] as const)("does not expose entries or actions while %s", (state) => {
    const html = renderInstance("Entries", input, state, theme);
    expect(html).toContain(state === "empty" ? "No journal entries yet" : 'aria-busy="true"');
    expect(html).not.toContain(note.text);
    expect(html).not.toContain('role="link"');
    expect(readComponent(components.Entries, input, "e1", state)).toEqual([`e1 Entries (${state})`]);
  });
});

describe("Entries actions", () => {
  it("navigates by sorted entry root only, with no confirmation or other controls", () => {
    const stamped = stampItemIds(meta, props.parse(input));
    expect(affordancesOf(meta, stamped, "e1")).toEqual([
      { address: "e1/r1", action: "press", part: "root", detail: "→leap_day" },
      { address: "e1/r2", action: "press", part: "root", detail: "→january" },
    ]);
    const links: string[] = [];
    const runtime = createScreenController({
      screen: { id: "home", components: [{ id: "e1", c: "Entries", ...input }] },
      defs: components,
      onLink: (goto) => {
        links.push(goto);
      },
    });
    try {
      for (const address of ["e1/month", "e1/r1/mood", "e1/r1/text", "e1/r1/tags", "e1/r1/photo", "e1/r3"])
        expect(runtime.press(address).ok).toBe(false);
      expect(runtime.act({ address: "e1/r1", action: "toggle" }).ok).toBe(false);
      expect(runtime.press("e1/r1").ok).toBe(true);
      expect(runtime.press("e1/r2").ok).toBe(true);
      expect(links).toEqual(["leap_day", "january"]);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
});

it("composes both journal overrides only for registries with an active Mind pack", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["mind"] });
  const mind = createRegistry({ packs: ["mind"], includeDrafts: true });
  const defs = Object.fromEntries(mind.defs.map((def) => [def.meta.id, def]));
  const override = mind.packComposeArchetypes.find(({ id }) => id === "journal")!;
  const cast = { things: [], items: [] };
  expect(Object.keys(override.layouts)).toEqual(["entries", "month"]);
  expect(Object.hasOwn(live.archetypes.journal!.meta.layouts, "month")).toBe(packReady("mind"));
  const orderOf = (screen: ReturnType<typeof core.defaultLines>) => screen.components.map(({ c }) => c);
  expect(orderOf(core.defaultLines("journal", "entries", cast))).toEqual(["Header", "Card", "Button"]);
  for (const [layout, order] of [
    ["entries", ["Header", "Streak", "Entries", "Button"]],
    ["month", ["Header", "Calendar", "Entries"]],
  ] as const) {
    const screen = mind.defaultLines("journal", layout, cast);
    expect(orderOf(screen)).toEqual(order);
    if (layout === "month") expect(screen.components[1]).toMatchObject({ c: "Calendar", style: "month" });
    expect(scoreComposition(JSON.stringify(screen), override, layout, defs).issues).toEqual([]);
  }
});
