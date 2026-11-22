import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.ClientHistory;
const entry = { date: "2026-11-18", kind: "visit", title: "Consultation", goto: "details" } as const;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown, state: "filled" | "empty" | "loading" = "filled") =>
  renderInstance("ClientHistory", input, state, theme);

describe("ClientHistory contract and boundaries", () => {
  it.each(examples)("accepts every domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims titles and adds item ids only to view props", () => {
    expect(props.parse({ entries: [{ ...entry, title: " Consultation " }] })).toEqual({
      entries: [{ ...entry, mark: "none", tone: "neutral" }],
      lead: "icon",
    });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["entries"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
  });
  it.each([
    {},
    { entries: [] },
    { entries: Array.from({ length: 7 }, () => entry) },
    ...["", " ", "x".repeat(33)].map((title) => ({ entries: [{ ...entry, title }] })),
    ...["2026-02-29", "2026-13-01", "2026-11-31", "18 Nov", ""].map((date) => ({
      entries: [{ ...entry, date }],
    })),
    ...[NaN, Infinity, -Infinity, "$20"].map((amount) => ({ entries: [{ ...entry, amount }] })),
    ...[
      { kind: "refund" },
      { kind: undefined },
      { goto: undefined },
      { goto: "Bad ID" },
      { goto: "x".repeat(65) },
      { id: "r1" },
      { color: "red" },
      { root: "press" },
    ].map((fields) => ({ entries: [{ ...entry, ...fields }] })),
    { entries: [entry, { ...entry, date: "2026-11-19" }] },
    { entries: [entry], style: "history" },
    { entries: [entry], pixels: 12 },
  ])("rejects invalid and unbounded input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact limits, equal dates, leap days and signed finite amounts", () => {
    const row = { ...entry, title: "x".repeat(32), goto: "x".repeat(64), date: "2024-02-29" };
    expect(props.safeParse({ entries: Array.from({ length: 6 }, () => row) }).success).toBe(true);
    for (const amount of [0, -20, 12.5, -12.5, Number.MAX_SAFE_INTEGER])
      expect(props.safeParse({ entries: [{ ...entry, amount }] }).success).toBe(true);
  });
});

describe("ClientHistory fallback", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "record", fields: ["name"] }],
      items: [{ id: "a", type: "record", sample: true, name: "Consultation" }],
    },
    {
      things: [],
      items: [
        { id: "a", type: "record", sample: true, title: "Consultation" },
        { id: "b", type: "other", sample: true, name: "Other" },
      ],
    },
    {
      things: [{ type: "record", fields: ["name"] }],
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `r_${index}`,
        type: "record",
        sample: false,
        name: "x".repeat(80),
      })),
    },
    { things: [], items: [{ id: "a", type: "record", sample: true, name: 4 }] },
  ];
  it.each(casts)("validates empty, full, mixed, long and malformed casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast titles and shared neutral placeholders only", () => {
    expect(fallback({ cast: casts[0]! }).entries[0]?.title).toBe("Item one");
    expect(fallback({ cast: casts[1]! }).entries[0]?.title).toBe("Consultation");
    expect(fallback({ cast: casts[2]! }).entries).toHaveLength(1);
    expect(fallback({ cast: casts[3]! }).entries).toHaveLength(3);
    expect(fallback({ cast: casts[4]! }).entries[0]?.title).toBe("Item one");
    expect(fallback({ cast: casts[0]! }).entries[0]?.amount).toBeUndefined();
  });
});

describe("ClientHistory states and parts", () => {
  it.each(["visit", "order", "payment", "note", "message"] as const)(
    "draws the %s kind and optional amount",
    (kind) => {
      for (const amount of [undefined, 0, 120, -12.5]) {
        const html = draw({ entries: [{ ...entry, kind, amount }] });
        for (const part of ["root", "title", "date", "kind"])
          expect(elementAt(html, `home/c1/r1/${part}`).attributes).toContain("data-testid");
        expect(elementAt(html, "home/c1/r1/root").attributes).toContain('role="link"');
        expect(html.includes('data-testid="home/c1/r1/amount"')).toBe(amount !== undefined);
        expect(html).toContain(`${kind} · 2026-11-18`);
      }
    },
  );
  it("renders all six entries at maximum title length", () => {
    const html = draw({ entries: Array.from({ length: 6 }, () => ({ ...entry, title: "x".repeat(32) })) });
    expect(html.match(/data-testid="home\/c1\/r\d+\/root"/g)).toHaveLength(6);
  });
  it.each(["empty", "loading"] as const)("keeps %s intentional and non-actionable", (state) => {
    const html = draw(examples[0], state);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).not.toContain('role="link"');
    expect(readComponent(components.ClientHistory, examples[0], "c1", state)).toEqual([
      `c1 ClientHistory (${state})`,
    ]);
    expect(html).toContain(state === "empty" ? "Nothing here yet" : "Loading");
  });
});

describe("ClientHistory read/act and core-first probes", () => {
  it("offers only one phone-tier open action per entry", () => {
    for (const goto of ["details", "back", "payment", "client_details"]) {
      const input = props.parse({ entries: [{ ...entry, goto }] });
      expect(affordancesOf(meta, stampItemIds(meta, input), "c1")).toEqual([
        { address: "c1/r1", part: "root", action: "press", detail: `→${goto}` },
      ]);
      expect(readComponent(components.ClientHistory, input, "c1").join("\n")).toContain(
        `[c1/r1 press→${goto}]`,
      );
    }
    expect(meta.tier).toBe("phone");
    expect(meta.weight).toBe(2);
  });
  it("reads the full date, kind and formatted zero, positive and negative amounts", () => {
    const input = { entries: [0, 120, -12.5].map((amount) => ({ ...entry, amount })) };
    const reading = readComponent(components.ClientHistory, input, "c1").join("\n");
    const html = draw(input);
    for (const line of ["visit · 2026-11-18", "$0", "+$120", "-$12.50"]) {
      expect(reading).toContain(line);
      expect(html).toContain(line);
    }
  });
  it("preserves the contract probes and pack readiness gate", () => {
    expect(meta.status).toBe("ready");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Timeline");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Timeline")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "ClientHistory" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "c1/r1", action: "press" },
    });
    expect(createRegistry({ packs: ["customers"] }).ids.includes(meta.id)).toBe(packReady("customers"));
    expect(createRegistry({ packs: ["customers"], includeDrafts: true }).ids).toContain("ClientHistory");
  });
});
