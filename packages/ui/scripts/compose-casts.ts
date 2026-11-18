import type { CastLike } from "../src/catalog/types";
const cast: CastLike = {
  things: [{ type: "plant", fields: ["name", "room", "care"] }],
  items: [
    {
      id: "fern",
      type: "plant",
      sample: true,
      name: "Fern",
      room: "Bathroom",
      care: "Water every seven days",
      photo: "lib:plants",
    },
    {
      id: "basil",
      type: "plant",
      sample: true,
      name: "Basil",
      room: "Kitchen",
      care: "Water every three days",
      photo: "lib:plants",
    },
    {
      id: "monstera",
      type: "plant",
      sample: true,
      name: "Monstera",
      room: "Living room",
      care: "Water every ten days",
      photo: "lib:plants",
    },
  ],
};
export const compositionCast = (id: string, layout: string): CastLike =>
  id === "tracker" && layout === "counter"
    ? {
        things: [{ type: "water_log", fields: ["label", "day", "amount", "unit"] }],
        items: [
          {
            id: "today",
            type: "water_log",
            sample: true,
            label: "Water glasses",
            day: "Today",
            amount: 3,
            unit: "glasses",
          },
          {
            id: "mon",
            type: "water_log",
            sample: true,
            label: "Water glasses",
            day: "Mon",
            amount: 2,
            unit: "glasses",
          },
          {
            id: "tue",
            type: "water_log",
            sample: true,
            label: "Water glasses",
            day: "Tue",
            amount: 4,
            unit: "glasses",
          },
          {
            id: "wed",
            type: "water_log",
            sample: true,
            label: "Water glasses",
            day: "Wed",
            amount: 3,
            unit: "glasses",
          },
        ],
      }
    : id === "tracker" && layout === "timer"
      ? {
          things: [{ type: "session", fields: ["label", "day", "seconds", "minutes"] }],
          items: [
            {
              id: "today",
              type: "session",
              sample: true,
              label: "Care session",
              day: "Today",
              seconds: 0,
              minutes: 0,
            },
            {
              id: "mon",
              type: "session",
              sample: true,
              label: "Care session",
              day: "Mon",
              seconds: 720,
              minutes: 12,
            },
            {
              id: "tue",
              type: "session",
              sample: true,
              label: "Care session",
              day: "Tue",
              seconds: 480,
              minutes: 8,
            },
            {
              id: "wed",
              type: "session",
              sample: true,
              label: "Care session",
              day: "Wed",
              seconds: 900,
              minutes: 15,
            },
          ],
        }
      : id === "plans"
        ? {
            things: [{ type: "plan", fields: ["name", "description", "price"] }],
            items: [
              {
                id: "single",
                type: "plan",
                sample: true,
                name: "Single walk",
                description: "One walk when needed",
                price: "£18",
              },
              {
                id: "weekly",
                type: "plan",
                sample: true,
                name: "Weekly pack",
                description: "Five walks every week",
                price: "£65",
              },
            ],
          }
        : id === "chat"
          ? {
              things: [{ type: "message", fields: ["sender", "text"] }],
              items: [
                {
                  id: "anna",
                  type: "message",
                  sample: true,
                  sender: "Anna",
                  text: "Can Clover's walk start at 09:30?",
                },
                {
                  id: "reply",
                  type: "message",
                  sample: true,
                  sender: "Me",
                  text: "09:30 works, see you then.",
                },
              ],
            }
          : id === "settings"
            ? {
                things: [{ type: "setting", fields: ["label", "enabled", "description"] }],
                items: [
                  {
                    id: "reminders",
                    type: "setting",
                    sample: true,
                    label: "Care reminders",
                    enabled: true,
                    description: "A notice when watering is due",
                  },
                  {
                    id: "summary",
                    type: "setting",
                    sample: true,
                    label: "Daily summary",
                    enabled: false,
                    description: "A morning overview of plant care",
                  },
                  {
                    id: "quiet",
                    type: "setting",
                    sample: true,
                    label: "Quiet hours",
                    enabled: true,
                    description: "No notices after 21:00",
                  },
                ],
              }
            : cast;
