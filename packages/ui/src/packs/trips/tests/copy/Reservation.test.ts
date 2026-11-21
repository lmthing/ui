import { describe, expect, it } from "vitest";
import { reservationReading, reservationStampParts } from "../../copy";
import { registerTripsWords, tripsWordsFor } from "../../lang";

const start = { date: "2027-03-07", time: "08:30" };
const input = { kind: "train", start, ref: "REF", code: false } as const;

describe("Reservation copy", () => {
  it("formats the stored local date and time without a timezone shift", () => {
    expect(reservationStampParts(start, "en")).toEqual({ date: "7 Mar 2027", time: "08:30" });
    expect(reservationStampParts(start, "en-US")).toEqual({ date: "Mar 7, 2027", time: "08:30" });
  });

  it("quotes user data and only reads the supplied stops, seat and code", () => {
    expect(reservationReading({ ...input, from: 'A\n"B"', seat: "8A", code: true })).toEqual([
      "Train",
      'Departure "A\\n\\"B\\"" 7 Mar 2027 08:30',
      '"Seat 8A"',
      "Reference",
      'ref "REF"',
      "Copy reference",
      "Scannable reservation code",
    ]);
    expect(reservationReading({ ...input, to: "Kyoto", seat: "8A", detail: "brief" })).toContain(
      'Arrival "Kyoto"',
    );
    expect(reservationReading({ ...input, seat: "8A", detail: "brief" })).not.toContain('"Seat 8A"');
    expect(reservationReading({ ...input, kind: "stay", end: start, seat: "Room 12" })).toContain(
      '"Room 12"',
    );
  });

  it("reads localized pack words and forwards the locale to date and clock formatters", () => {
    const en = tripsWordsFor("en");
    registerTripsWords("fr", { ...en, reservationRef: "Référence", copyReservationRef: "Copier" });
    try {
      const lines = reservationReading(input, "fr");
      expect(lines).toContain("Référence");
      expect(lines).toContain("Copier");
      expect(lines[1]).toBe("Departure 7 mars 2027 08:30");
    } finally {
      registerTripsWords("fr", en);
    }
  });
});
