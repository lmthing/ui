import {
  useWords,
  KitAction,
  KitCard,
  KitContent,
  KitGrid,
  KitPhoto,
  KitRow,
  KitSkeleton,
  KitText,
  KitTrack,
  useComponentState,
  useVariant,
  type TextRole,
} from "../../../kit";
import {
  wordsFor,
  photo,
  probesFor,
  text,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../../../catalog";
import { healthWordsFor } from "../lang";
import { z } from "zod";
import { seedTitles } from "..";
import { exerciseReading } from "../copy";
import { prompt } from "../../../entry/prompt-Exercise.generated";

export const meta = {
  id: "Exercise",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  variants: { media: ["cover", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "An exercise library bundled with the app; instructions are not medical advice.",
  parts: ["root", "name", "photo", "muscles", "cues", "equipment", "best", "last", "start"],
  states: ["filled", "loading"],
  actions: { parts: { start: ["press"] } },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? exerciseReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    name: text(28),
    photo: photo.optional(),
    muscles: z.array(text(16)).min(1).max(3),
    cues: z.array(text(60)).min(1).max(3),
    equipment: text(20).optional(),
    best: text(16).optional(),
    last: text(16).optional(),
  })
  .refine(({ photo, media }) => media === "none" || photo !== undefined, { path: ["photo"] })
  .overwrite((value) => ({ ...value, ...(value.media === "none" ? { photo: undefined } : {}) }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  return {
    name: seedTitles(cast, 1, 28)[0]!,
    photo: "local:1",
    muscles: [placeholderDetail],
    cues: [placeholderDetail],
  };
}
// prettier-ignore
export const examples = [
  {
    name: "Bench press",
    photo: "lib:exercise",
    muscles: ["Chest", "Triceps"],
    cues: ["Keep feet planted", "Lower slowly", "Press without bouncing"],
    equipment: "Barbell and bench",
    best: "50 kg × 8",
    last: "40 kg × 8",
  },
  {
    name: "Bodyweight squat",
    photo: "local:2",
    muscles: ["Quads", "Glutes"],
    cues: ["Keep heels down", "Track knees over toes"],
    best: "20 reps",
    last: "15 reps",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Exercise");
export const probes = [
  choose(
    "Explain how to squat with a photo, worked muscles, equipment, form cues and my best and last result",
  ),
  choose(
    "Play one exercise video with playback controls, without instructions or previous results",
    "Player",
  ),
  write(
    "Explain bench press with lib:exercise photo, chest and triceps, feet planted and lower slowly, barbell, best 50 kg by 8, last 40 kg by 8",
  ),
  {
    ...write(
      "Explain bench press with lib:exercise saved as its photo, chest and triceps, and the cue Keep feet planted. Keep the photo reference but do not show any image on the exercise screen.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("Add bench press to my workout", { address: "e1/start", action: "press" }),
] satisfies Probe[];

// prettier-ignore
function ExerciseText({ value, part, role = "body", loading, muted = false }: {
  value: string;
  part: string | null;
  role?: TextRole;
  loading: boolean;
  muted?: boolean;
}) {
  return loading ? (
    <KitSkeleton shape="figure" inset="none" lines={[{ text: value, role, numberScale: "compact" }]} />
  ) : (
    <KitText part={part} role={role} tone={muted ? "muted" : "text"} numberScale="compact">
      {value}
    </KitText>
  );
}

// prettier-ignore
function ExerciseResults({
  best,
  last,
  loading,
}: {
  best?: string | undefined;
  last?: string | undefined;
  loading: boolean;
}) {
  const { exerciseLabels } = useWords(healthWordsFor).words;
  const results = [
    ["best", best],
    ["last", last],
  ] as const;
  return !(best || last) ? null : (
    <KitContent group="response">
      {results.map(
        ([part, value]) =>
          value && (
            <KitGrid key={part} fitLast>
              <ExerciseText value={exerciseLabels[part]} part={null} role="label" muted loading={loading} />
              <ExerciseText value={value} part={part} role="number" loading={loading} />
            </KitGrid>
          ),
      )}
    </KitContent>
  );
}

// prettier-ignore
export function Exercise({
  name, media, photo: image, muscles, cues, equipment, best, last }: Props<typeof props, typeof meta>) {
  const surface = "card";
  const { exerciseLabels } = useWords(healthWordsFor).words;
  const loading = useComponentState() === "loading";
  const showPhoto = useVariant("media", meta.variants.media, media) === "cover";
  return (
    <KitCard part="root" style="inset" padded surface={surface}>
      <KitContent>
        <ExerciseText value={name} part="name" role="heading" loading={loading} />
        <KitTrack part="muscles" label={exerciseLabels.muscles}>
          {muscles.map((value, index) => <ExerciseText key={index} {...{ value, loading }} part={null} role="label" muted />)}
        </KitTrack>
      </KitContent>
      {showPhoto && (loading ? <KitSkeleton shape="media" aspect="wide" lines={[]} inset="none" />
        : image && <KitPhoto photo={image} shape="wide" part="photo" label={name} />)}
      <KitRow part="cues" label={exerciseLabels.cues} inline>
        <KitContent>
          <ExerciseText value={exerciseLabels.cues} part={null} role="label" muted loading={loading} />
          {cues.map((value, index) => <ExerciseText key={index} {...{ value, loading }} part={null} />)}
        </KitContent>
      </KitRow>
      {equipment && (
        <KitContent>
          <ExerciseText value={exerciseLabels.equipment} part={null} role="label" muted loading={loading} />
          <ExerciseText value={equipment} part="equipment" loading={loading} />
        </KitContent>
      )}
      <ExerciseResults best={best} last={last} loading={loading} />
      <KitAction label={exerciseLabels.start} part="start" full />
    </KitCard>
  );
}
