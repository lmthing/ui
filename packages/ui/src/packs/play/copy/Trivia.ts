import { numberLine, pluralForm } from "../../../catalog";
import { playWordsFor } from "../lang";

export function triviaPointsCopy(points: number, lang?: string) {
  const value = numberLine(points, lang);
  const line = playWordsFor(lang).trivia.points(value, pluralForm(points, lang));
  const at = line.indexOf(value);
  return at < 0
    ? { line, before: line, value: "", after: "" }
    : { line, before: line.slice(0, at), value, after: line.slice(at + value.length) };
}
