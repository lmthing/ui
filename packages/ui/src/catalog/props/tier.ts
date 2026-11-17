import { z } from "zod";

export const tier = z.enum(["phone", "ok", "people", "service"]).meta({ kind: "tier" });
