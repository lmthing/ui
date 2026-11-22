import type { ActionName } from "../../types";

type Row = Readonly<Record<string, unknown>>;
export type SlotMoves = Readonly<
  Record<
    string,
    {
      mode: "reorder" | "swap";
      /** True on a row that cannot leave its slot or be displaced. */
      locked?: string;
      /** Check each displaced row against the previous occupant of its destination slot. */
      allows?: (row: Row, destination: Row, props: Row) => boolean;
    }
  >
>;

type Gates = Readonly<Record<string, string | boolean>>;
export type NamedCollection = {
  key: string;
  prefix: string;
  /** A unique, stable slug or positive integer in each schema-validated row. */
  identity: string;
  parts: readonly string[];
  actions?: Readonly<
    Record<string, readonly Extract<ActionName, "press" | "toggle" | "check" | "select" | "move">[]>
  >;
  when?: Readonly<Record<string, Gates>>;
  visibleWhen?: Gates;
  /** Toggle/check part to live row boolean. */
  toggles?: Readonly<Record<string, string>>;
  /** The addressed row's field, or its id when no field is declared, projects to this live prop. */
  select?: { prop: string; field?: string };
  slotMoves?: SlotMoves;
};

export type Choice = string | number | { value: string | number; label: string };
export type NestedPart = {
  when?: string | { prop: string; equals: boolean };
} & (
  | { action: "press"; prop: string }
  | { action: "select"; prop: string; choices: readonly Choice[] | { prop: string; from?: "parent" } }
  | { action: "toggle"; prop: string; group?: string; min?: number; max?: number; integer?: boolean }
  | { action: "set"; prop: string; min?: number; max?: number; integer?: boolean }
  | {
      action: "increment" | "decrement";
      prop: string;
      min: number | string;
      max: number | string;
      step: number | string;
    }
);

export type NestedGroups = Readonly<
  Record<string, { by?: string } & ({ mode: "single" } | { mode: "multi"; max: number | { prop: string } })>
>;
