import { durationLine, numberLine, percentLine, timeOfDayLine } from "../../../catalog";
import { mindWordsFor } from "../lang";

const minutesPerHour = 60;
const minutesPerDay = 24 * minutesPerHour;

type Night = {
  bed: string;
  wake: string;
  awake?: number | undefined;
  quality?: number | undefined;
  week?: readonly number[] | undefined;
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

export function sleepLogLines({ bed, wake, awake = 0, quality, week }: Night, lang?: string) {
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

export function readSleepLog(input: Night, full: boolean, lang?: string): string[] {
  const { editSleep, sleep: words } = mindWordsFor(lang);
  const lines = sleepLogLines(input, lang);
  return [
    words.reading(words.bed, lines.bed),
    words.reading(words.wake, lines.wake),
    words.reading(words.duration, words.minuteReading(lines.duration, lines.asleepMinutes)),
    lines.share,
    lines.awake,
    ...(lines.quality === undefined ? [] : [words.reading(words.quality, lines.quality)]),
    ...(full && lines.average !== undefined && lines.averageMinutes !== undefined
      ? [words.reading(words.average, words.minuteReading(lines.average, lines.averageMinutes))]
      : []),
    words.import,
    JSON.stringify(editSleep),
  ];
}
