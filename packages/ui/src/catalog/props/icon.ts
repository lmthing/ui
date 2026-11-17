import { z } from "zod";
import { icons } from "../icons";

export const icon = z.enum(icons).meta({ kind: "icon", values: icons });
