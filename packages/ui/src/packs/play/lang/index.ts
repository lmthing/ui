import { languageLookup } from "../../../catalog";
import { en, type PlayWords } from "./en";

export type { PlayWords } from "./en";
const lookup = languageLookup<PlayWords>(en);
export const playWordsFor = lookup.words;
export const registerPlayWords = lookup.register;
