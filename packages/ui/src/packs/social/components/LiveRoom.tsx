import { z } from "zod";
import {
  clip,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";
import { liveRoomReading } from "../copy";

// Core first: Player/audio plays one recording, not a live speaker stage with listener and host controls.
export const meta = {
  id: "LiveRoom",
  status: "draft",
  group: "content",
  tier: "people",
  pick: "Join or host a live multi-speaker audio room with an audience, a hand-raise queue, and stage controls. Not a recording (Player), a private call (ActiveCall), or asynchronous posts (Feed).",
  purpose: "Join a live audio conversation, see who’s speaking, and ask to speak.",
  region: "body",
  weight: 3,
  realPath:
    "live multi-speaker audio rooms backed by a real-time audio service (connect) and device microphone permission (ok) for active speakers; live WebRTC/video codecs stay in Canvas.",
  dense: true,
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["topic", "role"] } },
  parts: [
    "root",
    "title",
    "topic",
    "listeners",
    "active",
    "status",
    "connect",
    "speak",
    "hand",
    "react",
    "leave",
    "end",
  ],
  items: { key: "speakers", parts: ["root", "name", "photo", "role", "status"] },
  actions: {
    parts: {
      connect: ["press"],
      speak: ["toggle"],
      hand: ["toggle"],
      react: ["press"],
      leave: ["press"],
      end: ["press"],
    },
    when: { end: { isHost: true } },
  },
  confirmParts: ["end"],
  partTiers: { connect: "service", speak: "ok", react: "phone" },
  states: ["filled", "loading", "success", "error"],
  read: liveRoomReading,
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  title: text(48),
  topic: text(20).optional(),
  speakers: z
    .array(
      z.strictObject({
        name: text(20),
        photo: photo.optional(),
        role: z.enum(["host", "cohost", "speaker"]),
        speaking: z.boolean().default(false),
        muted: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(12),
  listenersCount: z.int().min(0),
  handRaised: z.boolean().default(false),
  isHost: z.boolean().default(false),
  style: z.enum(["stage", "mini"]).default("stage"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    title: castTitle(48, 0),
    speakers: Array.from({ length: 1 }, (_, index) => ({ name: castTitle(20, index), role: "host" })),
    listenersCount: 0,
  };
}

// prettier-ignore
export const examples = [
  { title: "Greenhouse after hours", topic: "Plant swap", listenersCount: 24, isHost: true, speakers: [
    { name: "Maya Chen", role: "host", speaking: true },
    { name: "Sam Rivera", role: "cohost" },
    { name: "Jo Park", role: "speaker", muted: true },
  ] },
  { title: "Sunday trail chat", style: "mini", listenersCount: 8, handRaised: true, speakers: [
    { name: "Anna Bell", role: "host", photo: "lib:people_anna", speaking: true },
    { name: "Ben Diaz", role: "speaker" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("LiveRoom");
export const probes = [
  choose(
    "Let the club host a live audio stage where several people can speak and the audience can raise their hands.",
  ),
  choose(
    "Play back one audio recording I made yesterday, with a play button and a scrubber. Nobody else is connected.",
    "Player",
  ),
  write(
    "Show the live audio stage Greenhouse after hours, on the Plant swap topic. Maya is the host and is speaking; Sam is the co-host and Jo is a muted speaker. There are 24 listeners.",
  ),
  {
    ...write(
      "Set up a live audio room named Sunday trail chat. Anna is the speaking host, Ben is another speaker, and there are eight listeners. Keep the stage grid but hide the topic and speaker role labels.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the reaction tray without sending a reaction.", { address: "l1/react", action: "press" }),
] satisfies Probe[];
