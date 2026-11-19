import { languageLookup } from "../../../catalog";
import { en, type MoneyWords } from "./en";

export type { MoneyWords } from "./en";
const lookup = languageLookup<MoneyWords>(en);
export const moneyWordsFor = lookup.words;
export const registerMoneyWords = lookup.register;
