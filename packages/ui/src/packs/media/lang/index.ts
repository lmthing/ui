import { languageLookup } from "../../../catalog";
import { en, type MediaWords } from "./en";

export type { MediaWords } from "./en";
const lookup = languageLookup<MediaWords>(en);
export const mediaWordsFor = lookup.words;
export const registerMediaWords = lookup.register;
