import { languageLookup } from "../../../catalog";
import { en, type TripsWords } from "./en";

const lookup = languageLookup<TripsWords>(en);
export const tripsWordsFor = lookup.words;
