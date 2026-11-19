import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { symptomReading } from "../../copy";
import { elementAt, renderInstance } from "../../../../../test/render";
const { meta, props, fallback, examples, probes } = components.SymptomLog;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const symptom = { label: "Headache", severity: 2 };
const group = { label: "Head", symptoms: [symptom, { label: "Dizziness", severity: 0 }] };
const input = { groups: [group] };
describe("SymptomLog schema and boundaries", () => {
  it.each(examples)("accepts a real domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims labels, defaults severity, and derives only code-owned selection flags", () => {
    const parsed = props.parse({
      groups: [{ label: " Head ", symptoms: [{ label: " Headache " }, symptom] }],
    });
    expect(parsed.groups[0]).toMatchObject({
      label: "Head",
      symptoms: [
        { label: "Headache", severity: 0, on: false },
        { ...symptom, on: true },
      ],
      symptom_1: { on: false },
      severity_2: 2,
    });
  });
});
describe("SymptomLog invalid and maximum inputs", () => {
  it.each([
    {},
    { groups: [] },
    { groups: Array(5).fill(group) },
    { groups: [{ ...group, label: "" }] },
    { groups: [{ ...group, label: " " }] },
    { groups: [{ ...group, label: "a".repeat(17) }] },
    { groups: [{ ...group, symptoms: [] }] },
    { groups: [{ ...group, symptoms: [symptom] }] },
    { groups: [{ ...group, symptoms: Array(9).fill(symptom) }] },
    ...[-1, 6, 1.5, Infinity, "2", null].map((severity) => ({
      groups: [{ ...group, symptoms: [{ ...symptom, severity }, symptom] }],
    })),
    ...["", " ", "a".repeat(17)].map((label) => ({
      groups: [{ ...group, symptoms: [{ ...symptom, label }, symptom] }],
    })),
    { groups: [{ ...group, id: "r1" }] },
    { groups: [{ ...group, has_1: true }] },
    { groups: [{ ...group, symptoms: [{ ...symptom, on: "false" }, symptom] }] },
    { groups: [{ ...group, symptoms: [{ ...symptom, note: "Pain" }, symptom] }] },
    { ...input, color: "#fff" },
    { ...input, size: 44 },
    { ...input, style: "grid" },
  ])("rejects invalid and presentation-owned input", (value) =>
    expect(props.safeParse(value).success).toBe(false),
  );
  it.each([0, 5])("accepts exact maximum density and text lengths at severity %i", (severity) => {
    const value = {
      groups: Array(4).fill({
        label: "a".repeat(16),
        symptoms: Array(8).fill({ label: "b".repeat(16), severity }),
      }),
    };
    expect(props.safeParse(value).success).toBe(true);
    const html = renderInstance("SymptomLog", value, "filled", theme);
    expect(html.match(/role="checkbox"/g)).toHaveLength(32);
    expect(html.match(/role="slider"/g) ?? []).toHaveLength(severity ? 32 : 0);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["groups"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
    expectTypeOf<View>().not.toHaveProperty("color");
  });
});
describe("SymptomLog fallback and contract", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: [{ id: "one", type: "record", sample: true, title: "Morning" }],
    },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: [{ id: "one", type: "record", sample: true, title: 4 }],
    },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: [{ id: "one", type: "record", sample: true, title: "a".repeat(80) }],
    },
  ];
  it.each(casts)("validates empty, useful, malformed and long casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast titles or shared neutral placeholders without invented symptoms", () => {
    expect(fallback({ cast: casts[0]! }).groups[0]).toEqual({
      label: "Item one",
      symptoms: [
        { label: "Item one", severity: 0 },
        { label: "Item two", severity: 0 },
      ],
    });
    expect(fallback({ cast: casts[1]! }).groups[0]!.label).toBe("Morning");
    expect(fallback({ cast: casts[2]! })).toEqual(fallback({ cast: casts[0]! }));
    expect(fallback({ cast: casts[3]! }).groups[0]!.label).toHaveLength(16);
  });
  it("preserves states, density, phone tier, and all core-first probes", () => {
    expect(meta).toMatchObject({
      status: "ready",
      states: ["filled"],
      dense: true,
      weight: 3,
      tier: "phone",
    });
    expect(meta.realPath).toContain("not a diagnosis");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Scale" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "SymptomLog" }));
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
    expect(createRegistry({ packs: ["health"], includeDrafts: true }).schema("SymptomLog")).toBe(props);
    expect(createRegistry().ids).not.toContain("SymptomLog");
  });
});
describe("SymptomLog states, parts, read and actions", () => {
  it.each(examples)("addresses every group and control, reading only visible severity lines", (example) => {
    const parsed = stampItemIds(meta, props.parse(example)) as Props<typeof props, typeof meta>;
    const html = renderInstance("SymptomLog", example, "filled", theme, { component: "s1" });
    const reading = readComponent(components.SymptomLog, example, "s1").join("\n");
    expect(html.match(/data-testid="home\/s1\/root"/g)).toHaveLength(1);
    for (const line of symptomReading(parsed.groups)) {
      for (const text of line.split(" · ")) expect(html).toContain(text);
      expect(reading).toContain(line);
    }
    for (const row of parsed.groups) {
      for (const part of ["root", "label", "chips"])
        expect(elementAt(html, `home/s1/${row.id}/${part}`)).toBeDefined();
      row.symptoms.forEach((entry, index) => {
        const address = `home/s1/${row.id}/symptom_${index + 1}`;
        expect(elementAt(html, address).attributes).toContain('role="checkbox"');
        expect(elementAt(html, address).attributes).toContain(`aria-checked="${entry.severity > 0}"`);
        if (entry.severity > 0) {
          const slider = elementAt(html, `home/s1/${row.id}/severity_${index + 1}`).attributes;
          expect(slider).toContain('role="slider"');
          expect(slider).toContain(`aria-valuenow="${entry.severity}"`);
          expect(elementAt(html, `home/s1/${row.id}/reading_${index + 1}`)).toBeDefined();
        } else expect(html).not.toContain(`data-testid="home/s1/${row.id}/severity_${index + 1}"`);
      });
    }
    expect(affordancesOf(meta, parsed, "s1")).toHaveLength(
      parsed.groups.reduce(
        (count, row) => count + row.symptoms.length + row.symptoms.filter((s) => s.severity > 0).length,
        0,
      ),
    );
    expect(meta.read(parsed, "empty")).toEqual([]);
  });
});
it("toggles and sets independently, preserves severity on reselect, and rejects invalid batches", () => {
  const runtime = createScreenController({
    screen: { id: "home", components: [{ id: "s1", c: "SymptomLog", ...examples[0] }] },
    defs: components,
  });
  try {
    const toggle = { address: "s1/r1/symptom_2", action: "toggle" };
    const set = { address: "s1/r1/severity_2", action: "set", value: 5 };
    expect(runtime.act(set).ok).toBe(false);
    expect(runtime.act(toggle).ok).toBe(true);
    expect(runtime.read()).toContain("Dizziness · 1/5");
    expect(runtime.act(set).ok).toBe(true);
    expect(runtime.read()).toContain("Dizziness · 5/5");
    expect(runtime.act(toggle).ok).toBe(true);
    expect(runtime.read()).not.toContain("Dizziness ·");
    expect(runtime.act(set).ok).toBe(false);
    expect(runtime.act(toggle).ok).toBe(true);
    expect(runtime.read()).toContain("Dizziness · 5/5");
    expect(runtime.read()).toContain("Headache · 2/5");
    expect(runtime.act({ ...set, value: 1 }).ok).toBe(true);
    for (const value of [0, 6, 1.5, Infinity, "3", true, null])
      expect(runtime.act({ ...set, value }).ok).toBe(false);
    const before = runtime.store.snapshot();
    expect(runtime.act([toggle, set]).ok).toBe(false);
    expect(runtime.store.snapshot()).toEqual(before);
    expect(runtime.act({ ...toggle, value: "yes" }).ok).toBe(false);
    expect(runtime.act({ ...toggle, address: "s1/r1/symptom_8" }).ok).toBe(false);
    expect(runtime.act({ ...toggle, address: "s1/r5/symptom_1" }).ok).toBe(false);
    expect(runtime.act({ ...toggle, address: "s1/root" }).ok).toBe(false);
    expect(runtime.snapshotScreen().components[0]).toMatchObject({
      groups: [{ symptoms: [symptom, { label: "Dizziness", severity: 1, on: true }] }, expect.anything()],
    });
  } finally {
    runtime.dispose();
  }
});
