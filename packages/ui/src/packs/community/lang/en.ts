import { words as ModQueueWords } from "./en/ModQueue";
import { words as DuesWords } from "./en/Dues";
import { words as MembersWords } from "./en/Members";
import { words as MinutesWords } from "./en/Minutes";
import { words as VoteWords } from "./en/Vote";
import { words as SignUpSheetWords } from "./en/SignUpSheet";
export const en = {
  ...DuesWords,
  ...MembersWords,
  ...MinutesWords,
  ...VoteWords,
  ...SignUpSheetWords,
  ...ModQueueWords,
};

export type CommunityWords = typeof en;
