import { appointmentDate } from "../../../catalog";

import { kitchenWordsFor } from "../lang";

export const { pantryLabels } = kitchenWordsFor();

/** Calendar dates follow the device's local day, not its UTC day. */
export function pantryToday(now = new Date()): string {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Today through three days ahead is soon; a use-by date ends at local midnight. */
export function pantryDates(useBy?: string, today = pantryToday(), lang?: string) {
  const { pantryLabels } = kitchenWordsFor(lang);
  if (!useBy) return { label: pantryLabels.undated, date: pantryLabels.missing, tone: "muted" as const };
  const days = (Date.parse(`${useBy}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  return {
    label: days < 0 ? pantryLabels.expired : days <= 3 ? pantryLabels.soon : pantryLabels.dated,
    date: appointmentDate(useBy, lang),
    tone: days < 0 ? ("bad" as const) : days <= 3 ? ("warn" as const) : ("muted" as const),
  };
}

/** Sort a copy so validator-owned ids retain their original record addresses. */
export function pantryOrder<T extends { useBy?: string | undefined }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.useBy ?? "99999").localeCompare(b.useBy ?? "99999"));
}

export function pantryReading(
  input: {
    items: {
      id?: string;
      name: string;
      qty: string;
      place: "cupboard" | "fridge" | "freezer";
      useBy?: string | undefined;
    }[];
  },
  lang?: string,
): string[] {
  const { pantryLabels } = kitchenWordsFor(lang);
  return pantryOrder(input.items).flatMap((item) => {
    const expiry = pantryDates(item.useBy, undefined, lang);
    return [
      `${item.id ?? item.name}: ${item.name}`,
      item.qty,
      pantryLabels[item.place],
      expiry.label,
      expiry.date,
      ...(item.useBy ? [item.useBy] : []),
      pantryLabels.used,
    ];
  });
}
