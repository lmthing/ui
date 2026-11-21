import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { requestReading, requestStatusChoices } from "../copy";
import { inventoryWordsFor } from "../lang";

const statuses = ["new", "booked", "fixed"] as const;
const updateLimit = 36;

// Core first: Timeline/history cannot summarize a rental fault and change its current repair status.
export const meta = {
  id: "Request",
  status: "ready",
  group: "input",
  purpose: "Review one rental repair and share its status and brief updates.",
  pick: "One rental-repair summary with location, priority, status, assignee and short updates. Not a history-only view (Timeline), any queue, triage, conversation, work order or request workflow (requests pack), staff leave (Approval), or a general board (Board).",
  writeHints: [
    "Use new, booked or fixed. Include up to four short updates, each with a time label. Never write a second request, thread, workflow or separate work order.",
    'Visibility is separate from whether the record has a photo. "Without the photo", "hide the photo" or "text only" must output "media":"none", even if you also output "photo":"local:1". Ordinary requests use "media":null. Set density and surface only when requested.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A shared repair record connects the tenant and landlord; the landlord changes status.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], media: ["thumb", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  parts: ["root", "title", "where", "photo", "priority", "status", "who", "updates", "update"],
  items: { key: "updates", parts: ["root", "time", "text"] },
  states: ["filled", "success"],
  actions: {
    parts: { status: ["select"], update: ["type"] },
    when: { status: { may_change_status: true } },
  },
  selections: { status: { prop: "status", choices: requestStatusChoices(statuses) } },
  live: { text: { update: { prop: "update", max: updateLimit } } },
  readSuccess: true,
  read: (input, state, lang): string[] => requestReading(input as z.output<typeof props>, state, lang),
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(32),
    where: c.text(24),
    photo: c.photo.optional(),
    priority: z.enum(["low", "normal", "urgent"]),
    status: z.enum(statuses),
    who: c.text(20).optional(),
    updates: z
      .array(z.strictObject({ time: c.text(12), text: c.text(updateLimit) }))
      .min(0)
      .max(4),
  })
  .overwrite((input) => ({
    ...input,
    photo: input.media === "none" ? undefined : input.photo,
    may_change_status: true,
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const row = c.itemsOf(cast, 1)[0];
  return {
    title: (row && c.titleOf(row, 32, thing)) ?? c.placeholderTitle(0, lang),
    where: (row && c.detailOf(row, 24, thing)) ?? c.clip(c.wordsFor(lang).placeholderLabel, 24),
    priority: "normal",
    status: "new",
    updates: [],
  };
}

/** Bind the host's landlord check for each request. Unbound catalog fixtures preview the landlord view. */
export function bindRequest(isLandlord: (instance: string) => boolean): c.Definition {
  const live = {
    ...meta.live,
    derive: (_: Readonly<c.Values>, id: string) => ({
      may_change_status: isLandlord(id),
    }),
  };
  return { meta: { ...meta, live }, props, fallback, examples, probes };
}

export const examples = [
  {
    title: "Patio tap is leaking",
    where: "Patio flat",
    photo: "local:1",
    priority: "urgent",
    status: "new",
    who: "Ana",
    updates: [{ time: "09:15", text: "Tenant turned off the tap." }],
  },
  {
    title: "Loose yard gate latch",
    where: "Trail house",
    priority: "normal",
    status: "booked",
    updates: [
      { time: "Monday", text: "Gate tied shut for the walks." },
      { time: "Tuesday", text: "Latch replacement booked." },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Request");
export const probes = [
  choose(
    "Summarize one rental's leaking tap with a photo, urgency, who is on it and a new/booked/fixed control. No queue or thread.",
  ),
  choose(
    "Show a read-only chronology of past repair events, each with one date and title. No current fault card or status editor.",
    "Timeline",
  ),
  write(
    "One shared repair summary: Patio tap is leaking at Patio flat, photo local:1, urgent and new; Ana is on it. 09:15: Tenant turned off the tap.",
  ),
  {
    ...write(
      "At Trail house, the loose yard gate latch is booked for repair and low priority. Keep photo local:1 on the record but show this repair summary without the photo.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("As landlord, change the patio tap repair status to booked", {
    address: "r1/status",
    action: "select",
  }),
] satisfies c.Probe[];

type RequestProps = c.Props<typeof props, typeof meta>;
type RequestWords = ReturnType<typeof inventoryWordsFor>["request"];
type Density = c.ThemeDensity;
type RequestStatus = RequestProps["status"];

// prettier-ignore
function Status({ status, editable, density, words }: { status: RequestStatus; editable: boolean; density: Density; words: RequestWords }) {
  return <kit.KitContent group="response" density={density}>
    <kit.KitText part={null} role="label" tone="muted" density={density}>{words.statusLabel}</kit.KitText>
    {editable
      ? <kit.KitTrack part="status" look="segments" role="radiogroup" label={words.statusLabel}>
        {statuses.map((choice) => <kit.KitChip key={choice} item={null} look="segment" role="radio" value={choice} label={words.status[choice]} on={status === choice} />)}
      </kit.KitTrack>
      : <kit.KitText part="status" tone={status === "fixed" ? "good" : "text"} density={density}>{words.status[status]}</kit.KitText>}
  </kit.KitContent>;
}

// prettier-ignore
function Updates({ rows, density, label }: { rows: RequestProps["updates"]; density: Density; label: string }) {
  if (!rows.length) return null;
  return <kit.KitContent group="response" density={density}>
    <kit.KitText part="updates" role="label" tone="muted" density={density}>{label}</kit.KitText>
    {rows.map((row) => <kit.KitRow key={row.id} item={row.id} part="root" label={row.text} inline density={density}>
      <kit.KitText part="time" role="label" tone="muted" density={density}>{row.time}</kit.KitText>
      <kit.KitText part="text" density={density}>{row.text}</kit.KitText>
    </kit.KitRow>)}
  </kit.KitContent>;
}

// prettier-ignore
export function Request(input: RequestProps) {
  const { words: { request: words } } = kit.useWords(inventoryWordsFor);
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const live = kit.useLiveControls(meta, input);
  const success = state === "success";
  const status = success ? "fixed" : live.status as RequestStatus;
  const photo = media === "thumb" && input.photo
    ? <kit.KitPhoto part="photo" shape="thumb" photo={input.photo} label={words.photo} /> : undefined;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitContent lead={photo} leadingAlign="row" density={density}>
      <kit.KitText part="title" role={density === "compact" ? "title" : "heading"} density={density}>{input.title}</kit.KitText>
      <kit.KitText part="where" role="label" tone="muted" density={density}>{input.where}</kit.KitText>
      <kit.KitText part="priority" role="label" tone={status !== "fixed" && input.priority === "urgent" ? "bad" : "muted"} density={density}>{words.priority[input.priority]}</kit.KitText>
      {input.who && <kit.KitText part="who" role="label" tone="muted" density={density}>{words.assignee(input.who)}</kit.KitText>}
    </kit.KitContent>
    <Status {...{ status, words, density }} editable={!success && live.may_change_status === true} />
    <Updates rows={input.updates} label={words.updates} density={density} />
    {!success && <kit.KitContent group={input.updates.length ? "response" : "content"} density={density}>
      <kit.KitInput part="update" label={words.update} hint={words.update} compact={density === "compact"} />
    </kit.KitContent>}
  </kit.KitCard>;
}
