import { numberLine, pluralForm, screenId, type DeviceData } from "../../../catalog";
import { inventoryWordsFor } from "../lang";

type Spot = { name: string; goto: string };
type MovingBox = {
  code?: string | undefined;
  fragile?: boolean | undefined;
  status?: "packing" | "sealed" | "in_transit" | "unpacked" | undefined;
};
type StorageInput = MovingBox & {
  path: string[];
  spots: Spot[];
  here: string[];
  detail: "full" | "brief";
};

export function storageBoxCopy({ code, fragile, status }: MovingBox, lang?: string) {
  const words = inventoryWordsFor(lang).storage;
  return {
    code: code && words.code(code),
    qr: code && words.qr(code),
    fragile: fragile ? words.fragile : undefined,
    status: status && words.status[status],
  };
}

/** The path wire format carries labels, not links. Ancestor screens use the corresponding slug. */
export function ancestorDestination(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!slug) return undefined;
  const parsed = screenId.safeParse(/^\d|^(back|sheet)$/.test(slug) ? `spot_${slug}` : slug);
  return parsed.data;
}

function isSpotSnapshot(record: unknown): record is { goto: string; here: readonly unknown[] } {
  return (
    typeof record === "object" &&
    record !== null &&
    "goto" in record &&
    typeof record.goto === "string" &&
    "here" in record &&
    Array.isArray(record.here)
  );
}

/** Read only host-owned contents for the matching child. Missing data does not mean zero. */
export function storageCount(data: DeviceData, goto: string, lang?: string) {
  const spot = data.storage_spots?.find((record) => isSpotSnapshot(record) && record.goto === goto);
  if (!isSpotSnapshot(spot)) return undefined;
  const count = spot.here.length;
  return {
    digits: numberLine(count, lang),
    unit: inventoryWordsFor(lang).storage.countUnit(pluralForm(count, lang)),
  };
}

export function storageReading(
  { path, spots, here, detail, ...box }: StorageInput,
  lang?: string,
  data: DeviceData = {},
) {
  const words = inventoryWordsFor(lang).storage;
  const { code, fragile, status } = storageBoxCopy(box, lang);
  if (!path.length && !spots.length && !here.length && !code && !fragile && !status) return [words.emptyHere];
  const indexed = (index: number, name: string) => `r${index + 1} ${JSON.stringify(name)}`;
  return [
    ...path.map((name, index) => indexed(index, name)),
    ...[status, fragile].flatMap((line) => line ?? []),
    ...(spots.length ? [words.spots] : []),
    ...spots.map(({ name, goto }, index) => {
      const line = indexed(path.length + index, name);
      const count = detail === "full" ? storageCount(data, goto, lang) : undefined;
      return count ? `${line} ${count.digits}${count.unit}` : line;
    }),
    words.here,
    ...(here.length ? here.map((name) => JSON.stringify(name)) : [words.emptyHere]),
    ...(code ? [code] : []),
  ];
}
