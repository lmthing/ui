import { createContext } from "react";

export type ReceivingRecord = { component: string; reference: string; fromRole: string; toRole: string };
export const RecordArrivalContext = createContext<ReceivingRecord | undefined>(undefined);
const spent = new WeakSet<ReceivingRecord>();

export function expireRecordArrival(cue: ReceivingRecord) {
  spent.add(cue);
}

export function receiptPose(props: Record<string, unknown>) {
  const { reference, fromRole, toRole, phase } = props;
  if (
    typeof reference !== "string" ||
    !reference ||
    typeof fromRole !== "string" ||
    !fromRole ||
    typeof toRole !== "string" ||
    !toRole
  )
    return;
  return { record: JSON.stringify([reference, fromRole, toRole]), phase };
}

export function isRecordArrival(from: ReturnType<typeof receiptPose>, to: ReturnType<typeof receiptPose>) {
  return from?.phase === "waiting" && to?.phase === "received" && from.record === to.record;
}

export function matchesReceived(cue: ReceivingRecord, pose: ReturnType<typeof receiptPose>) {
  return !spent.has(cue) && pose?.phase === "received" && receiptPose(cue)?.record === pose.record;
}
