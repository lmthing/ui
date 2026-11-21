import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { ActStep, Values } from "../act";
import { liveProps, parseControlProps, projectControlInput } from "../live-props";
import type { ScreenLike } from "../read";
import { addressedItems } from "../visibility";
import type { DeviceData } from "../device-data";
import { wireEditKey, writeWireEdit } from "./wire-edits";
export { applyReportEdits } from "./wire-edits";
type Choices = NonNullable<NonNullable<Meta["select"]>["choices"]>[string];
type ItemEdit =
  | { action: "select"; prop: string; choices: Choices | { row: string } }
  | { action: "type"; prop: string; max: number; empty?: "unset" }
  | { action: "photo"; prop: string; max: number }
  | { action: "remove"; photo: string };
export type ItemEdits = Readonly<Record<string, ItemEdit>>;
export type ItemEditPath = (
  item: Readonly<Values>,
  wire: Readonly<Values>,
) => readonly (string | number)[] | undefined;

function own<T>(map: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return Object.hasOwn(map ?? {}, key) ? map![key] : undefined;
}

function itemTarget(target: string) {
  const [item, part, extra] = target.split("/");
  return item && part && extra === undefined ? { item, part } : undefined;
}

export function itemEditSpec(meta: Meta, target: string) {
  const address = itemTarget(target);
  return address && own(meta.items?.edits, address.part);
}

export function itemEditAt(meta: Meta, props: Values, target: string) {
  const spec = itemEditSpec(meta, target);
  if (!spec) return;
  const { item, part } = itemTarget(target)!;
  const index = addressedItems(meta, props).findIndex(({ id }) => id === item);
  const row = addressedItems(meta, props)[index];
  if (row) return { spec, index, part, item, row };
}

export function reportConfirmation(meta: Meta, target: string, action: string) {
  return (
    action === "press" && (itemEditSpec(meta, target)?.action === "remove" || !!own(meta.signOff, target))
  );
}

export function hasReportConfirmation(meta: Meta) {
  return Boolean(
    meta.signOff || Object.values(meta.items?.edits ?? {}).some(({ action }) => action === "remove"),
  );
}

export function reportLocked(meta: Meta, props: Values) {
  return Object.values(meta.signOff ?? {}).some((prop) => props[prop] !== undefined);
}

function photoList(row: Values, prop: string): readonly string[] {
  return Array.isArray(row[prop]) ? (row[prop] as string[]) : [];
}

/** An item edit behaves like an ordinary declared action, but cannot link or fall back to a row selection. */
export function itemEditOffer(meta: Meta, row: Values, part: string, action: string) {
  const spec = own(meta.items?.edits, part);
  if (!spec) return undefined;
  if (meta.items?.deviceData && !meta.items.editPath) return false;
  if (spec.action === "photo") return action === "press" && photoList(row, spec.prop).length < spec.max;
  if (spec.action === "remove") {
    const photo = own(meta.items?.edits, spec.photo);
    return action === "press" && photo?.action === "photo" && photoList(row, photo.prop).length > 0;
  }
  return action === spec.action;
}

type EditRequest =
  | { kind: "input" }
  | { kind: "confirm"; now: number; removal: ReportRemoval | undefined }
  | { kind: "photo"; reference: string };

export type ReportRemoval = Readonly<{ index: number; reference: string }>;
export function reportRemovalAt(meta: Meta, props: Values, target: string): ReportRemoval | undefined {
  const edit = itemEditAt(meta, props, target);
  if (edit?.spec.action !== "remove") return;
  const picker = own(meta.items?.edits, edit.spec.photo);
  if (picker?.action !== "photo") return;
  const photos = photoList(edit.row, picker.prop);
  const reference = photos.at(-1);
  return reference === undefined ? undefined : { index: photos.length - 1, reference };
}

function changeAt(
  meta: Meta,
  row: Values,
  spec: NonNullable<ReturnType<typeof itemEditSpec>>,
  request: EditRequest,
  input: unknown,
) {
  if (request.kind === "input" && (spec.action === "select" || spec.action === "type")) {
    const value =
      spec.action === "type" && spec.empty === "unset" && typeof input === "string" && !input.trim()
        ? undefined
        : input;
    return { prop: spec.prop, value };
  }
  if (request.kind === "photo" && spec.action === "photo")
    return { prop: spec.prop, value: [...photoList(row, spec.prop), request.reference] };
  if (request.kind === "confirm" && spec.action === "remove") {
    const photo = own(meta.items?.edits, spec.photo);
    if (photo?.action !== "photo" || !request.removal) return;
    const { index, reference } = request.removal;
    const photos = photoList(row, photo.prop);
    if (photos[index] !== reference) return;
    const value = photos.filter((_, at) => at !== index);
    return { prop: photo.prop, value, picker: { part: spec.photo, reference: value.at(-1) } };
  }
}

function itemPath(meta: Meta, wire: Values, edit: NonNullable<ReturnType<typeof itemEditAt>>) {
  const items = meta.items!;
  if (items.editPath) return items.editPath(edit.row, wire);
  if (!items.deviceData && Array.isArray(wire[items.key])) return [items.key, edit.index];
}

/** Stage a schema-checked wire edit. Undefined means this step is not a wire edit. */
export function stageReportEdit(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  step: ActStep,
  request: EditRequest,
  data?: DeviceData,
): boolean | undefined {
  const [id, ...parts] = step.address.split("/");
  const target = parts.join("/") || "root";
  const entry = screen.components.find((component) => component.id === id);
  const def = entry && defs[entry.c];
  if (!def) return undefined;
  const { meta } = def;
  const spec = itemEditSpec(meta, target);
  if (request.kind !== "input" && step.action !== "press") return undefined;
  const signOff = request.kind === "confirm" && own(meta.signOff, target);
  const relevant =
    request.kind === "input"
      ? spec?.action === step.action
      : request.kind === "photo"
        ? spec?.action === "photo"
        : signOff || spec?.action === "remove";
  if (!relevant) return undefined;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const base = `${screen.id}/${id}`;
  const get = (part: string) => values[`${base}/${part}`];
  const wire = projectControlInput(def, raw, get);
  const editValues = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => key.startsWith(`${base}/`))
      .map(([key, value]) => [key.slice(screen.id.length + 1), value]),
  );
  const props = liveProps(meta, parseControlProps(def, raw, get), id!, editValues, true, data);
  if (reportLocked(meta, props)) return false;
  const commit = (path: readonly (string | number)[], value: unknown) =>
    writeWireEdit(def, wire, values, `${base}/${wireEditKey}`, { path, value });
  if (signOff && request.kind === "confirm") {
    const date = new Date(request.now);
    if (!Number.isFinite(date.valueOf()) || !commit([signOff], date.toISOString())) return false;
    return true;
  }
  const edit = itemEditAt(meta, props, target);
  if (!edit || !itemEditOffer(meta, edit.row, edit.part, step.action)) return false;
  const path = itemPath(meta, wire, edit);
  const change = changeAt(meta, edit.row, edit.spec, request, step.value);
  if (!path || !change || !commit([...path, change.prop], change.value)) return false;
  if (request.kind === "photo") values[`${base}/${target}`] = request.reference;
  if (change.picker) values[`${base}/${edit.item}/${change.picker.part}`] = change.picker.reference;
  return true;
}
