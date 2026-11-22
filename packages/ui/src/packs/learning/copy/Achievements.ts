import { appointmentDate } from "../../../catalog";
import { learningWordsFor } from "../lang";

type Milestone = { earned?: string | undefined; how?: string | undefined };

export function badgeMilestone({ earned, how }: Milestone, lang?: string) {
  return earned
    ? { part: "earned", text: appointmentDate(earned, lang) }
    : { part: "how", text: how ?? learningWordsFor(lang).achievements.locked };
}

const scoreTarget = /(?<![\p{L}\p{N}/])(\p{Nd}+\/\p{Nd}+)(?![\p{L}\p{N}/])/gu;

/** Keep authored criteria intact while identifying standalone score targets for emphasis. */
export function badgeCriterionRuns(text: string) {
  return text.split(scoreTarget).map((text, index) => ({ text, target: index % 2 === 1 }));
}

export function readBadgeMilestones(badges: readonly Milestone[], lang?: string): string[] {
  return badges.flatMap((badge, index) =>
    badge.earned || !badge.how ? [`r${index + 1}: ${badgeMilestone(badge, lang).text}`] : [],
  );
}
