import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  emptyLine,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance, styleAt } from "../../../../../test/render";
import { careLabels } from "../../copy";

const { props, meta, examples, fallback, probes } = components.CareSchedule;
const task = examples[0]!.tasks[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const screen = { id: "home", components: [{ id: "c1", c: "CareSchedule", tasks: [task] }] };

afterEach(() => vi.useRealTimers());

it("keeps grid defaults and preserves task addresses in full-width rows", () => {
  const input = examples[0]!;
  expect(props.parse(input)).toMatchObject({ arrange: "grid" });
  expect(props.safeParse({ ...input, arrange: "strip" }).success).toBe(false);
  const rows = { ...input, arrange: "rows" };
  const html = renderInstance("CareSchedule", rows, "filled", theme);
  expect(elementAt(html, "home/c1/r1/last")).toBeDefined();
  expect(elementAt(html, "home/c1/r1/next")).toBeDefined();
  expect(elementAt(html, "home/c1/r2/done")).toBeDefined();
  const read = readComponent(components.CareSchedule, rows, "c1").join("\n");
  expect(read).toContain("[c1/r2/done press]");
});

describe("CareSchedule contract and boundaries", () => {
  it.each(examples)("accepts the domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("retains its phone tier, density, signature and core near miss", () => {
    expect(meta).toMatchObject({
      status: "ready",
      tier: "phone",
      weight: 3,
      dense: true,
      signature: "check_burst",
    });
    expect(meta.realPath).toContain("permission");
    expect(meta).not.toHaveProperty("confirmParts");
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "CareSchedule",
      "Checklist",
    ]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "CareSchedule" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "c1/r1/done", action: "press" } }),
    );
  });

  it("accepts exactly 12 tasks at the field limits and stamps ids only for the view", () => {
    const max = { ...task, title: "a".repeat(24), for: "b".repeat(16), every: 12, goto: "a".repeat(64) };
    expect(props.safeParse({ tasks: Array.from({ length: 12 }, () => max) }).success).toBe(true);
    expect(props.parse({ tasks: [{ ...task, title: " Water " }] }).tasks[0]?.title).toBe("Water");
    expectTypeOf<Props<typeof props, typeof meta>["tasks"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { tasks: [] },
    { tasks: Array.from({ length: 13 }, () => task) },
    { tasks: [task], color: "red" },
    ...[
      { title: " " },
      { title: "a".repeat(25) },
      { for: "a".repeat(17) },
      { every: 0 },
      { every: 13 },
      { every: 1.5 },
      { repeat: "sometimes" },
      { last: "2026-02-29" },
      { last: undefined },
      { goto: "Bad destination" },
      { goto: undefined },
      { icon: "invalid" },
      { id: "r1" },
      { next: "2026-12-01" },
      { overdue: true },
      { done: true },
      { pixels: 4 },
    ].map((patch) => ({ tasks: [{ ...task, ...patch }] })),
  ])("rejects invalid wire data", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("CareSchedule fallback", () => {
  it("uses bounded cast fields and a safe link", () => {
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["name", "room"] }],
      items: Array.from({ length: 13 }, (_, index) => ({
        id: index === 0 ? "bad id" : `plant_${index}`,
        type: "plant",
        sample: true,
        name: "Fern",
        room: "a".repeat(40),
      })),
    };
    const input = fallback({ cast });
    expect(props.safeParse(input).success).toBe(true);
    expect(input.tasks).toHaveLength(12);
    expect(input.tasks[0]).toMatchObject({
      title: "Fern",
      for: expect.stringMatching(/^a.{0,15}$/),
      goto: "detail",
    });
    expect(input.tasks[1]?.goto).toBe("plant_1");
  });

  it.each([{ items: [] }, { items: [{ id: "item", type: "plant", sample: true, name: 3 }] }])(
    "validates and uses neutral placeholders with no usable title",
    ({ items }) => {
      const input = fallback({ cast: { things: [], items } });
      expect(props.safeParse(input).success).toBe(true);
      expect(input.tasks[0]?.title).toBe("Item one");
      expect(input.tasks[0]?.for).toBeUndefined();
    },
  );
});

describe("CareSchedule states and parts", () => {
  it("renders the link and the distinct completion button with the task's addressed details", () => {
    vi.setSystemTime(new Date(2026, 10, 19, 12));
    const html = renderInstance("CareSchedule", examples[0], "filled", theme);
    for (const part of meta.items.parts.filter((part) => part !== "category"))
      expect(elementAt(html, `home/c1/r1/${part}`)).toBeDefined();
    expect(html).not.toContain("home/c1/r1/category");
    const link = elementAt(html, "home/c1/r1/root");
    expect(link.attributes).toContain('role="link"');
    expect(link.children).not.toContainEqual(elementAt(html, "home/c1/r1/done"));
    expect(elementAt(html, "home/c1/r1/done").attributes).toContain('role="button"');
    expect(styleAt(html, "home/c1/r1/next")).toContain("var(--bad)");
  });

  it("shows today's date status without inventing an absent subject", () => {
    vi.setSystemTime(new Date(2026, 10, 18, 12));
    const html = renderInstance("CareSchedule", { tasks: [{ ...task, for: undefined }] }, "filled", theme);
    expect(html).toContain(careLabels.today);
    expect(html).not.toContain("home/c1/r1/for");
    expect(styleAt(html, "home/c1/r1/next")).toContain("var(--accent)");
  });

  it.each([
    { state: "empty", line: emptyLine("plant") },
    { state: "success", line: careLabels.success },
  ] as const)("shows $state without stale links or completion actions", ({ state, line }) => {
    const html = renderInstance("CareSchedule", examples[0], state, theme, "plant");
    expect(elementAt(html, "home/c1/root")).toBeDefined();
    expect(html).toContain(line);
    expect(html).not.toContain("home/c1/r1/");
    const runtime = createScreenController({
      screen: { ...screen, components: [{ ...screen.components[0]!, state }] },
      defs: components,
    });
    expect(runtime.act({ address: "c1/r1/done", action: "press" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

describe("CareSchedule read and act", () => {
  it("reads its dates and cadence, and offers only the link and a non-navigating completion", () => {
    vi.setSystemTime(new Date(2026, 10, 19, 12));
    const read = readComponent(components.CareSchedule, { tasks: [task] }, "c1").join("\n");
    expect(read).toContain("Every week");
    expect(read).toContain("Last 11\u00a0Nov\u00a026");
    expect(read).toContain("Late 18\u00a0Nov\u00a026");
    expect(read).toContain("[c1/r1/done press]");
    expect(read).toContain("[c1/r1 press→fern]");
    expect(planAct(screen, components, {}, [{ address: "c1/r1/next", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });

  it("dispatches completion to the host and opens details only from the item root", () => {
    const onAction = vi.fn();
    const onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    expect(runtime.act({ address: "home/c1/r1/done", action: "press" })).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/c1/r1/done", action: "press" });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.act({ address: "home/c1/r1/root", action: "press" })).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledTimes(1);
    expect(onLink.mock.calls[0]?.[0]).toBe("fern");
  });
});
