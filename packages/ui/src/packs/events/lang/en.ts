import { words as SeatingWords } from "./en/Seating";
import { words as DoorWords } from "./en/Door";
import { words as FindDateWords } from "./en/FindDate";
import { words as GuestListWords } from "./en/GuestList";
import { words as RSVPWords } from "./en/RSVP";
import { words as RegistryWords } from "./en/Registry";
import { words as TicketWords } from "./en/Ticket";
import { words as VendorsWords } from "./en/Vendors";
export type EventsWords = typeof en;

export const en = {
  ...SeatingWords,
  ...DoorWords,
  ...FindDateWords,
  ...GuestListWords,
  ...RSVPWords,
  ...RegistryWords,
  ...TicketWords,
  ...VendorsWords,
};
