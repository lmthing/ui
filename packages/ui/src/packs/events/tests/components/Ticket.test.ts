import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  wordsFor,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";
import { eventsWordsFor } from "../../lang";

const { Ticket } = components;
const { props, meta, examples, fallback, probes } = Ticket;
const example: ReturnType<typeof fallback> = examples[0]!;
const words = eventsWordsFor().ticket;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown = example, state: StateName = "filled", lang?: string) =>
  renderInstance("Ticket", input, state, theme, { component: "t1", ...(lang ? { lang } : {}) });
const read = (input: unknown = example, state: StateName = "filled", lang?: string) =>
  readComponent(Ticket, input, "t1", state, {}, lang).join("\n");
const address = (part: string) => `home/t1/${part}`;

describe("Ticket contract and boundaries", () => {
  it.each(examples)("accepts a real admission pass", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("defaults to full start-aligned content and trims authored text", () => {
    expect(props.parse({ ...example, holder: ` ${example.holder} ` })).toMatchObject({
      detail: "full",
      align: "start",
      holder: example.holder,
    });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["holder"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
  // prettier-ignore
  it.each([
    { event: "x".repeat(33) }, { place: "x".repeat(33) }, { holder: "x".repeat(25) },
    { type: "x".repeat(17) }, { number: "x".repeat(13) }, { number: "" }, { event: " " },
    { date: "2027-02-29" }, { time: "24:00" }, { time: "6:30 pm" }, { holder: undefined },
    { density: "tiny" }, { align: "right" }, { detail: "hidden" }, { style: "pass" },
    { color: "#fff" }, { used: true }, { code: "other" }, { pixels: 12 },
  ])("rejects invalid input %o", (fields) =>
    expect(props.safeParse({ ...example, ...fields }).success).toBe(false),
  );
  it("accepts exact bounds and a real leap day", () => {
    expect(
      props.safeParse({
        event: "e".repeat(32),
        place: "p".repeat(32),
        holder: "h".repeat(24),
        type: "t".repeat(16),
        number: "n".repeat(12),
        date: "2028-02-29",
        time: "23:59",
      }).success,
    ).toBe(true);
  });
});

describe("Ticket fallback and metadata", () => {
  it("uses cast titles when valid and neutral placeholders otherwise", () => {
    const cast: CastLike = {
      things: [{ type: "record", fields: ["label"] }],
      items: [{ id: "r", type: "record", sample: true, label: " Market Hall Benefit " }],
    };
    const malformed: CastLike = { ...cast, items: [{ ...cast.items[0]!, label: 7 }] };
    const empty: CastLike = { things: [], items: [] };
    for (const [seed, title] of [
      [cast, "Market Hall Benefit"],
      [malformed, placeholderTitle(0)],
      [empty, placeholderTitle(0)],
    ] as const) {
      const input = fallback({ cast: seed });
      expect(props.safeParse(input).success).toBe(true);
      expect(input).toMatchObject({
        event: title,
        holder: placeholderTitle(1),
        place: wordsFor().placeholderDetail,
        type: wordsFor().placeholderLabel,
        number: wordsFor().placeholderValue,
      });
    }
  });
  it("preserves the core-first near miss, device tier and pack readiness gate", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    // prettier-ignore
    for (const probe of [
      { kind: "choose", expect: "Ticket" }, { kind: "choose", expect: "KeyValue" },
      { kind: "write", expect: "Ticket", variant: { axis: "detail", value: "brief" } },
    ]) expect(probes).toContainEqual(expect.objectContaining(probe));
    expect(probes.filter(({ kind }) => kind === "write")).toHaveLength(2);
  });
});

describe("Ticket parts and states", () => {
  it("draws one labeled QR image and preserves its addresses under finish variants", () => {
    const full = addressedElements(render());
    expect(new Set(full.keys())).toEqual(new Set(meta.parts.map(address)));
    expect(full.get(address("code"))?.attributes).toContain(`aria-label="${words.code(example.number)}"`);
    expect(full.get(address("code"))?.children.some(({ tag }) => tag === "svg")).toBe(true);
    expect(full.get(address("number"))?.text).toEqual([example.number]);
    for (const input of [
      { ...example, align: "center" },
      { ...example, density: "compact" },
    ])
      expect([...addressedElements(render(input)).keys()]).toEqual([...full.keys()]);
    const brief = { ...example, detail: "brief" };
    expect([...addressedElements(render(brief)).keys()]).toEqual(
      [...full.keys()].filter((part) => part !== address("hint")),
    );
    expect(read(brief)).not.toContain(words.hint);
  });
  it("shows that the pass was scanned, without rendering a scannable QR or inviting a rescan", () => {
    const html = render(example, "success");
    const used = addressedElements(html);
    expect(new Set(used.keys())).toEqual(new Set(meta.parts.filter((part) => part !== "hint").map(address)));
    expect(used.get(address("code"))?.children.some(({ tag }) => tag === "svg")).toBe(false);
    expect(used.get(address("code"))?.attributes).not.toContain('role="img"');
    expect(used.get(address("number"))?.text).toEqual([example.number]);
    expect(html).toContain(words.scanned);
    expect(html).not.toContain(words.hint);
    expect(read(example, "success")).toContain(words.scanned);
    expect(read(example, "success")).not.toContain(words.hint);
  });
});

describe("Ticket read and act", () => {
  it.each(["en", "en-US"])("reads the localized date and time drawn for %s", (lang) => {
    const html = addressedElements(render(example, "filled", lang));
    const text = read(example, "filled", lang);
    for (const part of ["event", "date", "time", "place", "type", "holder", "number", "hint"]) {
      const drawn = html.get(address(part))?.text.join("");
      expect(drawn).toBeTruthy();
      expect(text).toContain(drawn);
    }
  });
  it.each(["filled", "success"] as const)("offers no action in %s, including on the QR", (state) => {
    expect(render(example, state)).not.toContain('role="button"');
    expect(read(example, state)).not.toContain("[t1/");
    const screen = { id: "home", components: [{ id: "t1", c: "Ticket", state, ...example }] };
    for (const target of ["t1", "t1/code"])
      expect(planAct(screen, { Ticket }, {}, [{ address: target, action: "press" }])).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
  });
});
