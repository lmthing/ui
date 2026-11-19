import raw from "../generated/site-data.json";
import type { SiteData } from "../../scripts/site-types";

export const site = raw as unknown as SiteData;
export const itemById = new Map(site.items.map((item) => [item.id, item]));
export const packById = new Map(site.packs.map((pack) => [pack.id, pack]));
/** Gallery screenshot of a component's first example (calm, light), for thumbnails. */
export const shotOf = (id: string) => `gallery/shots/${id}.card.jpg`;
