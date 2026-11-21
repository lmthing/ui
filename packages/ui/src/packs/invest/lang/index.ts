import { languageLookup } from "../../../catalog";
import { en, type InvestWords } from "./en";

export type { InvestWords } from "./en";
const lookup = languageLookup<InvestWords>(en);
export const investWordsFor = lookup.words;
export const registerInvestWords = lookup.register;
