import { languageLookup } from "../../../catalog";
import { en, type DataWords } from "./en";

export type { DataWords } from "./en";
const lookup = languageLookup<DataWords>(en);
export const dataWordsFor = lookup.words;
export const registerDataWords = lookup.register;
