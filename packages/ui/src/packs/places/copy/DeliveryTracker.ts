import { z } from "zod";
import { numberLine, text, type DeviceData, type StateName } from "../../../catalog";
import { placesWordsFor, type PlacesWords } from "../lang";

type Step = keyof PlacesWords["deliveryStep"];
type Delivery = { step: Step; courier?: string | undefined };
const coordinate = z.number().min(0).max(1);
const position = z.object({ x: coordinate, y: coordinate });
const tracking = z.object({
  step: z.string(),
  courier: text(20).optional(),
  etaMinutes: z.int().nonnegative().optional().catch(undefined),
  position: position.optional().catch(undefined),
  destination: position.optional().catch(undefined),
});

function trackingOf({ step, courier }: Delivery, data?: DeviceData) {
  for (const entry of data?.delivery_tracking ?? []) {
    const trackingRecord = tracking.safeParse(entry);
    if (!trackingRecord.success) continue;
    if (trackingRecord.data.step === step && trackingRecord.data.courier === courier)
      return trackingRecord.data;
  }
}

export function deliveryCopy(input: Delivery, state: StateName, data?: DeviceData, lang?: string) {
  const words = placesWordsFor(lang);
  const current = trackingOf(input, data);
  const delivered = input.step === "delivered" || state === "success";
  const minutes = current?.etaMinutes;
  const eta =
    minutes === undefined
      ? words.deliveryEtaUnknown
      : minutes === 0
        ? words.deliveryEtaNow
        : words.deliveryEtaMinutes(numberLine(minutes, lang));
  const pins = [
    ...(current?.position && !delivered
      ? [
          {
            id: "r1",
            label: words.deliveryCourierMarker,
            ...current.position,
            selected: true,
            mark: "dot" as const,
          },
        ]
      : []),
    ...(current?.destination
      ? [
          {
            id: "r2",
            label: words.deliveryDestinationMarker,
            ...current.destination,
            selected: delivered,
          },
        ]
      : []),
  ];
  return {
    delivered,
    eta: delivered ? undefined : eta,
    timed: minutes !== undefined && minutes > 0,
    step: words.deliveryStep[delivered ? "delivered" : input.step],
    courierLabel: input.courier ? words.deliveryCourier : undefined,
    call: delivered || !input.courier ? undefined : words.deliveryCall,
    pins,
  };
}

export function deliveryReading(input: Delivery, state: StateName, data?: DeviceData, lang?: string) {
  if (state !== "filled" && state !== "success") return [];
  const { eta, step, call, courierLabel } = deliveryCopy(input, state, data, lang);
  return [
    ...(eta ? [placesWordsFor(lang).deliveryEta, eta] : []),
    step,
    ...(courierLabel ? [courierLabel] : []),
    ...(call ? [call] : []),
  ];
}

export function deliveryPreview({ step, courier }: Delivery): DeviceData {
  const nearby = step === "nearby";
  return {
    delivery_tracking: [
      {
        step,
        courier,
        etaMinutes: nearby ? 2 : 8,
        position: nearby ? { x: 0.55, y: 0.52 } : { x: 0.28, y: 0.64 },
        destination: { x: 0.74, y: 0.36 },
      },
    ],
  };
}
