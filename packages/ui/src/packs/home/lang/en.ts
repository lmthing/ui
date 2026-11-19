import type { LDMLPluralRule, repeatOptions } from "../../../catalog";

type CareRepeat = Exclude<(typeof repeatOptions)[number], "never">;
const repeatUnits = {
  daily: "day",
  weekdays: "weekday",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

export const en = {
  agendaLabels: { add: "Add event", allDay: "All day", conflict: "Time conflict", everyone: "Everyone" },
  babyLabels: {
    feed_left: "Feed left",
    feed_right: "Feed right",
    bottle: "Bottle",
    nappy: "Nappy",
    sleep: "Sleep",
    none: "None running",
  },
  babyLog: {
    title: "Today’s log",
    history: "History",
    empty: "No entries yet",
    running: (label: string) => `${label} running`,
    last: (time?: string) => (time ? `Last ${time}` : "—"),
  },
  careLabels: {
    last: "Last",
    next: "Next",
    today: "Due today",
    overdue: "Late",
    noNext: "No next date",
    done: "Log done",
    success: "Care logged",
  },
  careRepeat: (repeat: CareRepeat | "never", count: string, form: LDMLPluralRule) =>
    repeat === "never"
      ? "Does not repeat"
      : `Every ${form === "one" ? repeatUnits[repeat] : `${count} ${repeatUnits[repeat]}s`}`,
  careDate: (label: string, date: string) => `${label} ${date.replace(/ /g, "\u00a0")}`,
  choreLabels: { points: "points" },
  deviceLabels: {
    reading: "Reading",
    setPoint: "Set point",
    normal: "Normal range",
    outOfRange: "Outside normal range",
    apply: "Apply scene",
    secure: "Apply scene, asks first",
    locked: "Locked",
    unlocked: "Unlocked",
  },
  deviceUnits: {
    celsius: "°C",
    percent: "%",
    ppm: "ppm",
    lux: "lux",
  },
  rewardLabels: {
    units: { one: "point", other: "points" },
    heading: "Rewards",
    claim: "Claim",
    success: "Prize claimed",
  },
  rewardPoints: (value: string, unit: string) => `${value} ${unit}`,
  rewardEntry: (name: string, amount: string) => `${name}: ${amount}`,
  rewardNeeds: (amount?: string) => (amount ? `Needs ${amount} more` : "Needs more"),
  rewardPrizeStatus: (line: string, reason: string) => `${line} · ${reason}`,
  turnLabels: { next: "Done, next", skip: "Skip" },
};

export type HomeWords = typeof en;
