import { expect, it } from "vitest";
import { probePackIndex } from "./probe-pack-index";
import { packs } from "@lmthing/ui/catalog";

it("includes the booking guide's commerce boundary without registering that pack", () => {
  const index = probePackIndex(packs);
  expect(index.ids).toContain("commerce");
  expect(index.prompt).toContain("commerce: selling goods");
  expect(packs).not.toHaveProperty("commerce");
});
