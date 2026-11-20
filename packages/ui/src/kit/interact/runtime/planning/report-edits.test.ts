import { expect, it, vi } from "vitest";
import type { z } from "zod";
import { parseControlProps, planAct, readScreen, type Definition } from "@lmthing/ui/catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { Inspections as draft } from "../../../../packs/property";

const def: Definition = {
  ...draft,
  meta: {
    ...draft.meta,
    items: {
      ...draft.meta.items,
      edits: {
        condition: {
          action: "select",
          prop: "condition",
          choices: [
            { value: "unrecorded", label: "Unrecorded" },
            { value: "good", label: "Good" },
            { value: "worn", label: "Worn" },
            { value: "damaged", label: "Damaged" },
            { value: "not_applicable", label: "Not applicable" },
          ],
        },
        note: { action: "type", prop: "note", max: 100, empty: "unset" },
        photo: { action: "photo", prop: "photos", max: 3 },
        remove_photo: { action: "remove", photo: "photo" },
      },
      editPath: (item, wire) => {
        const rooms = wire.rooms as (typeof draft.examples)[number]["rooms"];
        const room = rooms.findIndex(({ roomRef }) => roomRef === item.roomRef);
        const check = rooms[room]?.checks.findIndex(({ checkRef }) => checkRef === item.checkRef);
        return check !== undefined && check >= 0 ? ["rooms", room, "checks", check] : undefined;
      },
    },
    signOff: { finalise: "finalisedAt" },
  },
};
const seed: z.input<typeof draft.props> = draft.examples[0]!;
const room = seed.rooms[0]!;
const check = room.checks[0]!;
const input = {
  ...seed,
  rooms: [
    { ...room, checks: [{ ...check, condition: "unrecorded" }] },
    {
      ...room,
      roomRef: "other",
      title: "Other room",
      checks: [{ ...check, note: "Other note", photos: [] }],
    },
  ],
};
const screen = { id: "s", components: [{ id: "i1", c: "Inspections", ...input }] };
const defs = { Inspections: def };
const at = Date.parse("2026-11-20T11:00:00Z");
const press = (target: string) => ({ address: `i1/${target}`, action: "press" });
const select = (target: string, value?: unknown) => ({ address: `s/i1/${target}`, action: "select", value });
const note = (row: string, value: unknown) => ({ address: `i1/${row}/note`, action: "type", value });
const accept = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };
const open = (options: Partial<Parameters<typeof createScreenController>[0]> = {}) =>
  createScreenController({ screen, defs, now: () => at, ...options });

it("validates item choice labels, keys and note bounds in an atomic plan", () => {
  const before = readScreen(screen, defs);
  expect(before).toContain('[i1/r2/condition select = "Unrecorded"; choices ["Unrecorded","Good"');
  expect(before).not.toContain("[i1/finalise press]");
  for (const value of ["", "Unknown", undefined]) {
    expect(planAct(screen, defs, {}, [select("r2/condition", value)])).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
  }
  expect(planAct(screen, defs, {}, [select("r1/condition", "Good")])).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
  expect(
    planAct(screen, defs, {}, [select("r2/condition", "Good"), note("r4", "x".repeat(101))]),
  ).toMatchObject({ ok: false, code: "invalid_value", at: 1, hint: "Use at most 100 characters" });
  const result = planAct(screen, defs, {}, [
    select("r2/condition", "Good"),
    select("r4/condition", "damaged"),
    note("r2", "x".repeat(100)),
    note("r4", ""),
    press("finalise"),
  ]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const get = (part: string) => result.values[`s/i1/${part}`];
  expect(parseControlProps(def, input, get)).toMatchObject({
    canFinalise: true,
    entries: [
      { id: "r1" },
      { id: "r2", condition: "good", note: "x".repeat(100) },
      { id: "r3" },
      { id: "r4", condition: "damaged", note: "" },
    ],
  });
  expect(readScreen(screen, defs, result.values)).toContain('[i1/r4/condition select = "Damaged"');
  expect(readScreen(screen, defs, result.values)).not.toContain("Other note");
  expect(readScreen(screen, defs, result.values)).not.toContain("2026-11-20");
});

it("keeps a room selection independent of edits and keeps decoder input strict", () => {
  const runtime = open({ requireMounted: true });
  for (const target of ["r2/condition", "r3", "r4/note"]) runtime.registerPart(`i1/${target}`);
  expect(runtime.act(select("r2/condition"))).toMatchObject({ ok: false, code: "invalid_value" });
  expect(runtime.act([select("r2/condition", "Good"), select("r3"), note("r4", "New note")]).ok).toBe(true);
  const { id: _id, c: _c, ...wire } = runtime.snapshotScreen().components[0]!;
  expect(def.props.parse(wire)).toMatchObject({
    canFinalise: true,
    entries: [{}, { condition: "good", note: check.note }, {}, { condition: "worn", note: "New note" }],
  });
  expect(runtime.store.get("s/i1/r2/condition")).toBe("good");
  expect(runtime.read()).toContain('"New note"');
  expect(runtime.read()).toContain("[i1/finalise press]");
});

it.each(["mounted", "standalone"])("requires confirmation for removal and sign-off (%s)", (mode) => {
  const store = createInteractionStore();
  const runtime =
    mode === "mounted" ? open({ store }) : createAgentAccess({ defs, store, current: () => screen });
  const before = runtime.read().trim();
  expect(runtime.act(press("r2/remove_photo")).ok).toBe(true);
  expect(runtime.read()).toContain("[confirm/confirm press]");
  expect(runtime.act(cancel).ok).toBe(true);
  expect(runtime.read().trim()).toBe(before);
  expect(runtime.act([press("r2/remove_photo"), accept]).ok).toBe(true);
  expect(runtime.read()).not.toContain("local:1");
  expect(runtime.read()).not.toContain("[i1/r2/remove_photo press]");
  expect(runtime.act(press("finalise"))).toMatchObject({ ok: false, code: "not_actionable" });
  expect(runtime.act([select("r2/condition", "Good"), press("finalise"), accept], { dryRun: true }).ok).toBe(
    true,
  );
  expect(runtime.read()).not.toContain("[i1/finalise press]");
  expect(runtime.act([select("r2/condition", "Good"), press("finalise"), cancel]).ok).toBe(true);
  expect(runtime.read()).toContain("[i1/finalise press]");
  expect(runtime.act([press("finalise"), accept, note("r4", "Too late")])).toMatchObject({
    ok: false,
    code: "not_actionable",
    at: 2,
  });
  expect(runtime.read()).toContain("[i1/finalise press]");
  expect(runtime.act([press("finalise"), accept]).ok).toBe(true);
  expect(runtime.read()).not.toContain("[i1/finalise press]");
  expect(runtime.read()).not.toContain("[i1/r4/note type");
  expect(runtime.act(note("r4", "Too late"))).toMatchObject({ ok: false, code: "not_actionable" });
  if ("snapshotScreen" in runtime) {
    const saved = runtime.snapshotScreen();
    expect(saved.components[0]?.finalisedAt).toBe("2026-11-20T11:00:00.000Z");
    expect(readScreen(saved, defs)).toContain("2026-11-20T11:00:00.000Z");
  }
});

it("settles picker results at the requested row, and discards late results after sign-off", async () => {
  const replies = new Map<string, (value: string | undefined) => void>();
  const requestPhoto = vi.fn(
    (address: string) => new Promise<string | undefined>((resolve) => replies.set(address, resolve)),
  );
  const onChange = vi.fn();
  const runtime = open({ requestPhoto, onChange });
  const r2 = "s/i1/r2/photo";
  const r4 = "s/i1/r4/photo";
  expect(runtime.act(press("r2/photo"), { dryRun: true }).ok).toBe(true);
  expect(requestPhoto).not.toHaveBeenCalled();
  expect(runtime.act([press("r2/photo"), press("r4/photo")]).ok).toBe(true);
  expect(requestPhoto.mock.calls).toEqual([[r2], [r4]]);
  expect(runtime.act(press("r2/remove_photo")).ok).toBe(true);
  replies.get(r4)!("lib:second");
  replies.get(r2)!("lib:first");
  await Promise.resolve();
  expect(runtime.store.get(r2)).toBe("lib:first");
  expect(runtime.store.get(r4)).toBe("lib:second");
  const { id: _id, c: _c, ...wire } = runtime.snapshotScreen().components[0]!;
  expect(def.props.parse(wire)).toMatchObject({
    entries: [{}, { photos: ["local:1", "lib:first"] }, {}, { photos: ["lib:second"] }],
  });
  expect(runtime.read()).toContain("[confirm/confirm press]");
  expect(onChange.mock.lastCall?.[0]).toEqual(runtime.snapshotScreen());
  expect(runtime.act(accept).ok).toBe(true);
  expect(runtime.read()).not.toContain("local:1");
  expect(runtime.read()).toContain("lib:first");
  expect(runtime.act([press("r2/photo"), select("r2/condition", "Good"), press("finalise"), accept]).ok).toBe(
    true,
  );
  replies.get(r2)!("lib:late");
  await Promise.resolve();
  expect(runtime.store.get(r2)).toBe("lib:first");
  expect(runtime.read()).not.toContain("lib:late");
});
