import { z } from "zod";
import {
  clip,
  placeholderTitle,
  stepLabels,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, KitCard, KitContent, KitGrid, KitText } from "../kit";

export const meta = {
  id: "Counter",
  group: "data",
  purpose: "Keep one running count, adding or removing a fixed amount with each tap.",
  pick: "One count the person nudges up or down with plus and minus buttons. Not several read-only summary numbers (Stats) or a number entered in a form (Field).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A count stored on the device, changed by a fixed step with each tap.",
  parts: ["root", "value", "label", "minus", "plus"],
  states: ["filled"],
  actions: { parts: { minus: ["decrement"], plus: ["increment"] } },
  aliases: ["tally", "count", "quantity"],
  read: (input, state) => {
    if (state !== "filled") return [];
    const { value, unit } = props.parse(input);
    return [unit ? `${value} ${unit}` : String(value)];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  label: text(24),
  value: z.int().min(0).default(0),
  unit: text(8).optional(),
  step: z.int().min(1).max(100).default(1),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const label = clip(thingOf(cast)?.type.trim() ?? "", 24) || placeholderTitle(0);
  return { label, value: 0 };
}

export const examples = [
  { label: "Water glasses for fern", value: 2 },
  { label: "Dogs walked today", value: 3, unit: "dogs" },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Let me add or remove one glass of water for my fern with a tap",
    expect: "Counter",
  },
  {
    kind: "choose",
    need: "Show how many dogs I walked today, how many walks I booked and how much I earned together",
    expect: "Stats",
  },
  {
    kind: "write",
    brief: "Show three dogs walked today, with dogs as the unit and one more or less per tap",
    expect: "Counter",
  },
  {
    kind: "read",
    screen: 0,
    task: "Add one more",
    expect: { address: "c1/plus", action: "increment" },
  },
] satisfies Probe[];

export function Counter({ label, value, unit }: Props<typeof props, typeof meta>) {
  return (
    <KitCard style="inset" padded part="root">
      <KitText role="heading" part="label">
        {label}
      </KitText>
      <KitGrid columns={3}>
        <KitAction kind="secondary" icon="minus" a11y={stepLabels.less} part="minus" full />
        <KitContent>
          <KitText role="number" align="center" tabular part="value">
            {value}
          </KitText>
          {unit && (
            <KitText role="caption" tone="muted" align="center" part={null}>
              {unit}
            </KitText>
          )}
        </KitContent>
        <KitAction kind="secondary" icon="plus" a11y={stepLabels.more} part="plus" full />
      </KitGrid>
    </KitCard>
  );
}
