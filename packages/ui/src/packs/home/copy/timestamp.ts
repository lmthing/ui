import { z } from "zod";
import { appointmentDate, timeOfDayLine } from "../../../catalog";

const dateTime = z.iso.datetime({ offset: true });

// Keep the strict Writer grammar simple; Zod still verifies the calendar and offset.
export const homeTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => dateTime.safeParse(value).success, "Use a real ISO datetime with an offset");

export const homeTimestampParts = (at: string, lang?: string) => ({
  date: appointmentDate(at.slice(0, 10), lang),
  clock: timeOfDayLine(at.slice(11, 16), lang),
});
