## Purpose

Follow an order through fulfillment or move it along as the seller.

## Pick

Track fulfillment milestones on one goods order, with timestamps and a seller's next-stage action. Not a multi-step form (Steps), a map (DeliveryTracker), or an order receipt (OrderSummary).

## Writer

- at is the zero-based current step index and must exist in the steps array. Use a real HH:MM time when known.
- If asked to suppress an authored secondary status sentence, write "detail":"brief","density":null,"surface":null unless a different density or surface was requested. Never emit "card" or "comfortable" to represent an unset axis. Keep the supplied line.
- Use style "carrier" for parcel tracking: carrier, trackingNumber, optional proofPhoto; use steps with times for checkpoints. Use style "pickup" with pickupCode and bay (bay or locker label); write seller false for the buyer and the “I’m here” button.
