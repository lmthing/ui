import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  loadingLabel,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";

const def = components.AccountCard;
const { meta, props, examples, fallback, probes } = def;
const example = examples[0]!;
const account = example.accounts[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const neutral = { things: [], items: [] };

describe("AccountCard schema", () => {
  it.each(examples)("accepts a real example", (input) => expect(props.safeParse(input).success).toBe(true));
  it.each([
    { accounts: [] },
    { accounts: Array.from({ length: 5 }, () => account) },
    { accounts: [account], currency: "GBP" },
    ...[
      { name: "" },
      { name: "a".repeat(21) },
      { kind: "credit" },
      { last4: "123" },
      { last4: "12345" },
      { last4: "12x4" },
      { balance: "120" },
      { balance: Infinity },
      { balance: NaN },
      { swatch: "#345678" },
      { goto: undefined },
      { goto: "Bad ID" },
      { id: "r1" },
    ].map((overrides) => ({ accounts: [{ ...account, ...overrides }] })),
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("preserves a 20-character name, leading zeros, signed balances and four accounts", () => {
    const boundary = {
      ...account,
      name: "a".repeat(20),
      last4: "0042",
      balance: -12.5,
      goto: "a".repeat(64),
    };
    const input = { accounts: Array.from({ length: 4 }, () => boundary) };
    expect(props.parse(input)).toEqual({ ...input, detail: "full", surface: "card" });
    expectTypeOf<Props<typeof props, typeof meta>["accounts"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("AccountCard fallback and metadata", () => {
  it("uses bounded cast names and a neutral placeholder for missing names", () => {
    const full: CastLike = {
      things: [{ type: "record", fields: ["title"] }],
      items: ["First", "Long account description", "Third", "Fourth"].map((title, index) => ({
        id: `record_${index}`,
        type: "record",
        sample: true,
        title,
      })),
    };
    const malformed: CastLike = { ...full, items: [{ ...full.items[0]!, title: 12 }] };
    for (const cast of [neutral, full, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: full }).accounts.map(({ name }) => name)).toEqual([
      "First",
      "Long account",
      "Third",
    ]);
    expect(fallback({ cast: neutral }).accounts).toEqual([
      { name: placeholderTitle(0), kind: "cash", balance: 0, swatch: "grey", goto: "details" },
    ]);
    expect(fallback({ cast: malformed }).accounts[0]?.name).toBe(placeholderTitle(0));
  });
  it("keeps the phone tier, core near miss, read probe and pack readiness gate", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", states: ["filled", "loading"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Amount");
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "AccountCard",
      "Amount",
    ]);
    expect(probes.find(({ kind }) => kind === "write")).toMatchObject({ expect: "AccountCard" });
    expect(probes.find(({ kind }) => kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "a1/r1", action: "press" },
    });
    expect(createRegistry({ packs: ["money"] }).ids.includes("AccountCard")).toBe(packReady("money"));
    expect(createRegistry({ packs: ["money"], includeDrafts: true }).schema("AccountCard")).toBe(props);
  });
});

describe("AccountCard states and parts", () => {
  it("addresses each card and all drawn parts, omitting digits when absent", () => {
    const html = renderInstance("AccountCard", example, "filled", theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    for (const id of ["r1", "r2"]) {
      const address = `home/c1/${id}`;
      expect(elementAt(html, `${address}/root`).attributes).toContain('role="link"');
      for (const part of ["name", "kind", "balance", "swatch"])
        expect(elementAt(html, `${address}/${part}`)).toBeDefined();
    }
    expect(html).not.toContain('data-testid="home/c1/r1/last4"');
    expect(elementAt(html, "home/c1/r2/last4")).toBeDefined();
    expect(html).toContain("Current");
    expect(html).toContain("· 4821");
  });
  it("skeletons each card when loading without exposing links or addressable text", () => {
    const html = renderInstance("AccountCard", example, "loading", theme);
    expect(html.match(/aria-busy="true"/g)).toHaveLength(example.accounts.length);
    expect(html).toContain(loadingLabel);
    expect(html).not.toContain('role="link"');
    expect(html).not.toMatch(/data-testid="home\/c1\/r[12]\/(name|kind|last4|balance)"/);
    expect(readComponent(def, example, "a1", "loading")).toEqual(["a1 AccountCard (loading)"]);
  });
});

describe("AccountCard read and act", () => {
  it("reads the visible localized amounts and only offers presses on item roots", () => {
    const read = readComponent(def, example, "a1", "filled", {}, "en-GB");
    expect(read[0]).toContain("r2 Current · 4821 US$1,240.50");
    expect(read[1]).toContain('"Ledge supplies" [a1/r1 press→supplies]');
    expect(read[2]).toContain('"Everyday" · "4821" [a1/r2 press→current]');
    const html = renderInstance("AccountCard", example, "filled", theme, { lang: "en-GB" });
    expect(html).toContain("US$1,240.50");
    const stamped = stampItemIds(meta, props.parse(example));
    expect(affordancesOf(meta, stamped, "a1")).toEqual([
      { address: "a1/r1", part: "root", action: "press", detail: "→supplies" },
      { address: "a1/r2", part: "root", action: "press", detail: "→current" },
    ]);
  });
  it.each(["filled", "loading"] as const)("only navigates from card roots when %s", (state) => {
    const onLink = vi.fn();
    const screen = { id: "home", components: [{ id: "a1", c: "AccountCard", state, ...example }] };
    const controller = createScreenController({ screen, defs: { AccountCard: def }, onLink });
    for (const address of ["a1", "a1/r1/name", "a1/r1/last4", "a1/r2/last4", "a1/r3"])
      expect(controller.press(address)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(controller.press("home/a1/r2/root")).toMatchObject({ ok: state === "filled" });
    if (state === "filled") expect(onLink).toHaveBeenCalledExactlyOnceWith("current", "home/a1/r2");
    else expect(onLink).not.toHaveBeenCalled();
    controller.dispose();
  });
});
