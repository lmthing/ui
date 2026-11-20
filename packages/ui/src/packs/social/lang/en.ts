import type { LDMLPluralRule } from "../../../catalog";

type CountCopy = { before?: string; after?: string };

export type SocialWords = {
  feed: {
    likes: (form: LDMLPluralRule) => CountCopy;
    comments: (form: LDMLPluralRule) => CountCopy;
    countSeparator: string;
    reaction: (author: string, liked: boolean) => string;
    open: (author: string) => string;
    image: string;
    skeleton: { author: string; time: string; excerpt: string; likes: string; comments: string };
  };
  post: {
    more: string;
    comment: string;
    share: string;
    image: (position: string, total: string) => string;
    withCount: (action: string, count: string) => string;
  };
  poll: {
    voteFor: (label: string) => string;
    chosen: (label: string) => string;
    votes: (form: LDMLPluralRule) => string;
    closes: (date: string) => string;
    share: (label: string, percent: string) => string;
  };
  stories: {
    add: string;
    rail: string;
    own: string;
    empty: string;
    status: (name: string, seen: boolean) => string;
  };
  event: {
    going: string;
    interested: string;
    attending: (count: string) => string;
    attendees: string;
    photo: string;
    response: Record<"none" | "going" | "interested", string>;
  };
  challenge: {
    amount: (value: string, unit: string) => string;
    progress: (total: string, goal: string, unit: string) => string;
    group: string;
    goal: (amount: string) => string;
    mine: (amount: string) => string;
    deadline: (date: string) => string;
    daysLeft: (days: string, form: LDMLPluralRule) => string;
    endsToday: string;
    ended: string;
    reached: string;
    top: string;
    leader: (name: string, amount: string) => string;
    join: string;
    log: string;
  };
  invite: {
    copy: string;
    share: string;
    qr: string;
    joined: (count: string, form: LDMLPluralRule) => string;
  };
};

export const en = {
  feed: {
    likes: (form) => ({ after: form === "one" ? " like" : " likes" }),
    comments: (form) => ({ after: form === "one" ? " comment" : " comments" }),
    countSeparator: " · ",
    reaction: (author, liked) => (liked ? `Unlike ${author}’s post` : `Like ${author}’s post`),
    open: (author) => `Open ${author}’s post`,
    image: "Post photo",
    skeleton: {
      author: "Author name",
      time: "A moment ago",
      excerpt: "An excerpt from a recent update with room for a second line.",
      likes: "Likes",
      comments: "Comments",
    },
  },
  post: {
    more: "More post actions",
    comment: "Comment on this post",
    share: "Share this post",
    image: (position, total) => `Post photo ${position} of ${total}`,
    withCount: (action, count) => `${action} · ${count}`,
  },
  poll: {
    voteFor: (label) => `Vote for ${label}`,
    chosen: (label) => `${label} chosen`,
    votes: (form) => (form === "one" ? "vote" : "votes"),
    closes: (date) => `Closes ${date}`,
    share: (label, percent) => `${label} · ${percent}`,
  },
  stories: {
    add: "Add your story",
    rail: "Stories",
    own: "Your story",
    empty: "No stories yet",
    status: (name, seen) => (seen ? `${name}: seen story` : `${name}: new story`),
  },
  event: {
    going: "Going",
    interested: "Interested",
    attending: (count) => `${count} going`,
    attendees: "Attendees",
    photo: "Event cover photo",
    response: { none: "RSVP", going: "You’re going", interested: "You’re interested" },
  },
  challenge: {
    amount: (value, unit) => `${value} ${unit}`,
    progress: (total, goal, unit) => `${total} ${goal} ${unit}`,
    group: "Group progress",
    goal: (amount) => `Goal: ${amount}`,
    mine: (amount) => `Your contribution: ${amount}`,
    deadline: (date) => `Deadline: ${date}`,
    daysLeft: (days, form) => `${days} ${form === "one" ? "day" : "days"} left`,
    endsToday: "Ends today",
    ended: "Challenge ended",
    reached: "Goal reached",
    top: "Top contributors",
    leader: (name, amount) => `${name}, ${amount}`,
    join: "Join challenge",
    log: "Log contribution",
  },
  invite: {
    copy: "Copy code",
    share: "Share invite",
    qr: "Invite QR code",
    joined: (count, form) => `${count} ${form === "one" ? "person" : "people"} joined`,
  },
} satisfies SocialWords;
