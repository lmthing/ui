import { createFont } from "tamagui";
import { fontFamilies, type as typography } from "../../catalog";

export const kitFonts = Object.fromEntries(
  Object.entries(fontFamilies).map(([name, family]) => [
    name,
    createFont({
      family,
      size: Object.fromEntries(Object.entries(typography).map(([role, value]) => [role, value.size])),
      lineHeight: Object.fromEntries(
        Object.entries(typography).map(([role, value]) => [role, value.lineHeight]),
      ),
      weight: Object.fromEntries(Object.entries(typography).map(([role, value]) => [role, value.weight])),
    }),
  ]),
);
export const kitFontAssets = {};
