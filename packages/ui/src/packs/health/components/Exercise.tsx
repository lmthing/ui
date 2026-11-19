import { z } from "zod";
import {
  photo,
  placeholderDetail,
  probesFor,
  text,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";
import { seedTitles } from "..";

// Core first: Player/video cannot pair an exercise's muscles and form cues with best and last results.
export const meta = {
  id: "Exercise",
  status: "draft",
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
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
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
