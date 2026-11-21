import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  wordsFor,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Address;
const { props, fallback, examples, probes, meta } = def;
const [nursery, park, brief] = examples;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const draw = (input: unknown) => addressedElements(renderInstance("Address", input, "filled", theme));
const screen = (input: object) => ({
  id: "home",
  components: [{ ...input, c: "Address", id: "a1", state: "filled" as const }],
});
const defs = { Address: def };

describe("Address contract and boundaries", () => {
  it.each(examples)("accepts a real address", (input) => expect(props.safeParse(input).success).toBe(true));

  it("accepts both line count limits, trims input and applies axis defaults", () => {
    const line = "a".repeat(40);
    const phone = "1".repeat(20);
    const note = "n".repeat(80);
    expect(props.parse({ lines: [` ${line} `, line, line], phone, note })).toMatchObject({
      lines: [line, line, line],
      phone,
      note,
      callable: true,
      detail: "full",
    });
    expect(props.parse({ lines: [" 1 Brent Road "] })).toMatchObject({
      lines: ["1 Brent Road"],
      callable: false,
    });
  });

  it.each([
    { lines: undefined },
    { lines: [] },
    { lines: ["1", "2", "3", "4"] },
    { lines: [" "] },
    { lines: ["a".repeat(41)] },
    { phone: "1".repeat(21) },
    { phone: " " },
    { note: "n".repeat(81) },
    { note: "" },
    { density: "tight" },
    { detail: "hidden" },
    { callable: true },
    { color: "red" },
  ])("rejects invalid input %j", (invalid) => {
    expect(props.safeParse({ ...nursery, ...invalid }).success).toBe(false);
  });

  it("preserves every core-first, write and read probe and follows pack readiness", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: ["places"] }).ids.includes("Address")).toBe(packReady("places"));
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "Address" }),
      expect.objectContaining({ kind: "choose", expect: "KeyValue" }),
      expect.objectContaining({ kind: "write", expect: "Address" }),
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
      ...["copy", "directions", "call"].map((part) =>
        expect.objectContaining({ kind: "read", expect: { address: `a1/${part}`, action: "press" } }),
      ),
    ]);
  });
});

describe("Address fallback", () => {
  it("uses matching cast detail or neutral copy without inventing a phone or note", () => {
    const empty = { things: [], items: [] };
    const matching = {
      things: [{ type: "venue", fields: ["name", "address"] }],
      items: [{ id: "venue", type: "venue", sample: true, name: "Riverside", address: "North entrance" }],
    };
    const malformed = { ...matching, items: [{ ...matching.items[0]!, name: false, address: 7 }] };
    const neutral = { lines: [wordsFor("en").placeholderDetail] };
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast, lang: "en" })).success).toBe(true);
    expect(fallback({ cast: empty, lang: "en" })).toEqual(neutral);
    expect(fallback({ cast: malformed, lang: "en" })).toEqual(neutral);
    expect(fallback({ cast: matching })).toEqual({ lines: ["North entrance"] });
  });
});

describe("Address states and parts", () => {
  it("draws all supplied filled parts and the three named buttons, with a decorative map", () => {
    expect(meta.states).toEqual(["filled"]);
    const parts = draw(nursery);
    for (const part of meta.parts) expect(parts.has(`home/c1/${part}`)).toBe(true);
    expect(parts.get("home/c1/map")?.attributes).toContain('aria-hidden="true"');
    for (const [part, label] of [
      ["copy", "Copy address"],
      ["directions", "Directions"],
      ["call", "Call 0117 496 0124"],
    ]) {
      expect(parts.get(`home/c1/${part}`)?.attributes).toContain('role="button"');
      expect(parts.get(`home/c1/${part}`)?.attributes).toContain(`aria-label="${label}"`);
    }
  });

  it("hides only the note in brief, omits absent parts and preserves compact addresses", () => {
    const keys = (input: object) => [...draw(input).keys()];
    expect(keys({ ...nursery, density: "compact" })).toEqual(keys(nursery!));
    expect(keys(brief!)).toEqual(keys(nursery!).filter((part) => !part.endsWith("/note")));
    expect(keys(park!)).toEqual(keys(nursery!).filter((part) => !/\/(?:note|call)$/.test(part)));
  });
});

describe("Address read and act", () => {
  it("reads visible text and distinguishes phone and service tiers", () => {
    const reading = readComponent(def, nursery, "a1").join("\n");
    for (const text of [
      '"14 Greenhouse Lane"',
      '"Bristol BS1 4DJ"',
      '"Use the side gate by the shed."',
      "Call 0117 496 0124",
      "[a1/copy press]",
      "[a1/directions press !needs-service]",
      "[a1/call press !needs-service]",
    ])
      expect(reading).toContain(text);
    expect(readComponent(def, brief, "a1").join("\n")).not.toContain("side gate");
    expect(affordancesOf(meta, props.parse(park), "a1").map((action) => action.part)).toEqual([
      "copy",
      "directions",
    ]);
  });

  it("dispatches non-destructive button presses to the host", () => {
    const events: unknown[] = [];
    const controller = createScreenController({
      screen: screen(nursery!),
      defs,
      onAction: (event) => events.push(event),
    });
    const steps = ["copy", "directions", "call"].map((part) => ({
      address: `home/a1/${part}`,
      action: "press",
    }));
    for (const step of steps) expect(controller.act(step).ok).toBe(true);
    expect(events).toEqual(steps);
  });

  it("rejects call without a phone and press on a static part", () => {
    for (const part of ["call", "map", "lines"])
      expect(planAct(screen(park!), defs, {}, [{ address: `a1/${part}`, action: "press" }])).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
  });
});
