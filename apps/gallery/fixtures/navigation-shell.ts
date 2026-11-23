import type { ScreenLike } from "@lmthing/ui/catalog";

const tabs = [
  { icon: "sun", label: "Today", goto: "today" },
  { icon: "leaf", label: "Plants", goto: "plants" },
];
const plants = [
  { title: "Fern", meta: "Bathroom · water today", icon: "drop", goto: "fern" },
  { title: "Basil", meta: "Kitchen · water tomorrow", icon: "leaf", trail: "none" },
  { title: "Monstera", meta: "Living room · check Friday", icon: "leaf", trail: "none" },
  { title: "Pothos", meta: "Hall · check Friday", icon: "leaf", trail: "none" },
  { title: "Aloe", meta: "Kitchen · check Saturday", icon: "leaf", trail: "none" },
  { title: "Jade", meta: "Kitchen · check Sunday", icon: "leaf", trail: "none" },
];
const fernFacts = [
  { label: "Room", value: "Bathroom", icon: "home" },
  { label: "Watering", value: "Every 7 days", icon: "drop" },
];

export const navigationScreens: Record<string, ScreenLike> = {
  today: {
    id: "today",
    components: [
      { id: "h1", c: "Header", title: "Today", sub: "Your plant care at a glance" },
      { id: "intro", c: "Hero", title: "Watering due today", sub: "Check the soil before watering." },
      { id: "plants", c: "List", rows: plants },
      // The kit says where tabs go even when the host supplies them before the action.
      { id: "tabs", c: "TabBar", tabs, at: 0 },
      { id: "log", c: "Button", label: "Log watering", icon: "drop", goto: "log" },
    ],
  },
  plants: {
    id: "plants",
    components: [
      { id: "h1", c: "Header", title: "My plants", sub: "Find a plant by room" },
      { id: "bathroom", c: "SectionTitle", text: "Bathroom" },
      { id: "bath_plants", c: "List", rows: plants.slice(0, 1) },
      { id: "kitchen", c: "SectionTitle", text: "Kitchen" },
      { id: "kitchen_plants", c: "List", rows: [plants[1], plants[4], plants[5]] },
      { id: "other_rooms", c: "SectionTitle", text: "Other rooms" },
      { id: "other_plants", c: "List", rows: plants.slice(2, 4) },
      { id: "tabs", c: "TabBar", tabs, at: 1 },
    ],
  },
  fern: {
    id: "fern",
    components: [
      { id: "h1", c: "Header", style: "back", title: "Fern" },
      { id: "facts", c: "KeyValue", pairs: fernFacts },
      { id: "note", c: "Note", text: "Keep the soil slightly damp, not soggy." },
      {
        id: "history",
        c: "Button",
        emphasis: "quiet",
        icon: "calendar",
        label: "Watering history",
        goto: "history",
      },
    ],
  },
  history: {
    id: "history",
    components: [
      { id: "h1", c: "Header", style: "back", title: "Watering history", sub: "Fern · Bathroom" },
      { id: "november", c: "SectionTitle", text: "November" },
      {
        id: "entries",
        c: "List",
        trail: "none",
        rows: ["16 November", "9 November", "2 November"].map((title) => ({
          title,
          icon: "drop",
          meta: "Watered",
        })),
      },
    ],
  },
  log: {
    id: "log",
    components: [
      { id: "h1", c: "Header", style: "back", title: "Log watering" },
      { id: "plant", c: "Field", label: "Plant", value: "Fern" },
      { id: "day", c: "Field", label: "Date", kind: "date", value: "2026-11-23" },
      { id: "note", c: "Field", label: "Watering note", value: "Soil felt dry" },
      { id: "save", c: "Button", label: "Save watering", goto: "saved" },
    ],
  },
  saved: {
    id: "saved",
    components: [
      { id: "h1", c: "Header", style: "back", title: "Watering log" },
      { id: "result", c: "Success", title: "Fern watered", sub: "Added to your care history" },
      {
        id: "facts",
        c: "KeyValue",
        pairs: [
          { label: "Date", value: "23 November", icon: "calendar" },
          { label: "Next check", value: "30 November", icon: "drop" },
        ],
      },
    ],
  },
};

export const navigationRoots = tabs.map(({ goto }) => goto);
export function navigationStart(id: string): string[] {
  if (navigationRoots.includes(id)) return [id];
  if (id === "fern") return ["plants", id];
  if (id === "history") return ["plants", "fern", id];
  if (id === "log") return ["today", id];
  if (id === "saved") return ["today", id];
  return ["today"];
}
