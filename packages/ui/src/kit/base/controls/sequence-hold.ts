import type { ScreenController } from "../../interact";
import type { SequenceState } from "../../../catalog";

const tapMs = 250;
type Transport = Pick<ScreenController, "act" | "actionsAt" | "store">;

export function sequenceTransport(controller: Transport, address: string, key: string) {
  const action = () => {
    const offered = controller.actionsAt(address);
    if (offered.includes("pause")) return "pause";
    if (offered.includes("play")) return "play";
  };
  const send = (action: "pause" | "play") => controller.act({ address, action }).ok;
  const state = () => controller.store.get(key) as SequenceState | undefined;
  return { action, send, state };
}

export function beginSequenceHold(
  transport: ReturnType<typeof sequenceTransport> | undefined,
  at: number,
  tap: () => void,
) {
  const running = transport?.state()?.since !== undefined;
  const paused =
    running && transport?.action() === "pause" && transport.send("pause") ? transport.state() : undefined;
  return (releasedAt?: number) => {
    // Do not undo a stop, seek, or a different playback decision made during the hold.
    if (transport && paused?.elapsedMs !== undefined && paused === transport.state()) transport.send("play");
    if (releasedAt !== undefined && releasedAt - at < tapMs) tap();
  };
}
