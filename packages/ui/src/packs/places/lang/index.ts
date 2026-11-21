import { languageLookup } from "../../../catalog";
import { en, type PlacesWords } from "./en";

export type { PlacesWords } from "./en";
const lookup = languageLookup<PlacesWords>(en);
export const placesWordsFor = lookup.words;
export const registerPlacesWords = lookup.register;
