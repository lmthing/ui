import { languageLookup } from "../../../catalog";
import { en, type RequestsWords } from "./en";

export type { RequestsWords } from "./en";
const lookup = languageLookup<RequestsWords>(en);
export const requestsWordsFor = lookup.words;
export const registerRequestsWords = lookup.register;
