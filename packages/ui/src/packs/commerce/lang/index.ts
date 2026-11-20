import { languageLookup } from "../../../catalog";
import { en, type CommerceWords } from "./en";

export type { CommerceWords } from "./en";
const lookup = languageLookup<CommerceWords>(en);
export const commerceWordsFor = lookup.words;
export const registerCommerceWords = lookup.register;
