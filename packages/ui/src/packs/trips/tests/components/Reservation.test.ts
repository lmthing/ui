import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  wordsFor,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const def = components.Reservation;
const { meta, props, examples, fallback, probes } = def;
const stay = examples[0]!;
const pass = examples[1]!;
const blank = { kind: "ticket", title: "Garden entry", start: pass.start, ref: "TEST-1" } as const;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

describe("Reservation bounds", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("accepts exact limits and defaults to a ticket without a code", () => {
    const maximum = {
      ...blank,
      title: ` ${"t".repeat(32)} `,
      from: "a".repeat(20),
      to: "b".repeat(20),
      ref: "r".repeat(12),
      seat: "s".repeat(12),
      end: { date: "2028-02-29", time: "23:59" },
    };
    expect(props.parse(maximum)).toMatchObject({ title: "t".repeat(32), code: false, detail: "full" });
    expect(props.parse(maximum).style).toBeUndefined();
    expectTypeOf<Props<typeof props, typeof meta>["start"]>().toEqualTypeOf<{ date: string; time: string }>();
  });

  it.each([
    {},
    { ...blank, title: "t".repeat(33) },
    { ...blank, from: "a".repeat(21) },
    { ...blank, to: "b".repeat(21) },
    { ...blank, ref: "r".repeat(13) },
    { ...blank, ref: " " },
    { ...blank, seat: "s".repeat(13) },
    { ...blank, style: "pass" },
    { ...blank, style: "compact" },
    { ...blank, density: "dense" },
    { ...blank, detail: "reduced" },
    { ...blank, kind: "appointment" },
    { ...blank, start: { date: "2027-02-29", time: "09:00" } },
    { ...blank, start: { date: "2027-03-07", time: "08:30", timezone: "JST" } },
    { ...blank, end: { date: "2027-03-07", time: "24:00" } },
    { ...blank, code: "true" },
    { ...blank, color: "#aabbcc" },
  ])("rejects invalid props: %j", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Reservation fallback and metadata", () => {
  it("uses cast titles and shared neutral values, including with an unusable cast", () => {
    const empty = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "place", fields: ["name"] }],
      items: [{ id: "garden", type: "place", sample: true, name: "Garden " + "g".repeat(50) }],
    };
    const malformed = { ...cast, items: [{ ...cast.items[0]!, name: 42 }] };
    for (const input of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: input })).success).toBe(true);
    expect(fallback({ cast: cast }).title).toMatch(/^Garden /);
    for (const input of [empty, malformed])
      expect(fallback({ cast: input })).toMatchObject({
        title: placeholderTitle(0),
        ref: wordsFor().placeholderValue,
      });
  });

  it("preserves the pack gate, phone tier and probe contracts", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 2, states: ["filled", "loading"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(meta).not.toHaveProperty("partTiers");
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Reservation",
      "KeyValue",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: meta.id,
        variant: { axis: "detail", value: "brief" },
      }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "r1/ref", action: "press" } }),
    );
  });
});

describe("Reservation states and parts", () => {
  it("addresses each part of a pass and separates its controls", () => {
    const html = renderInstance("Reservation", pass, "filled", theme);
    expect([...addressedElements(html).keys()].sort()).toEqual(
      meta.parts.map((part) => `home/c1/${part}`).sort(),
    );
    for (const target of ["root", "ref"])
      expect(elementAt(html, `home/c1/${target}`).attributes).toContain('role="button"');
    expect(elementAt(html, "home/c1/ref").attributes).toContain('aria-label="Copy reference"');
    expect(elementAt(html, "home/c1/code").attributes).toContain('role="img"');
    const descendants = elementAt(html, "home/c1/root").children;
    expect(JSON.stringify(descendants)).not.toContain('data-testid=\\"home/c1/ref\\"');
  });

  it.each([
    { input: blank, missing: ["from", "to", "end", "seat", "code"] },
    { input: stay, missing: ["from", "code"] },
    { input: { ...blank, to: "Kyoto", code: true }, missing: ["from", "end", "seat"] },
    { input: { ...pass, detail: "brief" }, missing: ["seat"] },
  ])("draws only the parts of $input.title that are present", ({ input, missing }) => {
    const html = renderInstance("Reservation", input, "filled", theme);
    expect([...addressedElements(html).keys()].sort()).toEqual(
      meta.parts
        .filter((part) => !missing.includes(part))
        .map((part) => `home/c1/${part}`)
        .sort(),
    );
  });

  it.each(examples)("draws an inert loading ticket without content or a scannable code", (example) => {
    const html = renderInstance("Reservation", example, "loading", theme);
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/root"]);
    expect(html).toContain('aria-busy="true"');
    for (const text of [example.title, example.ref]) expect(html).toContain(text); // The shared skeleton measures hidden text to preserve line geometry.
    for (const text of ['role="button"', 'role="img"', 'aria-label="Copy reference"'])
      expect(html).not.toContain(text);
  });
});

describe("Reservation read and act", () => {
  it("reads the visible ticket and omits a hidden assignment", () => {
    const read = readComponent(def, pass, "r1").join("\n");
    for (const text of [
      "Departure",
      "Tokyo",
      "08:30",
      "Arrival",
      "Kyoto",
      "10:40",
      "Seat 8A",
      'ref "JP8K2"',
      "Copy reference",
      "[r1 press]",
      "[r1/ref press]",
    ])
      expect(read).toContain(text);
    expect(readComponent(def, { ...pass, detail: "brief" }, "r1").join("\n")).not.toContain("8A");
    expect(readComponent(def, blank, "r1").join("\n")).not.toContain("Scannable");
  });

  it.each(["filled", "loading"] as const)("routes the two controls independently in %s", (state) => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ id: "r1", c: meta.id, ...pass, state }] };
    const runtime = createScreenController({ screen, defs: components, onAction });
    for (const part of ["ref", "root"]) {
      const step = { address: `home/r1/${part}`, action: "press" } as const;
      expect(runtime.act(step).ok).toBe(state === "filled");
      if (state === "filled")
        expect(onAction).toHaveBeenLastCalledWith({
          ...step,
          address: part === "root" ? "home/r1" : step.address,
        });
    }
    expect(runtime.act({ address: "home/r1/code", action: "press" }).ok).toBe(false);
    expect(onAction).toHaveBeenCalledTimes(state === "filled" ? 2 : 0);
    if (state === "loading") expect(readComponent(def, pass, "r1", state).join("\n")).not.toContain("press");
  });
});
