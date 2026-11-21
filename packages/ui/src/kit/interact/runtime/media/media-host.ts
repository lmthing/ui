import {
  attachmentSource,
  validMediaReference,
  type MediaHostGate,
  type MediaOffer,
  type AttachmentStatus,
} from "../../../../catalog";
import type { AttachmentCommand } from "../../index";
import type { Confirmation, ControllerOptions } from "../index";

export type AttachmentOffer = Extract<MediaOffer, { kind: "attachment" }>;
export type AttachmentEntry = {
  offer: AttachmentOffer;
  phase: AttachmentStatus["phase"];
  reference?: string | undefined;
  revision?: symbol | undefined;
};
export type AttachmentEntries = Map<string, AttachmentEntry>;

export function registeredAttachment(entries: AttachmentEntries, address: string, identity?: string) {
  const entry = entries.get(address);
  if (!entry || entry.offer.identity !== identity) return;
  let current = entry;
  const seen = new Set([address]);
  for (let source = attachmentSource(current.offer); source; source = attachmentSource(current.offer)) {
    const input = entries.get(source);
    if (
      !input ||
      input.offer.identity !== identity ||
      input.revision !== current.offer.sourceRevision ||
      seen.has(source)
    )
      return;
    seen.add(source);
    current = input;
  }
  return entry;
}

const confirmedAttachments = new WeakMap<Confirmation, AttachmentOffer>();
export function bindMediaConfirmation(confirmation: Confirmation, offer?: MediaOffer) {
  if (offer?.kind !== "attachment") return confirmation;
  confirmation = { ...confirmation, mediaBound: true };
  confirmedAttachments.set(confirmation, offer);
  return confirmation;
}
export function matchesMediaConfirmation(confirmation: Confirmation, offer?: MediaOffer) {
  const bound = confirmedAttachments.get(confirmation);
  return confirmation.mediaBound
    ? Boolean(bound && sameAttachment(bound, offer))
    : offer?.kind !== "attachment";
}
export function sameAttachment(before: AttachmentOffer, after?: MediaOffer) {
  return (
    after?.kind === "attachment" &&
    before.address === after.address &&
    before.spec.intent === after.spec.intent &&
    before.spec.source === after.spec.source &&
    before.identity === after.identity &&
    before.sourceRevision === after.sourceRevision
  );
}

export function attachmentCommand(screen: string, offer: AttachmentOffer): AttachmentCommand {
  const { address, spec } = offer;
  const source = attachmentSource(offer);
  return {
    address: `${screen}/${address}`,
    intent: spec.intent,
    ...(source ? { source: `${screen}/${source}` } : {}),
  };
}

export function mediaHostGate(
  options: ControllerOptions,
  screen: string,
  entries: AttachmentEntries,
): MediaHostGate | undefined {
  if (!options.attachments && !options.resolvePlayback) return;
  return {
    allows(request) {
      if (options.interactive === false) return false;
      try {
        if (request.kind === "playback")
          return Boolean(
            options.media && validMediaReference(options.resolvePlayback?.(`${screen}/${request.address}`)),
          );
        return Boolean(options.attachments?.canRun(attachmentCommand(screen, request)));
      } catch {
        return false;
      }
    },
    attachment(address, identity) {
      const entry = registeredAttachment(entries, address, identity);
      return (
        entry && { phase: entry.phase, present: entry.reference !== undefined, revision: entry.revision }
      );
    },
  };
}
