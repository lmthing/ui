import {
  useWords,
  KitCard,
  KitCheck,
  KitContent,
  KitInput,
  KitRow,
  KitScroll,
  KitText,
  useComponentState,
  useVariant,
} from "../../../kit";
import {
  wordsFor,
  detailOf,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { customersWordsFor } from "../lang";
import { z } from "zod";
import { agreementDateLine } from "../copy";

// Core first: Checklist/default cannot capture one client's consent with terms, typed name and signed date.
export const meta = {
  id: "Agreement",
  status: "ready",
  group: "input",
  purpose: "Keep a client's acceptance of terms with their typed name and signing date.",
  pick: "A waiver, consent or terms signed once by a client. Not jobs to tick (Checklist) or a long read without consent (Article).",
  writeHints: [
    "Keep the supplied client's name in name even when signed is false; an unsigned agreement may have a prefilled name.",
    "Only write date when a signing date is supplied. Never invent a name or signing date.",
    'If asked only to hide the signing date, use {"density":null,"surface":null,"detail":"brief"} and keep the supplied date in the data. Otherwise detail is null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "A signed copy kept with the client record on the business's phone; signing remotely needs a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["date"] } },
  parts: ["root", "title", "terms", "agree", "name", "date"],
  states: ["filled", "success"],
  actions: {
    parts: { agree: ["check"], name: ["type"] },
    when: { agree: { signed: false }, name: { signed: false } },
  },
  read: (input, _state, lang?: string): string[] => {
    const { agreementLabels: copy } = customersWordsFor(lang);
    const value = input as z.infer<typeof props>;
    return [
      value.signed ? copy.accepted : copy.agree,
      ...(!value.signed || value.name ? [copy.name] : []),
      ...(value.date ? [agreementDateLine(value.date, lang)] : []),
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    title: text(32),
    terms: text(600),
    signed: z.boolean(),
    name: text(28).optional(),
    date: isoDate.optional(),
  })
  .overwrite((value) => (value.detail === "brief" ? { ...value, date: undefined } : value));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    title: (item && titleOf(item, 32, thing)) || placeholderTitle(0, lang),
    terms: (item && detailOf(item, 600, thing)) || placeholderDetail,
    signed: false,
  };
}
const variantExample = {
  title: "Holiday care consent",
  terms: "Use the spare key for the six booked watering visits. Return it after the last visit.",
  signed: true,
  name: "Anna Patel",
  date: "2026-11-19",
} satisfies z.input<typeof props>;
export const examples = [
  {
    title: "Plant care access consent",
    terms: "I allow the carer to enter for booked plant care visits and keep the spare key securely.",
    signed: false,
  },
  {
    title: "Key-holding consent",
    terms: "I allow Trot to hold my spare key for booked walks. Return it when our agreement ends.",
    signed: true,
    name: "Ben Carter",
    date: "2026-11-18",
  },
  { ...variantExample, density: "compact" },
  { ...variantExample, surface: "outlined" },
  { ...variantExample, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Agreement");
export const probes = [
  choose("Show the client's waiver terms, an agreement tick, their typed name and the date they signed"),
  choose("Tick off the three jobs I need to do before leaving home", "Checklist"),
  write("Unsigned Key-holding consent: I allow Trot to keep my spare key for booked walks. Name Ben Carter"),
  {
    ...write(
      "Show Key-holding consent, accepted by Ben Carter: I allow Trot to keep my spare key for booked walks. Store the signing date 2026-11-18, but don't display it.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Accept these access terms", { address: "a1/agree", action: "check" }),
  read("Type the client's name", { address: "a1/name", action: "type" }),
] satisfies Probe[];

export function Agreement(input: Props<typeof props, typeof meta>) {
  const { title, terms, signed, name, date, surface } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang, words } = useWords(customersWordsFor);
  const { agreementLabels: copy } = words;
  const state = useComponentState();
  const accepted = signed || state === "success";
  return (
    <KitCard padded part="root" {...{ density, surface }}>
      <KitText role="heading" part="title" {...{ density }}>
        {title}
      </KitText>
      <KitScroll part="terms" label={title}>
        <KitText part={null} {...{ density }}>
          {terms}
        </KitText>
      </KitScroll>
      <KitRow
        inline
        {...{ density }}
        label={accepted ? copy.accepted : copy.agree}
        trailing={
          <KitCheck
            part="agree"
            done={accepted}
            readonly={accepted}
            label={accepted ? copy.accepted : copy.agree}
          />
        }
      >
        <KitText part={null} {...{ density }}>
          {accepted ? copy.accepted : copy.agree}
        </KitText>
      </KitRow>
      {(!accepted || name) && (
        <KitContent {...{ density }}>
          <KitText role="caption" tone="muted" part={null} {...{ density }}>
            {copy.name}
          </KitText>
          {accepted ? (
            <KitText part="name" lines={1} {...{ density }}>
              {name}
            </KitText>
          ) : (
            <KitInput part="name" hint={copy.name} label={copy.name} value={name} />
          )}
        </KitContent>
      )}
      {date && (
        <KitText role="caption" tone="muted" part="date" tabular lines={1} {...{ density }}>
          {agreementDateLine(date, lang)}
        </KitText>
      )}
    </KitCard>
  );
}
