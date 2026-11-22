import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createScreenController } from "@lmthing/ui/kit";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const { Achievements } = components;
const { examples, fallback, meta, probes, props } = Achievements;
const first = examples[0]!;
const badge = { title: "First lesson", icon: "star" } as const;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const mixed = {
  badges: [
    { ...badge, earned: "2026-10-04", how: "Previous criterion" },
    { title: "New skill", icon: "award", how: "Complete the practice." },
    { title: "Practice goal", icon: "leaf" },
  ],
} as const;

describe("Achievements schema and metadata", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it.each([
    {},
    { badges: [] },
    { badges: [badge] },
    { badges: Array(13).fill(badge) },
    { ...first, color: "red" },
    { ...first, arrange: "strip" },
    ...[
      { title: " " },
      { title: "a".repeat(21) },
      { icon: "unknown" },
      { how: "a".repeat(49) },
      { earned: "2026-02-30" },
      { id: "r1" },
      { color: "red" },
    ].map((patch) => ({ badges: [{ ...badge, ...patch }, badge] })),
  ])("rejects invalid or code-owned input", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
  it("accepts the exact limits and stamps the item ids in order", () => {
    const atLimit = { ...badge, title: "a".repeat(20), how: "a".repeat(48) };
    const parsed = props.parse({ badges: Array(12).fill(atLimit) });
    expect(parsed.arrange).toBe("grid");
    expect(parsed).not.toHaveProperty("surface");
    expect(stampItemIds(meta, parsed).badges.at(-1)).toEqual({ ...atLimit, id: "r12" });
    expectTypeOf<Props<typeof props, typeof meta>["badges"][number]["id"]>().toEqualTypeOf<string>();
  });
  it("keeps pack readiness, tier, and the chosen, near-miss, write, and read probes", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta).toMatchObject({ tier: "phone", dense: true, weight: 3 });
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Achievements" }),
        expect.objectContaining({ kind: "choose", expect: "Streak" }),
        expect.objectContaining({ kind: "write", expect: "Achievements" }),
        expect.objectContaining({
          kind: "write",
          variant: { axis: "arrange", value: "rows", itemTitles: expect.any(Array) },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "a1/r2", action: "press" } }),
      ]),
    );
  });
});

describe("Achievements fallback and empty state", () => {
  it("uses the cast where possible and neutral titles for absent or malformed items", () => {
    const empty: CastLike = { things: [], items: [] };
    const record = { id: "one", type: "record", sample: true };
    const populated: CastLike = {
      things: [{ type: "record", fields: ["label", "summary"] }],
      items: [{ ...record, label: "Record one", summary: "A detail" }],
    };
    const malformed: CastLike = { things: populated.things, items: [{ ...record, label: " ", summary: 3 }] };
    for (const cast of [empty, populated, malformed]) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
      expect(fallback({ cast }).badges).toHaveLength(2);
    }
    expect(fallback({ cast: populated }).badges[0]).toEqual({
      title: "Record one",
      icon: "award",
      how: "A detail",
    });
    expect(fallback({ cast: empty }).badges.map(({ title }) => title)).toEqual([
      placeholderTitle(0),
      placeholderTitle(1),
    ]);
    expect(fallback({ cast: malformed }).badges[0]?.title).toBe(placeholderTitle(0));
  });
  it("draws a quiet empty state without badge content or actions", () => {
    const parts = addressedElements(renderInstance("Achievements", first, "empty", theme));
    expect([...parts.keys()]).toEqual(["home/c1/root", "home/c1/empty"]);
    expect(parts.get("home/c1/empty")?.text).toEqual(["No badges yet"]);
    expect(readComponent(Achievements, first, "a1", "empty")).toEqual(["a1 Achievements (empty)"]);
    const screen = {
      id: "home",
      components: [{ id: "a1", c: "Achievements", state: "empty" as const, ...first }],
    };
    expect(planAct(screen, { Achievements }, {}, [{ address: "a1/r2", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

describe("Achievements parts and read/act", () => {
  it("draws the title, icon and correct detail at each stable badge address", () => {
    const draw = (axes = {}) =>
      addressedElements(
        renderInstance("Achievements", { ...mixed, ...axes }, "filled", theme, { lang: "en-US" }),
      );
    const parts = draw();
    const row = (at: number, part: string) => parts.get(`home/c1/r${at}/${part}`);
    for (const at of [1, 2, 3]) {
      expect(row(at, "root")?.attributes).toContain('role="button"');
      expect(row(at, "root")?.attributes).not.toContain("aria-disabled");
      expect(row(at, "title")?.text).toEqual([mixed.badges[at - 1]!.title]);
      expect(row(at, "icon")).toBeDefined();
    }
    expect(row(1, "earned")?.text).toEqual(["Oct 4, 2026"]);
    expect(row(1, "how")).toBeUndefined();
    expect(row(2, "earned")).toBeUndefined();
    expect(row(2, "how")?.text).toEqual(["Complete the practice."]);
    expect(row(3, "how")?.text).toEqual(["Locked"]);
    expect([...draw({ arrange: "rows" }).keys()]).toEqual([...parts.keys()]);
  });
  it("shares the visible text and accepts a press for each badge, not its detail", () => {
    const lines = readComponent(Achievements, mixed, "a1", "filled", {}, "en-US").join("\n");
    for (const text of ["Oct 4, 2026", "Complete the practice.", "Locked"]) expect(lines).toContain(text);
    expect(lines).not.toContain("Previous criterion");
    const stamped = stampItemIds(meta, props.parse(mixed));
    expect(affordancesOf(meta, stamped, "a1").map(({ address, action }) => `${address} ${action}`)).toEqual([
      "a1/r1 press",
      "a1/r2 press",
      "a1/r3 press",
    ]);
    for (const at of [1, 2, 3]) expect(lines).toContain(`[a1/r${at} press]`);
    const screen = { id: "home", components: [{ id: "a1", c: "Achievements", badges: [...mixed.badges] }] };
    expect(planAct(screen, { Achievements }, {}, [{ address: "a1/r2", action: "press" }])).toMatchObject({
      ok: true,
      changed: ["a1/r2 press"],
      values: {},
      links: [],
    });
    for (const address of ["a1/r2/how", "a1/r4"]) {
      expect(planAct(screen, { Achievements }, {}, [{ address, action: "press" }])).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
    }
  });

  it.each(["grid", "rows"] as const)("dispatches the locked badge press to the host in %s", (arrange) => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ id: "a1", c: "Achievements", ...first, arrange }] };
    const controller = createScreenController({ screen, defs: { Achievements }, onAction });
    const address = "home/a1/r2";
    expect(controller.act({ address: `${address}/root`, action: "press" })).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address, action: "press" });
    expect(controller.confirmation).toBeUndefined();
  });
});
