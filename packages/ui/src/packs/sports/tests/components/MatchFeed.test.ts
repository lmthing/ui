import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.MatchFeed;
const { meta, props, examples, fallback, probes } = def;
const sample = examples[0]!;
const first = sample.events[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/m1/${part}`;
const render = (input: unknown, state: StateName = "filled", lang?: string) =>
  renderInstance("MatchFeed", input, state, theme, { component: "m1", ...(lang ? { lang } : {}) });
const screenWith = (state: StateName) => ({
  id: "home",
  components: [{ ...sample, c: "MatchFeed", id: "m1", state }],
});

describe("MatchFeed schema and bounds", () => {
  it.each(examples)("accepts each domain example", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );

  it("defaults the variants, trims text and attaches ids only to view props", () => {
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["events"][number]["id"]>().toEqualTypeOf<string>();
    expect(props.parse({ events: [{ ...first, text: ` ${first.text}  ` }] })).toMatchObject({
      detail: "full",
      events: [first],
    });
  });

  // prettier-ignore
  it.each([
    {}, { events: [] }, { events: Array(13).fill(first) },
    { ...sample, detail: "none" }, { ...sample, density: "tiny" }, { ...sample, surface: "tinted" },
    { ...sample, color: "#000" }, { ...sample, add: { goto: "other" } },
  ])("rejects invalid component input %j", (input) => expect(props.safeParse(input).success).toBe(false));
  // prettier-ignore
  it.each([
    { minute: -1 }, { minute: 131 }, { minute: 0.5 }, { minute: "48" },
    { side: "neutral" }, { kind: "assist" }, { text: "" }, { text: "  " },
    { text: "a".repeat(37) }, { id: "r1" }, { icon: "target" },
  ])("rejects invalid event input %j", (patch) => {
    expect(props.safeParse({ events: [{ ...first, ...patch }] }).success).toBe(false);
  });

  it("accepts twelve incidents, both minute endpoints and the exact text limit", () => {
    const last = { ...first, minute: 0, text: "a".repeat(36) };
    expect(props.safeParse({ events: [{ ...first, minute: 130 }, ...Array(11).fill(last)] }).success).toBe(
      true,
    );
  });
});

describe("MatchFeed fallback and metadata", () => {
  it("uses neutral placeholders, validates malformed casts and bounds useful cast titles", () => {
    const empty: CastLike = { things: [], items: [] };
    const item = { id: "event", type: "incident", sample: true, name: "Equaliser" };
    const cast: CastLike = { things: [{ type: "incident", fields: ["name"] }], items: [item] };
    const malformed = { ...cast, items: [{ ...item, name: 10 }] };
    const large = { ...cast, items: Array.from({ length: 8 }, () => ({ ...item, name: "a".repeat(50) })) };
    for (const candidate of [empty, cast, malformed, large])
      expect(props.safeParse(fallback({ cast: candidate })).success).toBe(true);
    const neutral = [{ minute: 0, side: "home", kind: "note", text: placeholderTitle(0) }];
    expect(fallback({ cast: empty }).events).toEqual(neutral);
    expect(fallback({ cast: malformed }).events).toEqual(neutral);
    expect(fallback({ cast }).events[0]?.text).toBe("Equaliser");
    expect(fallback({ cast: large }).events.map(({ text }) => text)).toEqual(Array(3).fill("a".repeat(36)));
  });

  it("keeps the tier split, readiness gate and Timeline near miss", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.partTiers).toEqual({ root: "people" });
    expect(meta.dense).toBe(true);
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: ["sports"] }).ids.includes("MatchFeed")).toBe(packReady("sports"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "MatchFeed",
      "Timeline",
    ]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "write", expect: "MatchFeed" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "m1/add", action: "press" } }),
      ]),
    );
  });
});

describe("MatchFeed parts, states and reading", () => {
  it("renders the incident hierarchy, localized minutes, sides and kinds at their addresses", () => {
    const keys = addressedElements(render(sample, "filled", "ar-EG"));
    for (const part of ["root", "title", "add", "add_icon", "add_label"])
      expect(keys.has(address(part))).toBe(true);
    expect(keys.has(address("empty"))).toBe(false);
    sample.events.forEach((row, i) => {
      const id = `r${i + 1}`;
      for (const part of meta.items.parts) expect(keys.has(address(`${id}/${part}`))).toBe(true);
      expect(keys.get(address(`${id}/text`))?.text).toContain(row.text);
      expect(keys.get(address(`${id}/side`))?.text).toContain(row.side === "home" ? "Home" : "Away");
      expect(keys.get(address(`${id}/kind`))?.children[0]?.tag).toBe("svg");
    });
    expect(keys.get(address("r1/minute"))?.text).toContain("٤٨′");
    expect(keys.get(address("r2/kind_label"))?.text).toContain("Yellow card");
    const read = readComponent(def, sample, "m1", "filled", {}, "ar-EG").join("\n");
    expect(read).toContain("Match events");
    expect(read).toContain("Add event");
    expect(read).toContain("٤٨′ Home · Goal: Reed scores from the edge");
    expect(read).toContain("٣٢′ Away · Yellow card: Birch booked");
    expect(read).toContain("[m1/add press→sheet]");
  });

  it("only removes the written kinds in brief detail, and finish keeps every address", () => {
    const full = addressedElements(render(sample));
    const brief = addressedElements(render({ ...sample, detail: "brief" }));
    const compact = addressedElements(render({ ...sample }));
    expect([...full.keys()].filter((key) => !brief.has(key))).toEqual(
      sample.events.map((_, i) => address(`r${i + 1}/kind_label`)),
    );
    expect([...compact.keys()]).toEqual([...full.keys()]);
    expect(props.parse({ ...sample, detail: "brief" }).events).toEqual(sample.events);
  });

  it("keeps Add available in the empty state without exposing seeded incidents", () => {
    const keys = addressedElements(render(sample, "empty"));
    expect(keys.get(address("empty"))?.text).toContain(emptyLine());
    const fromCast = renderInstance("MatchFeed", sample, "empty", theme, { thing: "match event" });
    expect(fromCast).toContain(emptyLine("match event"));
    expect([...keys.keys()].some((key) => key.startsWith(address("r1/")))).toBe(false);
    expect(keys.get(address("add"))?.attributes).toContain('role="button"');
    expect(keys.get(address("add_label"))?.text).toContain("Add event");
    expect(readComponent(def, sample, "m1", "empty").join("\n")).toBe(
      "m1 MatchFeed (empty) [m1/add press→sheet]",
    );
  });
});

describe("MatchFeed actions", () => {
  it.each(["filled", "empty"] as const)("only offers a non-destructive add action when %s", (state) => {
    const act = (part: string, action: string) =>
      planAct(screenWith(state), components, {}, [{ address: address(part), action }]);
    expect(act("add", "press")).toMatchObject({
      ok: true,
      values: {},
      links: [{ address: address("add"), goto: "sheet" }],
    });
    for (const part of ["root", "add_icon", "add_label", ...meta.items.parts.map((part) => `r1/${part}`)])
      expect(act(part, "press")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(act("add", "set")).toMatchObject({ ok: false, code: "not_actionable" });
  });

  it.each([0, 1, 2])("opens Add only with one event-kind menu (%i supplied)", (count) => {
    for (const state of ["filled", "empty"] as const) {
      const screen = screenWith(state);
      const sheets = Array.from({ length: count }, (_, i) => ({
        c: "Sheet",
        id: `s${i}`,
        style: "menu",
        title: "Event type",
        items: ["Goal", "Yellow card", "Red card", "Substitution", "Note"].map((label) => ({ label })),
      }));
      const onAction = vi.fn();
      const runtime = createScreenController({
        screen: { ...screen, components: [...screen.components, ...sheets] },
        defs: components,
        onAction,
      });
      try {
        expect(runtime.press(address("add")).ok).toBe(count === 1);
        expect(runtime.openSheet).toBe(count === 1 ? "s0" : undefined);
        expect(runtime.confirmation).toBeUndefined();
        if (count === 1) {
          expect(runtime.press("home/s0/r1").ok).toBe(true);
          expect(runtime.openSheet).toBeUndefined();
          expect(onAction).toHaveBeenLastCalledWith({ address: "home/s0/r1", action: "press" });
          expect(runtime.press(address("add")).ok).toBe(true);
          expect(runtime.openSheet).toBe("s0");
        }
      } finally {
        runtime.dispose();
      }
    }
  });
});
