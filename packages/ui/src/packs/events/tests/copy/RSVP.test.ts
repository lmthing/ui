import { describe, expect, it } from "vitest";
import { rsvpFields, rsvpReading } from "../../copy";
import { eventsWordsFor } from "../../lang";

const reply = { date: "2027-06-12", answer: "none", plusMax: 2, meals: ["Pasta"] } as const;

describe("RSVP copy", () => {
  it("formats the date and safely displays the bounded companion count", () => {
    expect(rsvpFields(reply, 2, "en-GB")).toEqual({ date: "12 Jun 2027", count: "2" });
    for (const count of [-1, 3, 1.5, NaN]) expect(rsvpFields(reply, count, "en-GB").count).toBe("0");
  });

  it("changes the summary to sent feedback without carrying forward the previous answer", () => {
    const { rsvp } = eventsWordsFor();
    expect(rsvpReading(reply, "filled")).toContain(rsvp.none);
    expect(rsvpReading({ ...reply, answer: "yes" }, "filled").slice(1, 2)).toEqual([rsvp.yes]);
    const declined = rsvpReading({ ...reply, answer: "no", detail: "brief" }, "filled");
    expect(declined.slice(1, 2)).toEqual([rsvp.no]);
    expect(declined).not.toContain(rsvp.plus);
    expect(declined).not.toContain(rsvp.meal);
    expect(declined).not.toContain(rsvp.note);
    expect(rsvpReading(reply, "success")).toEqual([rsvp.sent, rsvpFields(reply, 0).date]);
  });
});
