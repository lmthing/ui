import { languageLookup } from "../../../catalog";
import { en, type MindWords } from "./en";

const lookup = languageLookup<MindWords>(en);
export const mindWordsFor = lookup.words;
