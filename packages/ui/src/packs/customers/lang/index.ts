import { languageLookup } from "../../../catalog";
import { en, type CustomersWords } from "./en";

export type { CustomersWords } from "./en";
const lookup = languageLookup<CustomersWords>(en);
export const customersWordsFor = lookup.words;
export const registerCustomersWords = lookup.register;
