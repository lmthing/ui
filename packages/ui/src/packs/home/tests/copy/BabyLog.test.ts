import { expect, it } from "vitest";
import { babyLabels } from "../../copy";

it("keeps every baby-entry kind and idle label unchanged", () => {
  expect(babyLabels).toEqual({
    feed_left: "Feed left",
    feed_right: "Feed right",
    bottle: "Bottle",
    nappy: "Nappy",
    sleep: "Sleep",
    none: "None running",
  });
});
