import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { components, createRegistry, packReady, readComponent, type Props } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { membersProjection } from "../../copy";

const def = components.Members;
const { props, meta, examples, fallback, probes } = def;
const sample = examples[0]!;
const first = sample.members[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const data = {
  member_dues: [
    { memberId: "ana", outstanding: 5 },
    { memberId: "cal", outstanding: 0 },
  ],
};
const address = (part: string) => `home/m1/${part}`;
const draw = (input: unknown, state: "filled" | "empty" | "loading" | "success" | "error" = "filled") =>
  renderInstance("Members", input, state, theme, { component: "m1", deviceData: data });
const read = (input: unknown) => readComponent(def, input, "m1", "filled", {}, "en", data).join("\n");

describe("Members schema", () => {
  it.each(examples)("parses a real example", (input) => expect(props.safeParse(input).success).toBe(true));
  it("accepts exact bounds and types stamped rows", () => {
    const member = { ...first, name: "X".repeat(24), roles: Array<string>(3).fill("Y".repeat(24)) };
    const members = Array.from({ length: 30 }, (_, index) => ({ ...member, id: `member_${index}` }));
    expect(props.parse({ members }).members).toHaveLength(30);
    expectTypeOf<Props<typeof props, typeof meta>["members"][number]["id"]>().toEqualTypeOf<string>();
  });
  it.each([
    { members: [] },
    { members: [first, first] },
    { members: [{ ...first, id: "not-a-ref" }] },
    { members: [{ ...first, name: "X".repeat(25) }] },
    { members: [{ ...first, ended: "2024-03-11" }] },
    { members: [{ ...first, roles: ["A", "B", "C", "D"] }] },
    { members: [{ ...first, can_end: true }] },
    { members: [{ ...first, dues: "paid" }] },
    { ...sample, detail: "short" },
    { ...sample, color: "#fff" },
  ])("rejects invalid or code-owned input", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Members fallback and metadata", () => {
  it("uses cast names, with neutral fallback for empty and malformed casts", () => {
    const empty = { things: [], items: [] };
    const named = (name: string | number) => ({
      things: [{ type: "person", fields: ["name"] }],
      items: [{ id: "ana", type: "person", sample: true, name }],
    });
    for (const cast of [empty, named("Jordan"), named(42)])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).members[0]?.name).toBe("Item one");
    expect(fallback({ cast: named(42) }).members[0]?.name).toBe("Item one");
    expect(fallback({ cast: named("Jordan") }).members[0]?.name).toBe("Jordan");
  });
  it("keeps the core near miss, variant probe, pack gate and destructive metadata", () => {
    expect(meta).toMatchObject({ tier: "phone", dense: true, weight: 3, confirmParts: ["end"] });
    expect(createRegistry({ packs: ["community"] }).ids.includes("Members")).toBe(packReady("community"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Members" }),
        expect.objectContaining({ kind: "choose", expect: "People" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "m1/r1", action: "press" } }),
      ]),
    );
  });
});

describe("Members states and parts", () => {
  it("draws and reads full details, with a link only on the linked member", () => {
    const parts = addressedElements(draw(sample));
    expect(parts.get(address("r1/root"))?.attributes).toContain('role="link"');
    expect(parts.get(address("r2/root"))?.attributes).not.toContain('role="link"');
    expect(parts.has(address("r1/photo"))).toBe(true);
    expect(parts.has(address("r2/photo"))).toBe(false);
    expect(parts.has(address("r2/ended"))).toBe(true);
    expect(parts.has(address("r1/ended"))).toBe(false);
    for (const text of ["Ana Reed", "Plot steward", "Joined 12 Mar 2024", "Can vote", "Dues due"])
      expect(read(sample)).toContain(text);
  });
  it("keeps finish addresses and hides only declared brief parts without dropping data", () => {
    const keys = [...addressedElements(draw(sample)).keys()];
    const compact = { ...sample };
    const brief = { ...sample, detail: "brief" as const };
    expect([...addressedElements(draw(compact)).keys()]).toEqual(keys);
    const hidden: readonly string[] = meta.variantParts["detail.brief"].hides;
    expect([...addressedElements(draw(brief)).keys()]).toEqual(
      keys.filter((key) => !hidden.includes(key.split("/")[3] ?? "")),
    );
    expect(read(brief)).not.toMatch(/Joined|Left|Plot steward|photo:/);
    expect(props.parse(brief).members[0]).toMatchObject(first);
  });
  it.each([
    ["empty", "Nothing here yet"],
    ["success", "Membership ended"],
    ["error", "Could not end membership"],
  ] as const)("draws the %s message without controls", (state, message) => {
    const html = draw(sample, state);
    expect(html).toContain(message);
    expect(html).not.toContain('role="button"');
    expect(addressedElements(html).has(address("r1/root"))).toBe(false);
  });
  it("loads with inert membership placeholders", () => {
    const html = draw(sample, "loading");
    expect(html).toContain('aria-busy="true"');
    expect(addressedElements(html).has(address("r1/root"))).toBe(false);
  });
});

describe("Members actions", () => {
  it("opens only linked records and denies ending membership without confirmed authority", () => {
    const screen = { id: "home", components: [{ ...sample, c: "Members", id: "m1" }] };
    const runtime = createScreenController({ screen, defs: { Members: def } });
    try {
      expect(runtime.press("m1/r1").ok).toBe(true);
      expect(runtime.press("m1/r2").ok).toBe(false);
      expect(runtime.press("m1/r1/end").ok).toBe(false);
      expect(read(sample)).not.toContain("/end press");
    } finally {
      runtime.dispose();
    }
  });
  it("confirms an end only for an active member and never navigates on confirmation", () => {
    const future = { ...first, id: "future", joined: "2027-01-01" };
    const members = [...sample.members, future];
    const screen = {
      id: "home",
      components: [{ ...sample, members, detail: "brief", c: "Members", id: "m1" }],
    };
    const derive = membersProjection(() => ({ secretary: true, today: "2026-11-21" }));
    const Members = { ...def, meta: { ...meta, live: { derive } } };
    const onAction = vi.fn();
    const onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: { Members }, onAction, onLink });
    try {
      expect(runtime.press("m1/r2/end").ok).toBe(false);
      expect(runtime.press("m1/r3/end").ok).toBe(false);
      expect(runtime.press("m1/r1/end").ok).toBe(true);
      expect(runtime.confirmation).toBeDefined();
      expect(onAction).not.toHaveBeenCalled();
      expect(runtime.press("confirm/confirm").ok).toBe(true);
      expect(onAction).toHaveBeenCalledWith({ address: address("r1/end"), action: "press" });
      expect(onLink).not.toHaveBeenCalled();
    } finally {
      runtime.dispose();
    }
  });
});
