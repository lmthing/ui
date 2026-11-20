import { appointmentDate, localeOf, numberLine, timeOfDayLine } from "../../../catalog";
import { sportsWordsFor } from "../lang";

type Fixture = {
  opponent: string;
  date: string;
  time: string;
  home: boolean;
  venue?: string | undefined;
  us?: number | undefined;
  them?: number | undefined;
  meet?: string | undefined;
  kit?: string | undefined;
};

export function fixtureCopy(row: Fixture, lang?: string) {
  const words = sportsWordsFor(lang);
  const { us, them } = row;
  const outcome =
    us === undefined || them === undefined ? undefined : us > them ? "win" : us === them ? "draw" : "loss";
  const initials = row.opponent
    .split(/\s+/u)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("");
  return {
    initials: initials.toLocaleUpperCase(localeOf(lang)),
    date: appointmentDate(row.date, lang),
    time: timeOfDayLine(row.time, lang),
    side: row.home ? words.fixtureHome : words.fixtureAway,
    meet: row.meet && words.fixtureMeet(timeOfDayLine(row.meet, lang)),
    clothing: row.kit && words.fixtureKit(row.kit),
    result:
      outcome && us !== undefined && them !== undefined
        ? {
            score: words.fixtureScore(numberLine(us, lang), numberLine(them, lang)),
            label: words.fixtureResults[outcome],
            tone:
              outcome === "win"
                ? ("good" as const)
                : outcome === "loss"
                  ? ("bad" as const)
                  : ("muted" as const),
          }
        : undefined,
  };
}

export function fixtureReading(rows: readonly (Fixture & { id?: string })[], lang?: string): string[] {
  const words = sportsWordsFor(lang);
  return rows.map((row) => {
    const copy = fixtureCopy(row, lang);
    return [
      row.id,
      row.opponent,
      copy.initials,
      copy.date,
      copy.time,
      copy.side,
      row.venue,
      copy.result?.score,
      copy.result?.label,
      copy.meet,
      copy.clothing,
    ]
      .filter(Boolean)
      .join(words.fixtureSeparator);
  });
}
