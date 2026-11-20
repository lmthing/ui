import {
  useWords,
  KitAction,
  KitCard,
  KitContent,
  KitDayMark,
  KitGrid,
  KitText,
  useComponentState,
  useVariant,
} from "../../../kit";
import {
  wordsFor,
  detailOf,
  goalLine,
  itemsOf,
  placeholderTitle,
  probesFor,
  stampLine,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { z } from "zod";

// Core first: Streak/default cannot keep client reward stamps or redeem a completed business reward.
export const meta = {
  id: "Loyalty",
  status: "ready",
  group: "data",
  purpose: "Reward repeat clients with stamps toward a redeemable free thing.",
  pick: "A business client's four-to-twelve stamp reward card, with stamp and redeem actions. Not a habit streak (Streak) or a personal goal (Ring).",
  writeHints: [
    "stamps is a whole count from zero through of; of is a whole number from four through twelve. Code enables redeem only when full.",
    'If asked only to hide the client name, use {"density":null,"surface":null,"detail":"brief"} and keep the name in the data. Otherwise detail is null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A count per client on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["name"] } },
  parts: ["root", "stamps", "of", "reward", "name", "earned", "stamp", "redeem"],
  states: ["filled", "success"],
  actions: {
    parts: { stamp: ["press"], redeem: ["press"] },
    when: { stamp: { stamp: true }, redeem: { redeem: true } },
  },
  read: (input, state, lang?: string): string[] => {
    const { loyaltyLabels } = wordsFor(lang);

    if (state !== "filled") return [];
    const { stamps, of } = input as z.output<typeof props>;
    return [
      stampLine(stamps, of, lang),
      ...(stamps === of ? [loyaltyLabels.earned, loyaltyLabels.redeem] : [loyaltyLabels.stamp]),
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    stamps: z.int().min(0).max(12),
    of: z.int().min(4).max(12),
    reward: text(40),
    name: text(24).optional(),
  })
  .refine(({ stamps, of }) => stamps <= of, { path: ["stamps"] })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { name: undefined } : {}),
    stamp: value.stamps < value.of,
    redeem: value.stamps === value.of,
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    stamps: 0,
    of: 10,
    reward: (item && detailOf(item, 40, thing)) || placeholderDetail,
    name: (item && titleOf(item, 24, thing)) || placeholderTitle(0, lang),
  };
}
const variantExample = {
  stamps: 7,
  of: 10,
  reward: "Your tenth walk is free",
  name: "Mia Jones",
} satisfies z.input<typeof props>;
export const examples = [
  { stamps: 3, of: 6, reward: "Your sixth plant care visit is free", name: "Anna Patel" },
  { stamps: 10, of: 10, reward: "Your tenth walk is free", name: "Ben Carter" },
  { ...variantExample, density: "compact" },
  { ...variantExample, surface: "outlined" },
  { ...variantExample, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Loyalty");
export const probes = [
  choose(
    "Keep a stamp card for repeat customers, adding a stamp each visit and redeeming a free visit when full",
  ),
  choose("Show my current habit streak and which days this week I completed it", "Streak"),
  write("Ben Carter has seven of ten stamps; reward is Your tenth walk is free"),
  {
    ...write(
      "Ben Carter has seven of ten stamps and his reward is Your tenth walk is free. Remember his name, but don't display the name on the stamp card.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Add a stamp for this visit", { address: "l1/stamp", action: "press" }),
  read("Redeem Ben's free walk", { address: "l1/redeem", action: "press" }, 1),
] satisfies Probe[];

export function Loyalty(input: Props<typeof props, typeof meta>) {
  const { stamps, of, reward, name, surface } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang, words } = useWords();
  const { loyaltyLabels } = words;
  const success = useComponentState() === "success";
  const stamp = stamps < of,
    redeem = stamps === of;
  return (
    <KitCard style="inset" part="root" padded {...{ density, surface }}>
      <KitContent {...{ density }}>
        {name && (
          <KitText role="caption" tone="muted" part="name" {...{ density }}>
            {name}
          </KitText>
        )}
        {success ? (
          <KitText role="heading" tone="good" part="earned" {...{ density }}>
            {loyaltyLabels.earned}
          </KitText>
        ) : (
          <KitText role="number" part="stamps" tabular {...{ density }}>
            {stamps}{" "}
            <KitText role="caption" tone="muted" part="of" {...{ density }}>
              {goalLine(of, lang)}
            </KitText>
          </KitText>
        )}
      </KitContent>
      {!success && (
        <KitGrid columns={3} {...{ density }}>
          {Array.from({ length: Math.ceil(of / 2) }, (_, pair) => (
            <KitGrid key={pair} columns={2} {...{ density }}>
              {Array.from({ length: Math.min(2, of - pair * 2) }, (_, index) => (
                <KitDayMark key={index} done={pair * 2 + index < stamps} />
              ))}
            </KitGrid>
          ))}
        </KitGrid>
      )}
      <KitContent {...{ density }}>
        <KitText role="label" part="reward" {...{ density }}>
          {reward}
        </KitText>
        {!success && redeem && (
          <KitText role="caption" tone="good" part="earned" {...{ density }}>
            {loyaltyLabels.earned}
          </KitText>
        )}
      </KitContent>
      {!success && stamp && <KitAction part="stamp" label={loyaltyLabels.stamp} full />}
      {!success && redeem && <KitAction part="redeem" label={loyaltyLabels.redeem} full />}
    </KitCard>
  );
}
