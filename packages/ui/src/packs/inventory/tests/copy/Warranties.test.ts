import { describe, expect, it } from "vitest";
import { warrantyCopy, warrantyReading, warrantyStatus } from "../../copy";

const today = new Date(2024, 1, 29, 23, 30);
const purchase = {
  shop: "Garden Supply",
  bought: "2023-05-24",
  price: 0,
  ends: "2024-03-30",
  receipt: "local:3",
};

describe("warranty status and copy", () => {
  it.each([
    ["2024-02-28", "ended"],
    ["2024-02-29", "soon"],
    ["2024-03-01", "soon"],
    ["2024-03-30", "soon"],
    ["2024-03-31", "active"],
  ])("classifies %s as %s on the device's civil day", (ends, status) => {
    expect(warrantyStatus(ends, today)).toBe(status);
  });

  it("formats dates and even a zero price with the requested locale", () => {
    expect(warrantyCopy(purchase, "full", "en-US", today)).toEqual({
      shop: "Garden Supply",
      bought: "Bought May 24, 2023",
      price: "$0",
      ends: "Through Mar 30, 2024",
      status: "Ending soon",
      tone: "warn",
    });
  });

  it("uses the inactive treatment for ended coverage and shows no status without a date", () => {
    expect(warrantyCopy({ ...purchase, ends: "2024-02-28" }, "full", "en-GB", today)).toMatchObject({
      ends: "28 Feb 2024",
      status: "Expired",
      tone: "muted",
    });
    expect(warrantyCopy({ bought: purchase.bought }, "full", "en", today)).toMatchObject({
      ends: "No end date recorded",
      status: undefined,
      price: undefined,
    });
  });

  it("reads only visible fields without leaking receipt references or shifting row addresses", () => {
    expect(
      warrantyReading({ items: [{ bought: purchase.bought }, purchase], detail: "brief" }, "en-GB", today),
    ).toEqual(["r1 No end date recorded", "r2 Ending soon · Through 30 Mar 2024 · Receipt photo"]);
  });
});
