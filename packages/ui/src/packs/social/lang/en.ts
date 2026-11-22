import type { LDMLPluralRule } from "../../../catalog";
import { liveRoomWords } from "./live-room";
import { postOptionWords } from "./post-options";

type CountCopy = { before?: string; after?: string };

export type SocialWords = {
  liveRoom: typeof liveRoomWords;
  postOptions: typeof postOptionWords;
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
  comments: {
    reply: string;
    replyAuthor: (author: string, parent: string) => string;
    replyTarget: (author: string) => string;
    more: (author: string) => string;
    reaction: (author: string, liked: boolean, count: string) => string;
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
    notes: string;
    emptyNotes: string;
    noteStatus: (name: string, seen: boolean) => string;
    noteLink: (status: string, note: string) => string;
    status: (name: string, seen: boolean) => string;
  };
  storyViewer: {
    position: (current: string, total: string) => string;
    photo: (position: string) => string;
    previous: string;
    next: string;
    playback: string;
    play: string;
    pause: string;
    playing: string;
    paused: string;
    reply: string;
    send: string;
    react: string;
    close: string;
    expired: string;
    sent: string;
    sending: string;
    notSent: string;
  };
  event: {
    going: string;
    interested: string;
    attending: CountCopy;
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
    members: string;
    joined: (count: string, form: LDMLPluralRule) => string;
  };
};

export const en = {
  liveRoom: liveRoomWords,
  postOptions: postOptionWords,
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
      excerpt: "An excerpt from a recent update.",
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
  comments: {
    reply: "Reply",
    replyAuthor: (author, parent) => `${author} replying to ${parent}`,
    replyTarget: (author) => `Reply on this row answers ${author}’s comment`,
    more: (author) => `More actions for ${author}’s comment`,
    reaction: (author, liked, count) => `${liked ? "Unlike" : "Like"} ${author}’s comment · ${count}`,
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
    notes: "Notes",
    emptyNotes: "No notes yet",
    noteStatus: (name, seen) => (seen ? `${name}: seen note` : `${name}: new note`),
    noteLink: (status, note) => `${status} · ${note}`,
    status: (name, seen) => (seen ? `${name}: seen story` : `${name}: new story`),
  },
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
  event: {
    going: "Going",
    interested: "Interested",
    attending: { after: " going" },
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
    members: "People to discover",
    joined: (count, form) => `${count} ${form === "one" ? "person" : "people"} joined`,
  },
} satisfies SocialWords;
