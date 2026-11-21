import { languageLookup } from "../../../catalog";
import { en, type HiringWords } from "./en";

export type { HiringWords } from "./en";
const lookup = languageLookup<HiringWords>(en);
export const hiringWordsFor = lookup.words;
export const registerHiringWords = lookup.register;
