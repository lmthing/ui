import { z } from "zod";

export const screenId = z.string().max(64).regex(/^[a-z][a-z0-9_]*$/)
  .meta({ kind: "screen_id", max: 64 });
