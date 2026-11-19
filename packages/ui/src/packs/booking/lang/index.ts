import { languageLookup } from "../../../catalog";
import { en, type BookingWords } from "./en";

export type { BookingWords } from "./en";
const lookup = languageLookup<BookingWords>(en);
export const bookingWordsFor = lookup.words;
export const registerBookingWords = lookup.register;
