import type { DeviceData } from "@lmthing/ui/catalog";
import { read, type Source } from "./worked-source";

/** These worked screens already have matching synthetic records in the catalog previews. */
export function trips(source: Source): DeviceData {
  const { Weather, Converter } = source.defs;
  return {
    ...Weather.meta.previewDeviceData({ input: read(source, Weather), state: "filled" }),
    ...Converter.meta.previewDeviceData({ input: read(source, Converter), state: "filled" }),
  };
}

export function team(source: Source): DeviceData {
  const { TimeClock } = source.defs;
  return TimeClock.meta.previewDeviceData({ input: read(source, TimeClock), state: "filled" });
}

export function places(source: Source): DeviceData {
  const { Departures, DeliveryTracker, MapList, PlaceCard } = source.defs;
  const { places } = read(source, MapList);
  const { name, goto } = read(source, PlaceCard);
  const results = places.map((row, index) => ({ ...row, distanceKm: (index + 1) * 0.4 }));
  return {
    ...Departures.meta.previewDeviceData({ input: read(source, Departures), state: "filled" }),
    ...DeliveryTracker.meta.previewDeviceData({ input: read(source, DeliveryTracker), state: "filled" }),
    place_results: [{ shown: results, total: results.length }],
    place_details: [
      {
        name,
        goto,
        localTime: "13:00",
        distanceKm: results.find((row) => row.name === name && row.goto === goto)?.distanceKm,
      },
    ],
  };
}
