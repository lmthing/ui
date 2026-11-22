import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  wordsFor,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const { Lesson } = components;
const { props, meta, examples, fallback, probes } = Lesson;
const first = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown) => renderInstance("Lesson", input, "filled", theme, { component: "l1" });
const addresses = (input: unknown) => addressedElements(render(input));
const read = (input: unknown) => readComponent(Lesson, input, "l1").join("\n");
const next = { address: "l1/next", action: "press" };

describe("Lesson contract and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("defaults to the full card and trims authored text", () => {
    expect(props.parse({ title: "  Title  ", text: " Explanation ", example: " Example " })).toMatchObject({
      title: "Title",
      text: "Explanation",
      example: "Example",
      emphasis: "normal",
      detail: "full",
    });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["example"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
  it.each([
    { title: undefined },
    { text: undefined },
    { title: " " },
    { text: "" },
    { example: " " },
    { title: "a".repeat(41) },
    { text: "a".repeat(401) },
    { detail: "brief", example: "a".repeat(161) },
    { photo: "https://example.org/photo.png" },
    { photo: `lib:${"a".repeat(65)}` },
    { surface: "plain" },
    { emphasis: "quiet" },
    { detail: "short" },
    { density: "tight" },
    { color: "#c0ffee" },
    { next: "Continue" },
  ])("rejects invalid input %o", (patch) => {
    expect(props.safeParse({ ...first, ...patch }).success).toBe(false);
  });
  it.each(["lib:plants", "local:1"])("accepts exact text limits and photo form %s", (photo) => {
    expect(
      props.safeParse({ title: "a".repeat(40), text: "b".repeat(400), example: "c".repeat(160), photo })
        .success,
    ).toBe(true);
  });
  it("preserves scope, tier, states and probe coverage", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta.states).toEqual(["filled"]);
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Lesson" }),
        expect.objectContaining({ kind: "choose", expect: "Note" }),
        expect.objectContaining({ kind: "write", expect: "Lesson" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: next }),
      ]),
    );
  });
});

describe("Lesson fallback", () => {
  it("uses a cast record or the neutral placeholders if it cannot find usable fields", () => {
    const empty: CastLike = { things: [], items: [] };
    const populated: CastLike = {
      things: [{ type: "topic", fields: ["label", "summary"] }],
      items: [{ id: "rhythm", type: "topic", sample: true, label: "Find the beat", summary: "Count aloud" }],
    };
    const malformed: CastLike = {
      ...populated,
      items: [{ id: "rhythm", type: "topic", sample: true, label: " ", summary: 7 }],
    };
    const neutral = { title: placeholderTitle(0), text: wordsFor().placeholderDetail };
    expect(fallback({ cast: empty })).toEqual(neutral);
    expect(fallback({ cast: malformed })).toEqual(neutral);
    expect(fallback({ cast: populated })).toEqual({ title: "Find the beat", text: "Count aloud" });
    const oversized: CastLike = {
      ...populated,
      items: [{ ...populated.items[0]!, label: "a".repeat(41), summary: "b".repeat(401) }],
    };
    for (const cast of [empty, populated, malformed, oversized])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
  });
});

describe("Lesson filled parts and read/act", () => {
  it("renders one addressed root, the optional content and the addressed Continue button", () => {
    const html = render(first);
    const parts = addressedElements(html);
    expect(html.match(/data-testid="home\/l1\/root"/g)).toHaveLength(1);
    expect(new Set(parts.keys())).toEqual(new Set(meta.parts.map((part) => `home/l1/${part}`)));
    expect(parts.get("home/l1/title")?.text).toContain(first.title);
    expect(parts.get("home/l1/text")?.text).toContain(first.text);
    expect(parts.get("home/l1/photo")?.attributes).toContain('role="img"');
    expect(parts.get("home/l1/next")?.attributes).toContain('role="button"');
    expect(read(first)).toContain(`"${first.example}"`);
    expect(read(first)).toContain("Worked example");
    expect(read(first)).toContain("Continue");
  });
  it("draws optional parts independently and hides the entire example in brief detail", () => {
    const full = addresses(first);
    const finish = addresses({ ...first, emphasis: "hero" });
    expect([...finish.keys()]).toEqual([...full.keys()]);
    const brief = { ...first, detail: "brief" };
    const hidden = meta.variantParts["detail.brief"].hides.map((part) => `home/l1/${part}`);
    expect([...addresses(brief).keys()]).toEqual([...full.keys()].filter((key) => !hidden.includes(key)));
    expect(read(brief)).not.toContain(first.example);
    expect(read(brief)).not.toContain("Worked example");
    const justText = { title: "Find the beat", text: "Count aloud" };
    expect([...addresses(justText).keys()]).toEqual(
      [...full.keys()].filter((key) => key !== "home/l1/photo" && !hidden.includes(key)),
    );
    expect(addresses({ ...first, photo: undefined }).has("home/l1/example")).toBe(true);
    expect(addresses({ ...first, example: undefined }).has("home/l1/photo")).toBe(true);
  });
  it.each([first, { ...first, detail: "brief" }, { title: "Find the beat", text: "Count aloud" }])(
    "offers only the same non-destructive Continue action",
    (input) => {
      expect(read(input)).toContain("[l1/next press]");
      expect(affordancesOf(meta, props.parse(input), "l1")).toEqual([{ ...next, part: "next", detail: "" }]);
      const screen = { id: "home", components: [{ id: "l1", c: "Lesson", ...input }] };
      expect(planAct(screen, { Lesson }, {}, [next])).toEqual({
        ok: true,
        changed: ["l1/next press"],
        links: [],
        values: {},
      });
      expect(planAct(screen, { Lesson }, {}, [{ address: "l1/example", action: "press" }])).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
    },
  );
});
