import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-order_track.generated";

export const orderTrack: FlowTemplate = {
  ...prompt,
  id: "order_track",
  title: "Order and track",
  nameSlots: ["customer"],
  recordShape: {
    item: "string",
    reference: "string",
    destination: "string",
    eta: "string",
    departed_at: "string",
    delivered_at: "string",
  },
  journeys: [
    {
      role: "customer",
      id: "track_order",
      name: "Receive an order",
      goal: "{name.customer} can follow {record.reference} from order to delivery.",
      steps: [
        {
          id: "review",
          see: "Review {record.item} and the delivery destination before placing this order.",
          do: "Tap Place order",
          layout: {
            components: ["KeyValue"],
          },
          states: ["empty", "error"],
          preview: {
            title: "Review order",
            action: "Place order",
            fields: ["item", "destination"],
            messages: {
              error: "The order was not placed. Check the items and try again.",
            },
          },
        },
        {
          id: "preparing",
          see: "{record.reference} is confirmed. We’re preparing {record.item}.",
          do: "Tap View delivery",
          layout: {
            components: ["Note"],
          },
          states: ["waiting"],
          preview: {
            title: "Order confirmed",
            action: "View delivery",
          },
        },
        {
          id: "in_transit",
          see: "Left for {record.destination} at {record.departed_at}. The arrival time is an estimate, not a live location.",
          do: "Tap View arrival",
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "On the way",
            action: "View arrival",
            fields: ["reference", "departed_at", "eta", "destination"],
            messages: {
              error: "Running late. The last confirmed update was departure at {record.departed_at}.",
            },
          },
        },
        {
          id: "delivered",
          see: "{record.item} was delivered to {record.destination} at {record.delivered_at}.",
          next: null,
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "Order delivered",
            fields: ["reference", "delivered_at", "destination"],
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "market",
      names: {
        customer: "Lina",
      },
      record: {
        item: "Market box",
        reference: "OR-118",
        destination: "Lobby desk",
        eta: "18:40",
        departed_at: "Fri 27 Nov, 18:10",
        delivered_at: "Fri 27 Nov, 18:43",
      },
    },
    {
      id: "supplies",
      names: {
        customer: "Zoe",
      },
      record: {
        item: "Craft supplies",
        reference: "OR-614",
        destination: "Side entrance",
        eta: "13:15",
        departed_at: "Sat 28 Nov, 12:55",
        delivered_at: "Sat 28 Nov, 13:10",
      },
    },
  ],
  probes: {
    pick: [
      {
        request: "Let a buyer place a delivery order and follow it until it has arrived.",
        expect: "order_track",
      },
      {
        request: "Let a customer settle a bill and save proof they paid.",
        expect: "pay_receipt",
      },
    ],
    fill: [
      {
        request:
          "Lina orders a Market box, OR-118, for the Lobby desk. ETA 18:40. Departed Fri 27 Nov, 18:10; delivered Fri 27 Nov, 18:43.",
        expect: {
          names: {
            customer: "Lina",
          },
          record: {
            item: "Market box",
            reference: "OR-118",
            destination: "Lobby desk",
            eta: "18:40",
            departed_at: "Fri 27 Nov, 18:10",
            delivered_at: "Fri 27 Nov, 18:43",
          },
        },
      },
    ],
  },
};
