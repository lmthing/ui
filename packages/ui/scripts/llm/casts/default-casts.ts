import type { CastLike } from "@lmthing/ui/catalog";
export const cast: CastLike = {
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
export const plansCast: CastLike = {
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
};
export const chatCast: CastLike = {
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
};
export const settingsCast: CastLike = {
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
};
