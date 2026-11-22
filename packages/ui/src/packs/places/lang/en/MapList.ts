export const words = {
  mapListDistance: (value: string) => `${value} km`,
  mapListView: "View places",
  mapListMap: "With map",
  mapListList: "Just the list",
  mapListPin: (name: string) => `Select ${name} on the map`,
  mapListReading: (name: string, distance: string) => `${JSON.stringify(name)}: ${distance}`,
  mapListSplit: "Map + list",
  mapListMapOnly: "Map",
  mapListListOnly: "List",
};
