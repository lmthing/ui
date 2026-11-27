import type { ImageSlot, ScreenLike } from "@lmthing/ui/catalog";

export const artStyleWidth = 390;
export const artStyleHeight = 760;
export const artStyleTheme = { preset: "calm", accent: "moss", mode: "light" } as const;
export const artStyleTitle = "Ledge";

export const artStyleIcon = { kind: "app_icon", subject: "split monstera leaf" } satisfies ImageSlot;
export const artStyleScreen = {
  id: "ledge",
  components: [
    {
      id: "hero",
      c: "Hero",
      media: "cover",
      title: "Today’s plant care",
      sub: "Check the top 2 cm of soil before watering.",
      photo: { kind: "hero", subject: "potted monstera on a greenhouse bench" },
    },
    {
      id: "monstera",
      c: "Card",
      media: "thumb",
      title: "Swiss cheese plant",
      body: "East window · Water today",
      photo: { kind: "plant", subject: "potted swiss cheese monstera" },
    },
    {
      id: "fern",
      c: "Card",
      media: "thumb",
      title: "Bird’s nest fern",
      body: "Bathroom shelf · Check soil",
      photo: { kind: "plant", subject: "potted bird’s nest fern" },
    },
    {
      id: "aloe",
      c: "Card",
      media: "thumb",
      title: "Spotted aloe",
      body: "South sill · Water on Friday",
      photo: { kind: "plant", subject: "potted spotted aloe vera" },
    },
    {
      id: "empty",
      c: "Empty",
      title: "No repotting due",
      sub: "Plants due for a bigger pot will appear here.",
      photo: { kind: "empty_state", subject: "empty terracotta pot and a packet of seeds" },
    },
  ],
} satisfies ScreenLike;
