import type { ActionName, ActionSpec, StateName, Tier } from "../types";
import type { ClockMeta } from "./clocks";
import type { RecordEdits } from "./record-edits";
import type { ItemVariants, Session, VariantParts, Variants } from "../types";
import type { DateSpanSelection, DeviceData, HostCommandMeta, ItemEditPath, ItemEdits } from "../agent";
import type * as LiveMeta from "./live";
import type { Choice, NamedCollection, NestedGroups, NestedPart } from "./collections";
import type { DriveBindings, NumericRange } from "./runtime";
export type NumericAdjustments = Readonly<
  Partial<Record<`${string}.${ActionName}`, { prop: string; delta: number } & NumericRange>>
>;
type NumericSet = { prop: string; integer?: boolean } & NumericRange;
type ItemNumericSet = NumericSet & {
  /** Addressed items flatten this wire matrix in row-major order. */
  matrix?: { rows: string; values: string };
};
type ComponentSet =
  | (NumericSet & { type?: "number" } & (
        { runtime?: false } | { runtime: true; maxProp?: string; initial: number }
      ))
  | { prop: string; type: "date"; min?: string; max?: string }
  | { prop: string; type: "choice"; choices: readonly string[] };
type RowSelection = "index" | "position" | { field: string };
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
      /** Resolve a row selection without projecting it onto the host's current value. */
      host?: true;
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
  /** Option collection whose selection controls a sibling data view. */
  dataView?: "options" | "items";
  tier: Tier;
  /** A part that needs more than the component does (a reply that reaches other people) carries its own tier. */
  partTiers?: Readonly<Record<string, Tier>>;
  /** Resolve a declared part's tier from a live component prop before falling back to static tiers. */
  partTiersBy?: Readonly<Record<string, { prop: string; tiers: Readonly<Partial<Record<string, Tier>>> }>>;
  realPath: string;
  /** A filled component with no drawable content does not take up a screen slot. */
  viewVisible?: (
    input: Readonly<Record<string, unknown>>,
    resolvePhoto?: (reference: string) => string | undefined,
  ) => boolean;
  dense?: true;
  confirmParts?: readonly string[];
  drives?: string | DriveBindings; // A component id preserves legacy item-root seek.
  variants?: Variants;
  variantParts?: VariantParts;
  clocks?: readonly ClockMeta[];
  media?: LiveMeta.MediaTargets;
  sequence?: LiveMeta.SequenceMeta;
  adjust?: NumericAdjustments;
  /** Part/action pairs from `actions` that are also available in `empty`. */
  emptyActions?: readonly `${string}.${ActionName}`[];
  /** Part/action pairs from `actions` that are also available in `success`. */
  successActions?: readonly `${string}.${ActionName}`[];
  /** Part/action pairs from `actions` available only in `error`. */
  errorActions?: readonly `${string}.${ActionName}`[];
  /** Read visible content and the read summary in success, not just the header and available actions. */
  readSuccess?: true;
  /** Read a summary without listing items in empty or success when the props opt in. */
  readInState?: (props: Readonly<Record<string, unknown>>, state: "empty" | "success") => boolean;
  /** Read the component's error summary alongside its available recovery actions. */
  readError?: true;
  /** Runtime-only chance control. Input keys refer to validated props, never to result props. */
  draw?: LiveMeta.Draw;
  /** Monotonic round timing for an item press and a component reset press. */
  buzz?: { press: string; reset: string };
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
  items?: {
    key: string;
    parts: readonly string[];
    prefix?: string;
    /** Replace this runtime collection with validated, addressed host rows, not Writer props. */
    deviceData?: LiveMeta.DeviceRows;
    visible?: "all" | "first"; // "first" draws and reads only the first item and counts the rest.
    /** Read visible rows sharing the value of this readable text field on one addressed line. */
    readGroupBy?: string;
    /** Spell out `/root` on item-root actions in the reading without changing dispatch addresses. */
    readRoot?: true;
    /** This wire collection has item addresses only in the matching component structure. */
    addressedWhen?: Readonly<Record<string, string | boolean>>;
    /** Replace these item fields with the secret marker when the shared read condition matches. */
    readSecrets?: { fields: readonly string[]; when: Readonly<Record<string, string | boolean>> };
    revealSecrets?: { part: string; fields: readonly string[] };
    /** Match the addressed row first, then its component. Filter only after stamping. */
    visibleWhen?: Readonly<Record<string, string | boolean>>;
    toggles?: Readonly<Record<string, string>>; // Named toggle part → live row boolean.
    variants?: ItemVariants;
    clocks?: readonly ClockMeta[];
    media?: LiveMeta.MediaTargets & { identity?: string };
    adjust?: NumericAdjustments;
    /** Confirmed component press part that restores item adjustments and nested step values to their seeds. */
    reset?: string;
    /** Item parts backed by wire props. Photo and remove use the declared press actions. */
    edits?: ItemEdits;
    /** Confirmed edits of whole wire records in the item collection. */
    records?: RecordEdits;
    /** Inline press/select parts; a choice source prop belongs to the addressed item. */
    pickers?: Readonly<Record<string, { prop: string; choices: ChoiceSource }>>;
    /** Locate the row's wire owner; required for host row edits, otherwise defaults to the stamped index. */
    editPath?: ItemEditPath;
    /** Item-root move by index into { label } columns, or by ordered values of a wire row enum. */
    move?: LiveMeta.ItemMove;
    /** Item parts with a numeric `set`; adjustments to the same prop share its value and bounds. */
    set?: Readonly<Record<string, ItemNumericSet>>;
    nested?: {
      key: string;
      /** Show only the row selected by `select`; before selection, use the first row. */
      activeParent?: true;
      /** Maximum on toggles across all parent rows, including hidden ones. */
      maxActive?: number;
      /** Independent policies within each parent, optionally partitioned by a child field. */
      groups?: NestedGroups;
      clocks?: readonly ClockMeta[];
      parts: Readonly<Record<string, NestedPart>>;
    };
  };
  /** Optional independent, addressable collections alongside the legacy items. */
  collections?: Readonly<Record<string, NamedCollection>>;
  select?: SelectMeta; // Flags with runtime: true never enter wire snapshots.
  dateSpan?: DateSpanSelection;
  /** Declared component press parts that signal an in-screen drawing to reveal a local anchor. */
  jump?: readonly string[];
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
  /** Pure, bounded instance state, advanced by declared local actions only. */
  localState?: LiveMeta.LocalStateRuntime;
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
} & HostCommandMeta;
export type { ArchetypeMeta, PackMeta, PackScreenValidator, Slot } from "./pack-meta";
