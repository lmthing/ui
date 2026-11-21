import type { AttachmentTarget, Meta } from "../../meta";
import type { Values } from "../act";
import type { Affordance } from "../affordances";

export const mediaHostKey = "$mediaHost";
export const attachmentKey = (target: string) => `$attachment/${target}`;
export const clipKey = (target: string) => `$clip/${target}`;
export const validMediaReference = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export type MediaOffer =
  | { kind: "attachment"; address: string; part: string; spec: AttachmentTarget }
  | { kind: "playback"; address: string; video: boolean };
export type MediaHostGate = (request: MediaOffer) => boolean;
export type AttachmentStatus = { phase: "pending" | "ready" | "error"; present: boolean };
export const attachmentOwner = ({ address, part }: Extract<MediaOffer, { kind: "attachment" }>) =>
  part === "root" ? address : address.slice(0, -part.length - 1);

const slot = <T>(map: Readonly<Partial<Record<string, T>>> | undefined, part: string) =>
  map && Object.hasOwn(map, part) ? map[part] : undefined;

export function mediaOffer(
  meta: Meta,
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

export function mediaAffordance(offer: Affordance, media: MediaOffer, instance: string, values: Values) {
  const gate = values[mediaHostKey] as MediaHostGate | undefined;
  if (typeof gate !== "function" || !gate(media)) return [];
  const target = offer.address.slice(instance.length + 1) || "root";
  if (media.kind === "playback") {
    const state = values[`${instance}/${clipKey(target)}`];
    return [
      { ...offer, detail: state === "error" ? ":error" : state === true ? ":playing" : ":stopped", media },
    ];
  }
  if (media.spec.source) {
    const owner = attachmentOwner(media);
    const source =
      [owner.slice(instance.length + 1), media.spec.source === "root" ? "" : media.spec.source]
        .filter(Boolean)
        .join("/") || "root";
    if (!(values[`${instance}/${attachmentKey(source)}`] as AttachmentStatus | undefined)?.present) return [];
  }
  const status = values[`${instance}/${attachmentKey(target)}`] as AttachmentStatus | undefined;
  return [{ ...offer, detail: `:${media.spec.intent}${status ? `:${status.phase}` : ""}`, media }];
}
