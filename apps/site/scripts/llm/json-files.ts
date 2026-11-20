import type { SiteData } from "../site-types";
import { cat, type Def } from "./catalog";

/** catalog.json: the writer schema (`writerFormat`) for core, and one per pack from that pack's built components. */
export function catalogJson(data: SiteData): string {
  const core = cat.createRegistry({ packs: [] });
  const packs: Record<string, unknown> = {};
  for (const pack of data.packs) {
    const registry = cat.createRegistry({ includeDrafts: true, packs: [pack.id] });
    const ids = pack.items.filter((i) => i.state === "ready").map((i) => i.id);
    if (!ids.length) continue;
    const defs = ids.map((id) => cat.components[id] as Def);
    packs[pack.id] = { ids, schema: cat.writerFormat({ ids, defs }), scope: registry.ids.length };
  }
  const coreIds = core.ids.filter((id) => !core.packOf[id]);
  const coreDefs = coreIds.map((id) => cat.components[id] as Def);
  const body = {
    note: "writerFormat(registry): a line is one object; `c` is a constant per branch. Generated at build time.",
    core: { ids: coreIds, schema: cat.writerFormat({ ids: coreIds, defs: coreDefs }) },
    packs,
  };
  return JSON.stringify(body);
}

/** components.json: one row per component. */
export function componentsJson(data: SiteData, base: string): string {
  return JSON.stringify(
    data.items.map((i) => ({
      id: i.id,
      name: i.id,
      group: i.group,
      pack: i.pack,
      status: i.state,
      purpose: i.purpose,
      url: `${base}c/${i.id}.md`,
    })),
    null,
    1,
  );
}
