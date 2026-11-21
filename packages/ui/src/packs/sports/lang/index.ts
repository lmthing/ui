import { languageLookup } from "../../../catalog";
import { en, type SportsWords } from "./en";

export type { SportsWords } from "./en";
const lookup = languageLookup<SportsWords>(en);
export const sportsWordsFor = lookup.words;
export const registerSportsWords = lookup.register;
