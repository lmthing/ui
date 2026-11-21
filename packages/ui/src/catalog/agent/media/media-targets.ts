import type { AttachmentTarget, Meta } from "../../meta";
import type { Values } from "../act";
import type { Affordance } from "../affordances";
import { addressedItems } from "../visibility";

export const mediaHostKey = "$mediaHost";
export const attachmentKey = (target: string) => `$attachment/${target}`;
export const clipKey = (target: string) => `$clip/${target}`;
export const validMediaReference = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export type MediaOffer =
  | {
      kind: "attachment";
      address: string;
      part: string;
      spec: AttachmentTarget;
      identity?: string | undefined;
      sourceRevision?: symbol | undefined;
    }
  | { kind: "playback"; address: string; video: boolean };
export type MediaHostGate = {
  allows(request: MediaOffer): boolean;
  attachment(
    address: string,
    identity?: string,
  ): (AttachmentStatus & { revision?: symbol | undefined }) | undefined;
};
export type AttachmentStatus = { phase: "pending" | "ready" | "error"; present: boolean };
export const attachmentOwner = ({ address, part }: Extract<MediaOffer, { kind: "attachment" }>) =>
  part === "root" ? address : address.slice(0, -part.length - 1);
export function attachmentSource(media: Extract<MediaOffer, { kind: "attachment" }>) {
  const { source } = media.spec;
  if (!source) return;
  const owner = attachmentOwner(media);
  return source === "root" ? owner : `${owner}/${source}`;
}

const slot = <T>(map: Readonly<Partial<Record<string, T>>> | undefined, part: string) =>
  map && Object.hasOwn(map, part) ? map[part] : undefined;

export function mediaOffer(
  meta: Pick<Meta, "media" | "items">,
  instance: string,
  offer: Pick<Affordance, "address" | "part" | "action">,
): MediaOffer | undefined {
  const { address, part, action } = offer;
  const own = part === "root" ? instance : `${instance}/${part}`;
  const media = address === own ? meta.media : meta.items?.media;
  const spec = slot(media?.attachments, part);
  if (spec && action === (spec.intent === "scan" ? "scan" : "press"))
    return { kind: "attachment", address, part, spec };
  const playback = slot(media?.playback, part);
  if (playback && ["play", "pause", "stop"].includes(action))
    return { kind: "playback", address, video: Boolean(playback.video) };
}

export function mediaAffordance(
  meta: Meta,
  props: Values,
  offer: Affordance,
  media: MediaOffer,
  instance: string,
  values: Values,
) {
  const gate = values[mediaHostKey] as MediaHostGate | undefined;
  if (!gate?.allows(media)) return [];
  if (media.kind === "playback") {
    const target = offer.address.slice(instance.length + 1) || "root";
    const state = values[`${instance}/${clipKey(target)}`];
    return [
      { ...offer, detail: state === "error" ? ":error" : state === true ? ":playing" : ":stopped", media },
    ];
  }
  const owner = attachmentOwner(media);
  const row =
    owner === instance
      ? undefined
      : addressedItems(meta, props).find(({ id }) => id === owner.slice(instance.length + 1));
  const field = meta.items?.media?.identity;
  const identity = row && JSON.stringify(field && row[field] !== undefined ? row[field] : row);
  const source = attachmentSource(media);
  const sourceStatus = source ? gate.attachment(source, identity) : undefined;
  if (source && !sourceStatus?.present) return [];
  const status = gate.attachment(media.address, identity);
  return [
    {
      ...offer,
      detail: `:${media.spec.intent}${status ? `:${status.phase}` : ""}`,
      media: { ...media, identity, sourceRevision: sourceStatus?.revision },
    },
  ];
}
