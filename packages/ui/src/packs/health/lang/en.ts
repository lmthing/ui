import { words as ActivityRingsWords } from "./en/ActivityRings";
import { words as SymptomLogWords } from "./en/SymptomLog";
import { words as VitalsWords } from "./en/Vitals";
import { words as MedicationWords } from "./en/Medication";
import { words as CycleWords } from "./en/Cycle";
import { words as MeasurementsWords } from "./en/Measurements";
import { words as ExerciseWords } from "./en/Exercise";
import { words as WorkoutWords } from "./en/Workout";
export const en = {
  ...ActivityRingsWords,
  ...SymptomLogWords,
  ...VitalsWords,
  ...MedicationWords,
  ...CycleWords,
  ...MeasurementsWords,
  ...ExerciseWords,
  ...WorkoutWords,
};

export type HealthWords = typeof en;
