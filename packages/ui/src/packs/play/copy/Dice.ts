import { numberLine, pluralForm } from "../../../catalog";
import { playWordsFor } from "../lang";

export function diceSetupLine(count: number, sides: number, lang?: string): string {
  const words = playWordsFor(lang).dice;
  const label = pluralForm(count, lang) === "one" ? words.one : words.other;
  return label(numberLine(count, lang), numberLine(sides, lang));
}

export function diceFaceLabel(
  position: number,
  value: number | undefined,
  held: boolean,
  lang?: string,
  status?: string,
) {
  const words = playWordsFor(lang).dice;
  const die = numberLine(position, lang);
  if (value === undefined) return words.blankFace(die);
  const face = (held ? words.heldFace : words.face)(die, numberLine(value, lang));
  return status ? `${face} · ${status}` : face;
}

type DiceRules = { mod?: number | undefined; drop?: "none" | "low" | "high" | undefined };

export function diceDroppedIndex(faces: readonly number[], drop: DiceRules["drop"]): number {
  if (!faces.length || !drop || drop === "none") return -1;
  return faces.indexOf(drop === "low" ? Math.min(...faces) : Math.max(...faces));
}

export function diceRulesLine(rules: DiceRules, lang?: string): string | undefined {
  const words = playWordsFor(lang).dice;
  const { mod, drop } = rules;
  const modifier = mod === undefined ? undefined : words.modifier(numberLine(mod, lang), mod > 0);
  const discard = drop === "low" ? words.dropLow : drop === "high" ? words.dropHigh : undefined;
  return [modifier, discard].filter(Boolean).join(" · ") || undefined;
}

export function diceSumLine(
  faces: readonly number[],
  lang?: string,
  rules: DiceRules = {},
): string | undefined {
  if (!faces.length) return;
  const dropped = diceDroppedIndex(faces, rules.drop);
  const total = faces.reduce((sum, value, index) => sum + (index === dropped ? 0 : value), rules.mod ?? 0);
  return playWordsFor(lang).dice.sum(numberLine(total, lang));
}
