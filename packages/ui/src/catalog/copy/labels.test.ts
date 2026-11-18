import { expect, it } from "vitest";
import {
  appointmentDetails,
  appointmentLabels,
  appointmentReading,
  balancedLine,
  bookLabel,
  charLine,
  contactLabels,
  emptyLine,
  loadingLabel,
  nextLine,
  photoLabels,
  swipeLabels,
  tagsLine,
} from "./labels";

it("keeps contact actions, next details and static tags readable", () => {
  expect(contactLabels).toEqual({ call: "Call", message: "Message", directions: "Directions" });
  expect(nextLine("Friday 09:00")).toBe("Next: Friday 09:00");
  expect(tagsLine([])).toBe("");
  expect(tagsLine(["Regular"])).toBe("Regular");
  expect(tagsLine(["Regular", "Key holder", "New"])).toBe("Regular · Key holder · New");
});

it("keeps neutral labels and empty-state inflection unchanged", () => {
  expect([emptyLine(), emptyLine(" "), emptyLine("plant"), emptyLine("city"), emptyLine("box")]).toEqual([
    "Nothing here yet",
    "Nothing here yet",
    "No plants yet",
    "No cities yet",
    "No boxes yet",
  ]);
  expect(emptyLine("garden-bed")).toBe("No garden beds yet");
  expect(loadingLabel).toBe("Loading");
  expect(bookLabel).toBe("Book");
  expect(charLine(42, 600)).toBe("42 / 600");
  expect(photoLabels).toEqual({ add: "Add photo", take: "Take photo", scan: "Scan" });
  expect(swipeLabels).toEqual({ left: "Skip", right: "Keep" });
});

it("keeps policy endings together and reads dates, amounts and style-specific actions", () => {
  expect(balancedLine("two hours before.")).toBe("two hours\u00a0before.");
  expect(balancedLine("Terms")).toBe("Terms");
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
