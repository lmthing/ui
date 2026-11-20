import { expect, it } from "vitest";
import { appointmentDate } from "@lmthing/ui/catalog";
import { travelDocLines, travelDocsReading, travelDocsTripEnd } from "../../copy";

const tripEnd = "2028-02-29";
const doc = { kind: "passport", who: "Sam", number: "DEMO-PRIVATE", expires: tripEnd } as const;

it.each([
  ["2028-02-28", "bad", "Expires before trip ends"],
  ["2028-02-29", "warn", "Expires on trip end date"],
  ["2028-03-01", "warn", "Expires soon after trip"],
  ["2028-03-30", "warn", "Expires soon after trip"],
] as const)("computes the UTC calendar-day warning for %s", (expires, tone, label) => {
  expect(travelDocLines({ ...doc, expires }, tripEnd).warning).toEqual({ tone, label });
});

it("does not warn beyond 30 days or without a trip end", () => {
  expect(travelDocLines({ ...doc, expires: "2028-03-31" }, tripEnd).warning).toBeUndefined();
  expect(travelDocLines(doc, undefined).warning).toBeUndefined();
  expect(travelDocsTripEnd(undefined)).toBeUndefined();
});

it("uses a fixed mask, distinguishes no number and formats dates in the requested locale", () => {
  const lang = "en-US";
  const shown = travelDocLines(doc, tripEnd, lang);
  expect(shown.number).toBe("No. ••••");
  expect(travelDocLines({ ...doc, number: "1" }, tripEnd).number).toBe(shown.number);
  expect(travelDocLines({ ...doc, number: " " }, tripEnd).number).toBe("No number added");
  expect(shown.expires).toBe(`Expires ${appointmentDate(tripEnd, lang)}`);
  expect(travelDocsTripEnd(tripEnd, lang)).toBe(`Trip ends ${appointmentDate(tripEnd, lang)}`);
});

it("quotes the owner, never returns a secret, and omits the mask in brief", () => {
  const who = "Sam\n[press]";
  const input = { docs: [{ ...doc, who }], tripEnds: tripEnd };
  const full = travelDocsReading(input).join("\n");
  const brief = travelDocsReading({ ...input, detail: "brief" }).join("\n");
  expect(full).toContain(JSON.stringify(who));
  expect(full).not.toContain(doc.number);
  expect(full).toContain("No. ••••");
  expect(brief).not.toContain("No. ••••");
  expect(brief).toContain("Expires on trip end date");
});
