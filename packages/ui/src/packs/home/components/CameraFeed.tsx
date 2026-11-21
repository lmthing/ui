import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { cameraControls, cameraEventRows, cameraFrame, cameraReading, cameraStatus, homeTimestamp } from "../copy";
import { homeWordsFor } from "../lang";

const modes = ["home", "away", "disarmed", "privacy"] as const;

// Core first: Camera/photo takes a device photo, not a connected feed with arming and event history.
// prettier-ignore
export const meta = {
  id: "CameraFeed",
  status: "ready",
  group: "content",
  purpose: "Check a connected home camera, change its arming mode and review recent events.",
  pick: "Connected home security cameras or baby monitors with arming modes and motion events. Not taking a device photo (Camera), playing local media (Player), or controlling switches and thermostats (Devices).",
  writeHints: [
    'For text-only event history, set detail to "brief" even when no clip is supplied. Use JSON null for density and surface unless explicitly requested; do not fill in defaults.',
    'Use an ISO timestamp with an offset for each event at, for example "2026-11-20T09:42:00+00:00".',
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath:
    "A connected camera service supplies preview frames and motion clips; two-way talk also needs microphone permission.",
  items: { key: "events", parts: ["root", "kind", "time", "clip", "trail"] },
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["clip"] } },
  parts: ["root", "room", "status", "preview", "mode", "audio", "audio_label",
    "talk", "talk_label", "siren", "siren_label", "feedback", "events", "empty"],
  confirmParts: ["siren"],
  partTiers: { talk: "ok" },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { mode: ["select"], audio: ["toggle"], talk: ["press"], siren: ["press"] },
    items: { root: ["press"] },
    when: { mode: { style: "live" }, audio: { liveControls: true },
      talk: { liveControls: true }, siren: { liveControls: true } },
  },
  selections: { mode: { prop: "mode", choices: modes.map((value) => ({ value, label: homeWordsFor().cameraFeed.modes[value] })) } },
  emptyActions: ["mode.select", "audio.toggle", "talk.press", "siren.press"],
  successActions: ["mode.select", "audio.toggle", "talk.press", "siren.press", "root.press"],
  readSuccess: true,
  read: cameraReading,
} as const satisfies c.Meta;

const eventId = c.text(24).meta({ kind: "id", max: 24 });
const frameRef = c.photo.meta({ kind: "media", max: 64 });
// prettier-ignore
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    cameraId: eventId,
    room: c.text(20),
    mode: z.enum(modes),
    preview: frameRef.optional(),
    audioOn: z.boolean().default(false),
    live: z.boolean().default(false),
    events: z.array(z.strictObject({
      id: eventId, kind: z.enum(["motion", "person", "doorbell", "sound"]),
      at: homeTimestamp, clip: frameRef.optional(),
    })).min(0).max(6),
    style: z.enum(["live", "events"]).default("live"),
  })
  .refine(({ events }) => new Set(events.map(({ id }) => id)).size === events.length, "Event ids must be unique")
  .overwrite((input) => ({ ...input, liveControls: cameraControls(input) }));

// prettier-ignore
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  return { cameraId: "camera_1", mode: "disarmed", events: [],
    room: (item && c.titleOf(item, 20, c.thingOf(cast))) || c.placeholderTitle(0, lang) };
}

// prettier-ignore
export const examples = [
  {
    cameraId: "greenhouse", room: "Greenhouse", mode: "home", preview: "lib:plants", live: true,
    events: [
      { id: "evt_2", kind: "person", at: "2026-11-20T09:42:00+00:00", clip: "lib:plants" },
      { id: "evt_1", kind: "motion", at: "2026-11-20T07:15:00+00:00" },
    ],
  },
  {
    cameraId: "porch", room: "Front porch", mode: "away", style: "events", audioOn: true,
    events: [
      { id: "evt_2", kind: "doorbell", at: "2026-11-20T11:24:00+00:00", clip: "lib:dogs" },
      { id: "evt_1", kind: "sound", at: "2026-11-19T18:06:00+00:00" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CameraFeed");
// prettier-ignore
export const probes = [
  choose("Show my connected home security camera, switch between home and away arming, and review motion and doorbell events."),
  choose("Let me point my phone at a plant and take a new photo", "Camera"),
  write("Show my connected greenhouse camera, id greenhouse, room Greenhouse, home arming mode and a live preview of the plants. Include no recent events."),
  read("Sound the greenhouse camera siren, with confirmation first.", { address: "c1/siren", action: "press" }),
  {
    ...write("Show the recent doorbell history for my Front porch home camera, id porch, armed away. A doorbell rang at 2026-11-20T11:24:00+00:00. Keep the history text-only, hiding all clip thumbnails."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Switch the greenhouse camera's arming mode to Away.", { address: "c1/mode", action: "select" }),
  read("Open the doorbell event from the front porch.", { address: "c1/r1", action: "press" }, 1),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Display = { input: View; density: "comfortable" | "compact" };

// prettier-ignore
function LiveControls({ input, density }: Display) {
  const { words: { cameraFeed: w } } = kit.useWords(homeWordsFor);
  const loading = kit.useComponentState() === "loading";
  const { screen, component } = kit.usePartContext();
  const audio = kit.useControlValue(`${screen}/${component}/audio`, input.audioOn);
  return <kit.KitContent group="response" {...{ density }}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", w.mode]]} />
      : <kit.KitText role="label" part={null} tone="muted">{w.mode}</kit.KitText>}
    <kit.KitTrack part="mode" {...(!loading ? { role: "radiogroup" as const, label: w.mode } : {})} look="segments">
      {modes.map((value) => <kit.KitChip key={value} item={null} role="radio" look="segment"
        label={w.modes[value]} value={value} on={input.mode === value} {...(loading ? { disabled: true } : {})} />)}
    </kit.KitTrack>
    {cameraControls(input) && <kit.KitGrid columns={3}>
      <kit.KitAction part="audio" action="toggle" full kind="quiet" label={audio ? w.audioOn : w.audioOff} />
      <kit.KitAction part="talk" label={w.talk} full kind="secondary" />
      <kit.KitAction part="siren" label={w.siren} full kind="danger" />
    </kit.KitGrid>}
  </kit.KitContent>;
}

// prettier-ignore
function EventList({ input, density }: Display) {
  const { lang, words: { cameraFeed: w } } = kit.useWords(homeWordsFor);
  const state = kit.useComponentState();
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const rows = cameraEventRows(state === "empty" ? [] : input.events, lang);
  if (state === "loading") return <kit.KitContent group="response" {...{ density }}>
    <kit.KitSkeleton shape="figure" inset="none" content={[["heading", w.events]]} {...{ density }} />
    <kit.KitSkeleton rows={Math.max(rows.length, 1)} inset="none" lead="box" {...{ density }} />
  </kit.KitContent>;
  return <kit.KitContent group="response" {...{ density }}>
    <kit.KitText part="events" role="heading" {...{ density }}>{w.events}</kit.KitText>
    {!rows.length ? <kit.KitEmpty icon="bell" part="empty" decorativeIcon {...(state === "empty" ? {} : { title: w.empty })} />
      : <kit.KitGrid list arrange="rows" listRowGap="group" {...{ density }}>
      {rows.map(({ id, label, date, clock, clip }) => <kit.KitRow key={id} item={id}
        label={label} inset="none" role={state === "error" ? "group" : "button"} {...{ density }}
        leadingAlign={detail === "full" && clip ? "row" : "line"} leadingWidth="avatar"
        leading={detail === "full" && clip ? <kit.KitPhoto photo={clip} part="clip" label={label} />
          : <kit.KitIcon name="bell" tone="muted" decorative />}
        trailing={state !== "error" && <kit.KitTrail kind="chevron" />}>
        <kit.KitContent {...{ density }}>
          <kit.KitText part="kind" role="body" {...{ density }}>{label}</kit.KitText>
          <kit.KitText role="label" tone="muted" part={null}>
            <kit.KitText role="number" numberScale="compact" tabular part="time">{clock}</kit.KitText>{w.eventDate(date)}
          </kit.KitText>
        </kit.KitContent>
      </kit.KitRow>)}
    </kit.KitGrid>}
  </kit.KitContent>;
}

// prettier-ignore
export function CameraFeed(input: View) {
  const { lang, words: { cameraFeed: w } } = kit.useWords(homeWordsFor);
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const liveLayout = input.style === "live";
  const photo = cameraFrame(input);
  const loading = state === "loading";
  return <kit.KitCard part="root" {...{ density, surface }}>
    <kit.KitRow part={null} label={input.room} {...{ density }}><kit.KitContent {...{ density }}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
      content={[["title", input.room], ["label", w.preview]]} /> : <>
      <kit.KitGrid fitLast>
        <kit.KitText part="room" role="title" {...{ density }}>{input.room}</kit.KitText>
        <kit.KitTrail part="status" kind="badge" value={w.modes[input.mode]} />
      </kit.KitGrid>
      {state === "error" || state === "success" ? <kit.KitText part="feedback" role="body"
        tone={state === "error" ? "bad" : "good"}>{w[state]}</kit.KitText> : null}
      {state !== "error" && <kit.KitText part={null} role="label" tone="muted">{cameraStatus(input, lang)}</kit.KitText>}
    </>}
    {liveLayout && state !== "error" && <>
      {input.mode !== "privacy" && (loading ? <kit.KitSkeleton shape="media" inset="none" aspect="wide" lines={[]} />
        : <kit.KitPhoto part="preview" label={w.preview} aspect="wide" {...(photo ? { photo } : { initials: w.noFrame })} />)}
      <LiveControls {...{ input, density }} />
    </>}
    <EventList {...{ input, density }} />
    </kit.KitContent></kit.KitRow>
  </kit.KitCard>;
}
