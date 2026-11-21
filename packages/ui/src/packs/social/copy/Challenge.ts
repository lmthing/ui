import { appointmentDate, goalLine, numberLine, pluralForm, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type ChallengeCopy = {
  goal: number;
  total: number;
  mine: number;
  unit: string;
  ends: string;
  joined: boolean;
  detail: "full" | "brief";
  top: readonly { name: string; value: number }[];
};

const dayMs = 86_400_000;

export function challengeCopy(input: ChallengeCopy, state: StateName, lang?: string, now = Date.now()) {
  const { challenge: words } = socialWordsFor(lang);
  const { total, goal, mine, unit, ends, joined, top, detail } = input;
  const date = appointmentDate(ends, lang);
  const days = Date.parse(ends) / dayMs - Math.floor(now / dayMs);
  const daysLeft =
    days < 0
      ? words.ended
      : days === 0
        ? words.endsToday
        : words.daysLeft(numberLine(days, lang), pluralForm(days, lang));
  const amount = (value: number) => words.amount(numberLine(value, lang), unit);
  const reached = state === "success" || total >= goal;
  return {
    group: reached ? words.reached : words.group,
    reached,
    ended: days < 0,
    progress: words.progress(numberLine(total, lang), goalLine(goal, lang), unit),
    total: amount(total),
    goal: words.goal(amount(goal)),
    mine: words.mine(amount(mine)),
    ends: words.deadline(date),
    daysLeft,
    top: detail === "full" && top.length ? words.top : undefined,
    leaders:
      detail === "full"
        ? top.map(({ name, value }) => {
            const score = amount(value);
            return { score, label: words.leader(name, score) };
          })
        : [],
    action: joined ? words.log : words.join,
  };
}

export function challengeReading(input: unknown, state: StateName, lang?: string): string[] {
  const view = challengeCopy(input as ChallengeCopy, state, lang);
  return [
    view.progress,
    view.group,
    view.total,
    view.goal,
    view.mine,
    view.ends,
    view.daysLeft,
    ...(view.top
      ? [view.top, ...view.leaders.map(({ score }, index) => `${numberLine(index + 1, lang)}. ${score}`)]
      : []),
    view.action,
  ];
}
