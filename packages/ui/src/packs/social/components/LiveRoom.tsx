import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  liveRoomActiveSpeaker,
  liveRoomListenerUnit,
  liveRoomReading,
  liveRoomSpeakerInitials,
  liveRoomSpeakerStatus,
} from "../copy";
import { socialWordsFor } from "../lang";
import {
  listenerCount,
  liveRoomCommands,
  maxRoomSpeakers,
  projectLiveRoom,
  roomRecordKind,
  roomSpeaker,
} from "../live-room-host";

const reactionTray = c.defineLocalState({
  schema: z.strictObject({ open: z.boolean() }),
  initial: () => ({ open: false }),
  events: ["react.press"],
  reduce: ({ open }) => ({ state: { open: !open } }),
  project: ({ open }) => ({ reactionsOpen: open }),
});

// Core first: Player/audio plays one recording, not a live speaker stage with listener and host controls.
// prettier-ignore
export const meta = {
  id: "LiveRoom", status: "ready", group: "content", tier: "people",
  pick: "Join or host a live multi-speaker audio room with an audience, a hand-raise queue, and stage controls. Not a recording (Player), a private call (ActiveCall), or asynchronous posts (Feed).",
  purpose: "Join a live audio conversation, see who’s speaking, and ask to speak.",
  region: "body", weight: 3, dense: true,
  realPath: "Live audio needs a real-time audio service, and speaking needs device microphone permission.",
  writeHints: [
    'Use style "mini" only for a collapsed bar with the active speaker and Leave. Otherwise leave style null for the stage.',
    'Write detail "brief" when asked to hide the room topic and speaker role labels. Leave unrequested axes null.',
  ],
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["topic", "role"] } },
  parts: ["root", "title", "topic", "listeners", "listeners_unit", "active", "status", "connect", "speak", "hand", "react", "applaud", "heart", "leave", "end"],
  items: { key: "speakers", parts: ["root", "name", "photo", "role", "status", "mute"], addressedWhen: { style: "stage" } },
  actions: {
    parts: {
      connect: ["press"], speak: ["toggle"], hand: ["toggle"], react: ["press"],
      applaud: ["press"], heart: ["press"], leave: ["press"], end: ["press"],
    },
    items: { mute: ["press"] },
    when: {
      connect: { style: "stage", joined: false }, speak: { style: "stage", canSpeak: true },
      hand: { style: "stage", joined: true }, react: { style: "stage" },
      applaud: { style: "stage", joined: true, reactionsOpen: true },
      heart: { style: "stage", joined: true, reactionsOpen: true },
      leave: { joined: true }, end: { style: "stage", canModerate: true },
      mute: { style: "stage", canMute: true },
    },
  },
  confirmParts: ["end", "mute"],
  partTiers: { connect: "service", speak: "ok", react: "phone" },
  states: ["filled", "loading", "success", "error"],
  localState: reactionTray,
  deviceData: [roomRecordKind], live: { derive: projectLiveRoom }, hostCommands: liveRoomCommands,
  read: liveRoomReading,
} as const satisfies c.Meta;
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(48),
  topic: c.text(20).optional(),
  speakers: z.array(roomSpeaker).min(1).max(maxRoomSpeakers),
  listenersCount: listenerCount,
  handRaised: z.boolean().default(false),
  isHost: z.boolean().default(false),
  style: z.enum(["stage", "mini"]).default("stage"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  const title = (item && c.titleOf(item, 48, thing)) || c.placeholderTitle(0, lang);
  return {
    title: c.clip(title, 48),
    speakers: [{ name: c.clip(title, 20), role: "host" }],
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

const { choose, write, read } = c.probesFor("LiveRoom");
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
      "Set up a live audio room named Sunday trail chat. Anna is the speaking host, Ben is another speaker, and there are eight listeners. Hide the topic and speaker role labels. Keep the stage layout, card framing and spacing at their defaults; don’t set style, surface or density.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the reaction tray without sending a reaction.", { address: "l1/react", action: "press" }),
] satisfies c.Probe[];

type RoomProps = c.Props<typeof props, typeof meta>;
type RoomLive = RoomProps & {
  roomKey?: string;
  joined: boolean;
  canSpeak: boolean;
  canModerate: boolean;
  micOn: boolean;
  reactionsOpen: boolean;
};
type Speaker = RoomProps["speakers"][number] & { canMute?: boolean };
type Finish = { density: c.ThemeDensity; detail: RoomProps["detail"] };

// prettier-ignore
function SpeakerTile({ speaker, density, detail }: Finish & { speaker: Speaker }) {
  const loading = kit.useComponentState() === "loading";
  const { lang, words: { liveRoom: words } } = kit.useWords(socialWordsFor);
  const status = liveRoomSpeakerStatus(speaker, lang);
  const active = speaker.speaking && !speaker.muted;
  const initials = liveRoomSpeakerInitials(speaker.name);
  return <kit.KitRow item={speaker.id} label={speaker.name} inline fitContent density={density}>
    <kit.KitContent align="center" density={density}>
      <kit.KitPhoto part="photo" shape="avatar" ring={active ? "accent" : "none"} photo={speaker.photo} initials={initials} label={speaker.name} loading={loading} />
      <kit.KitLayoutText line={{ part: "name", text: speaker.name }} align="center" density={density} />
      {detail === "full" && <kit.KitLayoutText align="center" density={density} line={{ part: "role", text: words.role[speaker.role], role: "meta", tone: "muted" }} />}
      {status && <kit.KitLayoutText align="center" density={density} line={{ part: "status", text: status, role: "meta", tone: active ? "accent" : "muted" }} />}
      {speaker.canMute && <kit.KitAction part="mute" icon="mic" kind="quiet" action="press" a11y={words.muteSpeaker(speaker.name)} contentParts={{}} />}
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
function StageActions({ room, density }: { room: RoomLive; density: c.ThemeDensity }) {
  const { words: { liveRoom: words } } = kit.useWords(socialWordsFor);
  const connecting = kit.useHostOperations().some(({ name, status }) => name === "room.connect" && status === "pending");
  return <>
    {connecting && <kit.KitLayoutText density={density} line={{ part: "status", role: "meta", tone: "muted", text: words.loading }} />}
    <kit.KitActionFooter density={density}>
      {!room.joined && !connecting && <kit.KitAction part="connect" label={words.connect} icon="waves" action="press" contentParts={{}} />}
      {room.joined && <kit.KitAction part="hand" label={room.handRaised ? words.lower : words.hand} kind="secondary" action="toggle" contentParts={{}} />}
      {room.canSpeak && <kit.KitAction part="speak" label={room.micOn ? words.mute : words.speak} icon="mic" kind="quiet" action="toggle" contentParts={{}} />}
      <kit.KitAction part="react" icon="smile" a11y={room.reactionsOpen ? words.closeReact : words.react} kind="quiet" action="press" contentParts={{}} />
      {room.joined && <LeaveRoom stage />}
      {room.canModerate && <kit.KitAction part="end" label={words.end} kind="danger" action="press" contentParts={{}} />}
    </kit.KitActionFooter>
    {room.reactionsOpen && <kit.KitActionFooter density={density}>
      <kit.KitAction part="applaud" label={words.applaud} kind="secondary" action="press" contentParts={{}} />
      <kit.KitAction part="heart" label={words.heart} icon="heart" kind="secondary" action="press" contentParts={{}} />
    </kit.KitActionFooter>}
  </>;
}

// prettier-ignore
function LeaveRoom({ stage = false }: { stage?: boolean }) {
  const { words } = kit.useWords(socialWordsFor);
  return <kit.KitAction part="leave" label={stage ? undefined : words.liveRoom.leave} a11y={words.liveRoom.leave} icon="close" kind="quiet" action="press" contentParts={{}} />;
}

// prettier-ignore
export function LiveRoom(input: RoomProps) {
  const state = kit.useComponentState();
  const { lang, words: { liveRoom: words } } = kit.useWords(socialWordsFor);
  const { interactive } = kit.useKit();
  const room = kit.useLiveControls(meta, input) as RoomLive;
  const display = interactive || room.roomKey ? room : { ...room, joined: input.isHost, canModerate: input.isHost };
  const density = kit.useVariant("density", meta.variants.density, room.density);
  const surface = kit.useVariant("surface", meta.variants.surface, room.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, room.detail);
  const rows = room.speakers as Speaker[];
  const active = liveRoomActiveSpeaker(rows);
  const title = { text: room.title, part: "title" } as const;
  const heading = <kit.KitHeader {...{ title, density }} {...(room.topic ? { meta: { text: room.topic, part: "topic" } } : {})} />;
  const mini = room.style === "mini";
  const body = mini ? <kit.KitGrid fitLast density={density}>
        <kit.KitHeader {...{ title, density }} {...(active ? { meta: { text: active.name, part: "active" } } : {})} />
        <LeaveRoom />
      </kit.KitGrid> : <>
        <kit.KitContent density={density} rhythm="flush">
          {heading}
          <kit.KitFigure density={density}
            value={{ text: c.numberLine(room.listenersCount, lang), part: "listeners", compact: true }}
            unit={{ text: liveRoomListenerUnit(room.listenersCount, lang), part: "listeners_unit", role: "meta" }} />
        </kit.KitContent>
        <kit.KitGrid columns={3} density={density} list>{rows.map((speaker) =>
          <SpeakerTile key={speaker.id} {...{ speaker, density, detail }} />)}</kit.KitGrid>
        <StageActions room={display} density={density} />
      </>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitState density={density} part="status" message={state === "success" ? words.success : words.error} loading={body}>
      {body}
    </kit.KitState>
  </kit.KitCard>;
}
