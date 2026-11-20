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

// Core first: Field/number cannot provide a screen-dominant amount with a decimal keypad and backspace.
export const meta = {
  id: "AmountPad",
  status: "ready",
  group: "input",
  purpose: "Enter a money amount quickly with a large keypad.",
  pick: "Entering money is the main screen task: large live amount, decimal keypad and optional note. Not a number among form fields (Field), or a count to step (Counter).",
  writeHints: [
    "value and max are nonnegative numbers; value must not exceed max. note is a boolean enabling a note input, never the note text.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "An amount saved to a new entry on the device.",
  parts: ["root", "label", "value", "pad", "note"],
  states: ["filled", "empty"],
  actions: { parts: { pad: ["type"], note: ["type"] }, when: { note: { note: true } } },
  read: (input, state, lang) =>
    state === "filled" ? amountPadReading(input as { value?: number | string; note: boolean }, lang) : [],
} as const satisfies Meta;

export const props = z
  .strictObject({
    label: text(24),
    value: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
    note: z.boolean(),
  })
  .refine(({ value, max }) => value === undefined || max === undefined || value <= max, {
    path: ["value"],
    message: "The entered amount must not exceed max",
  })
  .meta({ keypadParts: ["pad"] });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  return { label: (item && titleOf(item, 24, thing)) || placeholderTitle(0, lang), note: false };
}

export const examples = [
  { label: "Ledge supplies", value: 24.5, max: 500, note: true },
  { label: "Trot walking income", note: false },
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
  read("Type 25 into the amount keypad", { address: "a1/pad", action: "type" }),
] satisfies Probe[];

export function AmountPad(input: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const { screen, component } = usePartContext();
  const { lang, words } = useWords(moneyWordsFor);
  const initialText = amountPadText(input.value);
  const draft = useControlValue(formatAddress({ screen, component, part: "pad" }), initialText);
  const keys = amountPadKeys(words.amountPad, Boolean(draft));
  return (
    <KitCard part="root" padded={state !== "empty"}>
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
          {input.note && (
            <KitContent group="response">
              <KitInput part="note" hint={words.amountPad.note} />
            </KitContent>
          )}
        </>
      )}
    </KitCard>
  );
}
