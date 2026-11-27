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
