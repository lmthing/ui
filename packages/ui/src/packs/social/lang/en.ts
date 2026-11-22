import { words as StoryViewerWords } from "./en/StoryViewer";
import { words as FeedWords } from "./en/Feed";
import { words as PostWords } from "./en/Post";
import { words as CommentsWords } from "./en/Comments";
import { words as PollWords } from "./en/Poll";
import { words as StoriesWords } from "./en/Stories";
import { words as EventCardWords } from "./en/EventCard";
import { words as ChallengeWords } from "./en/Challenge";
import { words as InviteWords } from "./en/Invite";
import { liveRoomWords, words as LiveRoomWords } from "./en/LiveRoom";
import { postOptionWords } from "./en/Post";
import type { LDMLPluralRule } from "../../../catalog";

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
  ...FeedWords,
  ...PostWords,
  ...CommentsWords,
  ...PollWords,
  ...StoriesWords,
  ...StoryViewerWords,
  ...EventCardWords,
  ...ChallengeWords,
  ...InviteWords,
  ...LiveRoomWords,
} satisfies SocialWords;
