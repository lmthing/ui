import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { rsvpFields, rsvpNoteMax, rsvpOptions, rsvpReading } from "../copy";
import { eventsWordsFor } from "../lang";
import { seedDate, seedTitles } from "../seeds";
import { prompt } from "../../../entry/prompt-RSVP.generated";

// Core first: Choice/cards cannot collect an invitation reply, companions, meal and note together.
export const meta = {
  id: "RSVP",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "The guest sends their reply to the organiser through a shared app or link.",
  writeHints: prompt.writeHints,
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["note"] } },
  parts: [
    "root",
    "event",
    "date",
    "yes",
    "yes_label",
    "no",
    "no_label",
    "plus",
    "meal",
    "note",
    "send",
    "send_label",
    "success",
  ],
  confirmParts: ["no"],
  states: ["filled", "success"],
  actions: {
    parts: {
      yes: ["press"],
      no: ["press"],
      plus: ["set"],
      meal: ["select"],
      note: ["type"],
      send: ["press"],
    },
    when: { plus: { allowsPlus: true }, meal: { allowsMeals: true }, note: { detail: "full" } },
  },
  set: { plus: { prop: "companions", runtime: true, min: 0, maxProp: "plusMax", integer: true, initial: 0 } },
  selections: { meal: { prop: "selectedMeal", choices: { prop: "meals" }, runtime: true } },
  live: { text: { note: { prop: "note", max: rsvpNoteMax } } },
  readSuccess: true,
  read: (input, state, lang): string[] => rsvpReading(input as RsvpFields, state, lang),
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    event: c.text(32),
    date: c.isoDate,
    plusMax: z.int().min(0).max(4),
    meals: z.array(c.text(20)).min(0).max(4),
    answer: z.enum(["none", "yes", "no"]),
  })
  .overwrite((input) => ({
    ...input,
    ...rsvpOptions(input),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { event: seedTitles(input, 32, 1)[0]!, date: seedDate, plusMax: 0, meals: [], answer: "none" };
}

export const examples = [
  {
    event: "Ruth and Sam's wedding",
    date: "2027-06-12",
    plusMax: 2,
    meals: ["Lemon chicken", "Roast squash"],
    answer: "none",
  },
  {
    event: "Harbour reunion",
    date: "2027-09-04",
    plusMax: 0,
    meals: [],
    answer: "no",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RSVP");
export const probes = [
  choose(
    "Let me accept or decline a wedding invitation, say how many companions I'll bring, pick a meal, add a note and send my reply.",
  ),
  choose(
    "Let me choose one of three dinner menus, each with a name and its own short description. No invitation or attendance reply.",
    "Choice",
  ),
  write(
    "Create the invitation reply for Ruth and Sam's wedding on 2027-06-12, no reply yet, at most two companions and a choice of Lemon chicken or Roast squash.",
  ),
  {
    ...write(
      "An invitation reply for the Harbour reunion on 2027-09-04. No reply yet, no companions or meals, and leave out the note field.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Decline the invitation.", { address: "r1/no", action: "press" }),
] satisfies c.Probe[];

type RsvpFields = z.output<typeof props> & {
  companions?: number;
  selectedMeal?: string;
  note?: string;
};
type RsvpFormProps = RsvpFields & { viewDensity: "comfortable" | "compact" };

function MealChoices(meals: RsvpFormProps["meals"], selected: RsvpFormProps["selectedMeal"], title: string) {
  return (
    <kit.KitContent group="response">
      <kit.KitText part={null} role="label">
        {title}
      </kit.KitText>
      <kit.KitTrack part="meal" role="radiogroup" label={title} look="pills">
        {Array.from(new Set(meals), (label) => (
          <kit.KitChip key={label} item={null} role="radio" on={selected === label} label={label} />
        ))}
      </kit.KitTrack>
    </kit.KitContent>
  );
}

function CompanionCount(count: string, max: RsvpFormProps["plusMax"], label: string) {
  return (
    <kit.KitContent group="response">
      <kit.KitText part={null} role="label">
        {label}
      </kit.KitText>
      <kit.KitInput
        part="plus"
        kind="number"
        action="set"
        value={count}
        projected
        min={0}
        max={max}
        step={1}
        hint={label}
      />
    </kit.KitContent>
  );
}

function ReplyForm(input: RsvpFormProps) {
  const {
    lang,
    words: { rsvp },
  } = kit.useWords(eventsWordsFor);
  const { screen, component } = kit.usePartContext();
  const base = `${screen}/${component}`;
  const companions = kit.useControlValue(`${base}/$adjust/companions`, input.companions ?? 0);
  const selected = kit.useControlValue(`${base}/$selection/selectedMeal`, input.selectedMeal);
  const { count } = rsvpFields(input, companions, lang);
  const { allowsPlus, allowsMeals } = rsvpOptions(input);
  return (
    <>
      <kit.KitContent density={input.viewDensity} group="response">
        <kit.KitGrid density={input.viewDensity}>
          <kit.KitAction
            part="yes"
            label={rsvp.yes}
            kind={input.answer === "yes" ? "secondary" : "quiet"}
            full
          />
          <kit.KitAction
            part="no"
            label={rsvp.no}
            kind="danger"
            icon={input.answer === "no" ? "check" : undefined}
            contentParts={{ label: "no_label" }}
            full
          />
        </kit.KitGrid>
      </kit.KitContent>
      {allowsPlus && CompanionCount(count, input.plusMax, rsvp.plus)}
      {allowsMeals && MealChoices(input.meals, selected, rsvp.meal)}
      {input.detail === "full" && (
        <kit.KitContent group="response">
          <kit.KitTextArea
            part="note"
            label={rsvp.note}
            hint={rsvp.note}
            value={input.note}
            maxLength={rsvpNoteMax}
            lines={2}
          />
        </kit.KitContent>
      )}
      <kit.KitContent group="response">
        <kit.KitAction part="send" label={rsvp.send} full />
      </kit.KitContent>
    </>
  );
}

export function RSVP(input: c.Props<typeof props, typeof meta>) {
  const {
    lang,
    words: { rsvp },
  } = kit.useWords(eventsWordsFor);
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const sent = state === "success";
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitContent lineRole="title" density={density}>
        {sent && (
          <kit.KitText part="success" role="title" density={density}>
            {rsvp.sent}
          </kit.KitText>
        )}
        <kit.KitText part="event" role={sent ? "body" : "title"} density={density}>
          {input.event}
        </kit.KitText>
        <kit.KitText part="date" role="body" tone="muted">
          {c.appointmentDate(input.date, lang)}
        </kit.KitText>
        {!sent && <ReplyForm {...input} detail={detail} viewDensity={density} />}
      </kit.KitContent>
    </kit.KitCard>
  );
}
