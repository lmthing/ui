import { playWordsFor } from "../lang";

export function buzzerPadReady(prompt?: string, lang?: string): string[] {
  const { waiting } = playWordsFor(lang).buzzerPad;
  return prompt ? [prompt, waiting] : [waiting];
}
