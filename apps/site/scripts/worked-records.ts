import type { DeviceData, PackId } from "@lmthing/ui/catalog";
import { books } from "./worked-books";
import { places, team, trips } from "./worked-previews";
import { findLine, read, type Definitions, type Line, type Source } from "./worked-source";

function invest(source: Source): DeviceData {
  const { defs } = source;
  const { portfolioId, since, openingCash, openingContributed, entries } = read(
    source,
    defs.InvestmentActivity,
  );
  const { positions } = read(source, defs.Holdings);
  const { distributions } = read(source, defs.Dividends);
  return {
    investment_portfolios: [
      {
        portfolioId,
        since,
        openingCash,
        openingContributed,
        entries,
        distributions,
        positions: positions.map(({ price: _price, quotedAt: _quotedAt, ...position }) => position),
        quotes: positions.map(({ assetId, price, quotedAt }) => ({ assetId, price, quotedAt })),
      },
    ],
  };
}

function projects(source: Source): DeviceData {
  const { defs } = source;
  const { projectRef, deliverables } = read(source, defs.Scope);
  const { gates } = read(source, defs.Milestones);
  const { entries } = read(source, defs.TimeLog);
  return {
    project_deliverables: deliverables.map((row) => ({ ...row, projectRef })),
    project_milestones: gates.map(({ requires }) => ({ projectRef, requires })),
    project_calendar: [{ projectRef, date: entries.at(-1)?.start.slice(0, 10), timeZone: "UTC" }],
    project_time_targets: entries.map(({ projectRef, taskRef, title, billable }) => ({
      projectRef,
      taskRef,
      title,
      billable,
    })),
  };
}

function inventory(source: Source): DeviceData {
  const { items } = read(source, source.defs.Things);
  const { spots } = read(source, source.defs.Storage);
  return {
    storage_spots: spots.map(({ name, goto }) => {
      const here = items.filter(({ where }) => where === name).map((item) => item.name);
      if (goto === "kitchen_box_3") {
        // The Boxes example describes fourteen things; Things shows the searchable kettle.
        here.push(
          "Toaster",
          "Mug",
          "Teapot",
          "Sugar bowl",
          "Jug",
          "Whisk",
          "Ladle",
          "Tongs",
          "Colander",
          "Measuring cup",
          "Mixing bowl",
          "Rolling pin",
          "Sieve",
        );
      }
      return { goto, here };
    }),
  };
}

function community(source: Source): DeviceData {
  const { defs } = source;
  const { members } = read(source, defs.Members);
  const { assessments, receipts } = read(source, defs.Dues);
  const { claims } = read(source, defs.SignUpSheet);
  const { voteId, opens, closes, quorum, rule, ballots, cancelled = false } = read(source, defs.Vote);
  return {
    member_dues: assessments.map(({ id, memberId, amount }) => {
      const paid = receipts.reduce(
        (sum, row) => sum + (!row.voided && row.assessmentId === id ? row.amount : 0),
        0,
      );
      return { memberId, outstanding: Math.max(0, amount - paid) };
    }),
    community_signups: [
      {
        instance: findLine(source, defs.SignUpSheet.meta.id).id,
        claims,
        members: members.map(({ id, name, ended }) => ({ id, name, active: !ended })),
      },
    ],
    community_votes: [
      {
        voteId,
        opens,
        closes,
        quorum,
        rule,
        ballots,
        cancelled,
        eligible: members.filter(({ votingRights, ended }) => votingRights && !ended).map(({ id }) => id),
      },
    ],
  };
}

function mind(source: Source): DeviceData {
  const { entries } = read(source, source.defs.Entries);
  const logged = entries.filter(({ mood }) => mood !== undefined);
  const history = Array.from({ length: 13 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 10, index + 6)).toISOString().slice(0, 10),
    mood: index % 2 === 0 ? 4 : 2,
    tags: index % 2 === 0 ? ["Outdoors"] : [],
  }));
  return { journal_entries: [...history, ...logged] };
}

function events(source: Source): DeviceData {
  const { holder } = read(source, source.defs.Ticket);
  const instance = findLine(source, source.defs.Door.meta.id).id;
  return { doorTickets: [{ instance, id: "r1", name: holder }] };
}

const snapshots: Partial<Record<PackId, (source: Source) => DeviceData>> = {
  invest,
  books,
  projects,
  inventory,
  community,
  mind,
  events,
  places,
  team,
  trips,
};

export function workedRecords(
  id: PackId,
  lines: readonly string[],
  defs: Definitions,
): DeviceData | undefined {
  if (!lines.length) return;
  return snapshots[id]?.({ defs, lines: lines.map((line) => JSON.parse(line) as Line) });
}
