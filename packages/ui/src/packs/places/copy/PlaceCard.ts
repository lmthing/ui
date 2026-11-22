import { z } from "zod";
import { clock, numberLine, screenId, text, timeOfDayLine, type DeviceData } from "../../../catalog";
import { placesWordsFor } from "../lang";

const venue = z.object({ name: text(32), goto: screenId });
const snapshot = venue.extend({
  localTime: clock.optional().catch(undefined),
  distanceKm: z.number().nonnegative().optional().catch(undefined),
});
type Place = z.output<typeof venue> & {
  rating?: number | undefined;
  priceLevel?: number | undefined;
  opens?: string | undefined;
  closes?: string | undefined;
  saved?: boolean | undefined;
  unit?: "km" | "mi" | undefined;
  distanceUnit?: "km" | "mi";
};

// The host supplies the venue's local clock and the distance calculated with location permission.
function snapshotOf(place: Place, data?: DeviceData) {
  for (const record of data?.place_details ?? []) {
    const result = snapshot.safeParse(record);
    if (result.success && result.data.name === place.name && result.data.goto === place.goto)
      return result.data;
  }
}

const minutesPerHour = 60;
const hoursPerDay = 24;
const minutesPerDay = hoursPerDay * minutesPerHour;

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  return hours * minutesPerHour + minutes;
}

function openingCopy({ opens, closes }: Place, localTime?: string, lang?: string) {
  if (!opens || !closes) return undefined;
  const words = placesWordsFor(lang);
  const closingTime = timeOfDayLine(closes, lang);
  if (opens === closes) return { text: words.closed, tone: "warn" } as const;
  if (!localTime)
    return { text: words.placeHours(timeOfDayLine(opens, lang), closingTime), tone: "muted" } as const;
  const now = minutesOf(localTime);
  const start = minutesOf(opens);
  const end = minutesOf(closes);
  const open = start < end ? start <= now && now < end : start <= now || now < end;
  if (!open) return { text: words.closed, tone: "warn" } as const;
  const untilClose = (end - now + minutesPerDay) % minutesPerDay;
  return untilClose <= minutesPerHour
    ? ({ text: words.closesAt(closingTime), tone: "warn" } as const)
    : ({ text: words.openNow, tone: "good" } as const);
}

const maxRating = 5;
const maxPriceLevel = 4;
const kmPerMile = 1.609344;

function distanceCopy(km: number | undefined, unit: Place["unit"], lang?: string) {
  if (km === undefined) return;
  const words = placesWordsFor(lang);
  return unit === "mi"
    ? words.milesAway(numberLine(Number((km / kmPerMile).toFixed(2)), lang))
    : words.distanceAway(numberLine(km, lang));
}

export function placeCardCopy(place: Place, data?: DeviceData, lang?: string) {
  const { rating, priceLevel } = place;
  const words = placesWordsFor(lang);
  const current = snapshotOf(place, data);
  const formattedRating = rating === undefined ? undefined : numberLine(Number(rating.toFixed(2)), lang);
  const ratingMax = numberLine(maxRating, lang);
  return {
    rating: formattedRating,
    ratingReading: formattedRating === undefined ? undefined : words.rating(formattedRating, ratingMax),
    price:
      priceLevel === undefined
        ? undefined
        : words.priceLevel(numberLine(priceLevel, lang), numberLine(maxPriceLevel, lang)),
    distance: distanceCopy(current?.distanceKm, place.distanceUnit ?? place.unit, lang),
    opening: openingCopy(place, current?.localTime, lang),
  };
}

export function placeCardReading(place: Place, data?: DeviceData, lang?: string) {
  const { ratingReading, price, distance, opening } = placeCardCopy(place, data, lang);
  const save = place.saved === undefined ? undefined : placesWordsFor(lang).placeSave;
  return [ratingReading, price, distance, opening?.text, save].filter(
    (line): line is string => line !== undefined,
  );
}
