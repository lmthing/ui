import {
  appointmentDate,
  compactMoneyLine,
  localeOf,
  moneyLine,
  numberLine,
  pluralForm,
} from "../../../catalog";
import { inventoryWordsFor } from "../lang";

type ListingRecord = {
  title: string;
  price: number;
  per: "month" | "week" | "none";
  beds: number;
  baths: number;
  area: number;
  areaUnit: "m2" | "ft2";
  where: string;
  from?: string | undefined;
  about?: string | undefined;
  detail: "full" | "brief";
};

function areaLine(area: number, lang?: string) {
  return new Intl.NumberFormat(localeOf(lang), {
    useGrouping: false,
    ...(area < 1e4
      ? { maximumFractionDigits: 2 }
      : { notation: area < 1e15 ? "compact" : "scientific", maximumSignificantDigits: 3 }),
  }).format(area);
}

export function listingCopy(input: ListingRecord, lang?: string) {
  const words = inventoryWordsFor(lang).listing;
  return {
    price:
      input.price < 1e7
        ? moneyLine(input.price, undefined, undefined, lang)
        : compactMoneyLine(input.price, undefined, lang),
    per: input.per === "none" ? undefined : words.per[input.per],
    beds: words.beds(numberLine(input.beds, lang), pluralForm(input.beds, lang)),
    baths: words.baths(areaLine(input.baths, lang), pluralForm(input.baths, lang)),
    area: areaLine(input.area, lang),
    areaUnit: words.areaUnit[input.areaUnit],
    from: input.from ? words.available(appointmentDate(input.from, lang)) : undefined,
    about: input.detail === "full" ? input.about : undefined,
  };
}

export function listingReading(input: ListingRecord, lang?: string): string[] {
  const words = inventoryWordsFor(lang).listing;
  const { price, per, beds, baths, area, areaUnit, from, about } = listingCopy(input, lang);
  const fields = [
    input.title,
    per ? price + words.unitSpace + per : price,
    beds,
    baths,
    area + words.unitSpace + areaUnit,
    input.where,
    from,
    about,
    words.contact,
    words.save,
  ];
  return [fields.filter((line) => line !== undefined).join(words.separator)];
}
