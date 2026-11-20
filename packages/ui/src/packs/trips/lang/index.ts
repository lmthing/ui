import { languageLookup } from "../../../catalog";
import { en, type TripsWords } from "./en";

export type { TripsWords } from "./en";
const lookup = languageLookup<TripsWords>(en);
export const tripsWordsFor = lookup.words;
export const registerTripsWords = lookup.register;
