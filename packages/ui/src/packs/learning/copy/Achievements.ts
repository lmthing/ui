import { appointmentDate } from "../../../catalog";
import { learningWordsFor } from "../lang";

type Milestone = { earned?: string | undefined; how?: string | undefined };

export function badgeMilestone({ earned, how }: Milestone, lang?: string) {
  return earned
    ? { part: "earned", text: appointmentDate(earned, lang) }
    : { part: "how", text: how ?? learningWordsFor(lang).achievements.locked };
}

export function readBadgeMilestones(badges: readonly Milestone[], lang?: string): string[] {
  return badges.flatMap((badge, index) =>
    badge.earned || !badge.how ? [`r${index + 1}: ${badgeMilestone(badge, lang).text}`] : [],
  );
}
