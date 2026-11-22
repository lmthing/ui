import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  type CastLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { bindTaskChoices } from "../../copy";

const definition = components.Tasks;
const { props, examples, fallback, probes } = definition;
const first = examples[0]!;
const grouped = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown = first, state: StateName = "filled") =>
  addressedElements(renderInstance("Tasks", input, state, theme, { component: "t1" }));
const screen = { id: "home", components: [{ id: "t1", c: "Tasks", ...first }] };
const part = (relative: string) => `home/t1/${relative}`;

describe("Tasks contract and fallback", () => {
  it.each(examples)("validates the domain examples", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("rejects unknown presentation and runtime fields and bounds tasks to six", () => {
    expect(props.safeParse({ ...first, color: "red" }).success).toBe(false);
    const rows = Array.from({ length: 7 }, (_, i) => ({ ...first.items[0]!, taskRef: `task_${i}` }));
    expect(props.safeParse({ items: rows }).success).toBe(false);
    expect(props.safeParse({ items: rows.slice(0, 6) }).success).toBe(true);
    expect(props.safeParse({ items: [{ ...rows[0], canAssign: true }] }).success).toBe(false);
    expect(props.safeParse({ items: [{ ...rows[0], title: "x".repeat(33) }] }).success).toBe(false);
  });

  it("keeps the Checklist near miss and obeys pack readiness", () => {
    expect(createRegistry({ packs: ["projects"] }).ids.includes("Tasks")).toBe(packReady("projects"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Checklist" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "group", value: "sections" } }),
    );
  });

  it("uses cast labels and neutral placeholders", () => {
    const empty = { things: [], items: [] };
    const sample: CastLike = {
      things: [{ type: "record", fields: ["label"] }],
      items: [{ id: "one", type: "record", sample: true, label: "Review the brief" }],
    };
    const malformed = { ...sample, items: [{ ...sample.items[0]!, label: 1 }] };
    for (const [cast, title] of [
      [sample, "Review the brief"],
      [empty, placeholderTitle(0)],
      [malformed, placeholderTitle(0)],
    ] as const) {
      expect(props.parse(fallback({ cast })).items[0]?.title).toBe(title);
    }
  });
});

describe("Tasks rendering and action gates", () => {
  it("keeps all item addresses under density, and adds the section without renumbering children", () => {
    const base = render();
    expect([...render({ ...first, density: "compact" }).keys()]).toEqual([...base.keys()]);
    expect(base.get(part("r1/root"))?.attributes).toContain('role="link"');
    expect(base.get(part("r1/done"))?.attributes).toContain('role="checkbox"');
    expect(base.has(part("r2/blockers"))).toBe(true);
    expect(base.has(part("r2/done"))).toBe(false);
    expect(base.has(part("r1/assign"))).toBe(false);
    const sections = render(grouped);
    expect(sections.has(part("r1/project"))).toBe(true);
    expect(sections.has(part("r1/done"))).toBe(false);
    expect(sections.has(part("r2/done"))).toBe(true);
    expect(sections.get(part("r5/project"))?.text).toEqual(["Walker onboarding"]);
    expect(sections.get(part("r5/done"))?.attributes).toContain('aria-checked="false"');
    expect(render(grouped, "success").has(part("r3/title"))).toBe(true);
  });

  it("hides content and controls in empty and loading", () => {
    expect([...render(first, "empty").keys()]).toEqual([part("root"), part("empty")]);
    expect([...render(first, "loading").keys()]).toEqual([part("root")]);
    expect([...render(grouped, "loading").keys()]).toEqual([part("root")]);
  });

  it("offers separate link and completion actions and unlocks the dependent after checking", () => {
    const reading = readComponent(definition, first, "t1").join("\n");
    expect(reading).toContain("Blocked by Check balcony light");
    expect(reading).toContain("[t1/r1 press→survey]");
    expect(reading).toContain("[t1/r1/done check");
    expect(reading).not.toContain("[t1/r2/done");
    const defs = { Tasks: definition };
    const check = (id: string) => ({ address: `t1/${id}/done`, action: "check" });
    expect(planAct(screen, defs, {}, [check("r2")])).toMatchObject({ ok: false, code: "not_actionable" });
    expect(planAct(screen, defs, {}, [check("r1"), check("r2")])).toMatchObject({ ok: true, links: [] });
    expect(planAct(screen, defs, {}, [check("r1"), check("r2"), check("r1")])).toMatchObject({
      ok: false,
      code: "not_actionable",
      at: 2,
    });
  });

  it("validates host-provided assignee choices without navigating the task row", () => {
    const defs = { Tasks: bindTaskChoices(definition, (id) => (id === "t1" ? ["Inez", "Noor"] : [])) };
    const assign = (value: string) => ({ address: "t1/r1/assign", action: "select", value });
    expect(planAct(screen, { Tasks: definition }, {}, [assign("Noor")])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    expect(planAct(screen, defs, {}, [assign("Someone else")])).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
    const result = planAct(screen, defs, {}, [assign("Noor")]);
    expect(result).toMatchObject({ ok: true, links: [] });
    if (result.ok) expect(JSON.stringify(result.values)).toContain("Noor");
  });
});

it("shows completed example tasks in success without changing the filled example", () => {
  const success = render(first, "success");
  expect(success.get(part("r1/state"))?.text).toEqual(["Done"]);
  expect(success.get(part("r2/state"))?.text).toEqual(["Done"]);
  expect(success.has(part("r2/blockers"))).toBe(false);
  expect(success.get(part("r2/done"))?.attributes).toContain('aria-checked="true"');
  expect(render(first).get(part("r1/done"))?.attributes).toContain('aria-checked="false"');
});

it("validates optional recurrence and two bounded tags without changing legacy rows", () => {
  const row = first.items[0]!;
  const input = (overrides: object) => ({ items: [{ ...row, ...overrides }] });
  for (const repeat of ["never", "daily", "weekly", "monthly"])
    expect(props.parse(input({ repeat, tags: [" Balcony ", "Planning"] })).items[0]).toMatchObject({
      repeat,
      tags: ["Balcony", "Planning"],
    });
  for (const value of [{ repeat: "yearly" }, { tags: ["A", "B", "C"] }, { tags: ["x".repeat(21)] }])
    expect(props.safeParse(input(value)).success).toBe(false);
  for (const value of [{}, { repeat: "never", tags: [] }]) {
    const drawn = render(input(value));
    expect(drawn.has(part("r1/repeat"))).toBe(false);
    expect(drawn.has(part("r1/tags"))).toBe(false);
  }
});

it("shows today's due rows at their original addresses without ignoring hidden blockers", () => {
  vi.useFakeTimers({ toFake: ["Date"] }).setSystemTime(new Date(2026, 10, 21, 12));
  try {
    const input = {
      style: "today",
      items: [
        first.items[0]!,
        { ...first.items[1]!, due: "2026-11-21", repeat: "weekly", tags: ["Balcony", "Planning"] },
        { ...first.items[0]!, taskRef: "ready", due: "2026-11-21", state: "done", goto: "ready" },
      ],
    };
    const parsed = props.parse(input);
    const drawn = render(input);
    expect(drawn.get(part("today"))?.text).toEqual(["Due today"]);
    expect(drawn.has(part("r1/root"))).toBe(false);
    expect(drawn.get(part("r2/repeat"))?.text).toEqual(["Repeats weekly"]);
    expect(drawn.get(part("r2/tags"))?.text).toEqual(["Balcony · Planning"]);
    expect(drawn.get(part("r3/done"))?.attributes).toContain('aria-checked="true"');
    const reading = readComponent(definition, input, "t1").join("\n");
    expect(reading).toContain("Blocked by Check balcony light");
    expect(reading).toContain("Repeats weekly · Balcony · Planning");
    expect(reading).not.toContain("[t1/r1");
    expect(reading).toContain("[t1/r3 press→ready]");
    const check = (row: string) => ({ address: `t1/${row}/done`, action: "check" });
    const defs = { Tasks: definition };
    const todayScreen = { ...screen, components: [{ ...screen.components[0]!, ...input }] };
    expect(planAct(todayScreen, defs, {}, [check("r1")]).ok).toBe(false);
    expect(planAct(todayScreen, defs, {}, [check("r2")]).ok).toBe(false);
    expect(planAct(todayScreen, defs, {}, [check("r3")]).ok).toBe(true);
    vi.setSystemTime(new Date(2026, 10, 22, 12));
    expect(props.parse(input)).toEqual(parsed);
    expect(planAct(todayScreen, defs, {}, [check("r3")]).ok).toBe(false);
    expect(render(input).get(part("empty"))?.text).toContain("No tasks due today");
    expect(readComponent(definition, input, "t1").join("\n")).toContain("No tasks due today");
  } finally {
    vi.useRealTimers();
  }
});
