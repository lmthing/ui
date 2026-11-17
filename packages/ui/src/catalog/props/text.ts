import { z } from "zod";

export function text(max: number) {
  return z.string().trim().min(1).max(max).meta({ kind: "text", max });
}
