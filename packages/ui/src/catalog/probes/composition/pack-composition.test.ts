import { expect, it } from "vitest";
import {
  components,
  packArchetypes,
  packComposition,
  defaultLines,
  scoreComposition,
} from "@lmthing/ui/catalog";

it("completes and validates every booking recipe from neutral cast fallbacks", () => {
  for (const meta of packArchetypes.booking) {
    const adapted = packComposition(meta);
    for (const layout of Object.keys(meta.layouts)) {
      const screen = defaultLines(adapted, layout, { things: [], items: [] }, components);
      expect(scoreComposition(JSON.stringify(screen), adapted, layout, components).issues).toEqual([]);
    }
  }
});
