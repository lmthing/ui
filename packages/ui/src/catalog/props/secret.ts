import { z } from "zod";

/** A value a person typed that agents must never see (a password, a code). Reads as `(secret)`. */
export function secret(max: number) {
  return z.string().max(max).meta({ kind: "secret", max });
}
