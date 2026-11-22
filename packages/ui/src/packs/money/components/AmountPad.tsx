import { z } from "zod";
import {
  formatAddress,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../../../catalog";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitInput,
  KitNumberPad,
  useComponentState,
  useControlValue,
  usePartContext,
  useWords,
} from "../../../kit";
import { amountPadDisplay, amountPadKeys, amountPadReading, amountPadText } from "../copy";
import { moneyWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-AmountPad.generated";

// Core first: Field/number cannot provide a screen-dominant amount with a decimal keypad and backspace.
export const meta = {
  id: "AmountPad",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "An amount saved to a new entry on the device.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["note"] } },
  parts: ["root", "label", "value", "pad", "note"],
  items: { key: "keys", parts: ["root"] },
  states: ["filled", "empty"],
  actions: { parts: { pad: ["type"], note: ["type"] }, when: { note: { note: true, detail: "full" } } },
  read: (input, state, lang) =>
    state === "filled"
      ? amountPadReading(input as { value?: number | string; note: boolean; detail?: "full" | "brief" }, lang)
      : [],
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    label: text(24),
    value: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
    note: z.boolean(),
  })
  .refine(({ value, max }) => value === undefined || max === undefined || value <= max, {
    path: ["value"],
    message: "The entered amount must not exceed max",
  })
  // These fixed keys have view addresses, but share the single authored pad input.
  .overwrite((value) => ({ ...value, keys: amountPadKeys(moneyWordsFor().amountPad, false) }))
  .meta({ keypadParts: ["pad"] });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  return { label: (item && titleOf(item, 24, thing)) || placeholderTitle(0, lang), note: false };
}

const ledgePad = { label: "Ledge supplies", value: 24.5, max: 500, note: true } satisfies z.input<
  typeof props
>;
export const examples = [
  ledgePad,
  { label: "Trot walking income", note: false },
  { ...ledgePad, detail: "brief" },
  { ...ledgePad },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("AmountPad");
export const probes = [
  choose(
    "Make entering an expense the whole screen: one large amount, a decimal digit keypad with backspace and a note line",
  ),
  choose(
    "One small number input labelled Monthly limit among the other fields on my settings form, no separate keypad",
    "Field",
  ),
  write(
    "A full-screen money keypad labelled Supplies with 24.50 entered, maximum 500, and a note input enabled",
  ),
  {
    ...write(
      "Use a money keypad labeled Market with 42 entered. Keep notes enabled in the data, but show the keypad without its note field.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Type 25 into the amount keypad", { address: "a1/pad", action: "type" }),
] satisfies Probe[];

export function AmountPad(input: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const { screen, component } = usePartContext();
  const { lang, words } = useWords(moneyWordsFor);
  const initialText = amountPadText(input.value);
  const draft = useControlValue(formatAddress({ screen, component, part: "pad" }), initialText);
  const surface = "card";
  const keys = amountPadKeys(words.amountPad, Boolean(draft));
  return (
    <KitCard surface={surface} part="root" padded={state !== "empty"}>
      {state === "empty" ? (
        <KitEmpty part="label" decorativeIcon />
      ) : (
        <>
          <KitNumberPad
            part="pad"
            displayPart="value"
            target={{ part: "pad" }}
            label={input.label}
            value={amountPadDisplay(draft, lang)}
            keys={keys}
          />
          {input.note && input.detail === "full" && (
            <KitContent group="response">
              <KitInput part="note" hint={words.amountPad.note} />
            </KitContent>
          )}
        </>
      )}
    </KitCard>
  );
}
