import type { Pack } from "../../scripts/site-types";

export type PackStatus = "live" | "in progress" | "planned";

/** live: the pack passed the catalog's ready check. in progress: some components built. planned: docs only. */
export const statusOf = (pack: Pack): PackStatus =>
  pack.ready ? "live" : pack.items.length ? "in progress" : "planned";

export const tierLabel: Record<string, string> = {
  phone: "phone",
  ok: "needs your OK",
  people: "needs other people",
  service: "needs an outside service",
};

export const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const shotLabel = (pack: Pack) =>
  `Status computed at build time: ${pack.items.filter((i) => i.state !== "draft").length} of ${pack.plannedComponents || pack.items.length} components built.`;
