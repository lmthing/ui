import { localeOf, numberLine, type Meta, type StateName, type Values } from "../../../catalog";
import { mindWordsFor } from "../lang";

export const moodChoices = [1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }));

export function moodChange(before?: number, after?: number, lang?: string) {
  if (before === undefined || after === undefined) return undefined;
  return new Intl.NumberFormat(localeOf(lang), { signDisplay: "exceptZero" }).format(after - before);
}

type Reading = {
  detail: "full" | "brief";
  moodBefore?: number | undefined;
  moodAfter?: number | undefined;
};

export function readReflection({ detail, moodBefore, moodAfter }: Reading, state: StateName, lang?: string) {
  if (state !== "filled") return [];
  const words = mindWordsFor(lang).thoughtRecord;
  if (detail === "brief") return [words.title, words.thought, words.traps, words.reframe, words.save];
  const rating = (label: string, value?: number) =>
    value === undefined ? label : words.rating(label, numberLine(value, lang));
  const delta = moodChange(moodBefore, moodAfter, lang);
  return [
    words.title,
    words.situation,
    words.thought,
    rating(words.before, moodBefore),
    words.guide(numberLine(1, lang), numberLine(5, lang)),
    words.traps,
    words.reframe,
    rating(words.after, moodAfter),
    ...(delta === undefined ? [] : [words.rating(words.change, delta)]),
    words.save,
  ];
}

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() || undefined : undefined);
export const canSaveReflection = (input: Values) => Boolean(trimmed(input.thought) && trimmed(input.reframe));

const guidedFields = { prompt: undefined, situation: undefined, moodBefore: undefined, moodAfter: undefined };
const blankFields = { ...guidedFields, thought: undefined, reframe: undefined };

export function emptyReflection<Row extends { on: boolean }>(distortions: readonly Row[]) {
  return { ...blankFields, distortions: distortions.map((row) => ({ ...row, on: false })) };
}

export function reflectionView(props: Readonly<Values>, reflectionInstance: string) {
  return props.detail === "brief" ? { reflectionInstance, ...guidedFields } : { reflectionInstance };
}

type Saved = { instance: string; savedAt: number; reflection: Values };
const hasInstance = (entry: unknown): entry is { instance: unknown } =>
  typeof entry === "object" && entry !== null && "instance" in entry;

const record = {
  kind: "thought_reflections",
  project({ props, journal }) {
    if (!journal.some((entry) => hasInstance(entry) && entry.instance === props.reflectionInstance))
      return {};
    return { state: "success", ...blankFields, distortions: [] };
  },
  actions: {
    "save.press": {
      target: (props) =>
        canSaveReflection(props) && typeof props.reflectionInstance === "string"
          ? props.reflectionInstance
          : undefined,
      plan({ props, now }) {
        const { reflectionInstance, detail, moodBefore, moodAfter, distortions } = props;
        const thought = trimmed(props.thought);
        const reframe = trimmed(props.reframe);
        if (!thought || !reframe || typeof reflectionInstance !== "string")
          return { error: mindWordsFor().thoughtRecord.incomplete };
        const guided = detail === "full";
        return {
          operation: {
            instance: reflectionInstance,
            savedAt: now,
            reflection: {
              thought,
              reframe,
              distortions: (distortions as { label: string; on: boolean }[])
                .filter(({ on }) => on)
                .map(({ label }) => label),
              ...(guided && {
                prompt: props.prompt,
                situation: trimmed(props.situation),
                moodBefore,
                moodAfter,
              }),
            },
          } satisfies Saved,
        };
      },
    },
  },
} satisfies NonNullable<Meta["recordRuntime"]>;

export function reflectionRecord(): NonNullable<Meta["recordRuntime"]> {
  return record;
}
