import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { components, readComponent, type CastLike, type Props, type ThemeChoice } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";
const { props, meta, examples, fallback, probes } = components.Rewards;
const points = examples[0]!;
const money = examples[1]!;
const kid = points.kids[0]!;
const prize = points.prizes[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const screen = { id: "home", components: [{ id: "r1", c: "Rewards", ...points }] };

describe("Rewards contract", () => {
  it.each(examples)("accepts a real example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("keeps the tier, confirmation and core-first probes", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", weight: 2, confirmParts: ["claim"] });
    expect(meta.realPath).not.toBe("");
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Rewards",
      "Ring",
    ]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "Rewards" }));
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "read",
        expect: { address: "r1/r2/claim", action: "press" },
      }),
    );
  });
  it("accepts exact field limits, defaults to points and reserves item ids for views", () => {
    const kids = Array.from({ length: 4 }, () => ({
      ...kid,
      name: "a".repeat(16),
      goto: "b".repeat(64),
      photo: "local:1",
    }));
    const prizes = Array.from({ length: 6 }, () => ({ ...prize, title: "a".repeat(24) }));
    expect(props.parse({ kids, prizes })).toMatchObject({ money: false, kids, prizes });
    expect(props.parse({ kids: [{ ...kid, name: " Mia " }], prizes }).kids[0]?.name).toBe("Mia");
    expectTypeOf<Props<typeof props, typeof meta>["entries"][number]["id"]>().toEqualTypeOf<string>();
  });
});
describe("Rewards boundaries", () => {
  it.each([
    {},
    { ...points, kids: [] },
    { ...points, prizes: [] },
    { ...points, kids: Array.from({ length: 5 }, () => kid) },
    { ...points, prizes: Array.from({ length: 7 }, () => prize) },
    { ...points, currency: "USD" },
    { ...points, entries: [] },
    { ...points, color: "red" },
    { ...points, money: "yes" },
    ...[
      { name: " " },
      { name: "a".repeat(17) },
      { points: -1 },
      { points: Infinity },
      { goto: undefined },
      { goto: "Bad ID" },
      { photo: "https://example.org/photo" },
      { id: "r1" },
    ].map((patch) => ({ ...points, kids: [{ ...kid, ...patch }] })),
    ...[
      { title: "" },
      { title: "a".repeat(25) },
      { cost: -1 },
      { cost: NaN },
      { icon: "unknown" },
      { claimable: true },
      { id: "r2" },
    ].map((patch) => ({ ...points, prizes: [{ ...prize, ...patch }] })),
  ])("rejects invalid wire data", (input) => expect(props.safeParse(input).success).toBe(false));
  it("uses one child's balance, not pooled points, and permits exact and zero costs", () => {
    const input = props.parse({
      kids: [
        { ...kid, points: 4 },
        { ...kid, points: 5 },
      ],
      prizes: [0, 5, 6].map((cost) => ({ ...prize, cost })),
    });
    expect(
      input.entries.filter((entry) => entry.entryKind === "prize").map((entry) => entry.claimable),
    ).toEqual([true, true, false]);
  });
});

describe("Rewards fallback", () => {
  it("clips cast names, limits the jars and uses safe destinations", () => {
    const cast: CastLike = {
      things: [{ type: "child", fields: ["name"] }],
      items: Array.from({ length: 5 }, (_, index) => ({
        id: index === 0 ? "bad id" : `child_${index}`,
        type: "child",
        sample: true,
        name: "a".repeat(24),
      })),
    };
    const input = fallback({ cast });
    expect(input.kids).toHaveLength(4);
    expect(input.kids[0]).toMatchObject({ name: expect.stringMatching(/^a.{0,15}$/), goto: "detail" });
    expect(input.kids[1]?.goto).toBe("child_1");
    expect(props.safeParse(input).success).toBe(true);
  });
  it.each([{ items: [] }, { items: [{ id: "child", type: "child", sample: true, name: 4 }] }])(
    "uses neutral content when the cast has no usable names",
    ({ items }) => {
      const input = fallback({ cast: { things: [], items } });
      expect(props.safeParse(input).success).toBe(true);
      expect(input.kids[0]?.name).toBe("Item one");
      expect(input.prizes[0]?.title).toBe("Item one");
    },
  );
});

describe("Rewards states and parts", () => {
  it("renders addressed jar links, prize details and the disabled claim", () => {
    const html = renderInstance("Rewards", points, "filled", theme);
    for (const path of [
      "root",
      "heading",
      "r1/root",
      "r1/jar",
      "r1/name",
      "r1/photo",
      "r1/points",
      "r1/unit",
      "r2/root",
      "r2/title",
      "r2/cost",
      "r2/icon",
      "r2/claim",
      "r3/claim",
    ]) {
      expect(elementAt(html, `home/c1/${path}`)).toBeDefined();
    }
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain('role="link"');
    expect(elementAt(html, "home/c1/r2/claim").attributes).toContain('role="button"');
    expect(elementAt(html, "home/c1/r2/claim").attributes).not.toContain('aria-disabled="true"');
    expect(elementAt(html, "home/c1/r3/claim").attributes).toContain('aria-disabled="true"');
  });
  it("draws a portrait fallback and pocket money without a points unit", () => {
    const html = renderInstance("Rewards", money, "filled", theme, { lang: "de-DE" });
    expect(elementAt(html, "home/c1/r1/photo").attributes).toContain('aria-label="Leo"');
    expect(html).toContain("8,50\u00a0$");
    expect(html).not.toContain("home/c1/r1/unit");
  });
  it("replaces jar links and claims with a success message", () => {
    const html = renderInstance("Rewards", points, "success", theme);
    expect(elementAt(html, "home/c1/message")).toBeDefined();
    expect(html).toContain("Prize claimed");
    expect(html).not.toContain("home/c1/r1/");
    const runtime = createScreenController({
      screen: { ...screen, components: [{ ...screen.components[0]!, state: "success" }] },
      defs: components,
    });
    expect(runtime.press("r1/r1")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(runtime.press("r1/r2/claim")).toMatchObject({ ok: false, code: "not_actionable" });
  });
});

describe("Rewards read and act", () => {
  it("reads displayed prices and offers only affordable claims and kid links", () => {
    const read = readComponent(components.Rewards, points, "r1").join("\n");
    expect(read).toContain("r1 Mia: 20 points");
    expect(read).toContain("r2 Choose a new plant: 15 points");
    expect(read).toContain("r3 Paint a planter: 30 points");
    expect(read).toContain("[r1/r1 press→mia]");
    expect(read).toContain("[r1/r2/claim press]");
    expect(read).not.toContain("[r1/r3/claim");
    expect(read).not.toContain("[r1/r2 press");
    expect(readComponent(components.Rewards, money, "r1", "filled", {}, "de-DE")[0]).toContain(
      "Leo: 8,50\u00a0$",
    );
  });
  it("navigates from the jar but rejects prize roots and unaffordable claims", () => {
    const onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onLink });
    expect(runtime.press("r1/r1")).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledExactlyOnceWith("mia", "home/r1/r1");
    for (const address of ["r1/r1/claim", "r1/r2", "r1/r3/claim"]) {
      expect(runtime.press(address)).toMatchObject({ ok: false, code: "not_actionable" });
    }
  });
  it.each(["cancel", "confirm"])("defers spending until the parent chooses %s", (choice) => {
    const onAction = vi.fn();
    const onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    expect(runtime.press("r1/r2/claim")).toMatchObject({ ok: true });
    expect(runtime.confirmation).toMatchObject({ source: "home/r1/r2/claim" });
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.press(`confirm/${choice}`)).toMatchObject({ ok: true });
    expect(runtime.confirmation).toBeUndefined();
    expect(onLink).not.toHaveBeenCalled();
    if (choice === "cancel") expect(onAction).not.toHaveBeenCalled();
    else expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/r1/r2/claim", action: "press" });
  });
});
