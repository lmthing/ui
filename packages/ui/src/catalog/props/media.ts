import { z } from "zod";

/** A recording by reference (`lib:<tag>` or `local:<n>`), played by the host. Never a URL or a file path. */
export const media = z
  .string()
  .max(64)
  .regex(/^(lib:[a-z][a-z0-9_]*|local:[1-9][0-9]*)$/)
  .meta({ kind: "media", max: 64 });
