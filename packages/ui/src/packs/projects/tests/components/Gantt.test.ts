import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  readScreen,
  type CastLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderExample } from "../../../../../test/render";
import { visibleTexts } from "../../../../../test/variants";
const { Gantt } = components;
const { examples, props, meta, fallback, probes } = Gantt;
const days = examples[0]!;
const weeks = examples[1]!;
const first = days.tasks[0]!;
const gate = days.gates[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown = days, state: StateName = "filled", lang?: string) =>
  renderExample("Gantt", input, state, theme, { component: "g1", ...(lang ? { lang } : {}) }).html;
const part = (relative: string) => `home/g1/${relative}`;
const screen = (state: StateName = "filled") => ({
  id: "home",
  components: [{ id: "g1", c: "Gantt", ...days, state }],
});

describe("Gantt contract", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, derives addresses from tasks and gates, and keeps the wire schema strict", () => {
    const parsed = props.parse(days);
    expectTypeOf<(typeof parsed.targets)[number]["kind"]>().toEqualTypeOf<"task" | "gate">();
    expect(parsed).toMatchObject({ style: "week", detail: "full" });
    expect(parsed.targets.map(({ kind, root }) => [kind, root])).toEqual([
      ["task", "survey"],
      ["task", undefined],
      ["gate", "garden_scope"],
    ]);
    expect(props.safeParse(parsed).success).toBe(false);
  });
  it("accepts exact inclusive limits including single-day tasks, unresolved refs and six gates", () => {
    const tasks = Array.from({ length: 12 }, (_, index) => ({
      ...first,
      taskRef: `task_${index}`,
      title: "x".repeat(32),
      end: first.start,
      after: ["external"],
    }));
    expect(
      props.safeParse({ ...days, from: "2026-01-01", to: "2026-03-31", tasks, gates: Array(6).fill(gate) })
        .success,
    ).toBe(true);
    expect(props.safeParse({ ...days, tasks: [first], gates: [] }).success).toBe(true);
  });
  it.each([
    { from: "2026-02-29" },
    { to: "2026-11-21" },
    { from: "2026-01-01", to: "2026-04-01" },
    { tasks: [] },
    { tasks: Array(13).fill(first) },
    { gates: Array(7).fill(gate) },
    { tasks: [first, first] },
    { tasks: [{ ...first, after: [first.taskRef] }] },
    {
      tasks: [
        { ...first, after: ["next"] },
        { ...first, taskRef: "next", after: [first.taskRef] },
      ],
    },
    { tasks: [{ ...first, after: ["a", "b", "c", "d"] }] },
    { tasks: [{ ...first, after: ["a", "a"] }] },
    { tasks: [{ ...first, end: "2026-11-15" }] },
    { tasks: [{ ...first, id: "r1" }] },
    { tasks: [{ ...first, goto: "Bad ID" }] },
    { tasks: [{ ...first, title: "x".repeat(33) }] },
    { gates: [{ ...gate, title: "" }] },
    { style: "quarter" },
    { detail: "outline" },
    { color: "green" },
  ])("rejects invalid props: %o", (change) =>
    expect(props.safeParse({ ...days, ...change }).success).toBe(false),
  );
});

describe("Gantt fallback and probes", () => {
  it("uses cast labels and falls back safely with empty or malformed records", () => {
    const cast: CastLike = {
      things: [{ type: "project", fields: ["label"] }],
      items: [{ id: "one", type: "project", sample: true, label: "Check design" }],
    };
    expect(props.parse(fallback({ cast })).tasks[0]?.title).toBe("Check design");
    for (const empty of [
      { things: [], items: [] },
      { ...cast, items: [{ ...cast.items[0]!, label: 3 }] },
    ]) {
      expect(props.parse(fallback({ cast: empty })).tasks[0]?.title).toBe(placeholderTitle(0));
    }
  });
  it("keeps its core near miss and pack readiness gate", () => {
    expect(meta).toMatchObject({ status: "ready", dense: true, weight: 3, tier: "phone" });
    expect(createRegistry({ packs: ["projects"] }).ids.includes("Gantt")).toBe(packReady("projects"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Gantt" }),
        expect.objectContaining({ kind: "choose", expect: "Timeline" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "g1/r1", action: "press" } }),
      ]),
    );
  });
});

describe("Gantt states and parts", () => {
  it("draws the range control, stable item roots and text parts", () => {
    const html = render();
    const elements = addressedElements(html);
    expect(elements.get(part("range"))?.attributes).toContain('role="radiogroup"');
    expect(elements.get(part("r1/root"))?.attributes).toContain('role="button"');
    expect(elements.get(part("r2/root"))?.attributes).not.toMatch(/role="(button|link)"/);
    expect(elements.get(part("r3/root"))?.attributes).toContain('role="button"');
    for (const item of ["r1", "r2", "r3"]) {
      for (const name of ["title", "dates"]) expect(elements.has(part(`${item}/${name}`))).toBe(true);
    }
    expect(elements.has(part("r2/after"))).toBe(true);
    expect(elements.has(part("r2/conflict"))).toBe(false);
    expect([...addressedElements(render({ ...weeks, density: "compact" })).keys()]).toEqual([
      ...addressedElements(render(weeks)).keys(),
    ]);
    expect([...addressedElements(render({ ...weeks, detail: "brief" })).keys()]).toEqual(
      [...addressedElements(render(weeks)).keys()].filter(
        (address) => !/\/(dates|after|conflict)$/.test(address),
      ),
    );
  });
  it("has a calm empty state and a masked loading chart with no controls", () => {
    expect([...addressedElements(render(days, "empty")).keys()]).toEqual([part("root"), part("empty")]);
    const loading = render(days, "loading");
    expect([...addressedElements(loading).keys()]).toEqual([part("root"), part("range"), part("chart")]);
    expect(loading).toContain('aria-busy="true"');
    expect(visibleTexts(loading)).toEqual([]);
  });
  it("keeps linked entries actionable when the whole schedule is outside the shown range", () => {
    const input = { ...days, from: "2027-01-01", to: "2027-01-07" };
    const html = render(input);
    const elements = addressedElements(html);
    expect(html).toContain("No scheduled dates in this range");
    expect(elements.has(part("r1/outside"))).toBe(true);
    expect(elements.get(part("r1/root"))?.attributes).toContain('role="link"');
    expect(elements.get(part("r3/root"))?.attributes).toContain('role="link"');
    const outside = { id: "home", components: [{ id: "g1", c: "Gantt", ...input }] };
    expect(planAct(outside, { Gantt }, {}, [{ address: "g1/r3", action: "press" }])).toMatchObject({
      ok: true,
      links: [{ goto: "garden_scope" }],
    });
  });
});

describe("Gantt read and act", () => {
  it("reads localized dates, the dependency and its date conflict as drawn", () => {
    const html = render(weeks, "filled", "fr-FR");
    const read = readComponent(Gantt, weeks, "g1", "filled", {}, "fr-FR").join(" ");
    for (const text of ["30 nov. 2026", "After Map route", "Starts before a dependency finishes"]) {
      expect(html).toContain(text);
      expect(read).toContain(text);
    }
  });
  it("allows navigation only for linked items and only while filled", () => {
    const targets = { "g1/r1": "survey", "g1/r2": undefined, "g1/r3": "garden_scope" };
    for (const state of ["filled", "empty", "loading"] as const) {
      for (const [address, goto] of Object.entries(targets)) {
        expect(planAct(screen(state), { Gantt }, {}, [{ address, action: "press" }])).toMatchObject(
          state === "filled" && goto
            ? { ok: true, links: [{ goto }] }
            : { ok: false, code: "not_actionable" },
        );
      }
    }
  });
  it("selects both scales without changing dates or item identities and rejects other values", () => {
    const select = (value: unknown, state: StateName = "filled") =>
      planAct(screen(state), { Gantt }, {}, [{ address: "g1/range", action: "select", value }]);
    const month = select("month");
    expect(month).toMatchObject({ ok: true, values: { "home/g1/$style": "month" } });
    if (month.ok) {
      const text = readScreen(screen(), { Gantt }, month.values);
      expect(text).toContain("Gantt[month]");
      expect(text).toContain("r1: Check light · 16 Nov – 17 Nov");
      expect(text).toContain("[g1/r1 press");
    }
    for (const value of ["week", "Days"])
      expect(select(value)).toMatchObject({ ok: true, values: { "home/g1/$style": "week" } });
    expect(select("year")).toMatchObject({ ok: false, code: "invalid_value" });
    expect(select("week", "empty")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(select("month", "loading")).toMatchObject({ ok: false, code: "not_actionable" });
  });
});
