import { numberLine, percentLine } from "../../../catalog";
import { tripsWordsFor } from "../lang";

type PackingItem = { name: string; packed: boolean; qty?: number | undefined };
type Group = { label: string; items: PackingItem[] };
type Input = { groups: Group[]; detail?: "full" | "brief" | undefined };

/** Merge live checkbox flags without changing the wire items or their positions. */
export function packingRows<T extends Group>(groups: T[]): T[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item, index) => {
      const flag = (group as T & Record<string, unknown>)[`$packed_${index + 1}`];
      return typeof flag === "boolean" ? { ...item, packed: flag } : item;
    }),
  }));
}

export function packingQuantity(qty: number, lang?: string): string {
  return tripsWordsFor(lang).packing.quantity(numberLine(qty, lang));
}

export function packingProgress(groups: Group[], lang?: string) {
  const items = groups.flatMap((group) => group.items);
  const count = items.filter((item) => item.packed).length;
  const { packing } = tripsWordsFor(lang);
  const ratio = items.length ? count / items.length : 0;
  return {
    label: ratio === 1 ? packing.allPacked : packing.progress,
    amount: percentLine(count, items.length, lang),
    ratio,
  };
}

export function packingRead({ groups, detail }: Input, lang?: string): string[] {
  const { packing } = tripsWordsFor(lang);
  const { label, amount } = packingProgress(packingRows(groups), lang);
  return [
    `${label} ${amount}`,
    packing.add,
    ...groups.map(({ label, items }, index) => {
      const rows = items.map(({ name, qty }, i) => {
        const quantity = detail !== "brief" && qty !== undefined ? ` ${packingQuantity(qty, lang)}` : "";
        return `packed_${i + 1} ${JSON.stringify(name)}${quantity}`;
      });
      return `r${index + 1} ${JSON.stringify(label)}: ${rows.join(", ")}`;
    }),
  ];
}
