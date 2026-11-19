import { languageLookup } from "../../../catalog";
import { en, type HealthWords } from "./en";

export type { HealthWords } from "./en";
const lookup = languageLookup<HealthWords>(en);
export const healthWordsFor = lookup.words;
export const registerHealthWords = lookup.register;
