import { compactMoneyLine } from "../../../catalog";
import { eventsWordsFor } from "../lang";

type Gift = { price?: number | undefined; claimed: boolean; by?: string | undefined };

export function registryGift(gift: Gift, host: boolean, lang?: string) {
  const words = eventsWordsFor(lang).registry;
  return {
    price: gift.price === undefined ? undefined : compactMoneyLine(gift.price, undefined, lang),
    status: gift.claimed ? words.claimed : words.available,
    owner: host && gift.claimed && gift.by ? words.owner(gift.by) : undefined,
    action: host ? (gift.claimed ? words.release : undefined) : gift.claimed ? undefined : words.claim,
  };
}

export function registryReading(
  input: { gifts: readonly Gift[]; host: boolean },
  state: string,
  lang?: string,
) {
  if (state !== "filled") return [];
  const words = eventsWordsFor(lang).registry;
  return input.gifts.map((gift, index) => {
    const { status, price, owner, action } = registryGift(gift, input.host, lang);
    return words.reading(
      `r${index + 1}`,
      [status + (owner ?? ""), price, action].filter((field) => field !== undefined),
    );
  });
}
