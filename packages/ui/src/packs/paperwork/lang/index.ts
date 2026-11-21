import { languageLookup } from "../../../catalog";
import { en, type PaperworkWords } from "./en";

export type { PaperworkWords } from "./en";
const lookup = languageLookup<PaperworkWords>(en);
export const paperworkWordsFor = lookup.words;
export const registerPaperworkWords = lookup.register;
