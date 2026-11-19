import {
  useWords,
  KitAction,
  KitCard,
  KitContent,
  KitPhoto,
  KitRow,
  KitSkeleton,
  KitText,
  KitTrack,
  useComponentState,
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
} from "../../../catalog";
import { healthWordsFor } from "../lang";
import { z } from "zod";
import { seedTitles } from "..";
import { exerciseReading } from "../copy";

// Core first: Player/video cannot pair an exercise's muscles and form cues with best and last results.
export const meta = {
  id: "Exercise",
  status: "ready",
  group: "content",
  purpose: "Learn one exercise's form, muscles and equipment, and recall previous results.",
  pick: "One exercise explained with media, muscles, short form cues and best and last results. Not playing just an exercise video (Player), a lesson in a course (Lesson), or a whole session (Workout).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "An exercise library bundled with the app; instructions are not medical advice.",
  parts: ["root", "name", "photo", "muscles", "cues", "equipment", "best", "last", "start"],
  states: ["filled", "loading"],
  actions: { parts: { start: ["press"] } },
  read: (input, state, lang?: string) =>
    state === "filled" ? exerciseReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
export const props = z.strictObject({
  name: text(28),
  photo,
  muscles: z.array(text(16)).min(1).max(3),
  cues: z.array(text(60)).min(1).max(3),
  equipment: text(20).optional(),
  best: text(16).optional(),
  last: text(16).optional(),
});
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  return {
    name: seedTitles(cast, 1, 28)[0]!,
    photo: "local:1",
    muscles: [placeholderDetail],
    cues: [placeholderDetail],
  };
}
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
  read("Add bench press to my workout", { address: "e1/start", action: "press" }),
] satisfies Probe[];

function ExerciseText({
  value,
  part,
  role = "body",
  loading,
  muted = false,
}: {
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
            <KitRow
              key={part}
              part={part}
              label={exerciseLabels[part]}
              inline
              trailing={<ExerciseText value={value} part={null} role="number" loading={loading} />}
            >
              <ExerciseText value={exerciseLabels[part]} part={null} role="label" muted loading={loading} />
            </KitRow>
          ),
      )}
    </KitContent>
  );
}

export function Exercise({
  name,
  photo: image,
  muscles,
  cues,
  equipment,
  best,
  last,
}: Props<typeof props, typeof meta>) {
  const { exerciseLabels } = useWords(healthWordsFor).words;
  const loading = useComponentState() === "loading";
  return (
    <KitCard part="root" style="inset" padded>
      <KitContent>
        <ExerciseText value={name} part="name" role="heading" loading={loading} />
        <KitTrack part="muscles" label={exerciseLabels.muscles}>
          {muscles.map((muscle, index) => (
            <ExerciseText key={index} value={muscle} part={null} role="label" muted loading={loading} />
          ))}
        </KitTrack>
      </KitContent>
      {loading ? (
        <KitSkeleton shape="media" aspect="wide" lines={[]} inset="none" />
      ) : (
        <KitPhoto photo={image} shape="wide" part="photo" label={name} />
      )}
      <KitRow part="cues" label={exerciseLabels.cues} inline>
        <KitContent>
          <ExerciseText value={exerciseLabels.cues} part={null} role="label" muted loading={loading} />
          {cues.map((cue, index) => (
            <ExerciseText key={index} value={cue} part={null} loading={loading} />
          ))}
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
