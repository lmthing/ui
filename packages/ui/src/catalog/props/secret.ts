import { z } from "zod";

/** Redacted wire text (for example a synthetic credential). Real values belong in host-only bindings. */
export function secret(max: number) {
  return z.string().max(max).meta({ kind: "secret", max });
}
