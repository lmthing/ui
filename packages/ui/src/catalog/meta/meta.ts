import type { ActionName, ActionSpec, Component, ComponentId, StateName, Tier } from "../types";
import type { PackProbe, ChooseProbe } from "../probes";
import type { PackId } from "./pack-ids";
import type { ClockMeta } from "./clocks";
import type { ItemVariants, LiveActionInputs, Session, VariantParts, Variants } from "../types";
import type { DeviceData } from "../agent";

export type NumericAdjustments = Readonly<
  Partial<Record<`${string}.${ActionName}`, { prop: string; delta: number; min?: number; max?: number }>>
>;
type Draw =
  | { kind: "faces"; press: string; count: string; sides: string; hold?: string }
  | { kind: "pick"; press: string; pool: string; repeat?: string; reset?: string }
  | { kind: "partition"; press: string; redraw?: string; players: string; teams: string; locked?: string };
type NumericSet = { prop: string; min?: number; max?: number; integer?: boolean };
type ComponentSet =
  | (NumericSet & { type?: "number" })
  | { prop: string; type: "date"; min?: string; max?: string }
  | { prop: string; type: "choice"; choices: readonly string[] };
type LinkedEditState = Readonly<{ swapped: boolean; edit?: Readonly<{ part: string; text: string }> }>;
type LinkedEdits = {
  inputs: Readonly<Record<string, { prop: string; max: number }>>;
  swap: { part: string; sides: readonly [string, string] };
  /** Project display text and related props from the exact source edit and current order. */
  project: (
    props: Readonly<Record<string, unknown>>,
    state: LinkedEditState,
    data: DeviceData,
  ) => Record<string, unknown>;
};
type RowSelection = "index" | "position" | { field: string };
type Choice = string | number | { value: string | number; label: string };
/** A static list or a parsed prop containing the same option shape. */
type ChoiceSource = readonly Choice[] | { prop: string };
type NamedSelection = { prop: string; choices: ChoiceSource } & (
  { runtime?: false; clear?: never } | { runtime: true; clear?: string }
);
type SelectMeta = {
  prop: string;
  parts?: Readonly<Record<string, unknown>>;
} & (
  | { value: RowSelection; mode: "flags"; choices?: never }
  | {
      value?: RowSelection;
      mode?: "one";
      /** Named parts that require an explicit value from a closed list or an array prop. */
      choices?: Readonly<Record<string, ChoiceSource>>;
    }
);
export type Meta = {
  id: string;
  group: "structure" | "content" | "data" | "input" | "action" | "beyond" | "signature" | "escape";
  purpose: string;
  pick: string;
  /** Constraints and examples that a compact JSON Schema signature cannot express. */
  writeHints?: readonly string[];
  /** `overlay`: over the screen, outside its flow (a sheet); it has no weight. */
  region: "top" | "body" | "bottom" | "overlay";
  weight: 0 | 1 | 2 | 3;
  weightByStyle?: Readonly<Record<string, 0 | 1 | 2 | 3>>;
  signatureByStyle?: Readonly<Record<string, string>>;
  tier: Tier;
  /** A part that needs more than the component does (a reply that reaches other people) carries its own tier. */
  partTiers?: Readonly<Record<string, Tier>>;
  /** Resolve a declared part's tier from a live component prop before falling back to static tiers. */
  partTiersBy?: Readonly<Record<string, { prop: string; tiers: Readonly<Partial<Record<string, Tier>>> }>>;
  realPath: string;
  dense?: true;
  confirmParts?: readonly string[];
  variants?: Variants;
  variantParts?: VariantParts;
  clocks?: readonly ClockMeta[];
  adjust?: NumericAdjustments;
  /** Part/action pairs from `actions` that are also available in `empty`. */
  emptyActions?: readonly `${string}.${ActionName}`[];
  /** Part/action pairs from `actions` that are also available in `success`. */
  successActions?: readonly `${string}.${ActionName}`[];
  /** Part/action pairs from `actions` available only in `error`. */
  errorActions?: readonly `${string}.${ActionName}`[];
  /** Read visible content and the read summary in success, not just the header and available actions. */
  readSuccess?: true;
  /** Runtime-only chance control. Input keys refer to validated props, never to result props. */
  draw?: Draw;
  /** Runtime-only progress through a roster or deck; keys name seed props and declared press parts. */
  session?: Session;
  /** Component parts with a declared `set` action. Omitted type means number; date bounds are inclusive ISO dates. */
  set?: Readonly<Record<string, ComponentSet>>;
  /** Confirmed component press part → item set part whose nullable values are cleared. */
  clearItems?: Readonly<Record<string, string>>;
  /**
   * `visible: "first"` when only the first item is drawn (a card stack): the reader shows it and
   * counts the rest ("+2 more"), and conformance expects only the first item on screen.
   */
  items?: {
    key: string;
    parts: readonly string[];
    prefix?: string;
    visible?: "all" | "first";
    /** Match the addressed row first, then its component. Filter only after stamping. */
    visibleWhen?: Readonly<Record<string, string | boolean>>;
    variants?: ItemVariants;
    clocks?: readonly ClockMeta[];
    adjust?: NumericAdjustments;
    /** Item parts with a numeric `set`; adjustments to the same prop share its value and bounds. */
    set?: Readonly<
      Record<
        string,
        NumericSet & {
          /** Addressed items flatten this wire matrix in row-major order. */
          matrix?: { rows: string; values: string };
        }
      >
    >;
    nested?: {
      key: string;
      /** Show only the row selected by `select`; before selection, use the first row. */
      activeParent?: true;
      /** Maximum on toggles across all parent rows, including hidden ones. */
      maxActive?: number;
      clocks?: readonly ClockMeta[];
      parts: Readonly<
        Record<
          string,
          {
            action: "toggle" | "set";
            prop: string;
            min?: number;
            max?: number;
            integer?: boolean;
            /** A named control's true value, or a boolean property on the sub-item. */
            when?: string | { prop: string; equals: boolean };
          }
        >
      >;
    };
  };
  select?: SelectMeta;
  /** Named component parts with independent destinations and explicit offers. */
  selections?: Readonly<Record<string, NamedSelection>>;
  /** Component `type` parts and one `press` part sharing runtime state outside Writer props. */
  linkedEdits?: LinkedEdits;
  live?: LiveActionInputs;
  /** Record kinds this component may read from the host, never from Writer props. */
  deviceData?: readonly string[];
  /** Pure visibility rule over the declared host records. A false result hides the whole component. */
  deviceDataVisible?: (data: DeviceData) => boolean;
  /** Deterministic synthetic records for preview, conformance and read-probe fixtures only. */
  previewDeviceData?: (cell: { input: Readonly<Record<string, unknown>>; state: StateName }) => DeviceData;
  parts?: readonly string[];
  states?: readonly StateName[];
  actions?: ActionSpec;
  read?: (props: unknown, state: StateName, lang?: string, deviceData?: DeviceData) => string[];
  signature?: string;
  status?: "draft" | "ready";
  /**
   * Built by code, never chosen or written by the model (TabBar from the sections marked nav). It
   * stays in the catalog and is read like any component, but choose and write prompts leave it out
   * and it has only `read` probes.
   */
  codeOwned?: boolean;
};

export type PackMeta = {
  id: PackId;
  example: string;
  probes: readonly (PackProbe | ChooseProbe)[];
};
export type Slot = {
  allow: readonly ComponentId[];
  required: boolean;
  min?: number;
  max?: number;
  variant?: string;
};
export type ArchetypeMeta = {
  id: string;
  job: string;
  layouts: Record<
    string,
    { recipe: readonly Slot[]; defaults: readonly Component[]; writeHints?: readonly string[] }
  >;
  defaultLayout: string;
};
