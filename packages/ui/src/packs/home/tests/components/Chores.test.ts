import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  emptyLine,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";

// Keep exercising the view while the generated public map excludes drafts.
vi.mock("@lmthing/ui/kit", async (importOriginal) => {
  const kit = await importOriginal<typeof import("@lmthing/ui/kit")>();
  if (Object.hasOwn(kit.renderers, "Chores")) return kit;
  const { Chores } = await import("../../components");
  return { ...kit, renderers: { ...kit.renderers, Chores: Chores.Chores } };
});

const { props, meta, examples, fallback, probes } = components.Chores;
const chore = examples[0]!.chores[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const screen = { id: "home", components: [{ id: "c1", c: "Chores", chores: [chore] }] };
const done = "home/c1/r1/done";

afterEach(() => vi.useRealTimers());

describe("Chores contract and boundaries", () => {
  it.each(examples)("accepts the domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("retains its tiers, default list weight, probes and non-destructive actions", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 2, partTiers: { done: "people" } });
    expect(meta).not.toHaveProperty("dense");
    expect(meta).not.toHaveProperty("confirmParts");
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Chores",
      "Checklist",
    ]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "Chores" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "c1/r1/done", action: "check" } }),
    );
  });

  it("accepts exact limits, trims text and leaves IDs to the validator", () => {
    const max = { ...chore, title: "a".repeat(28), who: "a".repeat(16), every: 12, points: 100 };
    expect(props.safeParse({ chores: Array.from({ length: 6 }, () => max) }).success).toBe(true);
    expect(props.parse({ chores: [{ ...chore, title: " Mist the fern " }] }).chores[0]?.title).toBe(
      "Mist the fern",
    );
    expectTypeOf<Props<typeof props, typeof meta>["chores"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { chores: [] },
    { chores: Array.from({ length: 7 }, () => chore) },
    { chores: [chore], color: "red" },
    ...[
      { title: " " },
      { title: "a".repeat(29) },
      { who: "a".repeat(17) },
      { photo: "https://example.org/avatar.png" },
      { repeat: "sometimes" },
      { every: 0 },
      { every: 13 },
      { every: 1.5 },
      { last: "2026-02-29" },
      { points: -1 },
      { points: 101 },
      { goto: undefined },
      { goto: "Bad destination" },
      { next: "2026-12-01" },
      { overdue: true },
      { done: true },
      { id: "r1" },
      { pixels: 4 },
    ].map((patch) => ({ chores: [{ ...chore, ...patch }] })),
  ])("rejects invalid wire input", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("Chores fallback", () => {
  it("uses cast content and bounded safe links", () => {
    const cast: CastLike = {
      things: [{ type: "task", fields: ["name", "owner"] }],
      items: Array.from({ length: 7 }, (_, index) => ({
        id: index === 0 ? "bad id" : `chore_${index}`,
        type: "task",
        sample: true,
        name: "Mist the fern",
        owner: "a".repeat(30),
      })),
    };
    const input = fallback({ cast });
    expect(props.safeParse(input).success).toBe(true);
    expect(input.chores).toHaveLength(6);
    expect(input.chores[0]).toMatchObject({
      title: "Mist the fern",
      who: expect.stringMatching(/^a.{0,15}$/),
      goto: "detail",
    });
    expect(input.chores[1]?.goto).toBe("chore_1");
  });

  it.each([{ items: [] }, { items: [{ id: "task", type: "task", sample: true, name: 4 }] }])(
    "uses neutral placeholders without useful cast data",
    ({ items }) => {
      const cast: CastLike = { things: [], items };
      const input = fallback({ cast });
      expect(props.safeParse(input).success).toBe(true);
      expect(input.chores[0]).toMatchObject({ title: "Item one", who: "Item one" });
    },
  );
});

describe("Chores states and parts", () => {
  it("draws every item part, with the completion checkbox outside the details link", () => {
    vi.setSystemTime(new Date(2026, 10, 17, 12));
    const html = renderInstance("Chores", examples[0], "filled", theme);
    for (const part of meta.items.parts) expect(elementAt(html, `home/c1/r1/${part}`)).toBeDefined();
    const link = elementAt(html, "home/c1/r1/root");
    expect(link.attributes).toContain('role="link"');
    expect(link.children).not.toContainEqual(elementAt(html, done));
    expect(elementAt(html, done).attributes).toContain('role="checkbox"');
    expect(html).toContain("Due today");
  });

  it("draws initials and omits last and points when they were not authored", () => {
    const html = renderInstance(
      "Chores",
      { chores: [{ ...chore, last: undefined, points: undefined, photo: undefined }] },
      "filled",
      theme,
    );
    expect(elementAt(html, "home/c1/r1/photo")).toBeDefined();
    expect(html).toContain(">S</");
    expect(html).not.toContain("home/c1/r1/last");
    expect(html).not.toContain("home/c1/r1/points");
  });

  it.each([
    { state: "empty", line: emptyLine("plant") },
    { state: "success", line: "Chores complete" },
  ] as const)("shows $state without stale row actions", ({ state, line }) => {
    const html = renderInstance("Chores", examples[0], state, theme, "plant");
    expect(elementAt(html, "home/c1/root")).toBeDefined();
    expect(elementAt(html, "home/c1/message")).toBeDefined();
    expect(html).toContain(line);
    expect(html).not.toContain("home/c1/r1/");
    const runtime = createScreenController({
      screen: { ...screen, components: [{ ...screen.components[0]!, state }] },
      defs: components,
    });
    expect(runtime.act({ address: done, action: "check" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

describe("Chores read and act", () => {
  it("reads the same dates, cadence and points and keeps navigation separate from completion", () => {
    vi.setSystemTime(new Date(2026, 10, 17, 12));
    const onAction = vi.fn();
    const onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    expect(runtime.read()).toContain("Every day · Last 16\u00a0Nov\u00a026 · Due today · 5 points");
    expect(runtime.read()).toContain("[c1/r1/done check:todo !needs-people]");
    expect(runtime.press(done)).toMatchObject({ ok: true });
    expect(runtime.read()).toContain("[c1/r1/done check:done !needs-people]");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: done, action: "check" });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.press("home/c1/r1/root")).toMatchObject({ ok: true });
    expect(onLink.mock.calls[0]?.[0]).toBe("fern");
  });

  it("does not offer another check while the next due date is in the future", () => {
    vi.setSystemTime(new Date(2026, 10, 16, 12));
    const html = renderInstance("Chores", examples[0], "filled", theme);
    expect(elementAt(html, done).attributes).toContain('aria-hidden="true"');
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain("Done for now");
    const read = readComponent(components.Chores, examples[0], "c1").join("\n");
    expect(read).toContain("Next 17\u00a0Nov\u00a026 · 5 points · Done for now");
    expect(read).not.toContain("c1/r1/done check");
    expect(read).toContain("c1/r2/done check");
    const runtime = createScreenController({ screen, defs: components });
    expect(runtime.act({ address: done, action: "check" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});
