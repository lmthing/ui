import { describe, expect, it } from "vitest";
import { ticketReading, ticketStamp } from "../../copy";

const stamp = { date: "2027-04-09", time: "18:30" };
const pass = { ...stamp, holder: "Imani Cole" };

describe("Ticket copy", () => {
  it("formats the stored event date and local clock in the chosen language", () => {
    expect(ticketStamp(stamp, "en")).toEqual({ date: "9 Apr 2027", time: "18:30" });
    expect(ticketStamp(stamp, "en-US")).toEqual({ date: "Apr 9, 2027", time: "18:30" });
  });
  it("reads scan instructions only for a full unused pass", () => {
    const details = ["9 Apr 2027 · 18:30", "Ticket holder: Imani Cole"];
    expect(ticketReading(pass, "filled")).toEqual([...details, "Show this code at the door"]);
    expect(ticketReading({ ...pass, detail: "brief" }, "filled")).toEqual(details);
    expect(ticketReading({ ...pass, detail: "brief" }, "success")).toEqual([...details, "Scanned in"]);
  });
});
