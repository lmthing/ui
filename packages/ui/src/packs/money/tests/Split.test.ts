import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";
import { moneyWordsFor } from "../lang";

const { props, meta, examples, fallback, probes } = components.Split;
const first = examples[0]!;
const expense = first.expenses[0]!;
const neutral = { things: [], items: [] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const w = moneyWordsFor().split;
const render = (input: unknown, state: "filled" | "empty" | "success" = "filled") =>
  renderInstance("Split", input, state, theme, "expense");
const controller = (input = first, state: "filled" | "empty" | "success" = "filled") => {
  const onAction = vi.fn(),
    onLink = vi.fn();
  const runtime = createScreenController({
    defs: components,
    screen: { id: "home", components: [{ ...input, id: "s1", c: "Split", state }] },
    onAction,
    onLink,
  });
  return { runtime, onAction, onLink };
};

describe("Split schema and boundaries", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    { people: [] },
    { people: [first.people[0]] },
    { people: Array(7).fill(first.people[0]) },
    { people: [{ name: "x".repeat(21), photo: "lib:people" }, first.people[1]] },
    { people: [{ ...first.people[0], photo: "https://example.org/photo" }, first.people[1]] },
    { people: [{ ...first.people[0], owes: true }, first.people[1]] },
    { people: [{ ...first.people[0], id: "r1" }, first.people[1]] },
    { expenses: Array(7).fill(expense) },
    { expenses: [{ ...expense, title: "x".repeat(29) }] },
    { expenses: [{ ...expense, title: "  " }] },
    { expenses: [{ ...expense, amount: -1 }] },
    { expenses: [{ ...expense, amount: Infinity }] },
    { expenses: [{ ...expense, by: 1.5 }] },
    { expenses: [{ ...expense, by: 2 }] },
    { expenses: [{ ...expense, split: "weighted" }] },
    { expenses: [{ ...expense, balance: 0 }] },
    { goto: "Bad id" },
    { color: "red" },
    { currency: "EUR" },
  ])("rejects invalid or computed inputs", (input) =>
    expect(props.safeParse({ ...first, ...input }).success).toBe(false),
  );
  it("allows exact maxima and stamps ids only in the view", () => {
    const person = { name: "x".repeat(20), photo: "local:1" };
    expect(
      props.safeParse({
        people: Array(6).fill(person),
        expenses: Array(6).fill({ title: "x".repeat(28), amount: Number.MAX_VALUE, by: 5, split: "shares" }),
        goto: "a".repeat(64),
      }).success,
    ).toBe(true);
    expect(props.parse({ ...first, people: [{ ...person, name: "  Ana  " }, person] }).people[0]!.name).toBe(
      "Ana",
    );
    expectTypeOf<Props<typeof props, typeof meta>["people"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("Split fallback and metadata", () => {
  it("uses bounded cast titles and neutral placeholders", () => {
    const casts: CastLike[] = [
      neutral,
      { things: [], items: [{ id: "good", type: "person", sample: true, name: "Ana" }] },
      { things: [], items: [{ id: "bad", type: "person", sample: false, name: 4 }] },
      {
        things: [],
        items: Array.from({ length: 8 }, (_, i) => ({
          id: `p${i}`,
          type: "person",
          sample: false,
          title: "x".repeat(80),
        })),
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: neutral }).people.map((person) => person.name)).toEqual([
      placeholderTitle(0),
      placeholderTitle(1),
    ]);
    expect(fallback({ cast: casts[1]! }).people[0]!.name).toBe("Ana");
    expect(fallback({ cast: casts[3]! }).people).toHaveLength(6);
  });
  it("keeps the core near miss, the people tier and the pack readiness gate", () => {
    expect(meta).toMatchObject({
      status: "ready",
      tier: "people",
      partTiers: { settle: "people" },
      confirmParts: ["settle"],
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Amount")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Split" });
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
    expect(createRegistry({ packs: ["money"], includeDrafts: true }).ids).toContain("Split");
    expect(createRegistry({ packs: ["money"] }).ids.includes("Split")).toBe(packReady("money"));
  });
});

describe("Split states, parts and read/act", () => {
  it("draws portrait balances, suggested payments and the expense ledger", () => {
    const html = render(first);
    for (const part of ["root", "settlements", "balances", "expenses", "r1/name", "r1/photo", "r1/balance"])
      expect(elementAt(html, `home/c1/${part}`).attributes).toBeTruthy();
    const offered = affordancesOf(meta, stampItemIds(meta, props.parse(first)), "s1");
    expect(offered.map(({ address, detail }) => [address, detail])).toEqual([
      ["s1/add", "→entry"],
      ["s1/r2/settle", ""],
    ]);
    for (const { address } of offered)
      expect(elementAt(html, address.replace("s1", "home/c1")).attributes).toContain('role="button"');
    const reading = readComponent(components.Split, first, "s1").join("\n");
    for (const line of [
      "Sam pays Ana $18",
      "r2: Record settlement for Sam",
      "Ana: +$18",
      "Sam: -$18",
      "Terracotta pots · Paid by Sam · $12",
      "[s1/r2/settle press !needs-people]",
      "[s1/add press→entry !needs-people]",
    ])
      expect(reading).toContain(line);
  });

  it("omits settlement controls on empty or net-zero ledgers and explicit passive states", () => {
    const empty = { ...first, expenses: [] };
    const even = { ...first, expenses: [{ ...expense, amount: 0 }] };
    expect(render(empty)).toContain(w.empty);
    expect(render(even)).toContain(w.settled);
    for (const input of [empty, even]) {
      expect(render(input)).not.toContain('data-testid="home/c1/r2/settle"');
      const { runtime } = controller(input);
      expect(runtime.press("s1/r2/settle")).toMatchObject({ ok: false });
      expect(runtime.press("s1/add")).toMatchObject({ ok: true });
      runtime.dispose();
    }
    for (const state of ["empty", "success"] as const) {
      expect(render(first, state)).toContain(state === "empty" ? "No expenses yet" : w.settled);
      expect(render(first, state)).not.toContain('data-testid="home/c1/add"');
      const { runtime } = controller(first, state);
      expect(runtime.press("s1/add")).toMatchObject({ ok: false });
      expect(runtime.press("s1/r2/settle")).toMatchObject({ ok: false });
      expect(runtime.read()).not.toContain(" press");
      runtime.dispose();
    }
  });
});

describe("Split confirmation", () => {
  it("requires confirmation to record settlement without linking or moving money", () => {
    const { runtime, onAction, onLink } = controller();
    expect(runtime.press("s1/r1/settle")).toMatchObject({ ok: false });
    expect(runtime.press("s1/r2/settle")).toMatchObject({ ok: true });
    expect(runtime.confirmation?.source).toBe("home/s1/r2/settle");
    expect(onAction).not.toHaveBeenCalled();
    runtime.press("confirm/cancel");
    expect(onAction).not.toHaveBeenCalled();
    runtime.press("s1/r2/settle");
    expect(runtime.press("confirm/confirm")).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/s1/r2/settle", action: "press" });
    expect(runtime.press("confirm/confirm")).toMatchObject({ ok: false });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.press("s1/add")).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledExactlyOnceWith("entry", "home/s1/add");
    runtime.dispose();
  });
});
