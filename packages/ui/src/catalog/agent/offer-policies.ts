import type { Meta } from "../meta";
import type { Tier } from "../types";
import type { Affordance } from "./affordances";
import { hostOffer, type HostActionPolicy } from "./host-commands";

type Props = Record<string, unknown>;

export function hostOffers(
  meta: Meta,
  props: Props,
  instance: string,
  offered: Affordance[],
  policy: HostActionPolicy | undefined,
  rows: ReadonlyMap<string, Props> | undefined,
) {
  if (!meta.hostCommands && !policy) return offered;
  return offered.flatMap((offer) => {
    const allowed = hostOffer(
      meta,
      props,
      instance,
      offer,
      partTierAt(meta, props, offer.part),
      policy,
      rows,
    );
    return allowed ? [allowed] : [];
  });
}

/** Resolve a part against live props, without changing the component's tier. */
export function partTierAt(meta: Meta, props: Props, part: string): Tier {
  const rule = Object.hasOwn(meta.partTiersBy ?? {}, part) ? meta.partTiersBy![part] : undefined;
  const value = rule && props[rule.prop];
  if (rule && ["string", "number", "boolean"].includes(typeof value)) {
    const key = String(value);
    if (Object.hasOwn(rule.tiers, key) && rule.tiers[key]) return rule.tiers[key];
  }
  return meta.partTiers?.[part] ?? meta.tier;
}
