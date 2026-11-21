import { expect, it, vi } from "vitest";
import type { z } from "zod";
import { components, planAct, readScreen } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const { props, examples } = components.Inspections;
const sample = examples[0]!;
const room = sample.rooms[0]!;
const check = room.checks[0]!;
const other = { ...check, checkRef: "wall", title: "Wall", photos: [] };
const secondRoom = { roomRef: "hall", title: "Hall", checks: [other] };
const screen = (rooms: z.input<typeof props>["rooms"]) => ({
  id: "home",
  components: [{ ...sample, rooms, id: "i1", c: "Inspections" }],
});
const typeNote = (row: string, value: string) => ({ address: `i1/${row}/note`, action: "type", value });
const selectRoom = { address: "i1/r3", action: "select" };
const press = (address: string) => ({ address, action: "press" });

it("plans room selection and note edits atomically without offering hidden controls", () => {
  const input = screen([room, secondRoom]);
  const newNote = typeNote("r4", "Paint intact");
  const edits = [typeNote("r2", "New worktop note"), selectRoom];
  expect(planAct(input, components, {}, [newNote])).toMatchObject({ ok: false, code: "not_actionable" });
  const values = {};
  expect(planAct(input, components, values, [...edits, typeNote("r4", "x".repeat(101))])).toMatchObject({
    ok: false,
    code: "invalid_value",
    at: 2,
  });
  expect(values).toEqual({});
  const result = planAct(input, components, values, [...edits, newNote]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const read = readScreen(input, components, result.values);
  expect(read).toContain("Paint intact");
  expect(read).toContain("[i1/r4/note type");
  expect(read).not.toContain("[i1/r2/note type");
  const back = planAct(input, components, result.values, [{ ...selectRoom, address: "i1/r1" }]);
  expect(back.ok).toBe(true);
  if (back.ok) expect(readScreen(input, components, back.values)).toContain("New worktop note");
});

it("settles two active checks independently and rejects a late photo after sign-off", async () => {
  const replies = new Map<string, (reference: string) => void>();
  const requestPhoto = vi.fn(
    (address: string) => new Promise<string>((resolve) => replies.set(address, resolve)),
  );
  const controller = createScreenController({
    screen: screen([{ ...room, checks: [check, other] }, secondRoom]),
    defs: components,
    requestPhoto,
  });
  const photos = () => {
    const { id: _id, c: _c, ...wire } = controller.snapshotScreen().components[0]!;
    return props.parse(wire).rooms[0]!.checks.map(({ photos }) => photos);
  };
  try {
    const first = "home/i1/r2/photo";
    const second = "home/i1/r3/photo";
    expect(controller.act([press(first), press(second)]).ok).toBe(true);
    expect(requestPhoto.mock.calls).toEqual([[first], [second]]);
    replies.get(second)!("lib:second");
    replies.get(first)!("lib:first");
    await Promise.resolve();
    const saved = [["local:1", "lib:first"], ["lib:second"]];
    expect(photos()).toEqual(saved);
    expect(controller.act([press(first), press("i1/finalise"), press("confirm/confirm")]).ok).toBe(true);
    expect(controller.snapshotScreen().components[0]?.finalisedAt).toEqual(expect.any(String));
    replies.get(first)!("lib:late");
    await Promise.resolve();
    expect(photos()).toEqual(saved);
  } finally {
    controller.dispose();
  }
});
