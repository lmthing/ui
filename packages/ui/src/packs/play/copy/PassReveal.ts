import { playWordsFor } from "../lang";

export function passRevealCurtain(name?: string, prompt?: string, lang?: string): string[] {
  return name ? [name, prompt ?? playWordsFor(lang).passReveal.prompt] : [];
}
