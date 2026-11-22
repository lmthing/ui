import type { SocialWords } from "..";

export const words = {
  event: {
    going: "Going",
    interested: "Interested",
    attending: { after: " going" },
    attendees: "Attendees",
    photo: "Event cover photo",
    response: { none: "RSVP", going: "You’re going", interested: "You’re interested" },
  },
} satisfies Pick<SocialWords, "event">;
