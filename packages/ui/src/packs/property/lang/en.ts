import { words as LeaseRenewalWords } from "./en/LeaseRenewal";
import { words as RentalApplicationWords } from "./en/RentalApplication";
import { words as InspectionsWords } from "./en/Inspections";
import { words as RentRollWords } from "./en/RentRoll";
import { words as MetersWords } from "./en/Meters";
import { words as UnitsWords } from "./en/Units";
import { words as ViewingsWords } from "./en/Viewings";

export const en = {
  ...LeaseRenewalWords,
  ...RentalApplicationWords,
  ...InspectionsWords,
  ...RentRollWords,
  ...MetersWords,
  ...UnitsWords,
  ...ViewingsWords,
};

export type PropertyWords = typeof en;
