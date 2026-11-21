import { appointmentDate, moneyLine } from "../../../catalog";
import { inventoryWordsFor } from "../lang";

type Purchase = {
  shop?: string | undefined;
  bought: string;
  price?: number | undefined;
  ends?: string | undefined;
  receipt?: string | undefined;
};
type Detail = "full" | "brief";

const soonDays = 30;
const msPerDay = 86_400_000;

export function warrantyStatus(ends: string, now = new Date()) {
  // Compare calendar days, not elapsed hours across a daylight-saving change.
  const day = new Date(0);
  day.setUTCFullYear(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = (Date.parse(ends) - day.getTime()) / msPerDay;
  return daysLeft < 0 ? "ended" : daysLeft <= soonDays ? "soon" : "active";
}

export function warrantyCopy(purchase: Purchase, detail: Detail, lang?: string, now = new Date()) {
  const words = inventoryWordsFor(lang).warranties;
  const { shop, bought, price, ends } = purchase;
  const full = detail === "full";
  const status = ends && warrantyStatus(ends, now);
  const date = ends && appointmentDate(ends, lang);
  return {
    shop,
    bought: full ? words.bought(appointmentDate(bought, lang)) : undefined,
    price: full && price !== undefined ? moneyLine(price, undefined, undefined, lang) : undefined,
    ends: date ? (status === "ended" ? date : words.through(date)) : words.noEnd,
    status: status && words.status[status],
    tone: status === "soon" ? ("warn" as const) : ("muted" as const),
  };
}

export function warrantyReading(
  { items, detail }: { items: Purchase[]; detail: Detail },
  lang?: string,
  now = new Date(),
): string[] {
  const words = inventoryWordsFor(lang).warranties;
  return items.map((purchase, index) => {
    const { bought, price, ends, status } = warrantyCopy(purchase, detail, lang, now);
    const fields = [bought, price, status, ends, purchase.receipt && words.receipt].filter(
      (line): line is string => Boolean(line),
    );
    return `r${index + 1} ${words.reading(fields)}`;
  });
}
