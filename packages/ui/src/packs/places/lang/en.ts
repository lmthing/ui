import { words as packWords } from "./en/pack";
import { words as PlaceCardWords } from "./en/PlaceCard";
import { words as HoursWords } from "./en/Hours";
import { words as MapListWords } from "./en/MapList";
import { words as AddressWords } from "./en/Address";
import { words as DeparturesWords } from "./en/Departures";
import { words as DeliveryTrackerWords } from "./en/DeliveryTracker";
export const en = {
  ...packWords,
  ...PlaceCardWords,
  ...HoursWords,
  ...MapListWords,
  ...AddressWords,
  ...DeparturesWords,
  ...DeliveryTrackerWords,
};

export type PlacesWords = typeof en;
