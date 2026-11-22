import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Challenge;
const { props, meta, fallback, examples, probes } = def;
const example = { ...examples[0]!, total: 18, ends: "2026-11-30" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const parts = (input: unknown, state: "filled" | "success" = "filled") =>
  addressedElements(renderInstance("Challenge", input, state, theme, { component: "c1" }));
const address = (part: string) => `home/c1/${part}`;

describe("Challenge schema", () => {
  it.each(examples)("accepts an example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("trims text, applies defaults, and accepts exact bounds", () => {
    expect(props.parse({ ...example, title: "  Shared goal  " })).toMatchObject({
      title: "Shared goal",
      surface: "card",
      detail: "full",
    });
    expect(props.parse(example).density).toBeUndefined();
    expect(props.safeParse({ ...example, total: 0, mine: 0, goal: 0.01, top: [] }).success).toBe(true);
    const leader = { name: "N".repeat(20), value: 999999 };
    expect(
      props.safeParse({
        ...example,
        title: "T".repeat(40),
        unit: "U".repeat(8),
        goal: 999999,
        total: 999999,
        mine: 999999,
        top: [leader, leader, leader],
        goto: "x".repeat(64),
      }).success,
    ).toBe(true);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["top"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toHaveProperty("color");
  });
  // prettier-ignore
  it.each([
    {}, ...[
      { title: " " }, { title: "a".repeat(41) }, { unit: "a".repeat(9) }, { unit: "" },
      { goal: 0 }, { goal: -1 }, { goal: 1000000 }, { total: -1 }, { total: 1000000 },
      { mine: -1 }, { mine: 1000000 }, { ends: "2026-02-30" }, { days_left: 3 },
      { top: Array(4).fill({ name: "A", value: 1 }) }, { top: [{ name: "a".repeat(21), value: 1 }] },
      { top: [{ name: "A", value: -1 }] }, { top: [{ name: "A", value: 1000000 }] },
      { top: [{ name: "A", value: 1, id: "r1" }] }, { joined: "yes" }, { goto: "Bad ID" },
      { goto: undefined }, { density: "tiny" }, { detail: "minimal" }, { surface: "tinted" },
      { color: "red" }, { pixels: 4 },
    ].map((patch) => ({ ...example, ...patch })),
  ])("rejects invalid wire input", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("Challenge fallback and metadata", () => {
  it("uses bounded cast content and validates neutral and malformed casts", () => {
    const things = [{ type: "entry", fields: ["heading", "expiry"] }];
    const empty: CastLike = { things: [], items: [] };
    const valid: CastLike = {
      things,
      items: [{ id: "entry", type: "entry", sample: true, heading: "A".repeat(50), expiry: "2028-02-29" }],
    };
    const malformed: CastLike = {
      things,
      items: [{ id: "Bad ID", type: "entry", sample: true, heading: 7 }],
    };
    const neutral = {
      title: "Item one",
      goal: 1,
      total: 0,
      mine: 0,
      ends: "1970-01-01",
      top: [],
      joined: false,
      goto: "log",
    };
    for (const cast of [empty, valid, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty })).toMatchObject(neutral);
    expect(fallback({ cast: malformed })).toMatchObject(neutral);
    expect(fallback({ cast: valid })).toMatchObject({
      title: "A".repeat(40),
      ends: "2028-02-29",
      goto: "entry",
    });
  });
  it("keeps the tier, pack gate and core-first probes", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "people", weight: 2, states: ["filled", "success"] });
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("Challenge")).toBe(props);
    expect(createRegistry({ packs: ["social"] }).ids.includes("Challenge")).toBe(packReady("social"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Challenge" }),
        expect.objectContaining({ kind: "choose", expect: "Progress" }),
        expect.objectContaining({ kind: "write", expect: "Challenge" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "c1/log", action: "press" } }),
      ]),
    );
  });
});

describe("Challenge states, parts, and reading", () => {
  it("draws and reads group progress, own contribution, deadline and ordered leaders", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-20T20:00:00Z"));
    try {
      const drawn = parts(example);
      const read = readComponent(def, example, "c1").join("\n");
      const visible = {
        title: example.title,
        total: "18 plants",
        mine: "Your contribution: 4 plants",
        ends: "Deadline: 30 Nov 2026",
        days_left: "10 days left",
        top: "Top contributors",
      };
      for (const [part, value] of Object.entries(visible)) {
        expect(drawn.get(address(part))?.text).toEqual([value]);
        expect(read).toContain(value);
      }
      expect(drawn.get(address("goal"))?.text).toEqual(["Goal: 30 plants"]);
      expect(drawn.get(address("track"))?.attributes).toContain('aria-hidden="true"');
      example.top.forEach(({ name, value }, index) => {
        const item = `r${index + 1}`;
        expect(drawn.get(address(`${item}/rank`))?.text).toEqual([String(index + 1)]);
        expect(drawn.get(address(`${item}/name`))?.text).toEqual([name]);
        expect(drawn.get(address(`${item}/value`))?.text).toEqual([`${value} plants`]);
        expect(read).toContain(`  ${item} "${name}"`);
        expect(read).toContain(`${value} plants`);
      });
    } finally {
      now.mockRestore();
    }
  });
  it("marks goal completion and retains progress in success", () => {
    const exact = { ...example, total: example.goal };
    expect(renderInstance("Challenge", exact, "success", theme)).toContain("Goal reached");
    expect(renderInstance("Challenge", exact, "filled", theme)).toContain("Goal reached");
    expect(readComponent(def, exact, "c1", "success")[0]).toContain("30 of 30 plants");
  });
  it("preserves finish addresses and hides only ranks in brief or when empty", () => {
    const defaults = [...parts(example).keys()];
    expect([...parts({ ...example, density: "compact", surface: "outlined" }).keys()]).toEqual(defaults);
    const brief = { ...example, detail: "brief" };
    const unranked = defaults.filter((key) => key !== address("top") && !/\/r\d+\//.test(key));
    expect([...parts(brief).keys()]).toEqual(unranked);
    expect([...parts({ ...example, top: [] }).keys()]).toEqual(unranked);
    expect(props.parse(brief).top).toEqual(example.top);
    const read = readComponent(def, brief, "c1").join("\n");
    for (const hidden of ["Top contributors", "Maya", "6 plants"]) expect(read).not.toContain(hidden);
    expect(read).toContain("Your contribution: 4 plants");
  });
});

describe("Challenge actions", () => {
  it.each(["filled", "success"] as const)("offers only the membership action in %s", (state) => {
    for (const joined of [false, true]) {
      const input = { ...example, joined };
      const onAction = vi.fn(),
        onLink = vi.fn();
      const screen = { id: "home", components: [{ ...input, c: "Challenge", id: "c1", state }] };
      const runtime = createScreenController({ screen, defs: components, onAction, onLink });
      const [active, hidden] = joined ? ["log", "join"] : ["join", "log"];
      try {
        const drawn = parts(input, state);
        expect(drawn.get(address(active))?.attributes).toContain('role="button"');
        expect(drawn.has(address(hidden))).toBe(false);
        const read = readComponent(def, input, "c1", state).join("\n");
        expect(read).toContain(`[c1/${active} press${joined ? "→log_cuttings" : ""} !needs-people]`);
        expect(read).not.toContain(`[c1/${hidden} press`);
        expect(runtime.press(`c1/${hidden}`).ok).toBe(false);
        expect(runtime.press("c1/goal").ok).toBe(false);
        expect(runtime.press(`c1/${active}`).ok).toBe(true);
        expect(onAction.mock.calls.map(([event]) => event)).toEqual([
          { address: address(active), action: "press" },
        ]);
        expect(onLink.mock.calls).toEqual(joined ? [[example.goto, address(active)]] : []);
        expect(runtime.confirmation).toBeUndefined();
      } finally {
        runtime.dispose();
      }
    }
  });
});
