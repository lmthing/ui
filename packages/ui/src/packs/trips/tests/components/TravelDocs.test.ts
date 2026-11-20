import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const definition = components.TravelDocs;
const { meta, props, examples, fallback, probes } = definition;
const input = examples[0]!;
const doc = input.docs[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

describe("TravelDocs schema", () => {
  it.each(examples)("accepts each example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("accepts exact bounds and blank numbers, trims owners and defaults the finish and detail", () => {
    const bound = { ...doc, who: ` ${"A".repeat(16)} `, number: "X".repeat(16) };
    expect(props.parse({ docs: Array(6).fill(bound) })).toMatchObject({
      surface: "card",
      detail: "full",
      docs: Array(6).fill({ ...bound, who: "A".repeat(16) }),
    });
    expect(props.safeParse({ docs: [{ ...doc, number: "" }] }).success).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["docs"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { docs: [] },
    { docs: Array(7).fill(doc) },
    { ...input, tripEnds: "2027-02-29" },
    { ...input, color: "red" },
    { ...input, density: "dense" },
    { ...input, surface: "tinted" },
    { ...input, detail: "hidden" },
    ...[
      { who: " " },
      { who: "a".repeat(17) },
      { number: "a".repeat(17) },
      { number: 123 },
      { expires: "2027-02-29" },
      { kind: "ticket" },
      { warning: "bad" },
      { id: "r1" },
    ].map((patch) => ({ docs: [{ ...doc, ...patch }] })),
  ])("rejects invalid input", (value) => {
    expect(props.safeParse(value).success).toBe(false);
  });
});

describe("TravelDocs fallback and metadata", () => {
  it("takes at most three bounded cast titles and uses neutral defaults for absent values", () => {
    const empty = fallback({ cast: { things: [], items: [] } });
    const cast: CastLike = {
      things: [{ type: "person", fields: ["name"] }],
      items: ["Alex", 7, "B".repeat(40), "Riley"].map((name, index) => ({
        id: `person_${index}`,
        type: "person",
        sample: true,
        name,
      })),
    };
    const filled = fallback({ cast });
    expect(empty.docs).toEqual([
      { who: placeholderTitle(0), kind: "other", number: "", expires: docFallbackDate },
    ]);
    expect(filled.docs.map(({ who, number }) => [who, number])).toEqual([
      ["Alex", ""],
      [placeholderTitle(1), ""],
      [expect.stringMatching(/^B{10}/), ""],
    ]);
    for (const value of [empty, filled]) expect(props.safeParse(value).success).toBe(true);
  });

  it("keeps the phone tier, core near miss, brief write, row press and pack gate", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 2 });
    expect(meta.realPath).toContain("(secret)");
    expect(meta).not.toHaveProperty("partTiers");
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "TravelDocs",
      "KeyValue",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: "TravelDocs",
        variant: { axis: "detail", value: "brief" },
      }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "t1/r2", action: "press" } }),
    );
  });
});

const docFallbackDate = "2026-11-20";

describe("TravelDocs states and parts", () => {
  it("addresses only drawn parts, with brief hiding just the number lines", () => {
    const html = renderInstance("TravelDocs", input, "filled", theme);
    const full = addressedElements(html);
    const brief = addressedElements(
      renderInstance("TravelDocs", { ...input, detail: "brief" }, "filled", theme),
    );
    for (const row of ["r1", "r2"]) {
      for (const part of ["root", "kind", "who", "expires", "trail"])
        expect(full.has(`home/c1/${row}/${part}`)).toBe(true);
      expect(full.delete(`home/c1/${row}/number`)).toBe(true);
    }
    expect([...brief.keys()]).toEqual([...full.keys()]);
    expect(full.has("home/c1/trip_ends")).toBe(true);
    expect(full.has("home/c1/r2/warning")).toBe(true);
    expect(full.has("home/c1/r1/warning")).toBe(false);
    expect(elementAt(html, "home/c1/r2/root").attributes).toContain('role="button"');
    expect(html).toContain("No. ••••");
    expect(html).not.toContain("DEMO-");
  });

  it("leaves out trip-relative parts without a trip and uses shared empty copy", () => {
    const noTrip = addressedElements(renderInstance("TravelDocs", { docs: input.docs }, "filled", theme));
    expect(noTrip.has("home/c1/trip_ends")).toBe(false);
    expect(noTrip.has("home/c1/r2/warning")).toBe(false);
    const empty = renderInstance("TravelDocs", input, "empty", theme, "walk");
    expect(empty).toContain(emptyLine("walk"));
    expect([...addressedElements(empty).keys()]).toEqual(["home/c1/root", "home/c1/empty"]);
  });
});

describe("TravelDocs read and act", () => {
  it("reads the expiry, warning and press but only a redaction for the number", () => {
    const reading = readComponent(definition, input, "t1").join("\n");
    for (const line of [
      "Trip ends 13 Mar 2027",
      "Expires 10 Mar 2027",
      "Expires before trip ends",
      "(secret)",
      "[t1/r2 press]",
    ])
      expect(reading).toContain(line);
    expect(reading).not.toContain("DEMO-");
    expect(readComponent(definition, { ...input, detail: "brief" }, "t1").join("\n")).not.toContain("••••");
    expect(readComponent(definition, input, "t1", "empty").join("\n")).not.toContain("[t1/r2 press]");
  });

  it.each(["filled", "empty"] as const)("dispatches a row press only when %s has rows", (state) => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ id: "t1", c: "TravelDocs", ...input, state }] };
    const runtime = createScreenController({ screen, defs: components, onAction });
    const action = { address: "home/t1/r2", action: "press" } as const;
    expect(runtime.act(action)).toMatchObject({ ok: state === "filled" });
    if (state === "filled") expect(onAction).toHaveBeenCalledExactlyOnceWith(action);
    else expect(onAction).not.toHaveBeenCalled();
  });
});
