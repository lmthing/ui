import { z } from "zod";
import { icon, text } from "../../catalog";

export const outsideSurfaceKinds = ["LockScreen", "Widget", "Message"] as const;
export type OutsideSurfaceKind = (typeof outsideSurfaceKinds)[number];

export const outsideSurfaceContent = z.strictObject({ title: text(120), body: text(160).optional() });
export type OutsideSurfaceContent = z.infer<typeof outsideSurfaceContent>;

export const surfaceIdentity = z.strictObject({ name: text(60), icon });
export type SurfaceIdentity = z.infer<typeof surfaceIdentity>;

export type SurfaceMeta = {
  id: OutsideSurfaceKind;
  purpose: string;
  tier: "ok" | "phone" | "service";
  realPath: string;
};

export const outsideSurfaceMeta = {
  LockScreen: {
    id: "LockScreen",
    purpose: "Depict a reminder on a lock screen.",
    tier: "ok",
    realPath: "A real lock-screen reminder needs notification permission.",
  },
  Widget: {
    id: "Widget",
    purpose: "Depict a glanceable home-screen widget.",
    tier: "phone",
    realPath: "A real widget needs a built app and placement on the home screen.",
  },
  Message: {
    id: "Message",
    purpose: "Depict the content of an outside message.",
    tier: "service",
    realPath: "A real message needs a connected messaging service.",
  },
} as const satisfies { [K in OutsideSurfaceKind]: SurfaceMeta & { id: K } };
