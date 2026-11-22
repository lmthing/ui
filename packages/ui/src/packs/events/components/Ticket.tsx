import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { ticketAdmission, ticketReading, ticketSeat, ticketStamp, ticketStatuses } from "../copy";
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
    'For an ordinary admission pass use {"detail":null,"align":null,"density":null}. Only set detail to "brief" if the person explicitly says to omit the scan instruction. Never output "start" or "comfortable" just to set a default.',
    "Set style only for an explicitly requested badge or pass format. Include only the supplied section, row and seat. Set status only when supplied; used or transferred tickets no longer display an admission QR.",
    "Enable transfer (true) only if explicitly requested and the ticket is still eligible for admission.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The app issues the admission ticket; the organiser scans it at the door.",
  variants: { density: ["comfortable", "compact"], align: ["start", "center"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["hint"] } },
  // prettier-ignore
  parts: [
    "root", "event", "date", "time", "place", "type", "holder", "number", "code", "hint",
    "section", "row", "seat", "status", "transfer", "transfer_label",
  ],
  partTiers: { transfer: "people" },
  actions: { parts: { transfer: ["press"] }, when: { transfer: { canTransfer: true } } },
  states: ["filled", "success"],
  readSuccess: true,
  read: (input, state, lang): string[] => ticketReading(input as z.output<typeof props>, state, lang),
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  style: z.enum(["badge", "pass"]).optional(),
  event: c.text(32),
  date: c.isoDate,
  time: c.clock,
  place: c.text(32),
  type: c.text(16),
  holder: c.text(24),
  number: c.text(12),
  section: c.text(16).optional(), row: c.text(12).optional(), seat: c.text(12).optional(),
  status: z.enum(ticketStatuses).optional(), transfer: z.boolean().optional(),
}).overwrite((input) => ({
  ...input,
  canTransfer: input.transfer === true && input.status !== "used" && input.status !== "transferred",
}));

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
    align: "center",
    style: "pass",
    section: "Balcony",
    row: "G",
    seat: "12",
    status: "valid",
    transfer: true,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Ticket");
// prettier-ignore
export const probes = [
  choose("Show my issued admission pass for a benefit gala: my name, ticket type, venue and a big scannable code for entry."),
  choose("Show plain label/value facts about the hall: address, dress code and closing time. No issued pass or code.", "KeyValue"),
  write(
    "Write my Adult admission pass for Harbour Benefit at Harbour Hall, 2027-04-09 at 18:30. Holder Imani Cole, ticket number HB0142.",
  ),
  {
    ...write(
      "Make a Studio Open Night admission pass for Hugo Wells at Riverside Studio on 2027-05-15 at 19:00, Member ticket SO0081. Show the QR and ticket details, but leave off the scan instruction.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  ...optionProbes(),
  read("Transfer Hugo Wells's Studio Open Night ticket to someone else.", { address: "t1/transfer", action: "press" }, 1),
] satisfies c.Probe[];

// prettier-ignore
function optionProbes(): c.Probe[] {
  const brief = "Harbour Benefit, at Harbour Hall on 2027-04-09 at 18:30. Adult ticket HB0142 for Imani Cole.";
  const options: [string, NonNullable<c.WriteProbe["expectProps"]>][] = [
    ["Format the admission ticket as a badge.", { style: "badge" }],
    ["Use a centered event pass format, not an admission badge.", { style: "pass" }],
    ["Show the ticket's assigned section, Balcony.", { section: "Balcony" }],
    ["Show the ticket's assigned row, G.", { row: "G" }],
    ["Show the ticket's assigned seat, 12.", { seat: "12" }],
    ["The ticket is explicitly marked valid.", { status: "valid" }],
    ["The ticket has already been transferred to someone else.", { status: "transferred" }],
    ["The ticket is already used.", { status: "used" }],
    ["Give Imani a button to transfer this unused ticket to somebody else.", { transfer: true }],
  ];
  return options.map(([request, expectProps]) => ({ ...write(`${brief} ${request}`), expectProps }));
}

type TicketProps = c.Props<typeof props, typeof meta>;
type Finish = Pick<TicketProps, "align" | "density">;

// prettier-ignore
function TicketBody({ input, finish, used }: { input: TicketProps; finish: Finish; used: boolean }) {
  const { lang, words } = kit.useWords(eventsWordsFor);
  const stamp = ticketStamp(input, lang);
  const seat = ticketSeat(input, lang);
  return <>
    <kit.KitText part="type" role="caption" tone="muted" {...finish}>{input.type}</kit.KitText>
    <kit.KitHeader title={{ part: "event", text: input.event, ...(used ? { role: "body", tone: "muted" } : {}) }} {...finish} />
    <kit.KitContent group={finish.density === "compact" ? "content" : "response"} {...finish}>
      <kit.KitText part={null} tone="muted" {...finish}>
        <kit.KitText part="date" tone="muted" {...finish}>{stamp.date}</kit.KitText>
        {words.ticket.stampSeparator}
        <kit.KitText part="time" tone="muted" tabular {...finish}>{stamp.time}</kit.KitText>
      </kit.KitText>
      <kit.KitText part="place" tone="muted" {...finish}>{input.place}</kit.KitText>
      <kit.KitText part="holder" {...finish}>{words.ticket.holder(input.holder)}</kit.KitText>
      {seat.length > 0 && <kit.KitText part={null} tone="muted" {...finish}>
        {seat.map(({ part, text }, index) => <kit.KitText key={part} part={null} tone="muted" {...finish}>
          {index > 0 && words.ticket.stampSeparator}
          <kit.KitText {...{ part }} tone="muted" {...finish}>{text}</kit.KitText>
        </kit.KitText>)}
      </kit.KitText>}
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function Ticket(input: TicketProps) {
  const state = kit.useComponentState();
  const { lang, words: { ticket } } = kit.useWords(eventsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const align = kit.useVariant("align", meta.variants.align, input.align);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { blocked, scanned, status, feedback } = ticketAdmission(input.status, state, lang);
  const stub = blocked ? <kit.KitContent align="center" density={density}>
    {scanned && <kit.KitIcon name="circle_check" tone="good" decorative />}
    <kit.KitText part="code" role="heading" tone={scanned ? "good" : "muted"} align="center">
      {status && feedback === status ? <kit.KitText part="status" role="heading" tone="muted" align="center">
        {status}
      </kit.KitText> : feedback}
    </kit.KitText>
    <kit.KitText part="number" role="caption" tone="muted" align="center" density={density} tabular>{input.number}</kit.KitText>
  </kit.KitContent> : <>
    <kit.KitCode part="code" value={input.number} label={ticket.code(input.number)} />
    <kit.KitContent group="response" align="center" density={density}>
      <kit.KitText part={null} role="caption" tone="muted" align="center" density={density}>
        <kit.KitText part="number" role="body" emphasis="strong" density={density} tabular>
          {input.number}
        </kit.KitText>
        {detail === "full" && <>{ticket.stampSeparator}<kit.KitText part="hint" role="caption"
          tone="muted" density={density}>{ticket.hint}</kit.KitText></>}
      </kit.KitText>
    </kit.KitContent>
    {input.transfer && <kit.KitActionFooter density={density}>
      <kit.KitAction part="transfer" label={ticket.transfer} kind="secondary" />
    </kit.KitActionFooter>}
  </>;
  return <kit.KitTicket part="root" label={ticket.pass} used={blocked} code={stub}
    style={input.style === "pass" ? "pass" : "card"}>
    <TicketBody input={input} finish={{ align, density }} used={blocked} />
    {status && status !== feedback && <kit.KitLayoutText line={{ part: "status", text: status, role: "meta", tone: "muted" }} {...{ align, density }} />}
  </kit.KitTicket>;
}
