import { expect, it } from "vitest";
import { appointmentDetails, appointmentLabels, appointmentReading } from "../../copy";

it("reads dates, amounts and style-specific actions", () => {
  const input = { date: "2026-11-20", time: "09:00", minutes: 30, status: "confirmed" as const, price: 0 };
  expect(appointmentReading({ ...input, style: "card" })).toContain("Confirmed");
  expect(appointmentReading({ ...input, style: "summary" })).not.toContain("Confirmed");
  expect(appointmentReading({ ...input, style: "summary" })).toContain("Edit details");
  expect(appointmentReading({ ...input, style: "card" })).toContain("$0");
});

it("orders optional booking details without dropping a zero price", () => {
  expect(appointmentDetails({ minutes: 5 })).toEqual([{ part: "minutes", text: "5 min" }]);
  expect(appointmentDetails({ with: "Sam", minutes: 600, place: "Park", price: 0, policy: "Terms" })).toEqual(
    [
      { part: "with", text: "Sam" },
      { part: "minutes", text: "600 min" },
      { part: "place", text: "Park" },
      { part: "price", text: "$0" },
      { part: "policy", text: "Terms" },
    ],
  );
});

it("labels booking states and actions", () => {
  expect(appointmentLabels).toEqual({
    reschedule: "Reschedule",
    edit: "Edit details",
    booked: "Booked",
    confirmed: "Confirmed",
    pending: "Pending",
    cancelled: "Cancelled",
    done: "Done",
  });
});
