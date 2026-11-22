import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { eventCopy, eventReading } from "../copy";
import { socialWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-EventCard.generated";

// Core first: Card/feature cannot show an event's date block, attendees and two RSVP actions.
export const meta = {
  id: "EventCard",
  status: "ready",
  group: "content",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "An event in a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], media: ["cover", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  // prettier-ignore
  parts: ["root", "frame", "title", "date", "month", "time", "place", "photo", "attendees", "count",
    "rsvp", "going", "going_label", "going_icon", "interested", "interested_label", "interested_icon"],
  items: { key: "members", parts: ["root", "photo"] },
  states: ["filled", "loading"],
  actions: {
    parts: { root: ["press"], going: ["press"], interested: ["press"] },
    noGoto: { parts: ["going", "interested"] },
  },
  read: eventReading,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(40),
    date: c.isoDate,
    time: c.clock,
    place: c.text(40),
    photo: c.photo.optional(),
    going: z.int().min(0).max(999999),
    status: z.enum(["none", "going", "interested"]).default("none"),
    goto: c.screenId,
    attendees: z.array(c.text(24)).min(0).max(5).optional(),
  })
  .refine(({ going, attendees }) => !attendees || attendees.length <= going, { path: ["attendees"] })
  .overwrite((value) => ({
    ...value,
    photo: value.media === "none" ? undefined : value.photo,
    members: (value.attendees ?? []).map((label) => ({ label })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  const values = item ? c.textsOf(item, thing) : [];
  return {
    title: (item && c.titleOf(item, 40, thing)) || c.placeholderTitle(0, lang),
    date: values.find((value) => c.isoDate.safeParse(value).success) ?? "1970-01-01",
    time: values.find((value) => c.clock.safeParse(value).success) ?? "00:00",
    place: (item && c.detailOf(item, 40, thing)) || c.wordsFor(lang).placeholderDetail,
    going: 0,
    status: "none",
    goto: c.screenId.safeParse(item?.id).data ?? "event",
  };
}

export const examples = [
  {
    title: "Cutting swap",
    date: "2026-11-28",
    time: "14:00",
    place: "Community greenhouse",
    photo: "lib:plants",
    going: 14,
    status: "none",
    goto: "swap_meet",
    attendees: ["Maya", "Sam", "Jo"],
  },
  {
    media: "none",
    title: "Riverside dog walk",
    date: "2026-11-29",
    time: "09:00",
    place: "South gate",
    photo: "lib:dog",
    going: 6,
    status: "interested",
    goto: "river_walk",
    attendees: ["Anna", "Ben"],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("EventCard");
export const probes = [
  choose(
    "Show one upcoming neighbourhood gathering for members to join, with a date block, who's attending and buttons for Going and Interested.",
  ),
  choose(
    "In my plant journal, show a single tappable preview for one fern with a wide cover photo, the plant's title and a short watering note. Tap to open the fern's care details.",
    "Card",
  ),
  write(
    "Show the community cutting swap at the greenhouse on 2026-11-28 at 14:00, with fourteen going including Maya and Sam. Link to swap_meet.",
  ),
  {
    ...write(
      "Show Cutting swap on 2026-11-28 at 14:00 at the greenhouse, with 14 going and a link to swap_meet. Store lib:plants as its photo but hide the photo on this card. Keep the date and RSVP buttons. Leave the spacing and card finish unchanged.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("Say I’m going to the cutting swap.", { address: "e1/going", action: "press" }),
] satisfies c.Probe[];

type EventProps = c.Props<typeof props, typeof meta> & { members: { id: string; label: string }[] };
type EventFinish = { density: c.ThemeDensity; loading: boolean };
type EventCopy = ReturnType<typeof eventCopy>;

// prettier-ignore
function EventDetails({ input, density, loading, day, month, time }: EventFinish & Omit<EventCopy, "attendance"> & { input: EventProps }) {
  const date = loading ?
    <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["number", day, "start", "compact"], ["label", month]]} /> :
    <kit.KitContent density={density}>
      <kit.KitText part="date" role="number" numberScale="compact" tone="muted" density={density} tabular>{day}</kit.KitText>
      <kit.KitText part="month" role="label" tone="muted" density={density}>{month}</kit.KitText>
    </kit.KitContent>;
  return <kit.KitRow part="root" goto={loading ? undefined : input.goto} label={input.title}
    inset="none" density={density}>
    <kit.KitContent lead={date} leadingAlign="row" density={density}>
      <kit.KitGrid fitLast density={density}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["heading", input.title]]} /> :
          <kit.KitText part="title" role="heading" density={density}>{input.title}</kit.KitText>}
        {loading ? <kit.KitSkeleton shape="figure" lead="dot" inset="none" content={[]} density={density} /> :
          <kit.KitIcon name="chevron_right" tone="muted" decorative />}
      </kit.KitGrid>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["label", time], ["label", input.place]]} /> : <>
        <kit.KitText part="time" role="label" tone="muted" density={density}>{time}</kit.KitText>
        <kit.KitText part="place" role="label" tone="muted" density={density}>{input.place}</kit.KitText>
      </>}
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
function EventAttendees({ members, attendance, density, loading }: EventFinish & Pick<EventProps, "members"> & Pick<EventCopy, "attendance">) {
  const { words: { event } } = kit.useWords(socialWordsFor);
  const { count, before, after, line } = attendance;
  const label = loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", line]]} /> :
    <kit.KitText part="count" role="label" tone="muted" density={density}>
      {before}<kit.KitText part={null} role="number" numberScale="compact" tabular density={density}>{count}</kit.KitText>{after}
    </kit.KitText>;
  const avatars = loading ? members.slice(0, 3).reduceRight<React.JSX.Element | null>((tail, { id }) => {
    const circle = <kit.KitSkeleton shape="control" />;
    return tail ? <kit.KitRow key={id} part={null} label="" inline leadingAlign="row" leading={circle}>
      {tail}
    </kit.KitRow> : circle;
  }, null) : <kit.KitAvatarStack members={members} />;
  return <kit.KitRow part="attendees" label={event.attendees} role="group" inline density={density}
    leadingAlign="row" leading={members.length > 0 ? label : undefined}>
    {members.length > 0 ? avatars : label}
  </kit.KitRow>;
}

// prettier-ignore
function EventActions({ status, density, loading }: EventFinish & Pick<EventProps, "status">) {
  const { words: { event } } = kit.useWords(socialWordsFor);
  const controls = <kit.KitGrid density={density}>{(["going", "interested"] as const).map((part) => {
    const selected = status === part;
    const kind = selected || (status === "none" && part === "going") ? "primary" : "quiet";
    return loading ? <kit.KitSkeleton key={part} shape="control" kind={kind} label={event[part]} full /> :
      <kit.KitAction key={part} part={part} label={event[part]} kind={kind} icon={selected ? "check" : undefined} full />;
  })}</kit.KitGrid>;
  return loading ? controls : <kit.KitRow part="rsvp" label={event.response[status]} role="group" inline density={density}>
    {controls}
  </kit.KitRow>;
}

// prettier-ignore
export function EventCard(input: EventProps) {
  const loading = kit.useComponentState() === "loading";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const { words: { event }, lang } = kit.useWords(socialWordsFor);
  const { attendance, ...date } = eventCopy(input, lang);
  const photo = media === "cover" && input.photo;
  return <kit.KitCard part="frame" padded density={density} surface={surface}>
    {photo && (loading ? <kit.KitSkeleton shape="media" inset="none" content={[]} /> :
      <kit.KitPhoto part="photo" photo={photo} shape="wide" label={event.photo} />)}
    <EventDetails {...{ input, density, loading }} {...date} />
    <EventAttendees members={input.members} {...{ attendance, density, loading }} />
    <kit.KitContent group="response" density={density}>
      <EventActions status={input.status} {...{ density, loading }} />
    </kit.KitContent>
  </kit.KitCard>;
}
