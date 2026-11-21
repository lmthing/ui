import { describe, expect, it } from "vitest";
import { listingCopy, listingReading } from "../../copy";

const offer = {
  title: "Garden flat",
  price: 950.5,
  per: "month",
  beds: 2,
  baths: 1.5,
  area: 64.25,
  areaUnit: "m2",
  where: "14 Mill Lane",
  from: "2026-12-01",
  about: "Patio with room for pots.",
  detail: "full",
} as const;

describe("Listing copy", () => {
  it("formats localized figures and the availability date without changing the authored copy", () => {
    expect(listingCopy(offer, "en-US")).toEqual({
      price: "$950.50",
      per: "/ month",
      beds: "2 beds",
      baths: "1.5 baths",
      area: "64.25",
      areaUnit: "m²",
      from: "Available from Dec 1, 2026",
      about: offer.about,
    });
    expect(listingCopy({ ...offer, per: "week", beds: 1, baths: 1, areaUnit: "ft2" }, "de-DE")).toMatchObject(
      {
        price: "950,50\u00a0$",
        per: "/ week",
        beds: "1 bed",
        baths: "1 bath",
        area: "64,25",
        areaUnit: "ft²",
        from: "Available from 1. Dez. 2026",
      },
    );
  });

  it("keeps realistic asking prices exact and bounds the longest finite figures", () => {
    expect(listingCopy({ ...offer, price: 240000 }, "en-US").price).toBe("$240,000");
    expect(listingCopy({ ...offer, price: Number.MAX_VALUE, area: Number.MAX_VALUE }, "en-US")).toMatchObject(
      {
        price: "$1.8E308",
        area: "1.8E308",
      },
    );
  });

  it("reads zero facts, with no rent period, date or hidden description", () => {
    expect(
      listingReading(
        { ...offer, price: 0, per: "none", beds: 0, baths: 0, area: 0, from: undefined, detail: "brief" },
        "en-US",
      ),
    ).toEqual(["Garden flat · $0 · 0 beds · 0 baths · 0\u00a0m² · 14 Mill Lane · Contact · Save"]);
  });
});
