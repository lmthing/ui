import {
  clip,
  components,
  placeholderTitle,
  readComponent,
  wordsFor,
  type CastLike,
  type Definition,
  type Probe,
} from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";

const cases = [
  ["Documents", "List", "docs", "title"],
  ["Renewals", "Calendar", "items", "title"],
  ["Receipts", "Amount", "items", "payee"],
  ["Signature", "Field", undefined, "title"],
  ["TaxYear", "Checklist", "requirements", "label"],
] as const;
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "record", fields: ["name", "note"] }],
    items: [{ id: "entry", type: "record", sample: true, name: "Sample entry", note: "Sample detail" }],
  },
  {
    things: [{ type: "record", fields: ["name", "note"] }],
    items: [{ id: "entry", type: "record", sample: true, name: 4, note: null }],
  },
];

describe("paperwork examples and probes", () => {
  it.each(cases)("%s validates examples, neutral/cast fallbacks and probe shape", (id, core, key, title) => {
    const def: Definition = components[id];
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
    for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    const seed = (cast: CastLike) => {
      const fallback = def.fallback({ cast }) as Record<string, unknown>;
      return key ? (fallback[key] as Record<string, unknown>[])[0]?.[title] : fallback[title];
    };
    expect(seed(casts[0]!)).toBe(placeholderTitle(0));
    expect(seed(casts[1]!)).toBe("Sample entry");
    expect(def.meta.tier).toBe("phone");
    expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(def.meta.realPath).not.toBe("");
    for (const part of [...(def.meta.parts ?? []), ...(def.meta.items?.parts ?? [])])
      expect(part).toMatch(/^[a-z][a-z0-9_]*$/);
    for (const [kind, expected] of [
      ["choose", id],
      ["choose", core],
      ["write", id],
    ] as const)
      expect(def.probes).toContainEqual(expect.objectContaining({ kind, expect: expected }));
    expect(def.probes).toContainEqual(
      expect.objectContaining({ kind: "write", expect: id, variant: expect.any(Object) }),
    );
    for (const probe of def.probes.filter((p): p is Extract<Probe, { kind: "read" }> => p.kind === "read")) {
      const reading = readComponent(def, def.examples[probe.screen], id[0]!.toLowerCase() + "1").join("\n");
      expect(reading).toContain(`[${probe.expect.address} ${probe.expect.action}`);
    }
    expect(def.probes.some(({ kind }) => kind === "read")).toBe(true);
  });
});

describe("paperwork schema limits", () => {
  it.each(cases)("%s rejects unknown keys and collection/text limits", (id, _core, key, title) => {
    const def: Definition = components[id];
    const example = def.examples[0] as Record<string, unknown>;
    for (const input of [
      { ...example, pixels: 8 },
      { ...example, surface: "#aabbcc" },
    ])
      expect(def.props.safeParse(input).success).toBe(false);
    if (key) {
      const [row] = example[key] as Record<string, unknown>[];
      const max = id === "TaxYear" ? 8 : 6;
      expect(def.props.safeParse({ ...example, [key]: Array.from({ length: max }, () => row) }).success).toBe(
        true,
      );
      for (const invalid of [
        [],
        Array.from({ length: max + 1 }, () => row),
        [{ ...row, [title]: "a".repeat(33) }],
        [{ ...row, id: "r1" }],
      ])
        expect(def.props.safeParse({ ...example, [key]: invalid }).success).toBe(false);
    } else {
      expect(def.props.safeParse({ ...example, [title]: "a".repeat(33) }).success).toBe(false);
    }
  });

  it("enforces dates, attachment shapes and host-only fields", () => {
    const { Documents, Renewals, Receipts, Signature, TaxYear } = components;
    const [doc] = Documents.examples[0]!.docs;
    const [renewal] = Renewals.examples[0]!.items;
    const [receipt] = Receipts.examples[0]!.items;
    const [requirement] = TaxYear.examples[0]!.requirements;
    for (const file of ["https://example.org/file", "/private/path", "local:", `lib:${"x".repeat(117)}`]) {
      expect(Documents.props.safeParse({ docs: [{ ...doc, file }] }).success).toBe(false);
      expect(Receipts.props.safeParse({ items: [{ ...receipt, file }] }).success).toBe(false);
      expect(Signature.props.safeParse({ ...Signature.examples[0], document: file }).success).toBe(false);
    }
    expect(Renewals.props.safeParse({ items: [{ ...renewal, noticeBy: "2027-04-11" }] }).success).toBe(false);
    expect(Renewals.props.safeParse({ items: [{ ...renewal, due: "2026-02-30" }] }).success).toBe(false);
    expect(Receipts.props.safeParse({ items: [{ ...receipt, allocation: 101 }] }).success).toBe(false);
    expect(Receipts.props.safeParse({ items: [{ ...receipt, amount: -1 }] }).success).toBe(false);
    expect(TaxYear.props.safeParse({ ...TaxYear.examples[0], to: "2025-12-31" }).success).toBe(false);
    expect(
      TaxYear.props.safeParse({ ...TaxYear.examples[0], requirements: [{ ...requirement, needed: 13 }] })
        .success,
    ).toBe(false);
    expect(TaxYear.props.safeParse({ ...TaxYear.examples[0], matched: 1 }).success).toBe(false);
    expect(Signature.props.safeParse({ ...Signature.examples[0], mark: "local:unsigned" }).success).toBe(
      false,
    );
    expect(Signature.props.safeParse({ ...Signature.examples[0], can_save: true }).success).toBe(false);
  });
});

describe("paperwork reads", () => {
  it("redacts private references and keeps unrelated item actions from navigating", () => {
    const { Documents, Renewals, Receipts, Signature } = components;
    for (const def of [Documents, Receipts, Signature]) {
      const reading = readComponent(def, def.examples[0], "a1").join("\n");
      expect(reading).toContain("(private file)");
      expect(reading).not.toMatch(/(?:local|lib):/);
      expect(reading).not.toMatch(/\/(?:pad|save|clear) /);
    }
    const docs = readComponent(Documents, Documents.examples[0], "d1").join("\n");
    expect(docs).toContain("(secret)");
    expect(docs).not.toContain("DEMO-A");
    expect(docs).toContain("[d1/r1 press→permit]");
    expect(docs).toContain("[d1/r1/remove press]");
    expect(docs).not.toContain("[d1/r1/remove press→");
    const due = readComponent(Renewals, Renewals.examples[0], "r1").join("\n");
    expect(due).toContain("[r1/r1/remind press !needs-ok]");
    expect(due).not.toContain("remind press→");
    expect(Signature.fallback({ cast: casts[0]! }).signer).toBe(clip(wordsFor().placeholderDetail, 28));
  });
});
