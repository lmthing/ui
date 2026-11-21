import { z } from "zod";
import type { Meta, RecordContext, RecordRuntime } from "../../catalog";
import { sportsWordsFor } from "./lang";
import {
  type Goal,
  type MatchRecord,
  goalEvents,
  matchMinute,
  matchRecord,
  matchRecordKind,
  matchScore,
  maxMatchMinute,
  maxSeedEvents,
  replayMatch,
  seededMatch,
} from "./match-record";

const deviceData = [matchRecordKind] as const;
const scoreSeed = z.object({ homeScore: z.int().nonnegative(), awayScore: z.int().nonnegative() });
const feedSeed = (screen: RecordContext["screen"]) => screen?.components.find(({ c }) => c === "MatchFeed");
const feedEvents = (events: unknown) =>
  goalEvents.safeParse(
    Array.isArray(events)
      ? events.map((event) => {
          if (!event || typeof event !== "object") return event;
          const { id: _id, ...wire } = event;
          return wire;
        })
      : events,
  );

function seed({ props, screen }: RecordContext): MatchRecord | undefined {
  const id = screen?.id ?? "";
  const feed = feedSeed(screen);
  if (feed || Array.isArray(props.events)) {
    const events = feedEvents(feed?.events ?? props.events);
    if (events.success) return seededMatch(id, events.data);
    return;
  }
  const score = scoreSeed.safeParse(props);
  if (!score.success) return;
  const { homeScore, awayScore } = score.data;
  // A legacy standalone score has no feed text. Large scores need a real host record.
  if (homeScore + awayScore > maxSeedEvents) return;
  return {
    matchId: id,
    goals: Array.from({ length: homeScore + awayScore }, (_, index) => ({
      id: index + 1,
      side: index < homeScore ? "home" : "away",
      minute: 0,
      scorer: null,
    })),
  };
}

function history(context: RecordContext) {
  const records = context.data[matchRecordKind]?.filter(
    (row) => row && typeof row === "object" && "matchId" in row && row.matchId === context.screen?.id,
  );
  if (!records?.length) {
    const record = seed(context);
    return record && replayMatch(record, context.journal);
  }
  const parsed = matchRecord.safeParse(records[0]);
  if (records.length === 1 && parsed.success) return replayMatch(parsed.data, context.journal);
}

function latest(goals: readonly Goal[], side: Goal["side"]) {
  for (let index = goals.length - 1; index >= 0; index--) {
    if (goals[index]?.side === side) return goals[index];
  }
}

type KeeperAction = NonNullable<NonNullable<RecordRuntime["actions"]>[`${string}.${string}`]>;
function keeper(side: Goal["side"], kind: "add" | "undo"): KeeperAction {
  return {
    target(props) {
      if (kind === "add") return props.$canAdd === true ? side : undefined;
      const goal = side === "home" ? props.$undoHome : props.$undoAway;
      return goal ? JSON.stringify(goal) : undefined;
    },
    plan(context) {
      const record = history(context);
      if (!record) return { error: "No valid match record" };
      if (kind === "undo") {
        const goal = latest(record.goals, side);
        return goal ? { operation: { kind, id: goal.id } } : { error: "No goal to undo" };
      }
      const { nextId: id } = record;
      if (id === undefined) return { error: "No available goal ID" };
      const elapsed = Number(context.props.elapsed ?? 0);
      const minute = matchMinute.safeParse(Math.min(maxMatchMinute, Math.floor(elapsed / 60)));
      return minute.success
        ? { operation: { kind, goal: { id, side, minute: minute.data, scorer: null } } }
        : { error: "Invalid match clock" };
    },
  };
}

type Declaration = Pick<Meta, "deviceData" | "recordRuntime">;
export const scoreboardRecord = {
  deviceData,
  recordRuntime: {
    kind: matchRecordKind,
    actions: {
      "home.increment": keeper("home", "add"),
      "home.decrement": keeper("home", "undo"),
      "away.increment": keeper("away", "add"),
      "away.decrement": keeper("away", "undo"),
    },
    project(context) {
      const record = history(context);
      return record
        ? {
            ...matchScore(record.goals),
            $canAdd: record.nextId !== undefined,
            $undoHome: latest(record.goals, "home"),
            $undoAway: latest(record.goals, "away"),
          }
        : {};
    },
  },
} satisfies Declaration;

export const matchFeedRecord = {
  deviceData,
  recordRuntime: {
    kind: matchRecordKind,
    project(context) {
      const record = history(context);
      const seeds = feedEvents(context.props.events);
      if (!record || !seeds.success) return {};
      const events = [
        ...seeds.data.flatMap((event, index) =>
          event.kind === "goal" ? [] : [{ ...event, id: `r${index + 1}` }],
        ),
        ...record.goals
          .map(({ id, side, minute, scorer, description }) => ({
            id: `r${BigInt(id) + BigInt(maxSeedEvents)}`,
            minute,
            side,
            kind: "goal" as const,
            text: description ?? scorer ?? sportsWordsFor().matchGoal,
          }))
          .reverse(),
      ].sort((a, b) => b.minute - a.minute);
      return { events, ...(events.length ? {} : { state: "empty" }) };
    },
  },
} satisfies Declaration;
