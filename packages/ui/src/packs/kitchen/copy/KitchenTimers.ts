import { clockLine, numberLine } from "../../../catalog";
import { kitchenWordsFor } from "../lang";

type Countdown = {
  label: string;
  seconds: number;
  remaining?: number | undefined;
  finished?: boolean;
  running?: boolean | undefined;
};

export const kitchenTimerMax = 14400;
export const kitchenTimerMinute = 60;
export const countdownOf = (timer: Countdown) => timer.remaining ?? timer.seconds;

export function kitchenTimerOrder<T extends Countdown>(timers: readonly T[]): T[] {
  return [...timers].sort((a, b) => countdownOf(a) - countdownOf(b));
}

export function kitchenTimerMore(lang?: string) {
  return kitchenWordsFor(lang).kitchenTimerLabels.more(numberLine(1, lang));
}

export function kitchenTimerControl(timer: Countdown) {
  return timer.finished || countdownOf(timer) === 0 ? "finished" : timer.running ? "pause" : "start";
}

export function kitchenTimerReading(timers: readonly Countdown[], lang?: string): string[] {
  const words = kitchenWordsFor(lang).kitchenTimerLabels;
  return [
    ...kitchenTimerOrder(timers).map((timer) =>
      words.reading(timer.label, clockLine(countdownOf(timer), lang)),
    ),
    ...new Set(timers.map((timer) => JSON.stringify(words[kitchenTimerControl(timer)]))),
    JSON.stringify(kitchenTimerMore(lang)),
  ];
}
