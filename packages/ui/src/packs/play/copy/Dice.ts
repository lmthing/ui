import { numberLine, pluralForm } from "../../../catalog";
import { playWordsFor } from "../lang";

export function diceSetupLine(count: number, sides: number, lang?: string): string {
  const words = playWordsFor(lang).dice;
  const label = pluralForm(count, lang) === "one" ? words.one : words.other;
  return label(numberLine(count, lang), numberLine(sides, lang));
}

export function diceFaceLabel(position: number, value: number | undefined, held: boolean, lang?: string) {
  const words = playWordsFor(lang).dice;
  const die = numberLine(position, lang);
  if (value === undefined) return words.blankFace(die);
  return (held ? words.heldFace : words.face)(die, numberLine(value, lang));
}

export function diceSumLine(faces: readonly number[], lang?: string): string | undefined {
  if (!faces.length) return;
  const total = faces.reduce((sum, value) => sum + value, 0);
  return playWordsFor(lang).dice.sum(numberLine(total, lang));
}
