import type { ScreenLike } from "@lmthing/ui/catalog";

export const choiceFitScreen = {
  id: "class_schedule",
  components: [
    { c: "Header", id: "header", title: "Class schedule" },
    {
      c: "Segmented",
      id: "classes",
      filter: { list: "schedule", field: "category" },
      options: [
        { label: "All classes", view: { empty: "No classes this week" } },
        { label: "Strength work", view: { match: "strength", empty: "No strength classes" } },
        { label: "Cardio express", view: { match: "cardio", empty: "No cardio classes" } },
        { label: "Mobility flow", view: { match: "mobility", empty: "No mobility classes" } },
      ],
    },
    {
      c: "List",
      id: "schedule",
      lead: "none",
      trail: "none",
      rows: [
        { title: "Strength circuit", meta: "Monday · 08:00", category: "strength" },
        { title: "Spin express", meta: "Tuesday · 12:00", category: "cardio" },
        { title: "Mobility flow", meta: "Friday · 09:00", category: "mobility" },
      ],
    },
  ],
} satisfies ScreenLike;
