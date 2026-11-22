import { expect, it } from "vitest";
import { initialItineraryDay, itineraryDate, itineraryDuration, readItinerary } from "../../copy";

it("opens the local calendar day or the first listed day when there is no match", () => {
  const days = [{ date: "2027-03-04" }, { date: "2027-03-05" }];
  expect(initialItineraryDay(days, new Date(2027, 2, 5, 23))).toBe(1);
  expect(initialItineraryDay(days, new Date(2027, 2, 6))).toBe(0);
});

it("formats dates, times and durations with the supplied language", () => {
  expect(itineraryDate("2027-03-04", "en")).toMatch(/Thu,? 4 Mar/);
  expect(itineraryDate("2027-03-04", "fr-FR")).toContain("jeu.");
  expect([15, 60, 130].map((minutes) => itineraryDuration(minutes, "en"))).toEqual([
    "15 min",
    "1 h",
    "2 h 10 min",
  ]);
  expect(itineraryDuration(130, "ar-EG")).toContain("١٠");
});

it("quotes authored text and shows duration only in full detail", () => {
  const day = { date: "2027-03-04", place: "Area", stops: [{ title: "A\nB", minutes: 130 }] };
  expect(readItinerary([day], true, "en")[0]).toContain('Time TBD "A\\nB" 2 h 10 min');
  expect(readItinerary([day], false, "en")[0]).not.toContain("2 h 10 min");
});
