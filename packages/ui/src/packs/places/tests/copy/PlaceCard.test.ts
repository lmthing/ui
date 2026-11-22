import { describe, expect, it } from "vitest";
import { placeCardCopy, placeCardReading } from "../../copy";

const place = { name: "Riverside", goto: "nursery", opens: "09:00", closes: "18:00" };
const dataAt = (localTime: string) => ({ place_details: [{ ...place, localTime }] });

describe("PlaceCard copy", () => {
  it.each([
    ["08:59", "Closed", "warn"],
    ["09:00", "Open now", "good"],
    ["16:59", "Open now", "good"],
    ["17:00", "Closes 18:00", "warn"],
    ["17:59", "Closes 18:00", "warn"],
    ["18:00", "Closed", "warn"],
  ])("renders %s as %s", (now, text, tone) => {
    expect(placeCardCopy(place, dataAt(now)).opening).toEqual({ text, tone });
  });

  it("handles overnight and equal times", () => {
    const overnight = { ...place, opens: "22:00", closes: "02:00" };
    expect(placeCardCopy(overnight, dataAt("23:59")).opening?.text).toBe("Open now");
    expect(placeCardCopy(overnight, dataAt("01:00")).opening?.text).toBe("Closes 02:00");
    expect(placeCardCopy(overnight, dataAt("02:00")).opening?.text).toBe("Closed");
    expect(placeCardCopy({ ...place, closes: place.opens }, dataAt("09:00")).opening?.text).toBe("Closed");
  });

  it("does not invent live values and accepts zero distance", () => {
    const other = { ...place, name: "Other venue", localTime: "09:00", distanceKm: 4 };
    const stale = { ...other, name: place.name, goto: "other" };
    const invalid = { ...place, localTime: "24:00", distanceKm: -1 };
    expect(placeCardReading(place, { place_details: [other, stale, invalid] })).toEqual(["09:00–18:00"]);
    expect(placeCardReading(place, { place_details: [other, { ...invalid, distanceKm: 0 }] })).toEqual([
      "0 km away",
      "09:00–18:00",
    ]);
    expect(placeCardReading({ name: place.name, goto: place.goto }, dataAt("12:00"))).toEqual([]);
  });

  it("formats rating, price and distance using the requested language", () => {
    const copy = placeCardCopy(
      { ...place, rating: 4.7, priceLevel: 2 },
      { place_details: [{ ...place, localTime: "17:15", distanceKm: 1.2 }] },
      "de",
    );
    expect(copy).toMatchObject({
      rating: "4,7",
      ratingReading: "Rating 4,7 out of 5",
      price: "Price level 2 out of 4",
      distance: "1,2 km away",
      opening: { text: "Closes 18:00", tone: "warn" },
    });
  });

  it("formats star accessibility labels using the requested language", () => {
    expect(placeCardCopy(place).ratingLabels).toEqual(["1 of 5", "2 of 5", "3 of 5", "4 of 5", "5 of 5"]);
    expect(placeCardCopy(place, undefined, "ar-EG").ratingLabels).toEqual([
      "١ of ٥",
      "٢ of ٥",
      "٣ of ٥",
      "٤ of ٥",
      "٥ of ٥",
    ]);
  });
});
