import { numberLine } from "../../../catalog";
import { sportsWordsFor, type SportsWords } from "../lang";

type Incident = {
  minute: number;
  side: keyof SportsWords["matchFeed"]["sides"];
  kind: keyof SportsWords["matchFeed"]["kinds"];
  text: string;
};

export function matchMinute(minute: number, lang?: string) {
  return sportsWordsFor(lang).matchFeed.minute(numberLine(minute, lang));
}

export function matchFeedReading(events: readonly Incident[], lang?: string): string[] {
  const { matchFeed } = sportsWordsFor(lang);
  return events.map(({ minute, side, kind, text }) =>
    matchFeed.event(matchMinute(minute, lang), matchFeed.sides[side], matchFeed.kinds[kind], text),
  );
}
