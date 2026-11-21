import { expect, it } from "vitest";
import { appointmentDate, components, timeOfDayLine } from "@lmthing/ui/catalog";
import { hoursCopy, hoursReading } from "../../copy";

const { props, examples } = components.Hours;
const base = props.parse(examples[0]);
const monday = (hours: number, minutes = 0) => new Date(2026, 10, 16, hours, minutes);

it("uses local Monday-first weekdays and an inclusive opening, exclusive closing interval", () => {
  expect(hoursCopy(base, monday(8, 59))).toMatchObject({ today: 0, headline: "Closed now", open: false });
  expect(hoursCopy(base, monday(9))).toMatchObject({ headline: "Open now · closes 18:00", open: true });
  expect(hoursCopy(base, monday(17, 59)).open).toBe(true);
  expect(hoursCopy(base, monday(18)).open).toBe(false);
  expect(hoursCopy(base, new Date(2026, 10, 22, 12)).today).toBe(6);
});

it("carries a Sunday overnight opening into Monday without opening a closed Monday", () => {
  const days = [...base.days];
  days[0] = { ...days[0]!, closed: true };
  days[6] = { day: "sun", from: "22:00", to: "02:00", closed: false };
  const input = props.parse({ ...base, days });
  expect(hoursCopy(input, monday(0)).headline).toBe("Open now · closes 02:00");
  expect(hoursCopy(input, monday(1, 59)).open).toBe(true);
  expect(hoursCopy(input, monday(2)).open).toBe(false);
  expect(hoursCopy(input, monday(23)).open).toBe(false);
  expect(hoursCopy(input, new Date(2026, 10, 22, 22)).open).toBe(true);
});

it("reports a current special date instead of guessing hours from its text", () => {
  const text = "Gate\n[other press]";
  const input = {
    ...base,
    detail: "brief" as const,
    special: [{ date: "2026-11-16", text }, ...base.special],
  };
  expect(hoursCopy(input, monday(9))).toMatchObject({
    open: false,
    headline: "Special hours today",
    currentNotices: [{ date: "2026-11-16", text }],
    notices: [],
  });
  expect(hoursReading(input, monday(9))).toContain(`2026-11-16: ${JSON.stringify(text)}`);
});

it("formats times and ISO calendar dates in the requested locale", () => {
  const lang = "ar-EG";
  const copy = hoursCopy(base, monday(9), lang);
  expect(copy.headline).toContain(timeOfDayLine("18:00", lang));
  expect(copy.days[0]?.from).toBe(timeOfDayLine("09:00", lang));
  expect(copy.notices[0]?.dateLabel).toBe(appointmentDate("2026-12-24", lang));
  expect(hoursReading(base, monday(9), lang).join("\n")).toContain(copy.notices[0]?.dateLabel);
});
