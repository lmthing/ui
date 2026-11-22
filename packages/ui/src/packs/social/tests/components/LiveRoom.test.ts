import { expect, it, vi } from "vitest";
import { components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController, type HostCommandResult } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.LiveRoom;
const { examples, fallback, meta, probes, props } = def;
const stage = examples[0]!;
const mini = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, title: "x".repeat(49) },
  { ...valid, topic: "x".repeat(21) },
  { ...valid, speakers: [] },
  { ...valid, speakers: Array.from({ length: 13 }, () => ({ name: "x", role: "host" })) },
  { ...valid, listenersCount: -1 },
  { ...valid, listenersCount: 1.5 },
  { ...valid, isHost: "true" },
  { ...valid, speakers: [{ name: "x".repeat(21), role: "speaker" }] },
  { ...valid, speakers: [{ name: "Sam", role: "listener" }] },
  { ...valid, style: "not-a-choice!" },
];

it.each(examples)("accepts a domain example", (example) => {
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

it("keeps the ready pack gate and Player near miss", () => {
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "write", "read"]);
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Player" }));
  expect(meta).toMatchObject({ tier: "people", weight: 3, dense: true });
  expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("LiveRoom")).toBe(props);
  expect(createRegistry({ packs: ["social"] }).ids.includes("LiveRoom")).toBe(packReady("social"));
});

const drawn = (input: unknown, state: "filled" | "loading" | "error" | "success" = "filled") =>
  addressedElements(renderInstance("LiveRoom", input, state, theme, { component: "l1" }));
const key = (part: string) => `home/l1/${part}`;

it("draws distinct speaker states and keeps finish addresses stable", () => {
  const full = drawn(stage);
  expect(full.get(key("listeners"))?.text).toEqual(["24"]);
  expect(full.get(key("listeners_unit"))?.text).toEqual(["listeners"]);
  expect(full.get(key("r1/status"))?.text).toEqual(["Speaking"]);
  expect(full.get(key("r3/status"))?.text).toEqual(["Muted"]);
  expect([...drawn({ ...stage, density: "compact", surface: "plain" }).keys()]).toEqual([...full.keys()]);
  expect([...drawn({ ...stage, detail: "brief" }).keys()]).toEqual(
    [...full.keys()].filter((part) => !/\/(?:topic|role)$/.test(part)),
  );
  expect(readComponent(def, { ...stage, detail: "brief" }, "l1").join("\n")).not.toContain("Plant swap");
});

it("collapses to the active speaker and Leave, with independent loading and terminal states", () => {
  const compact = drawn(mini);
  expect(compact.get(key("active"))?.text).toEqual(["Anna Bell"]);
  expect(compact.has(key("leave"))).toBe(true);
  expect(compact.has(key("r1/photo"))).toBe(false);
  expect(compact.has(key("hand"))).toBe(false);
  expect(renderInstance("LiveRoom", stage, "loading", theme)).toContain('aria-busy="true"');
  expect(drawn(stage, "loading").has(key("connect"))).toBe(false);
  expect(drawn(stage, "success").get(key("status"))?.text).toEqual(["The room has ended."]);
  expect(drawn(stage, "error").get(key("status"))?.text).toEqual(["Audio connection lost."]);
});

function roomFixture() {
  const record = {
    component: "l1",
    roomKey: "room_one",
    joined: true,
    promoted: false,
    micOn: false,
    isHost: false,
    handRaised: false,
    listenersCount: 25,
    speakers: stage.speakers.map((row, i) => ({ ...row, speakerKey: `speaker_${i}` })),
  };
  let current = record;
  const run = vi.fn((): HostCommandResult => ({ status: "accepted" }));
  const commands = Object.fromEntries(
    ["connect", "microphone", "hand", "react", "leave", "end", "mute"].map((name) => [
      `room.${name}`,
      { allows: () => true, run },
    ]),
  );
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...stage, id: "l1", c: "LiveRoom" }] },
    defs: components,
    get deviceData() {
      return { social_live_rooms: [current] };
    },
    hostCommands: { commands },
  });
  for (const part of [
    "connect",
    "speak",
    "hand",
    "react",
    "applaud",
    "heart",
    "leave",
    "end",
    "r_s_speaker_1/mute",
  ])
    controller.registerPart(`l1/${part}`);
  for (const part of ["confirm", "cancel"]) controller.registerPart(`confirm/${part}`);
  return {
    controller,
    run,
    change: (patch: Partial<typeof record>) => {
      current = { ...current, ...patch };
    },
  };
}

it("takes microphone permission, moderated actions and listener counts from the trusted room", async () => {
  const { controller, run, change } = roomFixture();
  try {
    expect(controller.read()).toContain("25 listeners");
    expect(controller.actionsAt("l1/speak")).toEqual([]);
    expect(controller.actionsAt("l1/end")).toEqual([]);
    expect(controller.actionsAt("l1/connect")).toEqual([]);
    expect(controller.actionsAt("l1/hand")).toContain("toggle");
    change({ joined: false });
    expect(controller.actionsAt("l1/connect")).toContain("press");
    expect(controller.actionsAt("l1/leave")).toEqual([]);
    expect(controller.press("l1/connect").ok).toBe(true);
    expect(run.mock.calls).toHaveLength(1);
    expect(controller.read()).toContain("operation room.connect pending");
    await Promise.resolve();
    change({ joined: true, promoted: true });
    expect(controller.read()).toContain("[l1/speak toggle !needs-ok]");
    expect(controller.act({ address: "l1/speak", action: "toggle" }).ok).toBe(true);
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "room.microphone",
        tier: "ok",
        input: { room: "room_one", enabled: true },
      }),
      expect.anything(),
    );
  } finally {
    controller.dispose();
  }
});

it("opens reactions locally, then confirms moderation on the intended room and speaker", async () => {
  const { controller, run, change } = roomFixture();
  try {
    expect(controller.actionsAt("l1/heart")).toEqual([]);
    expect(controller.press("l1/react").ok).toBe(true);
    expect(run).not.toHaveBeenCalled();
    expect(controller.press("l1/heart").ok).toBe(true);
    await Promise.resolve();
    expect(run).toHaveBeenLastCalledWith(expect.objectContaining({ name: "room.react" }), expect.anything());
    change({ isHost: true });
    expect(controller.press("l1/r_s_speaker_1/mute").ok).toBe(true);
    expect(controller.confirmation).toBeDefined();
    expect(run).toHaveBeenCalledTimes(1);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    await Promise.resolve();
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "room.mute", input: { room: "room_one", speaker: "speaker_1" } }),
      expect.anything(),
    );
    expect(controller.press("l1/end").ok).toBe(true);
    change({ roomKey: "room_two" });
    expect(controller.press("confirm/confirm").ok).toBe(false);
    expect(run).toHaveBeenCalledTimes(2);
  } finally {
    controller.dispose();
  }
});

it("does not accept seed moderator or microphone authority when there is no host", () => {
  const screen = { id: "home", components: [{ ...stage, id: "l1", c: "LiveRoom" }] };
  const controller = createScreenController({ screen, defs: components });
  try {
    expect(controller.read()).toContain("[l1/react press]");
    expect(controller.read()).not.toMatch(/\[l1\/(?:connect|speak|hand|leave|end)\b/);
    expect(controller.press("l1/end").ok).toBe(false);
  } finally {
    controller.dispose();
  }
});
