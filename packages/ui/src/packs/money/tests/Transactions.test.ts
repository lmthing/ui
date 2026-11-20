import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  loadingLabel,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  wordsFor,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../test/render";

const definition = components.Transactions;
const { props, meta, examples, fallback, probes } = definition;
const row = examples[0]!.entries[0]!;
const theme = { preset: "calm", accent: "moss", mode: "light" } as const;

describe("Transactions contract", () => {
  it.each(examples)("parses each domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("trims text and admits one to six entries with the declared boundaries", () => {
    expect(props.parse({ entries: [{ ...row, payee: "  Supply shop  " }] }).entries[0]?.payee).toBe(
      "Supply shop",
    );
    const limit = { ...row, payee: "a".repeat(28), category: "b".repeat(16), goto: "c".repeat(64) };
    expect(props.safeParse({ entries: Array.from({ length: 6 }, () => limit) }).success).toBe(true);
    for (const amount of [-Number.MAX_VALUE, 0, Number.MAX_VALUE]) {
      expect(props.safeParse({ entries: [{ ...row, amount }] }).success).toBe(true);
    }
    expectTypeOf<Props<typeof props, typeof meta>["entries"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { entries: [] },
    { entries: Array(7).fill(row) },
    { entries: [row], currency: "EUR" },
    { entries: [row], color: "red" },
  ])("rejects invalid component props", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });

  it.each([
    { date: "2026-02-29" },
    { date: "Nov 17" },
    { payee: " " },
    { payee: "a".repeat(29) },
    { category: " " },
    { category: "a".repeat(17) },
    { icon: "unknown" },
    { amount: "-24.50" },
    { amount: Infinity },
    { amount: NaN },
    { goto: undefined },
    { goto: "Bad ID" },
    { goto: "a".repeat(65) },
    { id: "r9" },
  ])("rejects invalid entries", (change) => {
    expect(props.safeParse({ entries: [{ ...row, ...change }] }).success).toBe(false);
  });
});

describe("Transactions metadata", () => {
  it("retains the phone tier and probe contract without activating an incomplete pack", () => {
    expect(meta).toMatchObject({
      status: "ready",
      tier: "phone",
      weight: 2,
      states: ["filled", "empty", "loading"],
    });
    expect(meta.realPath).not.toBe("");
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Transactions",
      "Bars",
    ]);
    expect(probes.find((probe) => probe.kind === "write")?.expect).toBe("Transactions");
    expect(probes.find((probe) => probe.kind === "read")?.expect).toEqual({
      address: "t1/r1",
      action: "press",
    });
    expect(createRegistry({ packs: ["money"], includeDrafts: true }).schema("Transactions")).toBe(props);
    expect(createRegistry({ packs: ["money"] }).ids.includes("Transactions")).toBe(packReady("money"));
  });
});

describe("Transactions fallback", () => {
  const empty: CastLike = { things: [], items: [] };
  const record = { id: "one", type: "record", sample: true, title: "Sample record", detail: "A category" };
  const matching: CastLike = { things: [{ type: "record", fields: ["title", "detail"] }], items: [record] };
  const malformed: CastLike = { ...matching, items: [{ ...record, title: false, detail: null }] };
  const oversized: CastLike = {
    ...matching,
    items: Array.from({ length: 8 }, (_, index) => ({
      ...record,
      id: `item_${index}`,
      title: "a".repeat(60),
      detail: "b".repeat(60),
    })),
  };
  it("uses neutral placeholders, adapts to the cast and caps its seed rows", () => {
    for (const cast of [empty, matching, malformed, oversized]) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    }
    expect(fallback({ cast: empty }).entries[0]).toMatchObject({
      payee: placeholderTitle(0),
      category: wordsFor().placeholderDetail,
      amount: 0,
      icon: "dot",
    });
    expect(fallback({ cast: matching }).entries[0]).toMatchObject({
      payee: record.title,
      category: record.detail,
    });
    expect(fallback({ cast: oversized }).entries).toHaveLength(3);
  });
});

describe("Transactions states, parts and read/act", () => {
  const filled = () => renderInstance("Transactions", examples[0], "filled", theme);

  it("draws one heading at each day boundary and addresses every interactive row and its content", () => {
    const entries = [...examples[0]!.entries, examples[1]!.entries[1]!];
    const html = renderInstance("Transactions", { entries }, "filled", theme);
    expect(elementAt(html, "home/c1/root").attributes).not.toMatch(/\srole=/);
    for (const [index] of entries.entries()) {
      const item = `home/c1/r${index + 1}`;
      for (const part of ["payee", "category", "icon", "amount"])
        expect(elementAt(html, `${item}/${part}`)).toBeDefined();
      const link = elementAt(html, `${item}/root`);
      expect(link.attributes).toContain('role="link"');
      expect(JSON.stringify(link)).not.toContain(`${item}/date`);
      expect(html.includes(`data-testid="${item}/date"`)).toBe(index === 0 || index === 3);
    }
  });

  it.each(["empty", "loading"] as const)("keeps the %s state inert and free of filled addresses", (state) => {
    const html = renderInstance("Transactions", examples[0], state, theme, "record");
    expect(elementAt(html, "home/c1/root")).toBeDefined();
    expect(html).toContain(state === "empty" ? emptyLine("record") : loadingLabel);
    expect(html.includes('data-testid="home/c1/empty"')).toBe(state === "empty");
    expect(html).not.toContain('role="link"');
    expect(html).not.toMatch(/data-testid="home\/c1\/r\d/);
    expect(meta.read(props.parse(examples[0]), state, undefined)).toEqual([]);
    expect(readComponent(definition, examples[0], "c1", state)).toEqual([`c1 Transactions (${state})`]);
  });

  it("reads the rendered signs, day groups and their links without offering destructive actions", () => {
    const example = examples[0]!;
    const html = filled();
    const read = readComponent(definition, example, "c1").join("\n");
    const stamped = stampItemIds(meta, props.parse(example));
    expect(affordancesOf(meta, stamped, "c1")).toEqual(
      example.entries.map(({ goto }, index) => ({
        address: `c1/r${index + 1}`,
        action: "press",
        part: "root",
        detail: `→${goto}`,
      })),
    );
    for (const visible of ["-$24.50", "+$8", "-$12", "Ledge Potting", "Plant care"]) {
      expect(html).toContain(visible);
      expect(read).toContain(visible);
    }
    expect(read).toContain("r1 Ledge Potting · Plant care · -$24.50");
    expect(read).toContain("[c1/r1 press→supplies]");
  });
});
