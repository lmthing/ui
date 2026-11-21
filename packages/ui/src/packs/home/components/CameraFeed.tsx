import { z } from "zod";
import * as c from "../../../catalog";

const modes = ["home", "away", "disarmed", "privacy"] as const;

// Core first: Camera/photo takes a device photo, not a connected feed with arming and event history.
export const meta = {
  id: "CameraFeed",
  status: "draft",
  group: "content",
  purpose: "Check a connected home camera, change its arming mode and review recent events.",
  pick: "Connected home security cameras or baby monitors with arming modes and motion events. Not taking a device photo (Camera), playing local media (Player), or controlling switches and thermostats (Devices).",
  region: "body",
  weight: 2,
  tier: "service",
  realPath:
    "A connected camera service supplies preview frames and motion clips; two-way talk also needs microphone permission.",
  items: { key: "events", parts: ["root", "kind", "time", "clip"] },
  parts: ["root", "room", "status", "preview", "mode", "audio", "talk", "siren"],
  confirmParts: ["siren"],
  partTiers: { talk: "ok" },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { mode: ["select"], audio: ["toggle"], talk: ["press"], siren: ["press"] },
    items: { root: ["press"] },
    when: { audio: { live: true }, talk: { live: true }, siren: { live: true } },
  },
  selections: { mode: { prop: "mode", choices: modes } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  cameraId: c.text(24),
  room: c.text(20),
  mode: z.enum(modes),
  preview: c.photo.optional(),
  live: z.boolean().default(false),
  audioOn: z.boolean().default(false),
  events: z
    .array(
      z.strictObject({
        id: c.text(24),
        kind: z.enum(["motion", "person", "doorbell", "sound"]),
        at: z.iso.datetime({ offset: true }),
        clip: c.photo.optional(),
      }),
    )
    .min(0)
    .max(6),
  style: z.enum(["live", "events"]).default("live"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  return {
    cameraId: "camera_1",
    room: (item && c.titleOf(item, 20, thing)) || c.placeholderTitle(0, lang),
    mode: "disarmed",
    events: [],
  };
}

export const examples = [
  {
    cameraId: "greenhouse",
    room: "Greenhouse",
    mode: "home",
    preview: "lib:plants",
    live: true,
    events: [
      { id: "evt_2", kind: "person", at: "2026-11-20T09:42:00+00:00", clip: "lib:plants" },
      { id: "evt_1", kind: "motion", at: "2026-11-20T07:15:00+00:00" },
    ],
  },
  {
    cameraId: "porch",
    room: "Front porch",
    mode: "away",
    style: "events",
    audioOn: true,
    events: [
      { id: "evt_2", kind: "doorbell", at: "2026-11-20T11:24:00+00:00", clip: "lib:dogs" },
      { id: "evt_1", kind: "sound", at: "2026-11-19T18:06:00+00:00" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CameraFeed");
export const probes = [
  choose(
    "Show my connected home security camera, switch between home and away arming, and review motion and doorbell events.",
  ),
  choose("Let me point my phone at a plant and take a new photo", "Camera"),
  write(
    "Show my connected greenhouse camera, id greenhouse, room Greenhouse, home arming mode and a live preview of the plants. Include no recent events.",
  ),
  read("Sound the greenhouse camera siren, with confirmation first.", {
    address: "c1/siren",
    action: "press",
  }),
] satisfies c.Probe[];
