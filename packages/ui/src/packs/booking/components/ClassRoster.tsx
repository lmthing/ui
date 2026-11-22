import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import * as copy from "../copy";
import { bookingWordsFor, type BookingWords } from "../lang";
import { prompt } from "../../../entry/prompt-ClassRoster.generated";

// Core first: Progress/compact shows capacity, not who arrived, missed class, or can be admitted.
// prettier-ignore
export const meta = {
  id: "ClassRoster", status: "ready", group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body", weight: 3, dense: true, tier: "people",
  realPath: "A shared class roster synced across instructor and front-desk devices.",
  writeHints: prompt.writeHints,
  parts: ["root", "title", "at", "attendance", "spaces", "waiting", "feedback", "empty", "walkin", "promote"],
  items: { key: "attendees", parts: ["root", "name", "photo", "status", "paid", "checkin", "noshow"] },
  states: ["filled", "empty", "loading", "success", "error"],
  emptyActions: [],
  successActions: ["walkin.press", "promote.press", "checkin.toggle", "noshow.press"],
  live: { checks: { checkin: "checked" }, derive: copy.rosterLive },
  readSuccess: true, read: copy.rosterReading, confirmParts: ["noshow"],
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["at", "paid"] } },
  actions: {
    parts: { walkin: ["press"], promote: ["press"] },
    items: { checkin: ["toggle"], noshow: ["press"] },
    when: {
      walkin: { canAdmit: true },
      promote: { canPromote: true },
      checkin: { canCheck: true },
      noshow: { canCheck: true },
    },
  },
} as const satisfies c.Meta;
const timestamp = z.iso.datetime({ offset: true });
// prettier-ignore
const attendee = z.strictObject({
  id: c.text(24).meta({ kind: undefined }),
  name: c.text(24), photo: c.photo.optional(), status: z.enum(copy.rosterStatuses), paid: z.boolean().optional(),
});
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  sessionId: c.text(24).meta({ kind: undefined }), title: c.text(32),
  at: c.text(35).meta({ kind: undefined }).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/)
    .refine((value) => timestamp.safeParse(value).success && Number.isFinite(Date.parse(value))),
  capacity: z.int().min(2).max(60),
  attendees: z.array(attendee).min(0).max(copy.rosterLimit),
  waitlistCount: z.int().min(0).max(copy.rosterLimit).optional(),
}).refine(({ attendees }) => new Set(attendees.map(({ id }) => id)).size === attendees.length,
  { path: ["attendees"], message: "Attendee ids must be unique" },
).overwrite((input) => {
  const { canAdmit } = copy.rosterCounts(input.capacity, input.attendees);
  return { ...input, canAdmit, canPromote: canAdmit && Boolean(input.waitlistCount),
    attendees: input.attendees.map((row) => ({
      ...row, canCheck: copy.rosterCheckable(row.status),
      checked: row.status === "checked_in",
    })),
  };
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const attendees = c.itemsOf(cast, 3).flatMap((item, index) => {
    const name = c.titleOf(item, 24, thing);
    return name ? [{ id: String(index + 1), name, status: "booked" as const }] : [];
  });
  return {
    sessionId: c.placeholderValue,
    title: c.placeholderTitle(0, lang),
    at: new Date(0).toISOString(),
    detail: "brief",
    capacity: Math.max(2, attendees.length),
    attendees,
  };
}

const ledge = {
  sessionId: "repotting_101",
  title: "Repotting workshop",
  at: "2026-11-21T10:00:00-05:00",
  capacity: 6,
  attendees: [
    { id: "mia", name: "Mia Chen", status: "checked_in", paid: true },
    { id: "jules", name: "Jules Rivera", status: "booked", paid: false },
    { id: "dev", name: "Dev Singh", status: "no_show" },
  ],
  waitlistCount: 2,
} satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  ledge,
  {
    sessionId: "leash_skills", title: "Loose-leash class", at: "2026-11-22T09:30:00-05:00", capacity: 2,
    attendees: [
      { id: "sam", name: "Sam Morgan", status: "checked_in" },
      { id: "robin", name: "Robin Bell", status: "booked" },
    ],
    waitlistCount: 1,
  },
  { ...ledge, density: "compact" },
  { ...ledge, detail: "brief" },
  { ...ledge, surface: "outlined" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("ClassRoster");
// prettier-ignore
export const probes = [
  choose("Take attendance for my repotting workshop: check people in by name, mark no-shows, and admit the next waitlisted guest if a place opens."),
  choose("Show two compact capacity bars: eight of twelve class places booked and six of twelve checked in. I only need totals, no names or controls.", "Progress"),
  write("For the repotting workshop on November 21, 2026 at 10 am Eastern (-05:00), show check-in for a class of six. Mia Chen has arrived and Jules Rivera is booked. Two are waitlisted."),
  {
    ...write("Show attendance for a group leash class on July 9, 2026 at 10 am UTC. Four places, Sam Morgan is checked in and paid. Keep the actual timestamp and paid flag, but hide the date, time and payment on the screen."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Check Jules Rivera in", { address: "c1/r2/checkin", action: "toggle" }),
  read("Mark Jules Rivera as a no-show", { address: "c1/r2/noshow", action: "press" }),
  read("Add a walk-in to this class", { address: "c1/walkin", action: "press" }),
  read("Promote the next guest on the waitlist into the class", { address: "c1/promote", action: "press" }),
] satisfies c.Probe[];

type RosterProps = c.Props<typeof props, typeof meta>;
type Finish = { density: c.ThemeDensity; detail: RosterProps["detail"]; loading: boolean };
const statusTone = { booked: "muted", checked_in: "good", no_show: "bad" } as const;

// prettier-ignore
function RosterRow({ row, finish, words }: { row: RosterProps["attendees"][number]; finish: Finish; words: BookingWords["roster"] }) {
  const { density, detail, loading } = finish;
  const status = words.status[row.status], tone = statusTone[row.status], compact = density === "compact";
  const paid = detail === "brief" || row.paid === undefined ? undefined : row.paid ? words.paid : words.unpaid;
  return <kit.KitRow {...(loading ? { part: null } : { item: row.id })} label={row.name} density={density} inset="none" leadingAlign="row"
    leading={loading ? <kit.KitSkeleton shape="control" /> :
      <kit.KitPhoto {...(row.photo ? { photo: row.photo } : {})} shape="round" label={row.name} initials={copy.rosterInitials(row.name)} part="photo" />}
    trailing={copy.rosterCheckable(row.status) && <>
      {loading ? <><kit.KitSkeleton shape="figure" inset="none" content={[["caption", words.here]]} />
        <kit.KitSkeleton shape="control" kind="quiet" />
        <kit.KitSkeleton shape="control" kind="quiet" label={words.noshow} /></> : <>
        <kit.KitText part={null} role="caption" tone="muted">{words.here}</kit.KitText>
        <kit.KitCheck part="checkin" label={words.checkin(row.name)} done={row.status === "checked_in"} />
        <kit.KitAction kind="quiet" label={words.noshow} part="noshow" a11y={words.noShowFor(row.name)} />
      </>}
    </>}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["body", row.name], ["caption", status], ["caption", paid]]} />
      : <>
        <kit.KitContent inset={compact ? "md" : "none"}><kit.KitText part="name" role="body" lines={1}>{row.name}</kit.KitText></kit.KitContent>
        {compact ? <kit.KitContent lineRole="body" lead={<kit.KitTrail kind="badge" part="status" value={status} tone={tone} density={density} />}>{null}</kit.KitContent>
          : <kit.KitText part="status" role="caption" tone={tone}>{status}</kit.KitText>}
        {paid && <kit.KitContent inset={compact ? "md" : "none"}><kit.KitText part="paid" role="caption" tone="muted">{paid}</kit.KitText></kit.KitContent>}
      </>}
  </kit.KitRow>;
}

// prettier-ignore
export function ClassRoster(input: RosterProps) {
  const { title, at, capacity, waitlistCount, surface, detail } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const state = kit.useComponentState(), loading = state === "loading";
  const { words: { roster: words }, lang } = kit.useWords(bookingWordsFor);
  const { attendees: rows } = kit.useLiveControls(meta, input) as RosterProps;
  const { checkedIn, spaces, canAdmit } = copy.rosterCounts(capacity, rows);
  const metrics = copy.rosterMetrics(checkedIn, spaces, waitlistCount, lang);
  const feedback = copy.rosterFeedback(state, spaces, lang);
  const atLine = detail === "brief" ? undefined : copy.rosterDate(at, lang);
  return <kit.KitCard part="root" padded surface={surface} density={density}>
    {state === "error" ? <kit.KitEmpty part="feedback" icon="calendar" decorativeIcon title={feedback!} /> :
    state === "empty" ? <kit.KitEmpty part="empty" icon="users" decorativeIcon /> : <>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["heading", title], ["caption", atLine]]} /> : <kit.KitContent density={density}>
        <kit.KitText part="title" role="heading">{title}</kit.KitText>
        {atLine && <kit.KitText part="at" role="caption" tone="muted">{atLine}</kit.KitText>}
        {feedback && <kit.KitText part="feedback" role="caption" tone="good">{feedback}</kit.KitText>}
      </kit.KitContent>}
      <kit.KitGrid columns={metrics[2] ? 3 : 2} density={density}>
        {metrics.map((metric) => metric && (loading
          ? <kit.KitSkeleton key={metric.part} shape="figure" inset="none" content={[["number", metric.count, "start", "compact"], ["caption", metric.label]]} />
          : <kit.KitContent key={metric.part}><kit.KitText part={metric.part} role="number" numberScale="compact" tabular>{metric.count}</kit.KitText>
            <kit.KitText part={null} role="caption" tone="muted">{metric.label}</kit.KitText></kit.KitContent>))}
      </kit.KitGrid>
      {!rows.length ? (loading ? <kit.KitSkeleton rows={1} lead="none" /> : <kit.KitEmpty part="empty" icon="users" decorativeIcon title={words.empty} />) :
        <kit.KitGrid list arrange="rows" density={density}>{rows.map((row) =>
          <RosterRow key={row.id} {...{ row, words }} finish={{ density, detail, loading }} />)}</kit.KitGrid>}
      {canAdmit && <kit.KitGrid arrange={waitlistCount ? "grid" : "rows"} density={density}>
        {loading ? <kit.KitSkeleton shape="control" kind="secondary" full label={words.walkin} /> : <kit.KitAction part="walkin" kind="secondary" label={words.walkin} full />}
        {waitlistCount ? (loading ? <kit.KitSkeleton shape="control" kind="secondary" full label={words.promote} /> : <kit.KitAction part="promote" kind="secondary" label={words.promote} full />) : null}
      </kit.KitGrid>}
    </>}
  </kit.KitCard>;
}
