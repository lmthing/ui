import { languageLookup } from "../../../catalog";
import { en, type EventsWords } from "./en";

export type { EventsWords } from "./en";
const lookup = languageLookup<EventsWords>(en);
export const eventsWordsFor = lookup.words;
export const registerEventsWords = lookup.register;
