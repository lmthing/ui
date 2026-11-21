import { describe, expect, it } from "vitest";
import { moneyLine } from "@lmthing/ui/catalog";
import { registryGift, registryReading } from "../../copy";
import { eventsWordsFor } from "../../lang";

describe("registry copy", () => {
  const gift = { claimed: true, price: 1234.5, by: "Imani Cole" };
  const words = eventsWordsFor().registry;

  it.each(["en", "en-US", "en-GB"])("uses the same price and status for reading in %s", (lang) => {
    const price = moneyLine(gift.price, undefined, undefined, lang);
    const owner = words.owner(gift.by);
    expect(registryGift(gift, true, lang)).toEqual({
      status: words.claimed,
      price,
      owner,
      action: words.release,
    });
    expect(registryReading({ gifts: [gift], host: true }, "filled", lang)).toEqual([
      words.reading("r1", [words.claimed + owner, price, words.release]),
    ]);
  });

  it("keeps zero prices and excludes owner text for guests and unclaimed gifts", () => {
    expect(registryGift(gift, false).owner).toBeUndefined();
    expect(registryGift({ ...gift, claimed: false, price: 0 }, true)).toEqual({
      status: words.available,
      price: moneyLine(0),
      owner: undefined,
      action: undefined,
    });
    expect(registryGift({ claimed: true }, true).price).toBeUndefined();
    expect(registryReading({ gifts: [gift], host: true }, "empty")).toEqual([]);
    expect(registryReading({ gifts: [gift], host: true }, "success")).toEqual([]);
  });
});
