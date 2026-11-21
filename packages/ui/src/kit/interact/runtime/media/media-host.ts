import {
  attachmentOwner,
  validMediaReference,
  type MediaHostGate,
  type MediaOffer,
} from "../../../../catalog";
import type { AttachmentCommand } from "../../index";
import type { ControllerOptions } from "../index";

export function attachmentCommand(
  screen: string,
  offer: Extract<MediaOffer, { kind: "attachment" }>,
): AttachmentCommand {
  const { address, spec } = offer;
  const owner = attachmentOwner(offer);
  return {
    address: `${screen}/${address}`,
    intent: spec.intent,
    ...(spec.source
      ? { source: spec.source === "root" ? `${screen}/${owner}` : `${screen}/${owner}/${spec.source}` }
      : {}),
  };
}

export function mediaHostGate(options: ControllerOptions, screen: string): MediaHostGate | undefined {
  if (!options.attachments && !options.resolvePlayback) return;
  return (request) => {
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
  };
}
