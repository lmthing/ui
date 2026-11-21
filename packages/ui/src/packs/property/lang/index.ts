import { languageLookup } from "../../../catalog";
import { en, type PropertyWords } from "./en";

export type { PropertyWords } from "./en";
const lookup = languageLookup<PropertyWords>(en);
export const propertyWordsFor = lookup.words;
export const registerPropertyWords = lookup.register;
