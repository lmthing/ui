import { useWords, KitAction, KitCard, KitGrid, KitText } from "../kit";
import {
  wordsFor,
  probesFor,
  numberLine,
  clip,
  placeholderTitle,
  text,
  thingOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";

export const meta = {
  id: "Counter",
  group: "data",
  purpose: "Increase or decrease one running count by a fixed step with each tap.",
  pick: "One count whose plus button increments and minus button decrements the number by a fixed step. Not several read-only summary numbers (Stats) or a number entered in a form (Field).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A count stored on the device, changed by a fixed step with each tap.",
  parts: ["root", "value", "label", "minus", "plus"],
  states: ["filled"],
  actions: { parts: { minus: ["decrement"], plus: ["increment"] } },
  read: (input, state, lang?: string) => {
    const { stepLabels } = wordsFor(lang);

    if (state !== "filled") return [];
    const { value, unit } = props.parse(input);
    return [
      unit ? `${numberLine(value, lang)} ${unit}` : numberLine(value, lang),
      `"${stepLabels.less}" (decrement)`,
      `"${stepLabels.more}" (increment)`,
    ];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  label: text(24),
  value: z.int().min(0).default(0),
  unit: text(8).optional(),
  step: z.int().min(1).max(100).default(1),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const label = clip(thingOf(cast)?.type.trim() ?? "", 24) || placeholderTitle(0, lang);
  return { label, value: 0 };
}

export const examples = [
  { label: "Water glasses for fern", value: 2 },
  { label: "Dogs walked today", value: 3, unit: "dogs" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Counter");
export const probes = [
  choose("Let me add or remove one glass of water for my fern with a tap"),
  choose(
    "Show how many dogs I walked today, how many walks I booked and how much I earned together",
    "Stats",
  ),
  write("Show three dogs walked today, with dogs as the unit and one more or less per tap"),
  read("Add one more", { address: "c1/plus", action: "increment" }),
] satisfies Probe[];

export function Counter({ label, value, unit }: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords();
  const { stepLabels } = words;
  return (
    <KitCard style="inset" padded part="root">
      <KitText role="heading" part="label">
        {label}
      </KitText>
      <KitGrid columns={3}>
        <KitAction kind="secondary" icon="minus" a11y={stepLabels.less} part="minus" full />
        <KitText role="number" align="center" tabular part="value">
          {numberLine(value, lang)}
          {unit && (
            <KitText role="caption" tone="muted" part={null}>
              {" "}
              {unit}
            </KitText>
          )}
        </KitText>
        <KitAction kind="secondary" icon="plus" a11y={stepLabels.more} part="plus" full />
      </KitGrid>
    </KitCard>
  );
}
