import { describe, expect, it } from "vitest";
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
import { addressedElements, renderExample, renderInstance } from "../../../../../test/render";

const { Milestones } = components;
const { examples, props, fallback, probes } = Milestones;
const rail = examples[0]!;
const cards = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown = rail, state: StateName = "filled") =>
  renderExample("Milestones", input, state, theme, { component: "m1" });
const part = (relative: string) => `home/m1/${relative}`;

describe("Milestones contract and fallback", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("rejects invalid counts, dates, refs and computed metadata", () => {
    const gate = rail.gates[0]!;
    for (const gates of [
      [],
      Array(7).fill(gate),
      [{ ...gate, title: "x".repeat(33) }],
      [{ ...gate, due: "2026-02-29" }],
      [{ ...gate, requires: [] }],
      [{ ...gate, requires: ["one", "one"] }],
      [{ ...gate, reached: true }],
    ]) {
      expect(props.safeParse({ ...rail, gates }).success).toBe(false);
    }
    expect(props.safeParse({ ...rail, color: "red" }).success).toBe(false);
    expect(props.safeParse({ ...rail, gates: Array(6).fill(gate) }).success).toBe(true);
  });

  it("falls back to cast labels and neutral placeholders and keeps its core near miss", () => {
    const sample: CastLike = {
      things: [{ type: "record", fields: ["label"] }],
      items: [{ id: "one", type: "record", sample: true, label: "Design accepted" }],
    };
    const malformed = { ...sample, items: [{ ...sample.items[0]!, label: 42 }] };
    expect(props.parse(fallback({ cast: sample })).gates[0]?.title).toBe("Design accepted");
    for (const cast of [{ things: [], items: [] }, malformed]) {
      expect(props.parse(fallback({ cast })).gates[0]?.title).toBe(placeholderTitle(0));
    }
    expect(createRegistry({ packs: ["projects"] }).ids.includes("Milestones")).toBe(packReady("projects"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timeline" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
  });
});

describe("Milestones states and addresses", () => {
  it("orders gates by date but leaves their stamped addresses stable", () => {
    const reverse = { ...rail, gates: [...rail.gates].reverse() };
    const elements = addressedElements(render(reverse).html);
    expect([...elements.keys()].slice(0, 3)).toEqual([part("root"), part("r2/root"), part("r2/title")]);
    expect(elements.get(part("r2/root"))?.attributes).toContain('role="link"');
    expect(elements.get(part("r1/root"))?.attributes).not.toContain('role="link"');
  });

  it("only lists all requirements on full cards; density never changes addresses", () => {
    const full = [...addressedElements(render(cards).html).keys()];
    const compact = [...addressedElements(render({ ...cards, density: "compact" }).html).keys()];
    const brief = [...addressedElements(render({ ...cards, detail: "brief" }).html).keys()];
    expect(compact).toEqual(full);
    expect(full).toContain(part("r1/requires"));
    expect(brief).toEqual(full.filter((address) => !address.endsWith("/requires")));
    expect(brief).toContain(part("r1/missing"));
  });

  it("has an inert skeleton, empty state and completed success state", () => {
    expect([...addressedElements(render(rail, "empty").html).keys()]).toEqual([part("root"), part("empty")]);
    for (const input of [rail, cards]) {
      const loading = render(input, "loading").html;
      expect([...addressedElements(loading).keys()]).toEqual([part("root")]);
      expect(loading).not.toContain('role="link"');
    }
    const success = addressedElements(render(rail, "success").html);
    expect(success.has(part("r1/reached")) && success.has(part("r2/reached"))).toBe(true);
    expect(success.has(part("r2/missing"))).toBe(false);
  });
});

describe("Milestones read and act", () => {
  it("reads the same requirements as the view without inventing acceptance", () => {
    const { html, deviceData } = render(cards);
    const read = readComponent(Milestones, cards, "m1", "filled", {}, undefined, deviceData).join("\n");
    for (const line of ["Requires: Park route map, Crossing photos", "Still needed: Crossing photos"]) {
      expect(html).toContain(line);
      expect(read).toContain(line);
    }
    const untrusted = renderInstance("Milestones", rail, "filled", theme, { component: "m1" });
    expect(addressedElements(untrusted).has(part("r1/reached"))).toBe(false);
    expect(untrusted).toContain("Still needed: light plan");
  });

  it("offers only linked gates in filled or success", () => {
    for (const state of ["filled", "success", "empty", "loading"] as const) {
      const screen = { id: "home", components: [{ id: "m1", c: "Milestones", ...rail, state }] };
      const press = (address: string) => planAct(screen, { Milestones }, {}, [{ address, action: "press" }]);
      expect(press("m1/r2")).toMatchObject({ ok: false, code: "not_actionable" });
      expect(press("m1/r1")).toMatchObject(
        state === "filled" || state === "success"
          ? { ok: true, links: [{ goto: "garden_scope" }] }
          : { ok: false, code: "not_actionable" },
      );
    }
  });
});
