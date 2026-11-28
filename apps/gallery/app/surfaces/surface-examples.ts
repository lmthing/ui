import type { OutsideSurfaceContent, OutsideSurfaceKind, OutsideSurfaceProps } from "@lmthing/ui/kit";

export const app = { name: "Ledge", icon: "leaf" } satisfies OutsideSurfaceProps["app"];

export const examples = {
  LockScreen: { title: "Check the fern tomorrow", body: "Feel the top of the soil before watering." },
  Widget: { title: "2 plants to check", body: "Fern and pothos" },
  Message: { title: "A care note for the fern", body: "Let the top of the soil dry before watering again." },
} satisfies Record<OutsideSurfaceKind, OutsideSurfaceContent>;

export const labels = { LockScreen: "Lock screen", Widget: "Widget", Message: "Message" };
