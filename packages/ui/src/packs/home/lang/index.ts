import { languageLookup } from "../../../catalog";
import { en, type HomeWords } from "./en";

export type { HomeWords } from "./en";
const lookup = languageLookup<HomeWords>(en);
export const homeWordsFor = lookup.words;
export const registerHomeWords = lookup.register;
