import type { ScreenLike } from "@lmthing/ui/catalog";

export const themeReferenceScreens = [
  {
    id: "list",
    components: [
      { id: "header", c: "Header", title: "Today’s walks", sub: "Thursday, May 14" },
      {
        id: "walks",
        c: "List",
        trail: "none",
        rows: [
          { title: "Clover", meta: "8:30 AM · Riverside", icon: "paw" },
          { title: "Juniper", meta: "10:00 AM · Oak Park", icon: "paw" },
          { title: "Scout", meta: "1:15 PM · North Loop", icon: "paw" },
          { title: "Maple", meta: "3:00 PM · Oak Park", icon: "paw" },
          { title: "Otis", meta: "4:30 PM · Riverside", icon: "paw" },
        ],
      },
      { id: "new_walk", c: "Button", label: "New walk", icon: "plus" },
    ],
  },
  {
    id: "dashboard",
    components: [
      { id: "header", c: "Header", title: "Weekly activity", sub: "May 11–17" },
      {
        id: "summary",
        c: "Stats",
        tiles: [
          { label: "Walks", value: "24" },
          { label: "Distance", value: "38.6", unit: "km" },
        ],
      },
      {
        id: "chart",
        c: "Bars",
        title: "Walks by day",
        detail: "brief",
        active: 3,
        points: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => ({
          label,
          value: [2, 5, 3, 6, 4, 3, 1][index]!,
        })),
      },
    ],
  },
  {
    id: "form",
    components: [
      { id: "header", c: "Header", title: "Book a walk", sub: "Choose a time and place" },
      { id: "dog", c: "Field", label: "Dog name", value: "Clover" },
      { id: "route", c: "Field", label: "Route", value: "Riverside" },
      { id: "time", c: "Field", label: "Start time", kind: "time", value: "08:30" },
      { id: "notes", c: "Field", label: "Notes", value: "Use the south entrance" },
      { id: "save", c: "Button", label: "Save walk" },
    ],
  },
] satisfies ScreenLike[];
