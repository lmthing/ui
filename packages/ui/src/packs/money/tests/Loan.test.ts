import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance, type Theme } from "../../../../test/render";
import { moneyWordsFor } from "../lang";

const def = components.Loan;
const { props, meta, examples, probes, fallback } = def;
const simple = {
  name: "Friend loan",
  principal: 100,
  rate: 0,
  payment: 60,
  firstDue: "2090-01-31",
  payments: [],
};
const theme: Theme = { preset: "calm", mode: "light", accent: "moss" };
const labels = moneyWordsFor().loanLabels;
const addr = (part: string) => `home/c1/${part}`;

describe("Loan contract and boundaries", () => {
  it.each(examples)("accepts its domain examples", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("retains a strict typed schema with summary and unlinked defaults", () => {
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["principal"]>().toEqualTypeOf<number>();
    expectTypeOf<View>().not.toHaveProperty("currency");
    expect(props.parse({ ...simple, name: "  Friend loan  " })).toEqual({
      ...simple,
      style: "summary",
      linked: false,
    });
    expect(props.parse({ ...simple, goto: "terms" })).toHaveProperty("linked", true);
    expect(
      props.safeParse({
        ...simple,
        name: "x".repeat(24),
        rate: 100,
        goto: "a".repeat(64),
        payments: Array.from({ length: 6 }, () => ({ due: simple.firstDue, amount: 1 })),
      }).success,
    ).toBe(true);
  });
  it.each([
    { name: "" },
    { name: "x".repeat(25) },
    { rate: -1 },
    { rate: 101 },
    { payment: 0 },
    { principal: 0 },
    { principal: Infinity },
    { firstDue: "2026-02-30" },
    { goto: "Bad ID" },
    { goto: "a".repeat(65) },
    { payments: [{ due: simple.firstDue, amount: 0 }] },
    { payments: [{ due: "2026-02-30", amount: 1 }] },
    { payments: Array.from({ length: 7 }, () => ({ due: simple.firstDue, amount: 1 })) },
    { payments: [{ due: simple.firstDue, amount: 1, interest: 3 }] },
    { style: "grid" },
    { linked: true },
    { currency: "EUR" },
    { balance: 30 },
    { schedule: [] },
    { finish: "2090-02-28" },
    { color: "#fff" },
  ])("rejects %j", (overrides) => expect(props.safeParse({ ...simple, ...overrides }).success).toBe(false));
});

describe("Loan fallback", () => {
  it("uses a bounded cast title or neutral copy for empty/malformed casts", () => {
    const empty: CastLike = { things: [], items: [] };
    const casts: CastLike[] = [
      empty,
      {
        things: [{ type: "debt", fields: ["name"] }],
        items: [{ id: "one", type: "debt", sample: true, name: "x".repeat(24) }],
      },
      { ...empty, items: [{ id: "bad", type: "debt", sample: true, name: 99 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).name).toBe(placeholderTitle(0));
    expect(fallback({ cast: casts[1]! }).name).toBe("x".repeat(24));
    expect(fallback({ cast: casts[2]! }).name).toBe(placeholderTitle(0));
  });
});

describe("Loan states and parts", () => {
  it("renders the terms and forecast parts and only adds schedule in schedule style", () => {
    const summary = renderInstance("Loan", simple, "filled", theme);
    for (const part of ["root", "name", "balance", "principal", "rate", "payment", "next", "finish"]) {
      expect(elementAt(summary, addr(part))).toBeDefined();
    }
    expect(summary).not.toContain(addr("schedule"));
    const schedule = renderInstance("Loan", { ...simple, style: "schedule" }, "filled", theme);
    expect(elementAt(schedule, addr("schedule"))).toBeDefined();
    expect(schedule).toContain("$40 left");
    expect(schedule).toContain("$0 left");
  });

  it.each([
    { state: "loading", text: "Loading" },
    { state: "success", text: labels.cleared },
    { state: "error", text: labels.insufficient },
  ] as const)("shows $state without an active forecast or edit", ({ state, text }) => {
    const html = renderInstance("Loan", { ...simple, style: "schedule", goto: "terms" }, state, theme);
    expect(elementAt(html, addr("root"))).toBeDefined();
    expect(html).toContain(text);
    for (const part of ["next", "schedule", "finish", "edit"]) expect(html).not.toContain(addr(part));
  });

  it("shows the calculated error for a monthly payment equal to the interest", () => {
    const failing = { ...simple, rate: 12, payment: 1, goto: "terms" };
    const html = renderInstance("Loan", failing, "filled", theme);
    expect(html).toContain(labels.insufficient);
    expect(html).not.toContain(addr("next"));
    expect(html).not.toContain(addr("finish"));
    expect(html).toContain(addr("edit"));
    expect(readComponent(def, failing, "l1")[0]).toContain(labels.insufficient);
  });
});

describe("Loan read, act and readiness", () => {
  it("offers only the non-destructive linked edit and reads the amounts it draws", () => {
    expect(meta).not.toHaveProperty("confirmParts");
    expect(affordancesOf(meta, props.parse(simple), "l1")).toEqual([]);
    for (const goto of ["terms", "back"]) {
      const input = { ...simple, goto };
      expect(affordancesOf(meta, props.parse(input), "l1")).toEqual([
        { address: "l1/edit", part: "edit", action: "press", detail: `→${goto}` },
      ]);
      const read = readComponent(def, input, "l1")[0]!;
      expect(read).toContain("Remaining balance — $100");
      expect(read).toContain("Principal $60 · Interest $0");
      expect(read).toContain(`[l1/edit press→${goto}]`);
      const html = renderInstance("Loan", input, "filled", theme);
      expect(elementAt(html, addr("edit")).attributes).toMatch(/role="(button|link)"/);
    }
    const unlinked = readComponent(def, simple, "l1")[0]!;
    expect(unlinked).not.toContain("l1/edit");
    expect(unlinked).not.toContain(labels.edit);
  });

  it("keeps its phone tier, real path and core-first probes", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).toContain("never transfers");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Loan" }),
        expect.objectContaining({ kind: "choose", expect: "Amount" }),
        expect.objectContaining({ kind: "write", expect: "Loan" }),
        expect.objectContaining({ kind: "read", expect: { address: "l1/edit", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["money"], includeDrafts: true }).resolve("l-o-a-n")).toBe("Loan");
    expect(createRegistry({ packs: ["money"] }).ids.includes("Loan")).toBe(packReady("money"));
  });
});
