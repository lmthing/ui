import { numberLine, pluralForm, type repeatOptions } from "../../../catalog";
import { homeWordsFor } from "../lang";
import { agendaInitial } from "./Agenda";
import { careLines, careToday, nextCareDate } from "./CareSchedule";

type ChoreSeed = {
  title: string;
  who: string;
  repeat: (typeof repeatOptions)[number];
  every: number;
  last?: string | undefined;
  points?: number | undefined;
};

export function choreIsDone({ last, repeat, every }: ChoreSeed, today = careToday()): boolean {
  if (!last) return false;
  const next = nextCareDate({ last, repeat, every });
  return repeat === "never" || (next !== undefined && next > today);
}

export function choreLines(chore: ChoreSeed, today = careToday(), lang?: string) {
  const words = homeWordsFor(lang);
  const { title, who, repeat, every, last, points } = chore;
  const care = last ? careLines({ last, repeat, every }, today, lang) : undefined;
  const done = choreIsDone(chore, today);
  return {
    label: [title, who, done ? words.choreLabels.done : undefined].filter(Boolean).join(" · "),
    initials: agendaInitial(who, lang),
    check: done ? words.choreLabels.done : words.choreCheck(title),
    repeat:
      repeat === "never"
        ? words.choreLabels.once
        : (care?.repeat ?? words.careRepeat(repeat, numberLine(every, lang), pluralForm(every, lang))),
    last: care?.last,
    next: care?.next ?? (repeat === "never" ? words.choreLabels.ready : words.choreLabels.today),
    tone: care?.tone ?? (repeat === "never" ? "muted" : "accent"),
    points:
      points === undefined
        ? undefined
        : words.chorePoints(numberLine(points, lang), pluralForm(points, lang)),
    done,
  } as const;
}

export function choreReading(chores: readonly ChoreSeed[], lang?: string): string[] {
  const today = careToday();
  return chores.map((chore) => {
    const { repeat, last, next, points, done, check } = choreLines(chore, today, lang);
    const reward = points ? `${points.count}${points.suffix}` : undefined;
    return [chore.title, chore.who, repeat, last, next, reward, done ? check : undefined]
      .filter(Boolean)
      .join(" · ");
  });
}
