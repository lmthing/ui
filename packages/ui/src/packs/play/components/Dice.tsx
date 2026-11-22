import { z } from "zod";
import {
  drawKey,
  drawState,
  emptyLine,
  probesFor,
  variantProps,
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
  useKit,
} from "../../../kit";
import { diceDroppedIndex, diceFaceLabel, diceRulesLine, diceSetupLine, diceSumLine } from "../copy";
import { playWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Dice.generated";

// Core first: Counter/default cannot draw unbiased numbered dice or hold faces between rerolls.
export const meta = {
  id: "Dice",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Unbiased random faces are generated and saved on the device before the reveal animation.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["setup"] } },
  items: { key: "dice", parts: ["root", "face", "hold", "counted"] },
  parts: ["root", "setup", "rules", "pool", "dice_1", "dice_2", "dice_3", "sum", "roll", "roll_label"],
  states: ["empty", "filled", "loading", "success"],
  actions: { parts: { roll: ["press"] }, items: { hold: ["toggle"] } },
  emptyActions: ["roll.press"],
  draw: { kind: "faces", press: "roll", count: "count", sides: "sides", hold: "hold" },
  readInState: ({ mod, drop, style }, state) =>
    state === "empty" && (mod !== undefined || drop === "low" || drop === "high" || style === "pool"),
  read: (input, state, lang): string[] => {
    const setup = input as z.output<typeof props> & { [drawKey]?: DrawState };
    const { count, sides, detail, style, [drawKey]: result } = setup;
    const faces = result?.kind === "faces" ? result.faces : [];
    const sum = diceSumLine(faces, lang, setup);
    const rules = diceRulesLine(setup, lang);
    const words = playWordsFor(lang).dice;
    const dropped = diceDroppedIndex(faces, setup.drop);
    const settings = [
      ...(detail === "brief" ? [] : [diceSetupLine(count, sides, lang)]),
      ...(rules ? [rules] : []),
      ...(style === "pool" ? [words.pool] : []),
    ];
    if (state === "empty") return settings;
    const labels =
      style === "pool" || (setup.drop && setup.drop !== "none")
        ? faces.map((value, index) =>
            diceFaceLabel(
              index + 1,
              value,
              result?.kind === "faces" && !!result.held[index],
              lang,
              index === dropped ? words.dropped : words.counted,
            ),
          )
        : [];
    return [...settings, ...labels, sum ?? words.unrolled, sum ? words.reroll : words.roll];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    count: z.int().min(1).max(6).default(2),
    sides: z
      .union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(20)])
      .default(6),
    style: z.enum(["pips", "numbers", "pool"]).default("pips"),
    mod: z.int().min(-20).max(20).optional(),
    drop: z.enum(["none", "low", "high"]).optional(),
  })
  .refine(({ sides, style }) => sides === 6 || style !== "pips", {
    path: ["style"],
    message: "Pips require six-sided dice",
  })
  // Give the validator one item per die without serializing derived rows into draw-controller input.
  .overwrite((value) =>
    Object.defineProperty(value, "dice", { value: Array.from({ length: value.count }, () => ({})) }),
  );
export const fallback = (_input: FallbackInput): z.input<typeof props> => ({});
export const examples = [
  // Ledge's game-night pair.
  { count: 2, sides: 6, style: "pips" },
  // Trot's walkers play a tabletop adventure.
  { count: 1, sides: 20, style: "numbers" },
  { count: 2, detail: "brief" },
  { count: 2 },
  { count: 4, sides: 8, style: "pool", mod: 2, drop: "low" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Dice");
export const probes = [
  choose("Roll two six-sided dice and hold one face while rerolling the other"),
  choose("Manually increase or decrease one number, with no random draw", "Counter"),
  write("Roll three eight-sided dice, showing numbered faces rather than pips"),
  {
    ...write("Give me two six-sided dice. Hide the caption showing the number of dice and sides."),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write("Roll two six-sided dice and subtract three from their combined total."),
    expectProps: { mod: -3 },
  },
  {
    ...write("Roll four six-sided dice; sum the results without the single lowest die."),
    expectProps: { drop: "low" },
  },
  {
    ...write(
      "Roll four six-sided dice as a dice pool. Show numbered faces and label which dice count in the pool.",
    ),
    expectProps: { style: "pool" },
  },
  read("Roll the dice", { address: "d1/roll", action: "press" }),
] satisfies Probe[];
type DiceSetup = Props<typeof props, typeof meta> & { dice: { id: string }[] };
function DiceStatus({ status, loading, dropped }: { status: string; loading: boolean; dropped: boolean }) {
  return loading ? (
    <KitSkeleton shape="figure" centered inset="none" content={[["caption", status]]} />
  ) : (
    <KitText align="center" role="caption" part="counted" tone={dropped ? "muted" : "text"}>
      {status}
    </KitText>
  );
}

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
  const {
    lang,
    words: { dice: words },
  } = useWords(playWordsFor);
  const { count, sides, style, drop } = setup;
  const faceStyle = sides === 6 && style === "pips" ? { sides, style } : { sides, style: "numbers" as const };
  const dropped = diceDroppedIndex(result?.faces ?? [], drop);
  const showStatus = style === "pool" || (drop !== undefined && drop !== "none");
  const dice = setup.dice.map(({ id: item }, index) => {
    const value = loading ? undefined : result?.faces[index];
    const held = !loading && (result?.held[index] ?? false);
    const status = index === dropped ? words.dropped : words.counted;
    const label = diceFaceLabel(index + 1, value, held, lang, showStatus ? status : undefined);
    return (
      <PartScope key={item} {...scope} item={item}>
        <KitCard style="plain" align="center" part="root">
          <KitDiceFace
            {...faceStyle}
            item={item}
            part="face"
            {...{ held, label, loading }}
            {...(value === undefined ? {} : { value, holdPart: "hold" })}
          />
          {showStatus && (loading || value !== undefined) && (
            <DiceStatus status={status} loading={loading} dropped={index === dropped} />
          )}
        </KitCard>
      </PartScope>
    );
  });
  return (
    <KitContent align="center" group="response">
      {Array.from({ length: Math.ceil(count / 2) }, (_, index) => {
        const track = (
          <KitTrack key={index} part={`dice_${index + 1}`}>
            {dice.slice(index * 2, index * 2 + 2)}
          </KitTrack>
        );
        return index > 0 && showStatus ? (
          <KitContent key={index} group="response" align="center">
            {track}
          </KitContent>
        ) : (
          track
        );
      })}
    </KitContent>
  );
}

function DiceSettings({ setup }: { setup: DiceSetup }) {
  const { lang, words } = useWords(playWordsFor);
  const rules = diceRulesLine(setup, lang);
  return (
    <>
      {setup.detail !== "brief" && (
        <KitText align="center" tone="muted" role="caption" part="setup">
          {diceSetupLine(setup.count, setup.sides, lang)}
        </KitText>
      )}
      {rules && (
        <KitText align="center" role="caption" tone="muted" part="rules">
          {rules}
        </KitText>
      )}
      {setup.style === "pool" && (
        <KitText align="center" role="label" part="pool">
          {words.dice.pool}
        </KitText>
      )}
    </>
  );
}

export function Dice(setup: DiceSetup) {
  const scope = usePartContext();
  const state = useComponentState();
  const thing = useEmptyThing();
  const { lang, words } = useWords(playWordsFor);
  const density = useKit().density;
  const saved = useControlValue<unknown>(`${scope.screen}/${scope.component}/${drawKey}`, undefined);
  const result = drawState(meta, setup, () => saved);
  const faces = result?.kind === "faces" ? result : undefined;
  const sum = diceSumLine(faces?.faces ?? [], lang, setup);
  const loading = state === "loading";
  const roll = sum ? words.dice.reroll : words.dice.roll;
  return (
    <KitCard part="root" padded density={density}>
      <DiceSettings setup={setup} />
      <DiceFaces setup={setup} result={faces} loading={loading} />
      {loading ? (
        <>
          <KitSkeleton
            shape="figure"
            centered
            inset="none"
            density={density}
            content={[[sum ? "number" : "body", sum ?? words.dice.unrolled]]}
          />
          <KitSkeleton shape="control" label={roll} full />
        </>
      ) : (
        <>
          <KitText
            align="center"
            role={sum ? "number" : "body"}
            density={density}
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
