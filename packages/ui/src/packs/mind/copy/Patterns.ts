import { z } from "zod";
import { isoDate, numberLine, pluralForm, type StateName } from "../../../catalog";
import { mindWordsFor } from "../lang";

const journalEntry = z.object({
  date: isoDate,
  mood: z.int().min(1).max(5),
  tags: z.array(z.string()),
});
type JournalEntry = z.output<typeof journalEntry>;
type Input = { factors: string[]; minDays: number; detail?: "full" | "brief" };
type DailyMood = { sum: number; count: number; tags: Set<string> };
type Finding = { id: string; sentence: string; withAverage: number; withoutAverage: number };
type Report = { part: "days_left" | "empty"; message: string } | { findings: Finding[] };

function factorKey(label: string) {
  return label.trim().normalize("NFC").toLowerCase();
}

function dailyMoods(records: readonly unknown[]) {
  const days = new Map<string, DailyMood>();
  for (const record of records) {
    const parsed = journalEntry.safeParse(record);
    if (!parsed.success) continue;
    const { date, mood, tags } = parsed.data;
    const day = days.get(date) ?? { sum: 0, count: 0, tags: new Set<string>() };
    day.sum += mood;
    day.count++;
    for (const tag of tags) day.tags.add(factorKey(tag));
    days.set(date, day);
  }
  return days;
}

function compare(days: Iterable<DailyMood>, key: string) {
  const tagged = { sum: 0, count: 0 };
  const untagged = { sum: 0, count: 0 };
  for (const day of days) {
    const group = day.tags.has(key) ? tagged : untagged;
    group.sum += day.sum / day.count;
    group.count++;
  }
  if (!tagged.count || !untagged.count) return;
  const average = ({ sum, count }: typeof tagged) => Math.round((sum / count) * 10) / 10;
  return { withAverage: average(tagged), withoutAverage: average(untagged) };
}

export function patternReport(
  input: Input,
  state: StateName,
  lang: string | undefined,
  records: readonly unknown[],
): Report {
  const words = mindWordsFor(lang).patterns;
  const days = dailyMoods(records);
  const remaining = input.minDays - days.size;
  if (remaining > 0) {
    return {
      part: "days_left",
      message: words.daysLeft(numberLine(remaining, lang), pluralForm(remaining, lang)),
    } as const;
  }
  const seen = new Set<string>();
  const findings =
    state !== "filled"
      ? []
      : input.factors.flatMap((factor, index) => {
          const key = factorKey(factor);
          if (seen.has(key)) return [];
          seen.add(key);
          const pair = compare(days.values(), key);
          if (!pair) return [];
          const { withAverage, withoutAverage } = pair;
          const direction =
            withAverage > withoutAverage ? "higher" : withAverage < withoutAverage ? "lower" : "same";
          return [{ ...pair, id: `r${index + 1}`, sentence: words.finding[direction](factor) }];
        });
  return findings.length ? { findings } : ({ part: "empty", message: words.noComparison } as const);
}

export function readFindings(
  input: Input,
  state: StateName,
  lang: string | undefined,
  records: readonly unknown[],
) {
  const report = patternReport(input, state, lang, records);
  if ("message" in report) return [report.message];
  const words = mindWordsFor(lang).patterns;
  return [
    words.title,
    ...report.findings.flatMap(({ sentence, withAverage, withoutAverage }) =>
      input.detail === "brief"
        ? [sentence]
        : [
            sentence,
            words.reading(words.withFactor, numberLine(withAverage, lang)),
            words.reading(words.withoutFactor, numberLine(withoutAverage, lang)),
          ],
    ),
  ];
}

export function seededJournal(input: Input, state: StateName): JournalEntry[] {
  const count = state === "empty" ? input.minDays - 3 : input.minDays;
  return Array.from({ length: count }, (_, index) => {
    const tags = input.factors.filter((_, factor) => (index & (1 << factor)) !== 0);
    const mood = 3 + (index & 1 ? 1 : -1) + (index & 2 ? -1 : 1);
    const date = new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10);
    return { date, mood, tags };
  });
}
