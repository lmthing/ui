import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const def = components.Shift;
const { props, meta, examples, fallback, probes } = def;
const full = examples[0]!;
const base = { date: full.date, from: full.from, to: full.to, status: full.status };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const emptyCast = { things: [], items: [] } satisfies CastLike;
const actionParts = ["swap", "offer"] as const;
const liveParts = {
  confirmed: actionParts,
  offered: ["swap"],
  swap_requested: ["offer"],
} as const;

describe("Shift schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("defaults to full detail and accepts bounded optional text and overnight hours", () => {
    expect(
      props.parse({
        date: "2024-02-29",
        from: "23:59",
        to: "00:00",
        status: "offered",
        place: ` ${"x".repeat(28)} `,
        role: "x".repeat(16),
        with: "x".repeat(48),
      }),
    ).toMatchObject({ detail: "full", place: "x".repeat(28), role: "x".repeat(16), with: "x".repeat(48) });
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("color");
  });
  it.each([
    { date: undefined },
    { from: undefined },
    { to: undefined },
    { status: undefined },
    { date: "2026-02-30" },
    { from: "24:00" },
    { to: "07:60" },
    { to: "7:00" },
    { status: "pending" },
    { detail: "hidden" },
    { density: "small" },
    { place: "a".repeat(29) },
    { role: "a".repeat(17) },
    { with: "a".repeat(49) },
    { role: " " },
    { color: "red" },
    { swap: true },
    { canSwap: false },
  ])("rejects invalid or unknown input %j", (invalid) => {
    expect(props.safeParse({ ...base, ...invalid }).success).toBe(false);
  });
});

describe("Shift fallback and metadata", () => {
  it("uses bounded cast details or neutral placeholders", () => {
    const matching: CastLike = {
      things: [{ type: "work", fields: ["name", "site"] }],
      items: [{ id: "work", type: "work", sample: true, name: "Opening", site: "North entrance" }],
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "work", type: "work", sample: true, name: 4 }],
    };
    for (const cast of [emptyCast, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: matching })).toMatchObject({ role: "Opening", place: "North entrance" });
    for (const cast of [emptyCast, malformed]) expect(fallback({ cast }).role).toBe(placeholderTitle(0));
  });
  it("keeps the people tier, core near miss, write axes and read target", () => {
    expect(meta.tier).toBe("people");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Card");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Shift" }),
        expect.objectContaining({ kind: "choose", expect: "Card" }),
        expect.objectContaining({
          kind: "write",
          expect: "Shift",
          variant: { axis: "detail", value: "brief" },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/swap", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["team"], includeDrafts: true }).schema("Shift")).toBe(props);
    expect(createRegistry({ packs: ["team"] }).ids.includes("Shift")).toBe(packReady("team"));
  });
});

describe("Shift parts and reading", () => {
  it.each(["confirmed", "offered", "swap_requested"] as const)("draws the right actions at %s", (status) => {
    const input = { ...full, status };
    const html = renderInstance("Shift", input, "filled", theme);
    const reading = readComponent(def, input, "s1").join("\n");
    for (const part of meta.parts) expect(addressedElements(html).has(`home/c1/${part}`)).toBe(true);
    expect(affordancesOf(meta, props.parse(input), "s1")).toEqual(
      liveParts[status].map((part) => ({ address: `s1/${part}`, part, action: "press", detail: "" })),
    );
    for (const part of actionParts) {
      const active = actionParts.filter((candidate) => liveParts[status].some((live) => candidate === live));
      const attributes = elementAt(html, `home/c1/${part}`).attributes;
      expect(attributes).toContain('role="button"');
      expect(attributes.includes('aria-disabled="true"')).toBe(!active.includes(part));
      expect(reading.includes(`[s1/${part} press`)).toBe(active.includes(part));
    }
    const statusText = { confirmed: "Confirmed", offered: "Offered", swap_requested: "Swap requested" };
    for (const line of [
      "16 Nov 2026",
      "07:00–12:00",
      "Morning care",
      "East greenhouse",
      'With "Anna and Rae"',
      statusText[status],
    ]) {
      expect(reading).toContain(line);
    }
  });
  it("omits absent detail, and hides place and coworkers in brief without discarding them", () => {
    const input = { ...full, detail: "brief" as const };
    expect(props.parse(input)).toMatchObject({ place: full.place, with: full.with });
    const detailed = addressedElements(renderInstance("Shift", input, "filled", theme));
    const minimal = addressedElements(renderInstance("Shift", base, "filled", theme));
    const reading = readComponent(def, input, "s1").join("\n");
    for (const part of ["place", "with"]) {
      expect(detailed.has(`home/c1/${part}`)).toBe(false);
      expect(minimal.has(`home/c1/${part}`)).toBe(false);
    }
    expect(detailed.has("home/c1/role")).toBe(true);
    expect(minimal.has("home/c1/role")).toBe(false);
    expect(reading).not.toContain("East greenhouse");
    expect(reading).not.toContain("Anna and Rae");
  });
});

describe("Shift loading and action dispatch", () => {
  it("keeps the frame and shows inert skeletons while loading", () => {
    const html = renderInstance("Shift", full, "loading", theme);
    expect(html).toContain("Loading");
    expect(elementAt(html, "home/c1/root")).toBeDefined();
    const parts = addressedElements(html);
    for (const part of ["date", "from", "to", "role", "place", "with", "status"])
      expect(parts.has(`home/c1/${part}`)).toBe(false);
    for (const part of actionParts) {
      const action = elementAt(html, `home/c1/${part}`).attributes;
      expect(action).toContain('aria-disabled="true"');
      expect(action).not.toContain('role="button"');
    }
    expect(readComponent(def, full, "s1", "loading")).toEqual(["s1 Shift (loading)"]);
  });
  it.each([
    ["filled", "confirmed"],
    ["filled", "offered"],
    ["filled", "swap_requested"],
    ["loading", "confirmed"],
  ] as const)("dispatches only live actions when %s and %s", (state, status) => {
    const onAction = vi.fn();
    const runtime = createScreenController({
      screen: { id: "home", components: [{ ...base, id: "s1", c: "Shift", state, status }] },
      defs: components,
      onAction,
    });
    const active =
      state === "filled" ? actionParts.filter((part) => liveParts[status].some((live) => live === part)) : [];
    for (const part of actionParts)
      expect(runtime.press(`s1/${part}`)).toMatchObject({ ok: active.includes(part) });
    expect(runtime.press("s1/status")).toMatchObject({ ok: false });
    expect(runtime.confirmation).toBeUndefined();
    expect(onAction.mock.calls.map(([action]) => action)).toEqual(
      active.map((part) => ({ address: `home/s1/${part}`, action: "press" })),
    );
    runtime.dispose();
  });
});
