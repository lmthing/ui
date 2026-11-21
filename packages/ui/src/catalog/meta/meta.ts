import type { ActionName, ActionSpec, Component, ComponentId, StateName, Tier } from "../types";
import type { PackProbe, ChooseProbe } from "../probes";
import type { PackId } from "./pack-ids";
import type { ClockMeta } from "./clocks";
import type { RecordEdits } from "./record-edits";
import type { ItemVariants, Session, VariantParts, Variants } from "../types";
import type { DeviceData, ItemEditPath, ItemEdits, ScreenLike } from "../agent";
import type { Issue } from "../rules";
import type * as LiveMeta from "./live";
export type NumericAdjustments = Readonly<
  Partial<Record<`${string}.${ActionName}`, { prop: string; delta: number; min?: number; max?: number }>>
>;
type Draw =
  | { kind: "faces"; press: string; count: string; sides: string; hold?: string }
  | { kind: "pick"; press: string; pool: string; repeat?: string; reset?: string }
  | { kind: "partition"; press: string; redraw?: string; players: string; teams: string; locked?: string };
type NumericSet = { prop: string; min?: number; max?: number; integer?: boolean };
type ItemNumericSet = NumericSet & {
  /** Addressed items flatten this wire matrix in row-major order. */
  matrix?: { rows: string; values: string };
};
type ComponentSet =
  | (NumericSet & { type?: "number" } & (
        { runtime?: false } | { runtime: true; maxProp: string; initial: number }
      ))
  | { prop: string; type: "date"; min?: string; max?: string }
  | { prop: string; type: "choice"; choices: readonly string[] };
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
  | { value: RowSelection; mode: "flags"; choices?: never; runtime?: true }
  | {
      value?: RowSelection;
      mode?: "one";
      runtime?: never;
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
  drives?: string; // Forward item root presses as a seek to the item's `at` seconds.
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
  /**
   * Component `set` parts. Omitted type means number; date bounds are inclusive ISO dates.
   * Runtime numeric destinations never enter Writer props; `maxProp` is parsed.
   */
  set?: Readonly<Record<string, ComponentSet>>;
  /** Confirmed component press part → item set part whose nullable values are cleared. */
  clearItems?: Readonly<Record<string, string>>;
  /** Component press part → live text and item picker parts to reset together. */
  clear?: Readonly<Record<string, { text: readonly string[]; pickers: readonly string[] }>>;
  /** Confirmed component press part → wire prop holding the sign-off timestamp. */
  signOff?: Readonly<Record<string, string>>;
  /** `visible: "first"` draws and reads only the first item, with a count of the rest. */
  items?: {
    key: string;
    parts: readonly string[];
    prefix?: string;
    /** Replace this runtime collection with validated, addressed host rows, not Writer props. */
    deviceData?: LiveMeta.DeviceRows;
    visible?: "all" | "first";
    /** Read visible rows sharing the value of this readable text field on one addressed line. */
    readGroupBy?: string;
    /** Match the addressed row first, then its component. Filter only after stamping. */
    visibleWhen?: Readonly<Record<string, string | boolean>>;
    variants?: ItemVariants;
    clocks?: readonly ClockMeta[];
    adjust?: NumericAdjustments;
    /** Item parts backed by wire props. Photo and remove use the declared press actions. */
    edits?: ItemEdits;
    /** Confirmed edits of whole wire records in the item collection. */
    records?: RecordEdits;
    /** Inline press/select parts; a choice source prop belongs to the addressed item. */
    pickers?: Readonly<Record<string, { prop: string; choices: ChoiceSource }>>;
    /** Locate the row's wire owner; required for host row edits, otherwise defaults to the stamped index. */
    editPath?: ItemEditPath;
    /** Item-root move: the row's column index and the component's array of { label } columns. */
    move?: { column: string; columns: string };
    /** Item parts with a numeric `set`; adjustments to the same prop share its value and bounds. */
    set?: Readonly<Record<string, ItemNumericSet>>;
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
  select?: SelectMeta; // Flags with runtime: true never enter wire snapshots.
  /** Bind to item checks on a same-screen component. Without an instance id, require a unique source. */
  selectionBinding?: LiveMeta.SelectionBinding;
  /** Named component parts with independent destinations and explicit offers. */
  selections?: Readonly<Record<string, NamedSelection>>;
  /** Component `type` parts and one `press` part sharing runtime state outside Writer props. */
  linkedEdits?: LiveMeta.LinkedEdits;
  live?: LiveMeta.LiveInputs;
  /** Record kinds this component may read from the host, never from Writer props. */
  deviceData?: readonly string[];
  /** Trusted boolean props for `actions.when`; `now` is an unstored epoch millisecond sample. */
  deviceDataFlags?: LiveMeta.DeviceDataFlags;
  /** Next future epoch millisecond when a mounted projection needs to be read again. */
  deviceDataWake?: LiveMeta.DeviceDataWake;
  /** Runtime projections and row presses backed by declared host records and a staged journal. */
  recordRuntime?: LiveMeta.RecordRuntime;
  /** Pure visibility rule over the declared host records. A false result hides the whole component. */
  deviceDataVisible?: (data: DeviceData) => boolean;
  /** Deterministic synthetic records for preview, conformance and read-probe fixtures only. */
  previewDeviceData?: (cell: { input: Readonly<Record<string, unknown>>; state: StateName }) => DeviceData;
  parts?: readonly string[];
  states?: readonly StateName[];
  actions?: ActionSpec;
  /** Currency comes from the host, never from the component props. */
  read?: LiveMeta.ReadSummary;
  signature?: string;
  status?: "draft" | "ready";
  /** Built by code (e.g. TabBar); stays readable but has no choose/write prompts or probes. */
  codeOwned?: boolean;
};

/** Pure check over canonical entries with parsed props. Report stable `S.*` codes. */
export type PackScreenValidator = (screen: ScreenLike) => readonly Issue[];
export type PackMeta = {
  id: PackId;
  example: string;
  probes: readonly (PackProbe | ChooseProbe)[];
  screenValidators?: readonly PackScreenValidator[];
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
