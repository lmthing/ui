import { durationLine, numberLine, percentLine, timeOfDayLine } from "../../../catalog";
import { mindWordsFor } from "../lang";

const minutesPerHour = 60;
const minutesPerDay = 24 * minutesPerHour;

export const sleepStageKeys = ["deep", "rem", "light", "awake"] as const;
type Stages = Record<(typeof sleepStageKeys)[number], number>;

type Night = {
  bed: string;
  wake: string;
  awake?: number | undefined;
  quality?: number | undefined;
  week?: readonly number[] | undefined;
  stages?: Stages | undefined;
  hrAvg?: number | undefined;
  hrv?: number | undefined;
  style?: "summary" | "stages" | undefined;
};

export function nightMinutes(bed: string, wake: string): number {
  const minutes = (time: string) => Number(time.slice(0, 2)) * minutesPerHour + Number(time.slice(3));
  return (minutes(wake) - minutes(bed) + minutesPerDay) % minutesPerDay;
}

function sleepDuration(total: number, lang?: string): string {
  const words = mindWordsFor(lang).sleep;
  const hours = Math.floor(total / minutesPerHour);
  const minutes = total % minutesPerHour;
  if (hours === 0) return durationLine(minutes, lang);
  const h = numberLine(hours, lang);
  return minutes === 0 ? words.hours(h) : words.hoursAndMinutes(h, numberLine(minutes, lang));
}

export function sleepLogLines(
  { bed, wake, stages, awake = stages?.awake ?? 0, quality, week }: Night,
  lang?: string,
) {
  const words = mindWordsFor(lang).sleep;
  const total = nightMinutes(bed, wake);
  const asleep = total - awake;
  const average = week
    ? Math.round((week.reduce((sum, hours) => sum + hours, 0) * minutesPerHour) / week.length)
    : undefined;
  return {
    bed: timeOfDayLine(bed, lang),
    wake: timeOfDayLine(wake, lang),
    track: { at: asleep, count: Math.max(1, total) },
    share: words.asleepShare(percentLine(asleep, total, lang)),
    awake: words.awakeTime(sleepDuration(awake, lang)),
    duration: sleepDuration(asleep, lang),
    asleepMinutes: durationLine(asleep, lang),
    quality: quality === undefined ? undefined : words.qualityLevels[quality - 1],
    average: average === undefined ? undefined : sleepDuration(average, lang),
    averageMinutes: average === undefined ? undefined : durationLine(average, lang),
  };
}

export function sleepStagePoints(stages: Stages, lang?: string) {
  const labels = mindWordsFor(lang).sleep.stageLabels;
  return sleepStageKeys.map((key, index) => ({
    id: `r${index + 1}`,
    label: labels[key],
    value: stages[key],
  }));
}

export function wearableLines({ hrAvg, hrv }: Night, lang?: string) {
  const words = mindWordsFor(lang).sleep;
  return [
    ...(hrAvg === undefined
      ? []
      : ([{ part: "hr_avg", label: words.hrAvg, value: words.beats(numberLine(hrAvg, lang)) }] as const)),
    ...(hrv === undefined
      ? []
      : ([{ part: "hrv", label: words.hrv, value: words.milliseconds(numberLine(hrv, lang)) }] as const)),
  ];
}

export function readSleepLog(input: Night, full: boolean, lang?: string): string[] {
  const { editSleep, sleep: words } = mindWordsFor(lang);
  const lines = sleepLogLines(input, lang);
  const stages = input.style === "stages" && input.stages;
  const total = nightMinutes(input.bed, input.wake);
  return [
    words.reading(words.bed, lines.bed),
    words.reading(words.wake, lines.wake),
    words.reading(words.duration, words.minuteReading(lines.duration, lines.asleepMinutes)),
    ...(stages
      ? [
          words.stageTitle,
          words.stageMinutes,
          ...sleepStagePoints(stages, lang).map(
            ({ id, label, value }) =>
              `${id}/label ${words.reading(
                label,
                words.minuteReading(durationLine(value, lang), percentLine(value, total, lang)),
              )}`,
          ),
        ]
      : [lines.share, lines.awake]),
    ...(lines.quality === undefined ? [] : [words.reading(words.quality, lines.quality)]),
    ...(full && lines.average !== undefined && lines.averageMinutes !== undefined
      ? [words.reading(words.average, words.minuteReading(lines.average, lines.averageMinutes))]
      : []),
    ...wearableLines(input, lang).map(({ label, value }) => words.reading(label, value)),
    words.import,
    JSON.stringify(editSleep),
  ];
}
