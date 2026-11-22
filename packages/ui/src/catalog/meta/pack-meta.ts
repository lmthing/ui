import type { ScreenLike } from "../agent";
import type { ChooseProbe, PackProbe } from "../probes";
import type { Issue } from "../rules";
import type { Component, ComponentId } from "../types";
import type { HostRecords } from "./live";
import type { PackId } from "./pack-ids";

/** Pure check over canonical entries with parsed props. Report stable `S.*` codes. */
export type PackScreenValidator = (screen: ScreenLike) => readonly Issue[];
export type PackMeta = {
  id: PackId;
  example: string;
  probes: readonly (PackProbe | ChooseProbe)[];
  screenValidators?: readonly PackScreenValidator[];
  hostRecords?: HostRecords;
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
