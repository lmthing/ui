import type { ScreenLike } from "@lmthing/ui/catalog";

const tabs = [
  { label: "Garden", icon: "leaf", goto: "garden" },
  { label: "Activity", icon: "calendar", goto: "activity" },
];
const plants = [
  {
    id: "r1",
    title: "Fern",
    meta: "Bathroom · water tomorrow",
    photo: "lib:fern",
    goto: "fern",
    badge: "Soon",
    tone: "warn",
  },
  { id: "r2", title: "Basil", meta: "Kitchen · morning light", icon: "leaf", trail: "toggle" },
  { id: "r3", title: "Aloe", meta: "Office · indirect light", icon: "sun", trail: "none" },
  { id: "r4", title: "Jade", meta: "Kitchen · low water", icon: "drop", trail: "none" },
];
const recent = [
  { title: "Monstera", meta: "Living room", icon: "leaf" },
  { title: "Pothos", meta: "Hall", icon: "leaf" },
  { title: "Snake plant", meta: "Office", icon: "leaf" },
  { title: "Peperomia", meta: "Living room", icon: "leaf" },
  { title: "Calathea", meta: "Office", icon: "leaf" },
  { title: "Ivy", meta: "Hall", icon: "leaf" },
];

export type LabPhase = "ready" | "working" | "saved" | "error";

function garden(step: number): ScreenLike["components"] {
  const fern = { ...plants[0], ...(step % 2 ? { badge: "Watered", tone: "good" } : {}) };
  const rows = [plants[1], fern, plants[2], ...(step % 2 ? [plants[3]] : [])];
  return [
    { id: "heading", c: "Header", title: "My garden", sub: "Your notes and watering schedule" },
    { id: "today", c: "SectionTitle", text: "Today’s plants", link: { label: "Update list" } },
    { id: "plants", c: "List", lead: "thumb", rows: step % 2 ? rows : [fern, plants[1], plants[2]] },
    { id: "care", c: "SectionTitle", text: "Care checklist" },
    {
      id: "tasks",
      c: "Checklist",
      items: [{ text: "Mist the monstera" }, { text: "Check the fern’s soil" }],
    },
    { id: "all", c: "SectionTitle", text: "Other plants" },
    { id: "recent", c: "List", trail: "none", rows: recent },
    { id: "nav", c: "TabBar", tabs, at: 0 },
  ];
}

function activity(step: number, loading: boolean): ScreenLike["components"] {
  const watered = step % 2 ? 5 : 2;
  return [
    { id: "heading", c: "Header", title: "Activity", sub: "Your week in the garden" },
    { id: "week", c: "SectionTitle", text: "This week", link: { label: "Refresh" } },
    {
      id: "total",
      c: "Hero",
      state: loading ? "loading" : "filled",
      style: "number",
      title: String(watered),
      sub: "Plants watered",
    },
    { id: "goal", c: "Progress", style: "bars", bars: [{ label: "Watering goal", value: watered, of: 6 }] },
    { id: "advance", c: "Button", label: "Update totals", emphasis: "quiet" },
    { id: "nav", c: "TabBar", tabs, at: 1 },
  ];
}

function fern(phase: LabPhase): ScreenLike["components"] {
  const state = phase === "working" ? "loading" : phase === "error" ? "error" : "filled";
  return [
    {
      id: "heading",
      c: "Header",
      style: "back",
      title: "Fern",
      sub: "Bathroom",
      action: { icon: "more", label: "Plant details", goto: "sheet" },
    },
    ...(phase === "saved"
      ? [{ id: "done", c: "Success", title: "Watering logged", sub: "Saved to your garden activity." }]
      : []),
    { id: "plant_photo", c: "Photo", photo: "lib:fern", state },
    {
      id: "details",
      c: "Sheet",
      title: "Plant details",
      items: [
        { label: "Light", value: "Indirect" },
        { label: "Water", value: "Every week" },
      ],
    },
    ...(phase === "saved"
      ? []
      : [
          { id: "error", c: "Button", label: "Try an error", emphasis: "quiet" },
          { id: "save", c: "Button", label: phase === "working" ? "Saving watering…" : "Log watering" },
        ]),
  ];
}

export function motionLabScreen(route: string, step: number, phase: LabPhase, loading: boolean): ScreenLike {
  return {
    id: route,
    components:
      route === "activity" ? activity(step, loading) : route === "fern" ? fern(phase) : garden(step),
  };
}
