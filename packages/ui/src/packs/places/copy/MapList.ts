import { z } from "zod";
import { numberLine, screenId, text, wordsFor, type DeviceData } from "../../../catalog";
import { placesWordsFor } from "../lang";

const coordinate = z.number().min(0).max(1);
const position = z.object({ x: coordinate, y: coordinate });
const placeKey = z.object({ name: text(28), goto: screenId });
type Place = z.output<typeof placeKey>;
const results = z.object({
  shown: z
    .array(
      placeKey.extend({
        distanceKm: z.number().nonnegative().optional().catch(undefined),
        position: position.optional().catch(undefined),
      }),
    )
    .min(1)
    .max(6),
  total: z.int().nonnegative().optional().catch(undefined),
});

// Schematic marker positions when real locations are not available.
const spots = [
  { x: 0.21, y: 0.31 },
  { x: 0.56, y: 0.23 },
  { x: 0.41, y: 0.71 },
  { x: 0.82, y: 0.69 },
  { x: 0.13, y: 0.78 },
  { x: 0.82, y: 0.24 },
] as const;

function matchingResults(places: readonly Place[], data?: DeviceData) {
  for (const entry of data?.place_results ?? []) {
    const result = results.safeParse(entry);
    if (!result.success) continue;
    const { shown } = result.data;
    if (
      shown.length === places.length &&
      shown.every(({ name, goto }, index) => name === places[index]?.name && goto === places[index]?.goto)
    )
      return result.data;
  }
}

export function mapListCopy<T extends Place>(places: readonly T[], data?: DeviceData, lang?: string) {
  const words = placesWordsFor(lang);
  const current = matchingResults(places, data);
  const remaining = (current?.total ?? 0) - places.length;
  return {
    more: remaining > 0 ? wordsFor(lang).peekCount(numberLine(remaining, lang)) : undefined,
    places: places.map((place, index) => {
      const live = current?.shown[index];
      return {
        ...place,
        position: live?.position ?? spots[index]!,
        distance:
          live?.distanceKm === undefined
            ? undefined
            : words.mapListDistance(numberLine(live.distanceKm, lang)),
      };
    }),
  };
}

export function mapListReading(
  {
    places,
    style,
    rowsVisible = style !== "map",
  }: {
    places: readonly Place[];
    style?: "split" | "map" | "list" | undefined;
    rowsVisible?: boolean;
  },
  data?: DeviceData,
  lang?: string,
) {
  const { places: rows, more } = mapListCopy(places, data, lang);
  const words = placesWordsFor(lang);
  const labels =
    style === undefined
      ? [words.mapListMap, words.mapListList]
      : [words.mapListSplit, words.mapListMapOnly, words.mapListListOnly];
  if (!rowsVisible) return labels;
  return [
    ...labels,
    ...rows.flatMap(({ name, distance }) =>
      distance === undefined ? [] : [words.mapListReading(name, distance)],
    ),
    ...(more ? [more] : []),
  ];
}

export function mapListPreview(places: readonly Place[]): DeviceData {
  const kilometres = [0.4, 0.8, 1.2, 1.6, 2, 2.4];
  return {
    place_results: [
      {
        shown: places.map(({ name, goto }, index) => ({ name, goto, distanceKm: kilometres[index] })),
        total: places.length === spots.length ? places.length + 2 : places.length,
      },
    ],
  };
}
