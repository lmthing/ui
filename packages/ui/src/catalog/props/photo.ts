import { z } from "zod";

export const photo = z
  .string()
  .max(64)
  .regex(/^(lib:[a-z][a-z0-9_]*|local:[1-9][0-9]*)$/)
  .meta({ kind: "photo", max: 64 });
