import { z } from "zod";
import { defineLocalState, numberLine } from "../../../catalog";
import { teamWordsFor } from "../lang";

type Receipt = {
  requireAck: boolean;
  acknowledged: boolean;
  counted?: boolean | undefined;
  readCount: number;
  totalMembers: number;
};
type Notice = Receipt & {
  title: string;
  by: string;
  postedAt: string;
  priority: "info" | "important" | "urgent";
  body: string;
  detail: "full" | "brief";
};

export function noticeProgress(input: Receipt, success: boolean, lang?: string) {
  const words = teamWordsFor(lang).teamNotice;
  const done = input.acknowledged || (success && input.requireAck);
  const added = done && !(input.counted ?? input.acknowledged) ? 1 : 0;
  const read = Math.min(input.totalMembers, input.readCount + added);
  return {
    done,
    count: words.count(numberLine(read, lang), numberLine(input.totalMembers, lang)),
    unread: words.unread(numberLine(input.totalMembers - read, lang)),
  };
}

export function noticeCountPieces(count: string, lang?: string) {
  const words = teamWordsFor(lang).teamNotice;
  return words.countPieces(count);
}

export const noticeReceipt = defineLocalState({
  schema: z.strictObject({
    notice: z.tuple([z.string().max(48), z.string().max(24), z.string().max(16), z.string().max(400)]),
    acknowledged: z.boolean(),
  }),
  initial: (input): { notice: [string, string, string, string]; acknowledged: boolean } => ({
    notice: [input.title as string, input.by as string, input.postedAt as string, input.body as string],
    acknowledged: input.acknowledged === true,
  }),
  events: ["ack.check"],
  reduce: (state) => ({ state: { ...state, acknowledged: true } }),
  project: ({ acknowledged }) => ({ acknowledged }),
});

export function noticeReading(input: Notice, success: boolean, lang?: string) {
  const words = teamWordsFor(lang).teamNotice;
  const headline = [input.title, words.priority[input.priority]];
  if (input.detail === "brief") return headline;
  const { done, count, unread } = noticeProgress(input, success, lang);
  return [
    ...headline,
    input.by,
    input.postedAt,
    input.body,
    count,
    unread,
    ...(input.requireAck ? [done ? words.acknowledged : words.ack] : []),
  ];
}
