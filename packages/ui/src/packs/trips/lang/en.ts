import { words as BagTrackerWords } from "./en/BagTracker";
import { words as FlightStatusWords } from "./en/FlightStatus";
import { words as CabinSeatsWords } from "./en/CabinSeats";
import { words as ClocksWords } from "./en/Clocks";
import { words as ConverterWords } from "./en/Converter";
import { words as ItineraryWords } from "./en/Itinerary";
import { words as PackingListWords } from "./en/PackingList";
import { words as ReservationWords } from "./en/Reservation";
import { words as TravelDocsWords } from "./en/TravelDocs";
import { words as WeatherWords } from "./en/Weather";
export const en = {
  ...BagTrackerWords,
  ...FlightStatusWords,
  ...CabinSeatsWords,
  ...ClocksWords,
  ...ConverterWords,
  ...ItineraryWords,
  ...PackingListWords,
  ...ReservationWords,
  ...TravelDocsWords,
  ...WeatherWords,
};

export type TripsWords = typeof en;
