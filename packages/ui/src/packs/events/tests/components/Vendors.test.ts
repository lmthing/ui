import { describe, expect, expectTypeOf, it } from "vitest";
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
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";
import { eventsWordsFor } from "../../lang";

const { Vendors } = components;
const { props, meta, examples, fallback, probes } = Vendors;
const example: ReturnType<typeof fallback> = examples[0]!;
const row = example.vendors[0]!;
const second = example.vendors[1]!;
const words = eventsWordsFor().vendors;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown = example, state: StateName = "filled") =>
  renderInstance("Vendors", input, state, theme, { component: "v1" });
const read = (input: unknown = example, state: StateName = "filled") =>
  readComponent(Vendors, input, "v1", state).join("\n");
const withRow = (fields: object) => ({ vendors: [{ ...row, ...fields }] });
const plan = (address: string, state: StateName = "filled", input: object = example) =>
  planAct({ id: "home", components: [{ id: "v1", c: "Vendors", state, ...input }] }, { Vendors }, {}, [
    { address, action: "press" },
  ]);

describe("Vendors contract and boundaries", () => {
  it.each(examples)("accepts a supplier example", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("defaults to full cards and derives the call gate from trimmed contact data", () => {
    expect(props.parse(withRow({ name: "  Juniper Kitchen  ", phone: "  01632 960123  " }))).toMatchObject({
      surface: "card",
      detail: "full",
      vendors: [{ name: row.name, phone: row.phone, canCall: true }],
    });
    expect(props.parse(withRow({ phone: undefined })).vendors[0]).toMatchObject({ canCall: false });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["vendors"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("total");
  });
  // prettier-ignore
  it.each([
    { name: " " }, { name: "x".repeat(25) }, { role: "hotel" }, { cost: -1 }, { cost: Infinity },
    { paid: -1 }, { paid: 2401 }, { cost: 1_000_000_000 }, { paid: "1200" }, { booked: "yes" },
    { due: "2027-02-29" }, { phone: " " }, { phone: "x".repeat(21) },
    { id: "r1" }, { balance: 1200 }, { canCall: true }, { pixels: 12 },
  ])("rejects an invalid supplier %o", (fields) => expect(props.safeParse(withRow(fields)).success).toBe(false));
  it("accepts the row limits and rejects unknown axes, currency and computed totals", () => {
    const max = { ...row, name: "x".repeat(24), phone: "1".repeat(20), cost: 999_999_999.99 };
    expect(props.safeParse({ vendors: Array(6).fill(max) }).success).toBe(true);
    for (const input of [
      { vendors: [] },
      { vendors: Array(7).fill(max) },
      { ...example, detail: "hidden" },
      { ...example, currency: "GBP" },
      { ...example, totals: 3300 },
      { ...example, color: "#fff" },
    ])
      expect(props.safeParse(input).success).toBe(false);
  });
  it("preserves the core-first near miss, service tier and pack readiness gate", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta.partTiers).toEqual({ call: "service" });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    // prettier-ignore
    for (const probe of [
      { kind: "choose", expect: "Vendors" }, { kind: "choose", expect: "List" },
      { kind: "write", expect: "Vendors" }, { kind: "write", variant: { axis: "detail", value: "brief" } },
      { kind: "read", expect: { address: "v1/r1/call", action: "press" } },
    ]) expect(probes).toContainEqual(expect.objectContaining(probe));
  });
});

describe("Vendors fallback", () => {
  it("takes supplier names from the cast but never invents contact or payments", () => {
    const populated: CastLike = {
      things: [{ type: "record", fields: ["label"] }],
      items: [{ id: "r", type: "record", sample: true, label: "Market Hall" }],
    };
    const malformed: CastLike = { ...populated, items: [{ ...populated.items[0]!, label: 1 }] };
    const empty: CastLike = { things: [], items: [] };
    for (const [cast, name] of [
      [populated, "Market Hall"],
      [malformed, placeholderTitle(0)],
      [empty, placeholderTitle(0)],
    ] as const) {
      const input = fallback({ cast });
      expect(input.vendors).toEqual([{ name, cost: 0, booked: false, paid: 0, role: "other" }]);
      expect(props.safeParse(input).success).toBe(true);
    }
  });
});

describe("Vendors parts and states", () => {
  it("shows the totals first and preserves every address under finish variants", () => {
    const address = "home/v1";
    const parts = [...addressedElements(render()).keys()];
    expect(parts.slice(0, 2)).toEqual([`${address}/root`, `${address}/totals`]);
    for (const part of meta.items.parts) expect(parts).toContain(`${address}/r1/${part}`);
    for (const part of ["due", "call", "call_icon"]) expect(parts).not.toContain(`${address}/r2/${part}`);
    expect([
      ...addressedElements(render({ ...example, density: "compact", surface: "outlined" })).keys(),
    ]).toEqual(parts);
    const brief = { ...example, detail: "brief" };
    expect([...addressedElements(render(brief)).keys()]).toEqual(
      parts.filter((part) => !part.endsWith("/due")),
    );
    expect(props.parse(brief).vendors[0]!.due).toBe(row.due);
    expect(read(brief)).not.toContain("30 May 2027");
  });
  it("draws empty copy without vendor data or actions", () => {
    const html = render(example, "empty");
    expect([...addressedElements(html).keys()]).toEqual(["home/v1/root", "home/v1/empty"]);
    expect(html).toContain(emptyLine());
    expect(renderInstance("Vendors", example, "empty", theme, { thing: "supplier" })).toContain(
      emptyLine("supplier"),
    );
    expect(html).not.toContain(row.name);
    expect(html).not.toContain('role="button"');
    expect(read(example, "empty")).toBe("v1 Vendors (empty)");
    for (const target of ["v1/r1", "v1/r1/call"])
      expect(plan(target, "empty")).toMatchObject({ ok: false, code: "not_actionable" });
  });
});

describe("Vendors read and act", () => {
  it("reads the same amounts, dates, and booking status shown in the view, but not private phone text", () => {
    const text = read();
    for (const label of [
      "$3,300",
      "$1,200",
      "$2,100",
      "Due 30 May 2027",
      "Catering · Booked",
      "Music · Not booked",
    ]) {
      expect(text).toContain(label);
      expect(render()).toContain(label);
    }
    expect(text).not.toContain(row.phone!);
    expect(text).toContain(`[v1/r1/call press !needs-service]`);
    expect(text).not.toContain("[v1/r2/call");
  });
  it("opens both supplier rows and offers a separate, named call only on the row with a phone", () => {
    const html = addressedElements(render());
    for (const part of ["r1/root", "r2/root", "r1/call"])
      expect(html.get(`home/v1/${part}`)?.attributes).toContain('role="button"');
    expect(html.get("home/v1/r1/call")?.attributes).toContain(`aria-label="${words.call(row.name)}"`);
    for (const target of ["v1/r1", "v1/r2", "v1/r1/call"])
      expect(plan(target)).toMatchObject({ ok: true, links: [] });
    expect(plan("v1/r2/call")).toMatchObject({ ok: false, code: "not_actionable" });
    const swapped = {
      vendors: [
        { ...row, phone: undefined },
        { ...second, phone: row.phone },
      ],
    };
    expect(plan("v1/r1/call", "filled", swapped)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(plan("v1/r2/call", "filled", swapped)).toMatchObject({ ok: true, links: [] });
  });
});
