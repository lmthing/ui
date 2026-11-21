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
  const { name, goto } = read(source, PlaceCard);
  const map = MapList.meta.previewDeviceData({ input: read(source, MapList), state: "filled" });
  const [result] = (map.place_results ?? []) as readonly {
    shown: readonly { name: string; goto: string; distanceKm?: number }[];
  }[];
  return {
    ...Departures.meta.previewDeviceData({ input: read(source, Departures), state: "filled" }),
    ...DeliveryTracker.meta.previewDeviceData({ input: read(source, DeliveryTracker), state: "filled" }),
    ...map,
    place_details: [
      {
        name,
        goto,
        localTime: "13:00",
        distanceKm: result?.shown.find((row) => row.name === name && row.goto === goto)?.distanceKm,
      },
    ],
  };
}
