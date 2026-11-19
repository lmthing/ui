import { z } from "zod";
import {
  drawKey,
  drawState,
  emptyLine,
  probesFor,
  type DrawState,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitAction,
  KitCard,
  KitContent,
  KitDiceFace,
  KitSkeleton,
  KitText,
  KitTrack,
  PartScope,
  useComponentState,
  useControlValue,
  useEmptyThing,
  usePartContext,
  useWords,
} from "../../../kit";
import { diceFaceLabel, diceSetupLine, diceSumLine } from "../copy";
import { playWordsFor } from "../lang";

// Core first: Counter/default cannot draw unbiased numbered dice or hold faces between rerolls.
export const meta = {
  id: "Dice",
  status: "ready",
  group: "action",
  purpose: "Roll numbered dice and hold individual faces while rerolling the others.",
  pick: "Random numbered dice with optional holds and a computed sum. Not manual counting (Counter), named random options (Spinner), or a loading indicator.",
  writeHints: [
    'sides is the number 4, 6, 8, 10, 12 or 20. Use style: "numbers" unless sides is 6; pips is six-sided only. Never write faces, held flags or sum.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Unbiased random faces are generated and saved on the device before the reveal animation.",
  items: { key: "dice", parts: ["root", "face", "hold"] },
  parts: ["root", "dice_1", "dice_2", "dice_3", "sum", "roll", "roll_label"],
  states: ["empty", "filled", "loading", "success"],
  actions: { parts: { roll: ["press"] }, items: { hold: ["toggle"] } },
  emptyActions: ["roll.press"],
  draw: { kind: "faces", press: "roll", count: "count", sides: "sides", hold: "hold" },
  read: (input, _state, lang) => {
    const { count, sides, [drawKey]: result } = input as z.output<typeof props> & { [drawKey]?: DrawState };
    const sum = diceSumLine(result?.kind === "faces" ? result.faces : [], lang);
    const words = playWordsFor(lang).dice;
    return [diceSetupLine(count, sides, lang), sum ?? words.unrolled, sum ? words.reroll : words.roll];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    count: z.int().min(1).max(6).default(2),
    sides: z
      .union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(20)])
      .default(6),
    style: z.enum(["pips", "numbers"]).default("pips"),
  })
  .refine(({ sides, style }) => sides === 6 || style === "numbers", {
    path: ["style"],
    message: "Non-six-sided dice need numbers",
  });
export function fallback(_input: FallbackInput): z.input<typeof props> {
  return props.parse({});
}
export const examples = [
  // Ledge's game-night pair.
  { count: 2, sides: 6, style: "pips" },
  // Trot's walkers play a tabletop adventure.
  { count: 1, sides: 20, style: "numbers" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Dice");
export const probes = [
  choose("Roll two six-sided dice and hold one face while rerolling the other"),
  choose("Manually increase or decrease one number, with no random draw", "Counter"),
  write("Roll three eight-sided dice, showing numbered faces rather than pips"),
  read("Roll the dice", { address: "d1/roll", action: "press" }),
] satisfies Probe[];

type DiceSetup = Props<typeof props, typeof meta>;

function DiceFaces({
  setup,
  result,
  loading,
}: {
  setup: DiceSetup;
  result: Extract<DrawState, { kind: "faces" }> | undefined;
  loading: boolean;
}) {
  const scope = usePartContext();
  const { lang } = useWords(playWordsFor);
  const { count, sides, style } = setup;
  const faceStyle = sides === 6 ? { sides, style } : { sides, style: "numbers" as const };
  const dice = Array.from({ length: count }, (_, index) => {
    const item = `r${index + 1}`;
    const value = loading ? undefined : result?.faces[index];
    const held = !loading && (result?.held[index] ?? false);
    const label = diceFaceLabel(index + 1, value, held, lang);
    return (
      <PartScope key={item} {...scope} item={item}>
        <KitCard style="plain" align="center" part="root">
          <KitDiceFace
            {...faceStyle}
            item={item}
            part="face"
            held={held}
            label={label}
            loading={loading}
            {...(value === undefined ? {} : { value, holdPart: "hold" })}
          />
        </KitCard>
      </PartScope>
    );
  });
  return (
    <KitContent align="center" group="response">
      {Array.from({ length: Math.ceil(count / 2) }, (_, index) => (
        <KitTrack key={index} part={`dice_${index + 1}`}>
          {dice.slice(index * 2, index * 2 + 2)}
        </KitTrack>
      ))}
    </KitContent>
  );
}

export function Dice(setup: DiceSetup) {
  const scope = usePartContext();
  const state = useComponentState();
  const thing = useEmptyThing();
  const { lang, words } = useWords(playWordsFor);
  const saved = useControlValue<unknown>(`${scope.screen}/${scope.component}/${drawKey}`, undefined);
  const result = drawState(meta, setup, () => saved);
  const faces = result?.kind === "faces" ? result : undefined;
  const sum = diceSumLine(faces?.faces ?? [], lang);
  const loading = state === "loading";
  const roll = sum ? words.dice.reroll : words.dice.roll;
  return (
    <KitCard part="root" padded>
      <KitText align="center" tone="muted" role="caption" part={null}>
        {diceSetupLine(setup.count, setup.sides, lang)}
      </KitText>
      <DiceFaces setup={setup} result={faces} loading={loading} />
      {loading ? (
        <>
          <KitSkeleton
            shape="figure"
            centered
            inset="none"
            content={[[sum ? "number" : "body", sum ?? words.dice.unrolled]]}
          />
          <KitSkeleton shape="control" label={roll} full />
        </>
      ) : (
        <>
          <KitText
            align="center"
            role={sum ? "number" : "body"}
            tone={sum ? "text" : "muted"}
            part={sum ? "sum" : null}
          >
            {sum ?? (state === "empty" && thing ? emptyLine(thing, lang) : words.dice.unrolled)}
          </KitText>
          <KitAction
            part="roll"
            action="press"
            label={roll}
            full
            disabled={!!sum && !!faces?.held.every(Boolean)}
          />
        </>
      )}
    </KitCard>
  );
}
