import type { SocialWords } from "..";

export const words = {
  storyViewer: {
    position: (current, total) => `Slide ${current} of ${total}`,
    photo: (position) => `Story photo, ${position}`,
    previous: "Previous slide",
    next: "Next slide",
    playback: "Story playback",
    play: "Play story",
    pause: "Pause story",
    playing: "Story playing",
    paused: "Story paused",
    reply: "Reply to this slide",
    send: "Send reply",
    react: "React",
    close: "Close story",
    expired: "This story is no longer available.",
    sent: "Reply sent.",
    sending: "Sending reply…",
    notSent: "Couldn’t send the reply.",
  },
} satisfies Pick<SocialWords, "storyViewer">;
