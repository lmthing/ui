import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  partTierAt,
  placeholderTitle,
  type CastLike,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Loans;
const { examples, fallback, meta, props, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const loan = { thing: "Pruning shears", person: "Ana", way: "lent", since: "2024-02-29" } as const;
const input = {
  loans: [
    { ...loan, photo: "lib:plants", due: "2024-03-01" },
    { ...loan, thing: "Long training lead", person: "Sam", way: "borrowed" },
    { ...loan, thing: "Hand trowel", due: "9999-12-31" },
  ],
};
const render = (value: unknown, state: StateName = "filled", lang = "en") =>
  addressedElements(renderInstance("Loans", value, state, theme, { component: "l1", lang }));
const at = (part: string) => `home/l1/${part}`;

describe("Loans schema", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("accepts exact bounds, same-day due dates and the shared defaults", () => {
    const max = { ...loan, thing: "a".repeat(28), person: "b".repeat(20), photo: "local:1", due: loan.since };
    expect(props.parse({ loans: Array(6).fill(max) })).toMatchObject({
      surface: "card",
      detail: "full",
      loans: Array(6).fill(max),
    });
    expect(props.parse({ loans: [{ ...loan, thing: " Trowel " }] }).loans[0]?.thing).toBe("Trowel");
    expectTypeOf<Props<typeof props, typeof meta>["loans"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { loans: [] },
    { loans: Array(7).fill(loan) },
    { loans: [{ ...loan, thing: " ".repeat(4) }] },
    { loans: [{ ...loan, thing: "a".repeat(29) }] },
    { loans: [{ ...loan, person: "b".repeat(21) }] },
    { loans: [{ ...loan, way: "given" }] },
    { loans: [{ ...loan, since: "2023-02-29" }] },
    { loans: [{ ...loan, due: "today" }] },
    { loans: [{ ...loan, due: "2024-02-28" }] },
    { loans: [{ ...loan, photo: "https://example.org/shears.png" }] },
    { loans: [{ ...loan, overdue: true }] },
    { loans: [{ ...loan, id: "r1" }] },
    { loans: [loan], detail: "hidden" },
    { loans: [loan], color: "red" },
  ])("rejects invalid wire input: %j", (value) => expect(props.safeParse(value).success).toBe(false));
});

describe("Loans fallback and contract", () => {
  it("reads cast content through shared helpers and uses neutral placeholders", () => {
    const things = [{ type: "tool", fields: ["name", "holder"] }];
    const item = { type: "tool", id: "drill", sample: true, name: "Drill", holder: "Lee" };
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things, items: [item] },
      { things, items: [{ ...item, name: 5, holder: null }] },
      { things, items: [{ ...item, name: "x".repeat(80), holder: "y".repeat(80) }] },
    ];
    const results = casts.map((cast) => fallback({ cast, lang: "en" }));
    for (const result of results) expect(props.safeParse(result).success).toBe(true);
    expect(results[0]?.loans[0]).toMatchObject({ thing: placeholderTitle(0), person: placeholderTitle(1) });
    expect(results[1]?.loans[0]).toMatchObject({ thing: "Drill", person: "Lee" });
    expect(results[3]?.loans[0]).toMatchObject({ thing: "x".repeat(28), person: "y".repeat(20) });
  });

  it("preserves the phone tier, reminder tier, near miss and readiness gate", () => {
    expect(meta).toMatchObject({ weight: 2, tier: "phone", confirmParts: ["returned"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(partTierAt(meta, {}, "returned")).toBe("phone");
    expect(partTierAt(meta, {}, "remind")).toBe("service");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Loans" }),
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "write", expect: "Loans" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "l1/r1/returned", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["inventory"] }).ids.includes("Loans")).toBe(packReady("inventory"));
  });
});

describe("Loans states and parts", () => {
  it("draws stable item addresses and only the applicable photo and due parts", () => {
    const parts = render(input);
    expect([...parts.keys()].filter((address) => address.endsWith("/root"))).toEqual(
      ["root", "r1/root", "r2/root", "r3/root"].map(at),
    );
    expect(parts.has(at("r1/photo"))).toBe(true);
    expect(parts.has(at("r2/photo"))).toBe(false);
    expect(parts.get(at("r2/way"))?.text).toContain("Borrowed from ");
    expect(parts.get(at("r2/person"))?.text).toEqual(["Sam"]);
    expect(parts.has(at("r1/overdue"))).toBe(true);
    expect(parts.has(at("r2/due"))).toBe(false);
    expect(parts.has(at("r2/overdue"))).toBe(false);
    expect(parts.has(at("r3/due"))).toBe(true);
    expect(parts.has(at("r3/overdue"))).toBe(false);
    expect(parts.get(at("r1/remind_label"))?.text).toEqual(["Remind Ana"]);
    expect(parts.get(at("r2/remind_label"))?.text).toEqual(["Remind me"]);
    for (const id of ["r1", "r2", "r3"])
      for (const action of ["returned", "remind"])
        expect(parts.get(at(`${id}/${action}`))?.attributes).toContain('role="button"');
  });

  it("brief hides only the start date while keeping its wire value, and dates use the app language", () => {
    const brief = { ...input, detail: "brief", surface: "outlined", density: "compact" };
    expect(props.parse(brief).loans[0]?.since).toBe(loan.since);
    const parts = render(brief, "filled", "en-US");
    expect([...parts.keys()]).toEqual([...render(input).keys()].filter((key) => !key.endsWith("/since")));
    expect(parts.get(at("r1/due"))?.text).toEqual(["Due back Mar 1, 2024"]);
  });

  it("shows an intentional empty message and mounts no item controls", () => {
    const parts = render(input, "empty");
    expect([...parts.keys()]).toEqual([at("root"), at("empty")]);
    expect(parts.get(at("empty"))?.text).toContain("Nothing here yet");
  });
});

const setup = (state: StateName = "filled", detail = "full") => {
  const onAction = vi.fn();
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...input, id: "l1", c: "Loans", state, detail }] },
    defs: { Loans: def },
    onAction,
  });
  return { onAction, controller };
};

describe("Loans read and act", () => {
  it("reads the due dates, directions and actions alongside the correct items", () => {
    const { controller } = setup("filled", "brief");
    const reading = controller.read();
    expect(reading).toContain("r1 Lent to Ana · Due back 1 Mar 2024 · Overdue · Mark returned · Remind Ana");
    expect(reading).toContain("r2 Borrowed from Sam · Mark returned · Remind me");
    expect(reading).toMatch(
      /r2 .*"Long training lead".*\[l1\/r2\/returned press\].*\[l1\/r2\/remind press !needs-service\]/,
    );
    expect(reading).not.toContain("Since ");
    expect(controller.press("l1/r2/overdue").ok).toBe(false);
  });

  it("defers a destructive return until confirmed and delivers only the accepted item", () => {
    const { controller, onAction } = setup();
    expect(controller.press("l1/r1/returned").ok).toBe(true);
    expect(controller.confirmation?.source).toBe("home/l1/r1/returned");
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(controller.press("l1/r2/returned").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: at("r2/returned"), action: "press" });
  });

  it("dispatches reminders without return confirmation and blocks both actions while empty", () => {
    const { controller, onAction } = setup();
    expect(controller.press("l1/r1/remind").ok).toBe(true);
    expect(controller.confirmation).toBeUndefined();
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: at("r1/remind"), action: "press" });
    const empty = setup("empty");
    expect(empty.controller.read()).not.toContain("/r1/");
    expect(empty.controller.press("l1/r1/returned").ok).toBe(false);
    expect(empty.controller.press("l1/r1/remind").ok).toBe(false);
    expect(empty.onAction).not.toHaveBeenCalled();
  });
});
