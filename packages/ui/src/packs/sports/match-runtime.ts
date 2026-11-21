import type { Meta, RecordContext, RecordRuntime } from "../../catalog";
import { sportsWordsFor } from "./lang";
import {
  type MatchGoal,
  type MatchRecord,
  goalEvents,
  goalRowId,
  matchMinute,
  matchRecord,
  matchRecordKind,
  matchScore,
  maxMatchMinute,
  replayMatch,
  scoreSeed,
  seededMatch,
} from "./match-record";

const deviceData = [matchRecordKind] as const;
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
  const board = screen?.components.find(({ c }) => c === "Scoreboard");
  const score = scoreSeed.safeParse(board ?? props);
  if (score.success) return { matchId: id, goals: [], unlisted: score.data };
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

type History = NonNullable<ReturnType<typeof history>>;
function undoTarget({ goals, unlisted, seed }: History, side: MatchGoal["side"]) {
  for (let index = goals.length - 1; index >= 0; index--) {
    const candidate = goals[index]!;
    if (candidate.side === side) {
      const { local: _local, ...target } = candidate;
      return target;
    }
  }
  const key = `${side}Score` as const;
  const remaining = unlisted?.[key];
  if (remaining && seed) return { side, seed: seed[key], remaining };
}

type KeeperAction = NonNullable<NonNullable<RecordRuntime["actions"]>[`${string}.${string}`]>;
function keeper(side: MatchGoal["side"], kind: "add" | "undo"): KeeperAction {
  return {
    target(props) {
      if (kind === "add")
        return props.$canAdd === true && Number(props[`${side}Score`]) < Number.MAX_SAFE_INTEGER
          ? side
          : undefined;
      const goal = side === "home" ? props.$undoHome : props.$undoAway;
      if (!goal) return;
      // A seeded undo should survive the addition of unrelated events before confirmation, too.
      if (typeof goal === "object" && "seedOccurrence" in goal && "id" in goal) {
        const { id: _id, ...identity } = goal;
        return JSON.stringify(identity);
      }
      return JSON.stringify(goal);
    },
    plan(context) {
      const record = history(context);
      if (!record) return { error: "No valid match record" };
      if (kind === "undo") {
        const target = undoTarget(record, side);
        return target ? { operation: { kind, target } } : { error: "No goal to undo" };
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
            ...matchScore(record.goals, record.unlisted),
            $canAdd: record.nextId !== undefined,
            $undoHome: undoTarget(record, "home"),
            $undoAway: undoTarget(record, "away"),
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
          .map((goal) => ({
            id: goalRowId(goal),
            minute: goal.minute,
            side: goal.side,
            kind: "goal" as const,
            text: goal.description ?? goal.scorer ?? sportsWordsFor().matchGoal,
          }))
          .reverse(),
      ].sort((a, b) => b.minute - a.minute);
      const state = record.goals.length ? "filled" : events.length ? undefined : "empty";
      return { events, ...(state && { state }) };
    },
  },
} satisfies Declaration;
