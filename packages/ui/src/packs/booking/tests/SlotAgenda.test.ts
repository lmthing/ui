import { expect, it } from "vitest";
import {
  affordancesOf,
  components,
  placeholderTitle,
  readComponent,
  stampItemIds,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../test/render";

const { examples, fallback, meta, probes, props } = components.SlotAgenda;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, date: "2026-02-30" },
  { ...valid, sessions: [{ ...valid.sessions[0], time: "24:00" }] },
  { ...valid, sessions: [{ ...valid.sessions[0], title: "a".repeat(33) }] },
  { ...valid, sessions: [{ ...valid.sessions[0], status: "reserved" }] },
  { ...valid, sessions: [] },
  {
    ...valid,
    sessions: Array.from({ length: 13 }, () => ({ time: "00:00", title: "x", status: "available" })),
  },
];

it.each(examples)("accepts a real example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it.each(invalid)("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(
      props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } }))
        .success,
    ).toBe(true);
  }
});

it("declares choose, near miss, write and read probes", () => {
  expect(probes.map(({ kind }) => kind)).toEqual([
    "choose",
    "choose",
    "choose",
    "write",
    "read",
    "write",
    "write",
    "choose",
  ]);
  expect(probes[1]).toMatchObject({ expect: "Slots" });
  expect(probes[2]).toMatchObject({ expect: "List" });
  expect(valid.sessions[0]?.title).toBe(placeholderTitle(0));
});

it("keeps capacity visible in brief staffing rows, with an optional assignee and valid time range", () => {
  const input = examples[3]!;
  const row = input.sessions[0]!;
  expect(props.safeParse({ ...input, sessions: [{ ...row, filled: 12 }] }).success).toBe(false);
  expect(props.safeParse({ ...input, sessions: [{ ...row, end: "07:00" }] }).success).toBe(false);
  const brief = { ...input, detail: "brief" };
  const parts = addressedElements(renderInstance("SlotAgenda", brief, "filled", theme));
  expect(parts.has("home/c1/r1/assignee")).toBe(false);
  expect(parts.get("home/c1/r1/capacity")?.text.join("")).toBe("4 of 6 places filled");
});

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

it("opens only linked rows without suggesting that a full session is bookable", () => {
  const input = examples[0];
  const parts = addressedElements(renderInstance("SlotAgenda", input, "filled", theme));
  expect(
    affordancesOf(meta, stampItemIds(meta, props.parse(input)), "a1").map(({ address }) => address),
  ).toEqual(["a1/r1", "a1/r2"]);
  expect(parts.get("home/c1/r1/status")?.text.join("")).toContain("Available");
  expect(parts.get("home/c1/r2/status")?.text.join("")).toContain("Full");
  expect(parts.get("home/c1/r3/status")?.text.join("")).toContain("Booked");
  expect(parts.has("home/c1/r2/open")).toBe(true);
  expect(parts.has("home/c1/r3/open")).toBe(false);
});

it("hides only locations in the brief view and preserves addressed links", () => {
  const input = examples[2]!;
  const parts = addressedElements(renderInstance("SlotAgenda", input, "filled", theme));
  expect(parts.has("home/c1/r1/location")).toBe(false);
  expect(parts.has("home/c1/r1/open")).toBe(true);
  expect(readComponent(components.SlotAgenda, input, "a1").join("\n")).not.toContain("Glasshouse");
  expect(input.sessions[0]).toMatchObject({ location: "Glasshouse" });
});

it("shows specific empty copy and no links while empty or loading", () => {
  for (const state of ["empty", "loading"] as const) {
    const input = examples[0];
    const html = renderInstance("SlotAgenda", input, state, theme);
    expect(html).not.toContain('role="link"');
    expect(readComponent(components.SlotAgenda, input, "a1", state).join("\n")).not.toContain("a1/r1");
    if (state === "empty") {
      expect(html).toContain("No sessions on this date");
      expect(readComponent(components.SlotAgenda, input, "a1", state).join("\n")).toContain(
        "No sessions on this date",
      );
    } else expect(html).toContain('role="progressbar"');
  }
});
