import { z } from "zod";
import * as c from "../catalog";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-HandoffReceipt.generated";

export const meta = {
  id: "HandoffReceipt",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A shared app displays the hand-off phase recorded by the host for this record.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["summary"] } },
  parts: ["root", "subject", "reference", "sender", "recipient", "phase", "time", "summary", "open_label"],
  states: ["filled"],
  actions: { parts: { root: ["press"] }, when: { root: { linked: true } } },
  partTiers: { root: "phone" },
  read: (input, _state, lang): string[] => {
    const { phase, at, fromRole, toRole, goto } = input as z.output<typeof props>;
    const copy = c.wordsFor(lang).handoffReceipt;
    return [
      copy.phases[phase],
      ...(at ? [handoffTime(at, copy.phaseTimes[phase], lang)] : []),
      `${copy.from}: ${JSON.stringify(fromRole)}`,
      `${copy.to}: ${JSON.stringify(toRole)}`,
      ...(goto ? [copy.open] : []),
    ];
  },
} as const satisfies c.Meta;

const offsetDate = z.iso.datetime({ offset: true });
const timestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => offsetDate.safeParse(value).success && Number.isFinite(Date.parse(value)))
  .meta({ read: false });

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    subject: c.text(36),
    reference: c.text(20),
    fromRole: c.text(24).meta({ read: false }),
    toRole: c.text(24).meta({ read: false }),
    phase: z.enum(["waiting", "received", "returned"]).meta({ read: false }),
    at: timestamp.optional(),
    summary: c.text(120).optional(),
    goto: c.screenId.optional(),
  })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { summary: undefined } : {}),
    linked: value.goto !== undefined,
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  const empty = c.wordsFor(lang).placeholderLabel;
  return {
    subject: (item && c.titleOf(item, 36, thing)) || c.placeholderTitle(0, lang),
    reference: c.placeholderValue,
    fromRole: empty,
    toRole: empty,
    phase: "waiting",
  };
}

const plant = {
  subject: "Greenhouse key request",
  reference: "LEDGE-24",
  fromRole: "Plot volunteer",
  toRole: "Garden coordinator",
  phase: "waiting",
  at: "2026-11-26T10:30:00+01:00",
  summary: "The evening team needs access to water the seedlings.",
  goto: "key_request",
} as const;
export const examples = [
  plant,
  {
    subject: "Clover's completed walk",
    reference: "TROT-92",
    fromRole: "Walker",
    toRole: "Dispatch",
    phase: "received",
    at: "2026-11-27T14:15:00Z",
    summary: "Dispatch has received the walk notes and can review them.",
  },
  {
    ...plant,
    phase: "returned",
    summary: "Add the dates when the team needs access and send it back.",
  },
  { ...plant, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("HandoffReceipt");
export const probes = [
  choose("Show request LEDGE-24 went from the volunteer to the coordinator, who hasn't acknowledged it yet."),
  choose("I just saved my own garden notes; show a tick and say the notes were saved.", "Success"),
  {
    ...write(
      "Show Greenhouse key request LEDGE-24, from Plot volunteer to Garden coordinator, sent and still awaiting receipt at 2026-11-26T10:30:00+01:00. Link to key_request.",
    ),
    expectProps: { phase: "waiting", reference: "LEDGE-24", goto: "key_request" },
  },
  {
    ...write(
      "The walker sent Clover's completed walk TROT-92 to Dispatch and Dispatch acknowledged it. Keep the summary 'Dispatch can review it' in the data but hide it on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
    expectProps: { phase: "received" },
  },
  read("Open the greenhouse key request from its hand-off receipt", { address: "h1/root", action: "press" }),
] satisfies c.Probe[];

function handoffTime(at: string, event: string, lang?: string) {
  const value = new Intl.DateTimeFormat(c.localeOf(lang), {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(at));
  return `${event} · ${value}`;
}

const phaseTone = { waiting: "warn", received: "good", returned: "bad" } as const;

function HandoffParty({ label, name, part }: { label: string; name: string; part: "sender" | "recipient" }) {
  return (
    <kit.KitContent rhythm="flush">
      <kit.KitText part={null} role="caption" tone="muted">
        {label}
      </kit.KitText>
      <kit.KitText part={part} breakLongWords>
        {name}
      </kit.KitText>
    </kit.KitContent>
  );
}

export function HandoffReceipt(input: c.Props<typeof props, typeof meta>) {
  const { subject, reference, fromRole, toRole, phase, at, summary, goto } = input;
  const { lang, words } = kit.useWords();
  const copy = words.handoffReceipt;
  return (
    <kit.KitCard
      part="root"
      style="inset"
      padded
      goto={goto}
      label={goto ? copy.openRecord(subject) : subject}
    >
      <kit.KitContent lineRole="heading">
        <kit.KitText part="subject" role="heading" breakLongWords>
          {subject}
        </kit.KitText>
        <kit.KitText part="phase" role="label" tone={phaseTone[phase]} live="polite">
          {copy.phases[phase]}
        </kit.KitText>
        <kit.KitText part="reference" role="caption" tone="muted" breakLongWords>
          {reference}
        </kit.KitText>
        {at && (
          <kit.KitText part="time" role="caption" tone="muted">
            {handoffTime(at, copy.phaseTimes[phase], lang)}
          </kit.KitText>
        )}
      </kit.KitContent>
      <kit.KitContent group="response">
        <HandoffParty label={copy.from} name={fromRole} part="sender" />
        <HandoffParty label={copy.to} name={toRole} part="recipient" />
      </kit.KitContent>
      {summary && (
        <kit.KitContent group="response">
          <kit.KitText part="summary" tone="muted" breakLongWords>
            {summary}
          </kit.KitText>
        </kit.KitContent>
      )}
      {goto && (
        <kit.KitContent group="response">
          <kit.KitText part="open_label" role="label" tone="accent">
            {copy.open}
          </kit.KitText>
        </kit.KitContent>
      )}
    </kit.KitCard>
  );
}
