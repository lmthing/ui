import { z } from "zod";

/** A calendar date, `YYYY-MM-DD`, that exists. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number) as [number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }, "Use a real date as YYYY-MM-DD")
  .meta({ kind: "date" });

/** A time of day, `HH:MM`, 24 hours. */
export const clock = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")
  .meta({ kind: "time" });
