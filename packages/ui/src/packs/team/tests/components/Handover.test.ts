import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  wordsFor,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { teamWordsFor } from "../../lang";

const def = components.Handover;
const { props, meta, examples, fallback, probes } = def;
const full = examples[0]!;
const note = full.notes[0]!;
const words = teamWordsFor().handover;
const emptyCast: CastLike = { things: [], items: [] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const view = (input: unknown, state: "filled" | "empty" = "filled") =>
  addressedElements(renderInstance("Handover", input, state, theme));

describe("Handover schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("accepts six maximum-length notes, trims text and stamps view-only IDs", () => {
    const row = {
      by: "a".repeat(20),
      time: "a".repeat(12),
      text: "a".repeat(160),
      flag: "a".repeat(16),
      seen: false,
    };
    const notes = Array.from({ length: 6 }, () => ({ ...row, by: ` ${row.by} ` }));
    const parsed = props.parse({ notes });
    expect(parsed).toMatchObject({
      surface: "card",
      detail: "full",
      notes: Array.from({ length: 6 }, () => row),
    });
    expect(stampItemIds(meta, parsed).notes).toMatchObject(
      ["r1", "r2", "r3", "r4", "r5", "r6"].map((id) => ({ id })),
    );
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["notes"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
  });
  it.each([
    {},
    { notes: [] },
    { notes: Array.from({ length: 7 }, () => note) },
    { ...full, density: "tiny" },
    { ...full, surface: "raised" },
    { ...full, detail: "none" },
    { ...full, color: "#FFFFFF" },
  ])("rejects invalid input %j", (input) => expect(props.safeParse(input).success).toBe(false));
  it.each([
    { by: " " },
    { by: "a".repeat(21) },
    { time: undefined },
    { time: "a".repeat(13) },
    { text: "" },
    { text: "a".repeat(161) },
    { flag: "a".repeat(17) },
    { tone: "good" },
    { seen: "false" },
    { seen: undefined },
    { id: "r1" },
    { color: "red" },
  ])("rejects invalid note %j", (input) =>
    expect(props.safeParse({ notes: [{ ...note, ...input }] }).success).toBe(false),
  );
});

describe("Handover fallback and metadata", () => {
  it("uses bounded cast copy and neutral placeholders when no note can be built", () => {
    const cast: CastLike = {
      things: [{ type: "entry", fields: ["name", "detail"] }],
      items: Array.from({ length: 8 }, (_, i) => ({
        id: `note_${i}`,
        type: "entry",
        sample: true,
        name: i ? "a".repeat(25) : "Cameron",
        detail: i ? "a".repeat(180) : "Refilled the tray",
      })),
    };
    const malformed: CastLike = { things: [], items: [{ id: "bad", type: "entry", sample: true, name: 42 }] };
    for (const content of [cast, emptyCast, malformed])
      expect(props.safeParse(fallback({ cast: content })).success).toBe(true);
    const { placeholderDetail, placeholderValue } = wordsFor();
    expect(fallback({ cast }).notes).toHaveLength(6);
    expect(fallback({ cast }).notes[0]).toEqual({
      by: "Cameron",
      text: "Refilled the tray",
      time: placeholderValue,
      seen: false,
    });
    for (const content of [emptyCast, malformed])
      expect(fallback({ cast: content }).notes).toEqual([
        { by: placeholderTitle(0), text: placeholderDetail, time: placeholderValue, seen: false },
      ]);
  });
  it("keeps its tier, core near miss, both writes and the read target", () => {
    expect(meta.tier).toBe("people");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Composer");
    expect(probes).toMatchObject([
      { kind: "choose", expect: "Handover" },
      { kind: "choose", expect: "Composer" },
      { kind: "write", expect: "Handover" },
      { kind: "write", expect: "Handover", variant: { axis: "detail", value: "brief" } },
      { kind: "read", expect: { address: "h1/r1/seen", action: "check" } },
    ]);
    expect(createRegistry({ packs: ["team"], includeDrafts: true }).schema("Handover")).toBe(props);
    expect(packReady("team")).toBe(true);
    expect(createRegistry({ packs: ["team"] }).schema("Handover")).toBe(props);
  });
});

describe("Handover parts, states and variants", () => {
  it("addresses all visible content and exposes only unseen notes as checkboxes", () => {
    const parts = view(full);
    expect(parts.has("home/c1/root")).toBe(true);
    expect(parts.has("home/c1/message")).toBe(false);
    for (const part of meta.items.parts) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(true);
      expect(parts.has(`home/c1/r2/${part}`)).toBe(part !== "flag");
    }
    expect(parts.get("home/c1/r1/by")?.text).toEqual([note.by]);
    expect(parts.get("home/c1/r1/time")?.text.join("")).toContain(note.time);
    expect(parts.get("home/c1/r1/text")?.text).toEqual([note.text]);
    expect(renderInstance("Handover", full, "filled", theme)).toContain(`>${note.flag}<`);
    expect(parts.get("home/c1/r1/seen")?.attributes).toContain('role="checkbox"');
    expect(parts.get("home/c1/r1/seen")?.attributes).toContain(`aria-label="${words.markSeen(note.text)}"`);
    expect(parts.get("home/c1/r2/seen")?.attributes).toContain('role="img"');
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(full)), "h1")).toMatchObject([
      { address: "h1/r1/seen", part: "seen", action: "check" },
    ]);
  });
  it("keeps addresses for finish axes, and omits only timestamps in brief view and read", () => {
    const addresses = [...view(full).keys()];
    expect([...view({ ...full, density: "compact" }).keys()]).toEqual(addresses);
    expect([...view({ ...full, surface: "outlined" }).keys()]).toEqual(addresses);
    expect([...view({ notes: [{ ...note, tone: "neutral" }, full.notes[1]] }).keys()]).toEqual(addresses);
    const brief = { ...full, detail: "brief" };
    expect([...view(brief).keys()]).toEqual(addresses.filter((part) => !part.endsWith("/time")));
    expect(props.parse(brief).notes[0]?.time).toBe(note.time);
    const read = readComponent(def, brief, "h1").join("\n");
    for (const value of [note.by, note.text, note.flag, words.seen, words.unseen, "h1/r1/seen check"])
      expect(read).toContain(value);
    expect(read).not.toContain(note.time);
    expect(readComponent(def, full, "h1").join("\n")).toContain(note.time);
  });
  it("shows only the empty line and rejects stale actions in the empty state", () => {
    const parts = view(full, "empty");
    expect([...parts.keys()]).toEqual(["home/c1/root", "home/c1/message"]);
    expect(parts.get("home/c1/message")?.text).toEqual([emptyLine()]);
    expect(readComponent(def, full, "h1", "empty")).toEqual(["h1 Handover (empty)"]);
    const screen = {
      id: "home",
      components: [{ ...full, id: "h1", c: "Handover", state: "empty" as const }],
    };
    const runtime = createScreenController({ screen, defs: components });
    expect(runtime.press("h1/r1/seen").ok).toBe(false);
    runtime.dispose();
  });
});

describe("Handover read and act", () => {
  it("acknowledges exactly one note, then removes the action without asking for confirmation", () => {
    const screen = { id: "home", components: [{ ...full, id: "h1", c: "Handover" }] };
    const onAction = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction });
    expect(runtime.read()).toContain("[h1/r1/seen check:todo !needs-people]");
    for (const address of ["h1/r2/seen", "h1/r3/seen", "h1/r1/flag"])
      expect(runtime.press(address).ok).toBe(false);
    expect(runtime.press("h1/r1/seen").ok).toBe(true);
    expect(runtime.confirmation).toBeUndefined();
    expect(runtime.read()).toContain(`r1 ${words.seen}`);
    expect(runtime.read()).not.toContain("[h1/r1/seen check");
    expect(runtime.press("h1/r1/seen").ok).toBe(false);
    expect(onAction.mock.calls).toEqual([[{ address: "home/h1/r1/seen", action: "check" }]]);
    runtime.dispose();
  });
});
