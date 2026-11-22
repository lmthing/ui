import type { ScreenController } from "../../interact";
import type { SequenceState } from "../../../catalog";

const tapMs = 250;
type Transport = Pick<ScreenController, "act" | "actionsAt" | "store">;

export function sequenceTransport(controller: Transport, address: string) {
  const action = () => {
    const offered = controller.actionsAt(address);
    if (offered.includes("pause")) return "pause";
    if (offered.includes("play")) return "play";
  };
  const send = (action: "pause" | "play") => controller.act({ address, action }).ok;
  return { action, send };
}

export function beginSequenceHold(
  controller: Transport,
  address: string,
  key: string,
  at: number,
  tap: () => void,
) {
  const transport = sequenceTransport(controller, address);
  const state = () => controller.store.get(key) as SequenceState | undefined;
  const running = state()?.since !== undefined;
  const paused = running && transport.action() === "pause" && transport.send("pause") ? state() : undefined;
  return (releasedAt?: number) => {
    // Do not undo a stop, seek, or a different playback decision made during the hold.
    if (paused?.elapsedMs !== undefined && paused === state()) transport.send("play");
    if (releasedAt !== undefined && releasedAt - at < tapMs) tap();
  };
}
