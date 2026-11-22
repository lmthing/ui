import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { ticketReading, ticketStamp } from "../copy";
import { eventsWordsFor } from "../lang";
import { seedDate, seedTime, seedTitles } from "../seeds";

// Core first: KeyValue/default cannot present an issued admission pass with a scannable code.
export const meta = {
  id: "Ticket",
  status: "ready",
  group: "content",
  purpose: "Show the holder's admission pass and code for one event.",
  pick: "One issued event admission pass with holder, ticket type, venue and scannable ticket number. Not ordinary label/value facts (KeyValue), a travel confirmation (Reservation), a discount code (Promo) or the door scanner (Door).",
  writeHints: [
    'For an ordinary admission pass use {"detail":null}. Only set detail to "brief" if the person explicitly says to omit the scan instruction.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The app issues the admission ticket; the organiser scans it at the door.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["hint"] } },
  parts: ["root", "event", "date", "time", "place", "type", "holder", "number", "code", "hint"],
  states: ["filled", "success"],
  readSuccess: true,
  read: (input, state, lang): string[] => ticketReading(input as z.output<typeof props>, state, lang),
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  event: c.text(32),
  date: c.isoDate,
  time: c.clock,
  place: c.text(32),
  type: c.text(16),
  holder: c.text(24),
  number: c.text(12),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { placeholderDetail, placeholderLabel, placeholderValue } = c.wordsFor(input.lang);
  return {
    event: seedTitles(input, 32, 1)[0]!,
    date: seedDate,
    time: seedTime,
    place: c.clip(placeholderDetail, 32),
    type: c.clip(placeholderLabel, 16),
    holder: c.clip(c.placeholderTitle(1, input.lang), 24),
    number: c.clip(placeholderValue, 12),
  };
}

export const examples = [
  {
    event: "Harbour Benefit",
    date: "2027-04-09",
    time: "18:30",
    place: "Harbour Hall",
    type: "Adult",
    holder: "Imani Cole",
    number: "HB0142",
  },
  {
    event: "Studio Open Night",
    date: "2027-05-15",
    time: "19:00",
    place: "Riverside Studio",
    type: "Member",
    holder: "Hugo Wells",
    number: "SO0081",
  },
] satisfies z.input<typeof props>[];

const { choose, write } = c.probesFor("Ticket");
export const probes = [
  choose(
    "Show my issued admission pass for a benefit gala: my name, ticket type, venue and a big scannable code for entry.",
  ),
  choose(
    "Show plain label/value facts about the hall: address, dress code and closing time. No issued pass or code.",
    "KeyValue",
  ),
  write(
    "Write my Adult admission pass for Harbour Benefit at Harbour Hall, 2027-04-09 at 18:30. Holder Imani Cole, ticket number HB0142.",
  ),
  {
    ...write(
      "Make a Studio Open Night admission pass for Hugo Wells at Riverside Studio on 2027-05-15 at 19:00, Member ticket SO0081. Show the QR and ticket details, but leave off the scan instruction.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies c.Probe[];

type TicketProps = c.Props<typeof props, typeof meta>;
type Finish = { align: c.ContentAlign } & { density: c.ThemeDensity };

// prettier-ignore
function TicketBody({ input, finish, used }: { input: TicketProps; finish: Finish; used: boolean }) {
  const { lang, words } = kit.useWords(eventsWordsFor);
  const stamp = ticketStamp(input, lang);
  return <>
    <kit.KitContent lineRole="heading" {...finish}>
      <kit.KitText part="type" role="caption" tone="muted" {...finish}>{input.type}</kit.KitText>
      <kit.KitText part="event" role="heading" tone={used ? "muted" : "text"}
        emphasis={used ? "quiet" : "normal"} {...finish} density="comfortable">{input.event}</kit.KitText>
    </kit.KitContent>
    <kit.KitContent group={finish.density === "compact" ? "content" : "response"} {...finish}>
      <kit.KitText part={null} tone="muted" {...finish}>
        <kit.KitText part="date" tone="muted" {...finish}>{stamp.date}</kit.KitText>
        {words.ticket.stampSeparator}
        <kit.KitText part="time" tone="muted" tabular {...finish}>{stamp.time}</kit.KitText>
      </kit.KitText>
      <kit.KitText part="place" tone="muted" {...finish}>{input.place}</kit.KitText>
      <kit.KitText part="holder" {...finish}>{words.ticket.holder(input.holder)}</kit.KitText>
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function Ticket(input: TicketProps) {
  const used = kit.useComponentState() === "success";
  const { words: { ticket } } = kit.useWords(eventsWordsFor);
  const density = kit.useKit().density;
  const align = "start";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const stub = used ? <kit.KitContent align="center" density={density}>
    <kit.KitIcon name="circle_check" tone="good" decorative />
    <kit.KitText part="code" role="heading" tone="good" align="center" density="comfortable">
      {ticket.scanned}
    </kit.KitText>
    <kit.KitText part="number" role="caption" tone="muted" align="center" density={density} tabular>
      {input.number}
    </kit.KitText>
  </kit.KitContent> : <>
    <kit.KitCode part="code" value={input.number} label={ticket.code(input.number)} />
    <kit.KitContent group="response" align="center" density={density}>
      <kit.KitText part={null} role="caption" tone="muted" align="center" density={density}>
        <kit.KitText part="number" role="number" numberScale="compact" density={density} tabular>
          {input.number}
        </kit.KitText>
        {detail === "full" && <>{ticket.stampSeparator}<kit.KitText part="hint" role="caption"
          tone="muted" density={density}>{ticket.hint}</kit.KitText></>}
      </kit.KitText>
    </kit.KitContent>
  </>;
  return <kit.KitTicket part="root" label={ticket.pass} used={used} code={stub}>
    <TicketBody input={input} finish={{ align, density }} used={used} />
  </kit.KitTicket>;
}
