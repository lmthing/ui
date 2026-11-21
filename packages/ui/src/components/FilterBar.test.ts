import {
  components,
  createRegistry,
  planAct,
  readScreen,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController, renderers } from "@lmthing/ui/kit";
import { describe, expect, expectTypeOf, it } from "vitest";
import { addressedElements, renderInstance } from "../../test/render";
import { visibleTexts } from "../../test/variants";

const def = components.FilterBar;
const { meta, props, examples, fallback, probes } = def;
const ledge = examples[0]!;
const trot = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const defs = { FilterBar: def };
const screen = (input: object = ledge) => ({
  id: "home",
  components: [{ ...input, id: "s1", c: "FilterBar" }],
});
const part = (target: string) => `home/s1/${target}`;
const clear = { address: part("clear"), action: "press" };
const open = (item: string) => ({ address: part(`${item}/root`), action: "press" });
const select = (item: string, value?: string) => ({ address: part(`${item}/root`), action: "select", value });
const search = (value: string) => ({ address: part("field"), action: "type", value });

describe("FilterBar contract and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { hint: " ".repeat(4) },
    { hint: "x".repeat(41) },
    { sort: "x".repeat(21) },
    { filters: [] },
    { filters: Array.from({ length: 5 }, () => ({ label: "Room", options: ["Kitchen", "Study"] })) },
    { filters: [{ label: "x".repeat(15), options: ["Kitchen", "Study"] }] },
    { filters: [{ label: "Room", options: ["Kitchen"] }] },
    { filters: [{ label: "Room", options: Array.from({ length: 9 }, (_, i) => `Option ${i}`) }] },
    { filters: [{ label: "Room", options: ["Kitchen", "x".repeat(17)] }] },
    { filters: [{ label: "Room", options: ["Study", " Study "] }] },
    { filters: [{ label: "Room", options: ["Kitchen", "Study"], value: "Bright" }] },
    { filters: [{ label: "Room", options: ["Kitchen", "Study"], id: "r1" }] },
    { query: "not a Writer prop" },
    { detail: "minimal" },
    { density: "large" },
    { color: "red" },
  ])("rejects invalid FilterBar fields: %j", (change) => {
    expect(props.safeParse({ ...ledge, ...change }).success).toBe(false);
  });

  it("accepts exact bounds, trims text and stamps ids only for views", () => {
    const options = Array.from({ length: 8 }, (_, i) => `${"x".repeat(15)}${i}`);
    const filters = Array.from({ length: 4 }, () => ({
      label: ` ${"x".repeat(14)} `,
      options,
      value: ` ${options[7]!} `,
    }));
    const parsed = props.parse({ hint: "x".repeat(40), sort: "x".repeat(20), filters });
    expect(parsed).toMatchObject({ detail: "full", surface: "plain" });
    expect(parsed.filters[3]).toEqual({ label: "x".repeat(14), options, value: options[7] });
    expect(stampItemIds(meta, parsed).filters[3]).toMatchObject({ id: "r4" });
    expectTypeOf<Props<typeof props, typeof meta>["filters"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("FilterBar fallback and probes", () => {
  it("uses cast options and neutral placeholders for missing or unusable cast data", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["name"] }],
      items: [
        { id: "fern", type: "plant", sample: true, name: "Fern" },
        { id: "dog", type: "dog", sample: true, name: "Pip" },
        { id: "fern_copy", type: "plant", sample: true, name: "Fern" },
      ],
    };
    const malformed: CastLike = { ...cast, items: [{ ...cast.items[0]!, name: 4 }] };
    for (const source of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: source })).success).toBe(true);
    expect(fallback({ cast: empty })).toMatchObject({
      hint: "Search",
      filters: [{ label: "Name", options: ["Item one", "Item two"] }],
    });
    expect(fallback({ cast }).filters[0]?.options).toEqual(["Fern", "Item one"]);
    expect(fallback({ cast: malformed }).filters[0]?.options).toEqual(["Item one", "Item two"]);
  });

  it("uses phone tier and retains the core near miss and the variant and action probes", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 2, states: ["filled"] });
    expect(createRegistry().ids).toContain("FilterBar");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "FilterBar" }),
        expect.objectContaining({ kind: "choose", expect: "Chips" }),
        expect.objectContaining({ kind: "write", expect: "FilterBar" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r1", action: "select" } }),
      ]),
    );
  });
});

describe.skipIf(!Object.hasOwn(renderers, "FilterBar"))("FilterBar filled state and parts", () => {
  it.each(examples)("reads every visible label", (example) => {
    const html = renderInstance("FilterBar", example, "filled", theme);
    const read = readScreen(screen(example), defs);
    for (const text of visibleTexts(html)) expect(read).toContain(text);
  });

  it("renders the search field, closed pickers, count, sort and a non-destructive clear button", () => {
    const parts = addressedElements(renderInstance("FilterBar", ledge, "filled", theme));
    const at = (part: string) => parts.get(`home/c1/${part}`);
    expect(at("root")).toBeDefined();
    expect(at("field")?.attributes).toContain('role="searchbox"');
    expect(at("r1/root")?.attributes).toContain('aria-expanded="false"');
    expect(at("r1/root")?.children[0]?.text).toContain("Room: Study");
    expect(at("r2/root")?.children[0]?.text).toContain("Light");
    expect(at("count")?.text).toContain("1 active filter");
    expect(at("sort")?.text).toContain("Sort: Recently watered");
    expect(at("clear")?.attributes).toContain('role="button"');
    expect(at("clear_label")?.text).toContain("Clear filters");
    expect(meta).not.toHaveProperty("confirmParts");
  });

  it("omits unspecified sort and hides only the count for brief detail", () => {
    const noSort = addressedElements(renderInstance("FilterBar", trot, "filled", theme));
    expect(noSort.has("home/c1/sort")).toBe(false);
    const brief = { ...ledge, detail: "brief" };
    const parts = addressedElements(renderInstance("FilterBar", brief, "filled", theme));
    expect(parts.has("home/c1/count")).toBe(false);
    expect(parts.has("home/c1/r1/root")).toBe(true);
    expect(parts.has("home/c1/sort")).toBe(true);
    expect(parts.has("home/c1/clear")).toBe(true);
    expect(readScreen(screen(brief), defs)).not.toContain("active filter");
  });
});

describe("FilterBar read and act", () => {
  it("offers addressable options and opens, switches and closes inline pickers", () => {
    const input = screen();
    const before = readScreen(input, defs);
    expect(before).toContain("1 active filter");
    expect(before).toContain('[s1/r1 select = "Study"; choices ["Kitchen","Study"]]');
    expect(before).toContain("[s1/r2 press]");
    const switched = planAct(input, defs, {}, [open("r1"), open("r2")]);
    expect(switched).toMatchObject({ ok: true, values: { [part("$picker")]: "r2" } });
    if (!switched.ok) return;
    const closed = planAct(input, defs, switched.values, [select("r2", "Bright")]);
    expect(closed).toMatchObject({ ok: true, values: { [part("$picker")]: undefined } });
    if (closed.ok) expect(readScreen(input, defs, closed.values)).toContain("2 active filters");
    expect(planAct(input, defs, {}, [open("r1"), open("r1")])).toMatchObject({
      ok: true,
      values: { [part("$picker")]: undefined },
    });
  });

  it("clears typed text, rejected drafts, seeded and live values, and disclosure without touching sort", () => {
    const input = screen();
    const controller = createScreenController({ screen: input, defs });
    try {
      expect(controller.act([search("x".repeat(40)), select("r2", "Bright"), open("r1")]).ok).toBe(true);
      expect(controller.edit(part("field"), "x".repeat(41)).ok).toBe(false);
      const before = controller.store.snapshot();
      expect(controller.act([clear, select("r1", "Bright")])).toMatchObject({ ok: false, at: 1 });
      expect(controller.store.snapshot()).toEqual(before);
      expect(controller.act(clear)).toMatchObject({ ok: true });
      expect(controller.read()).toContain("0 active filters");
      expect(controller.read()).toContain('[s1/field type = ""]');
      expect(controller.read()).toContain('[s1/r1 select choices ["Kitchen","Study"]]');
      expect(controller.read()).toContain('[s1/r2 select choices ["Bright","Indirect"]]');
      expect(controller.read()).toContain('"Recently watered"');
      for (const target of ["$picker", "field/$draft", "field/$error"])
        expect(controller.store.get(part(target))).toBeUndefined();
      expect(controller.snapshotScreen().components).toEqual(input.components);
      expect(controller.act([clear, select("r1", "Kitchen")]).ok).toBe(true);
      expect(controller.read()).toContain("1 active filter");
    } finally {
      controller.dispose();
    }
  });

  it("rejects missing and foreign choices, long queries and attempts to change the sort label", () => {
    for (const action of [select("r1"), select("r1", "Bright"), search("x".repeat(41))])
      expect(planAct(screen(), defs, {}, [action])).toMatchObject({ ok: false, code: "invalid_value" });
    expect(
      planAct(screen(), defs, {}, [{ address: "s1/sort", action: "select", value: "Newest first" }]),
    ).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});
