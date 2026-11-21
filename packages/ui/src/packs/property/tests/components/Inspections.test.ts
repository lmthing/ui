import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { z } from "zod";
// prettier-ignore
import { affordancesOf, components, createRegistry, packReady, readComponent, stampItemIds, type CastLike, type Props } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements } from "../../../../../test/render";
import { renderInspection, renderInspectionScreen } from "./Inspections.render";

const def = components.Inspections;
const { props, meta, examples, fallback, probes } = def;
const [sample, report] = examples;
const draft = { ...sample!, rooms: [sample!.rooms[0]!, report!.rooms[0]!] };
const room = draft.rooms[0]!;
const check = room.checks[0]!;
type Input = z.input<typeof props>;
// prettier-ignore
const edit = (changes: Partial<Input["rooms"][number]["checks"][number]>): Input =>
  ({ ...draft!, rooms: [{ ...room, checks: [{ ...check, ...changes }] }, draft!.rooms[1]!] });
const read = (input: unknown) => readComponent(def, input, "i1").join("\n");
const accept = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };
const acceptFinalise = { address: "i1/finalise", action: "press" };
const now = "2026-11-20T11:00:00.000Z";
// prettier-ignore
const open = (input: Input, requestPhoto?: (address: string) => Promise<string | undefined>) => createScreenController({
  screen: { id: "home", components: [{ ...input, id: "i1", c: "Inspections" }] },
  defs: components, now: () => Date.parse(now), ...(requestPhoto ? { requestPhoto } : {}),
});

describe("Inspections wire contract", () => {
  it.each(examples)("accepts a real example", (example) => {
    expect(props.parse(example).entries.length).toBeGreaterThan(1);
  });
  it.each([
    { unit: "a".repeat(33) },
    { unitRef: "a".repeat(33) },
    { date: "2026-02-30" },
    { kind: "annual" },
    { style: "compact" },
    { previousRef: draft!.inspectionRef },
    { finalisedAt: "2026-11-18T11:00:00" },
    { rooms: [] },
    { rooms: Array.from({ length: 9 }, (_, index) => ({ ...room, roomRef: `room_${index}` })) },
    { rooms: [room, room] },
    { rooms: [{ ...room, checks: [] }] },
    { rooms: [{ ...room, checks: [check, check] }] },
    { rooms: [{ ...room, checks: Array.from({ length: 7 }, (_, i) => ({ ...check, checkRef: `c_${i}` })) }] },
    { rooms: [{ ...room, checks: [{ ...check, title: "a".repeat(33) }] }] },
    { rooms: [{ ...room, checks: [{ ...check, condition: "perfect" }] }] },
    { rooms: [{ ...room, checks: [{ ...check, note: "a".repeat(101) }] }] },
    { rooms: [{ ...room, checks: [{ ...check, photos: Array(4).fill("local:1") }] }] },
    { rooms: [{ ...room, checks: [{ ...check, photos: ["https://example.org/photo"] }] }] },
    { rooms: [{ ...room, checks: [{ ...check, id: "r2" }] }] },
    { roomRef: room.roomRef },
    { canFinalise: true },
    { color: "red" },
  ])("rejects invalid wire input %#", (invalid) => {
    expect(props.safeParse({ ...draft, ...invalid }).success).toBe(false);
  });
  it("accepts all 48 checks at their exact limits and only stamps view IDs", () => {
    const checks = Array.from({ length: 6 }, (_, index) => ({
      checkRef: `${"a".repeat(31)}${index}`,
      title: "a".repeat(32),
      note: "a".repeat(100),
      condition: "not_applicable",
      photos: ["local:1", "local:2", "local:3"],
    }));
    const rooms = Array.from({ length: 8 }, (_, index) => ({ ...room, roomRef: `room_${index}`, checks }));
    const parsed = props.parse({ ...draft, rooms, finalisedAt: now });
    expect(parsed).toMatchObject({ style: "rooms", canFinalise: false });
    expect(parsed.entries).toHaveLength(56);
    expect(stampItemIds(meta, parsed).entries.at(-1)).toHaveProperty("id", "r56");
    expectTypeOf<Props<typeof props, typeof meta>["entries"][number]["id"]>().toEqualTypeOf<string>();
  });
  it("cannot sign off a report containing an unrecorded check", () => {
    expect(props.safeParse({ ...edit({ condition: "unrecorded" }), finalisedAt: now }).success).toBe(false);
  });
});

describe("Inspections fallback and probes", () => {
  it("uses cast titles or neutral placeholders and never invents evidence", () => {
    // prettier-ignore
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [{ type: "record", fields: ["name"] }], items: [{ id: "a", type: "record", sample: true, name: "Willow Flat" }] },
      { things: [{ type: "record", fields: ["name"] }], items: [{ id: "a", type: "record", sample: true, name: 4 }] },
    ];
    for (const cast of casts) {
      const input = fallback({ cast });
      expect(props.parse(input).canFinalise).toBe(false);
      expect(input.rooms[0]).toMatchObject({
        title: "Item two",
        checks: [{ title: "Item three", condition: "unrecorded", photos: [] }],
      });
    }
    expect(fallback({ cast: casts[0]! }).unit).toBe("Item one");
    expect(fallback({ cast: casts[1]! }).unit).toBe("Willow Flat");
  });
  it("keeps the nearest core probe, permission tier, confirmations and pack readiness gate", () => {
    expect(meta).toMatchObject({ tier: "phone", dense: true, weight: 3, partTiers: { photo: "ok" } });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.confirmParts).toEqual(["remove_photo", "finalise"]);
    // prettier-ignore
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual(["Inspections", "Checklist"]);
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(probes).toContainEqual(expect.objectContaining({ kind: "read", expect: acceptFinalise }));
    expect(createRegistry({ packs: ["property"] }).ids.includes("Inspections")).toBe(packReady("property"));
  });
});

describe("Inspections states and parts", () => {
  it.each([
    ["empty", "Nothing here yet"],
    ["loading", "Loading"],
    ["success", "Report finalised"],
    ["error", "Couldn’t update the report"],
  ] as const)("draws %s without editing controls", (state, message) => {
    const html = renderInspection(draft, state);
    const parts = addressedElements(html);
    expect(parts.has("home/c1/root")).toBe(true);
    expect([...parts.keys()]).not.toContain("home/c1/finalise");
    expect(html).toContain(message);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(draft)), "i1", {}, state)).toEqual([]);
  });
  it("draws addressed edit controls only in the active room and reports the correct photo tier", () => {
    const parts = addressedElements(renderInspection(draft, "filled"));
    expect(parts.get("home/c1/r1/root")?.attributes).toContain('role="radio"');
    expect(parts.get("home/c1/r2/condition")?.attributes).toContain('role="radiogroup"');
    expect(parts.get("home/c1/r2/note")?.attributes).toMatch(/\bmaxlength="100"/i);
    expect(parts.get("home/c1/r2/evidence_one")?.attributes).toContain('role="img"');
    expect(parts.get("home/c1/r2/photo")?.attributes).toContain('role="button"');
    expect(parts.has("home/c1/r4/title")).toBe(false);
    expect(read(draft)).toContain("[i1/r2/photo press !needs-ok]");
    expect(read(draft)).not.toContain("Skirting");
  });
  it("keeps evidence in both report variants, with no edits and optional prior report metadata", () => {
    const full = { ...draft, style: "report", previousRef: report!.inspectionRef };
    for (const detail of ["full", "brief"]) {
      const input = { ...full, detail };
      const parts = addressedElements(renderInspection(input, "filled"));
      expect(parts.has("home/c1/r4/title")).toBe(true);
      expect(parts.has("home/c1/r2/evidence_one")).toBe(true);
      expect(parts.has("home/c1/r2/note")).toBe(true);
      expect(parts.has("home/c1/r2/photo")).toBe(false);
      expect(parts.has("home/c1/previous")).toBe(detail === "full");
      expect(read(input).includes("Previous report")).toBe(detail === "full");
      expect(read(input)).not.toMatch(/\b(select|press|type)\b/);
    }
  });
});

describe("Inspections shared read and act", () => {
  it("changes rooms without renumbering checks, edits independently, and locks only on confirmation", () => {
    const controller = open(edit({ condition: "unrecorded" }));
    expect(controller.press("i1/finalise").ok).toBe(false);
    expect(controller.act({ address: "i1/r4/note", action: "type", value: "Hidden" }).ok).toBe(false);
    expect(controller.act({ address: "i1/r2/condition", action: "select", value: "Unknown" }).ok).toBe(false);
    expect(controller.act({ address: "i1/r2/condition", action: "select", value: "Good" }).ok).toBe(true);
    expect(controller.press("i1/r3/root").ok).toBe(true);
    expect(addressedElements(renderInspectionScreen(controller)).has("home/i1/r4/note")).toBe(true);
    expect(controller.read()).toContain("Skirting");
    expect(controller.read()).not.toContain("Worktop");
    expect(controller.act({ address: "i1/r4/note", action: "type", value: "x".repeat(101) }).ok).toBe(false);
    expect(controller.act({ address: "i1/r4/note", action: "type", value: "Ready" }).ok).toBe(true);
    expect(controller.read()).toContain("Ready");
    expect(controller.press("i1/finalise").ok).toBe(true);
    expect(controller.act(cancel).ok).toBe(true);
    expect(controller.snapshotScreen().components[0]?.finalisedAt).toBeUndefined();
    expect(controller.press("i1/finalise").ok).toBe(true);
    expect(controller.act(accept).ok).toBe(true);
    expect(controller.snapshotScreen().components[0]?.finalisedAt).toBe(now);
    expect(controller.read()).toMatch(/Signed off.*2026-11-20T11:00:00\.000Z/);
    expect(controller.act({ address: "i1/r4/note", action: "type", value: "Too late" }).ok).toBe(false);
    for (const part of ["r2/photo", "finalise"]) expect(controller.press(`i1/${part}`).ok).toBe(false);
    controller.dispose();
  });
  it("picks only at the addressed check, caps photos and removes only after confirmation", async () => {
    const photos = ["local:1", "local:2", "local:3"];
    const request = vi.fn(async () => photos[2]);
    const controller = open(edit({ photos: photos.slice(0, 2) }), request);
    const savedPhotos = () => {
      const { id: _id, c: _c, ...wire } = controller.snapshotScreen().components[0]!;
      return props.parse(wire).rooms[0]!.checks[0]!.photos;
    };
    expect(controller.press("i1/r2/photo").ok).toBe(true);
    await Promise.resolve();
    expect(request).toHaveBeenCalledExactlyOnceWith("home/i1/r2/photo");
    expect(savedPhotos()).toEqual(photos);
    expect(controller.press("i1/r2/photo").ok).toBe(false);
    expect(controller.press("i1/r2/remove_photo").ok).toBe(true);
    expect(controller.act(cancel).ok).toBe(true);
    expect(savedPhotos()).toEqual(photos);
    expect(controller.act([{ address: "i1/r2/remove_photo", action: "press" }, accept]).ok).toBe(true);
    expect(savedPhotos()).toEqual(photos.slice(0, 2));
    expect(controller.read()).toContain("[i1/r2/photo press !needs-ok]");
    controller.dispose();
  });
});
