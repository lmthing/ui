import { z } from "zod";
export const icons = ["dot", "leaf", "drop", "dog", "calendar", "clock", "check", "chevron_right"] as const;

export const icon = z.enum(icons).meta({ kind: "icon", values: icons });
