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
          see: "{record.reference} is on the way. Estimated arrival: {record.eta}.",
          do: "Tap View arrival",
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "On the way",
            action: "View arrival",
            fields: ["reference", "eta", "destination"],
            messages: {
              error: "Delivery is running late. The order is still active; the estimate will update here.",
            },
          },
        },
        {
          id: "delivered",
          see: "{record.item} was delivered to {record.destination}. Order {record.reference}.",
          next: null,
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "Order delivered",
            fields: ["reference", "destination"],
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
        request: "Lina orders a Market box, OR-118, for the Lobby desk. The estimated arrival is 18:40.",
        expect: {
          names: {
            customer: "Lina",
          },
          record: {
            item: "Market box",
            reference: "OR-118",
            destination: "Lobby desk",
            eta: "18:40",
          },
        },
      },
    ],
  },
};
