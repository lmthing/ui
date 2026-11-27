import { z } from "zod";
import {
  appointmentDate,
  clock,
  isoDate,
  itemsOf,
  numberLine,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitContent,
  KitLayoutText,
  KitRow,
  KitRowGroup,
  KitState,
  KitTrail,
  useComponentState,
  useKit,
  useWords,
} from "../../../kit";
import { bookingWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-SlotAgenda.generated";

export const meta = {
  id: "SlotAgenda",
  status: "ready",
  group: "data",
  tier: "phone",
  pick: prompt.pick,
  purpose: prompt.purpose,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  realPath: "Read a shared schedule and open an existing booking screen without reserving a place.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["location", "assignee"] } },
  parts: ["root", "date", "empty"],
  items: {
    key: "sessions",
    parts: ["root", "time", "title", "location", "assignee", "capacity", "status", "open"],
  },
  actions: { items: { root: ["press"] }, when: { root: { linked: true } } },
  states: ["filled", "empty", "loading"],
  readInState: (_input, state) => state === "empty",
  read: (input, state, lang): string[] => {
    const { slotAgenda } = bookingWordsFor(lang);
    if (state === "empty") return [slotAgenda.empty];
    const { date, sessions } = input as z.output<typeof props>;
    return [
      appointmentDate(date, lang),
      ...sessions.map(
        (row, index) =>
          `r${index + 1} ${[timeLine(row), slotAgenda[row.status], row.assignee && slotAgenda.assignedTo(row.assignee), capacityLine(row, lang)].filter(Boolean).join(" · ")}`,
      ),
    ];
  },
} as const satisfies Meta;
const session = z
  .strictObject({
    time: clock.meta({ kind: "text", read: false }),
    end: clock.optional().meta({ read: false }),
    title: text(32),
    location: text(24).optional(),
    assignee: text(32).optional(),
    capacity: z.int().min(1).max(999).optional(),
    filled: z.int().min(0).max(999).optional(),
    status: z.enum(["available", "full", "booked"]).meta({ read: false }),
    goto: screenId.optional(),
  })
  .refine(
    ({ time, end, capacity, filled }) =>
      (!end || time < end) && (filled === undefined || (capacity !== undefined && filled <= capacity)),
    { message: "End follows start; occupancy fits capacity" },
  );

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    date: isoDate.meta({ read: false }),
    sessions: z.array(session).min(1).max(12),
  })
  .overwrite((input) => ({
    ...input,
    sessions: input.sessions.map((row) => ({
      ...row,
      linked: Boolean(row.goto),
      ...(input.detail === "brief" ? { location: undefined, assignee: undefined } : {}),
    })),
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  return {
    date: "2000-01-01",
    sessions: [
      {
        time: "00:00",
        title: (item && titleOf(item, 32, thing)) || placeholderTitle(0, lang),
        status: "available",
      },
    ],
  };
}

const garden = {
  date: "2026-11-27",
  sessions: [
    {
      time: "09:00",
      title: "Repotting workshop",
      location: "Glasshouse",
      status: "available",
      goto: "repotting",
    },
    {
      time: "11:30",
      title: "Plant cuttings exchange",
      location: "East courtyard",
      status: "full",
      goto: "cuttings_waitlist",
    },
    { time: "14:00", title: "Winter watering clinic", status: "booked" },
  ],
} satisfies z.input<typeof props>;
export const examples = [
  garden,
  {
    date: "2026-11-28",
    sessions: [
      {
        time: "09:30",
        title: "Leash skills",
        location: "Meadow gate",
        status: "booked",
        goto: "leash_details",
      },
      { time: "13:00", title: "New puppy social walk", location: "Oak field", status: "full" },
    ],
  },
  { ...garden, detail: "brief" },
  {
    date: "2026-11-29",
    sessions: [
      {
        time: "08:00",
        end: "09:30",
        title: "Meadow group walk",
        assignee: "Nia",
        capacity: 6,
        filled: 4,
        status: "available",
        goto: "staff_meadow",
      },
      {
        time: "11:00",
        end: "12:30",
        title: "Riverside puppy walk",
        assignee: "Sam",
        capacity: 4,
        filled: 4,
        status: "full",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("SlotAgenda");
export const probes = [
  choose(
    "Show today's named group classes with start times, rooms, and whether each is open, full, or already booked by me.",
  ),
  choose(
    "Let me choose one free 30-minute start time for the same visit on this day and rule out the taken times.",
    "Slots",
  ),
  choose(
    "Show a simple read-only list of my four favorite plant names, with no actions or other details.",
    "List",
  ),
  write(
    "Show which named garden sessions I can book on 2026-11-27: Repotting workshop at 09:00 in Glasshouse is available, open repotting; Plant cuttings exchange at 11:30 is full, open cuttings_waitlist; I'm booked for Winter watering clinic at 14:00.",
  ),
  read("Open the full plant cuttings exchange to review the waitlist", { address: "s1/r2", action: "press" }),
  {
    ...write(
      "List sessions on 2026-11-27. I'm booked for Winter watering clinic at 14:00 in Glasshouse. Keep the location in the data but don't show it in this short agenda.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write(
      "Show staffing for 2026-11-29: Meadow group walk from 08:00 to 09:30, assigned to Nia, 4 of 6 places filled and still available, with staff_meadow as the detail link.",
    ),
    fields: { "sessions.0.assignee": "Nia", "sessions.0.capacity": 6, "sessions.0.filled": 4 },
  },
  choose(
    "Show one day of named sessions so I can see the start times, who is staffed on each session, and the number of places filled.",
  ),
] satisfies Probe[];

type AgendaProps = Props<typeof props, typeof meta>;
const statusTone = { available: "good", full: "muted", booked: "accent" } as const;

const timeLine = ({ time, end }: z.output<typeof session>) => (end ? `${time}–${end}` : time);
function capacityLine({ capacity, filled }: z.output<typeof session>, lang?: string) {
  if (capacity === undefined) return undefined;
  const words = bookingWordsFor(lang).slotAgenda;
  return filled === undefined
    ? words.capacity(numberLine(capacity, lang))
    : words.occupancy(numberLine(filled, lang), numberLine(capacity, lang));
}

function AgendaRows({ sessions }: Pick<AgendaProps, "sessions">) {
  const { words, lang } = useWords(bookingWordsFor);
  const density = useKit().density;
  const active = useComponentState() === "filled";
  return (
    <KitRowGroup density={density}>
      {sessions.map((row) => (
        <KitRow
          key={row.id}
          item={row.id}
          density="compact"
          inset="none"
          label={row.title}
          goto={active ? row.goto : undefined}
          trailingAlign="row"
          trailing={
            row.goto &&
            (active ? (
              <KitTrail kind="chevron" part="open" />
            ) : (
              <KitTrail kind="value" value={row.time.slice(0, 2)} part="open" />
            ))
          }
        >
          <KitContent rhythm="flush" density={density}>
            <KitLayoutText line={{ text: timeLine(row), part: "time", role: "meta", tabular: true }} />
            <KitLayoutText line={{ text: row.title, part: "title", strong: true }} />
            <KitLayoutText
              line={{
                text: words.slotAgenda[row.status],
                part: "status",
                role: "meta",
                tone: statusTone[row.status],
              }}
            />
            <KitLayoutText line={{ text: row.location, part: "location", role: "meta", tone: "muted" }} />
            {row.assignee && (
              <KitLayoutText
                line={{
                  text: words.slotAgenda.assignedTo(row.assignee),
                  part: "assignee",
                  role: "meta",
                  tone: "muted",
                }}
              />
            )}
            <KitLayoutText line={{ text: capacityLine(row, lang), part: "capacity", role: "meta" }} />
          </KitContent>
        </KitRow>
      ))}
    </KitRowGroup>
  );
}

export function SlotAgenda({ date, sessions }: AgendaProps) {
  const density = useKit().density;
  const { lang, words } = useWords(bookingWordsFor);
  const content = (
    <KitContent rhythm="flush" density={density}>
      <KitLayoutText line={{ text: appointmentDate(date, lang), part: "date", strong: true }} />
      <AgendaRows sessions={sessions} />
    </KitContent>
  );
  return (
    <KitCard padded part="root" style="inset" density={density}>
      <KitState
        density={density}
        loading={content}
        part="empty"
        icon="calendar_days"
        message={words.slotAgenda.empty}
      >
        {content}
      </KitState>
    </KitCard>
  );
}
