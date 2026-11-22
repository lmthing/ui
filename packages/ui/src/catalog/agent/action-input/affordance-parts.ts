import type { Meta } from "../../meta";
import type { Affordance } from "../index";
import type { DeviceData } from "../device-data";
import { matches } from "../visibility";
import { hasComponentToggle, withLiveInput } from "../live-inputs";
import { linkedInput } from "../linked-edits";
import { isSelectAll } from "../selection-binding";
import { localEventOffer, recordActionAt } from "../record-runtime";
import {
  itemEditOffer,
  recordEdit,
  recordEditAllowed,
  reportConfirmation,
  reportLocked,
} from "../report-edits";
type Props = Record<string, unknown>;

const firstBoolean = (value: Props) => Object.values(value).find((v) => typeof v === "boolean");
function detailOf(action: string, holder: Props, suppressLink: boolean, flag?: string): string {
  if (!suppressLink && (action === "press" || action === "select") && typeof holder.goto === "string")
    return `→${holder.goto}`;
  if (action === "toggle" && flag !== undefined) return holder[flag] === true ? ":on" : ":off";
  if (action === "toggle" && ["on", "off"].includes(String(holder.value))) return `:${holder.value}`;
  if (action === "toggle" || action === "check") {
    const on = firstBoolean(holder);
    if (on !== undefined) return action === "check" ? `:${on ? "done" : "todo"}` : `:${on ? "on" : "off"}`;
  }
  return "";
}

type When = Record<string, Record<string, string | boolean>> | undefined;

function hasPart(meta: Meta, holder: Props, part: string, item: boolean) {
  if (!(part in holder) || holder[part] !== undefined) return true;
  if (item) return recordEdit(meta, part) || Object.hasOwn(meta.items?.edits ?? {}, part);
  return (
    meta.selections?.[part]?.runtime ||
    Object.hasOwn(meta.live?.text ?? {}, part) ||
    hasComponentToggle(meta, part) ||
    linkedInput(meta, part)
  );
}

function itemControlAt(meta: Meta, part: string) {
  return Boolean(
    recordEdit(meta, part) ||
    meta.items?.edits?.[part] ||
    meta.items?.pickers?.[part] ||
    meta.recordRuntime?.presses?.[part],
  );
}

function componentPressAt(meta: Meta, part: string, action: string) {
  return (
    meta.clear?.[part] ||
    meta.items?.reset === part ||
    meta.linkedEdits?.swap.part === part ||
    reportConfirmation(meta, part, action)
  );
}

function revealOffer(address: string, part: string, action: string) {
  return { address, part, action, detail: "", hostReveal: true as const };
}

function secretControl(meta: Meta, part: string, action: string, item: boolean): Affordance["hostSecret"] {
  const spec = meta.actions;
  if (action === "copy" && spec?.authenticatedCopy?.[item ? "items" : "parts"]?.includes(part)) return "copy";
  if (item) return;
  if (action === "type" && Object.hasOwn(spec?.privateInput ?? {}, part)) return "input";
  if (action === "press" && Object.hasOwn(spec?.privateVerify ?? {}, part)) return "verify";
}
function nestedHolder(holder: Props, part: string) {
  const target = holder[part];
  return target && typeof target === "object" ? (target as Props) : holder;
}

export function partsOf(
  spec: Record<string, readonly string[]> | undefined,
  holder: Props,
  base: string,
  when: When,
  outer: Props,
  meta: Meta,
  item = false,
  data?: DeviceData,
  wire?: Props,
) {
  const noGoto = item ? meta.actions?.noGoto?.items : meta.actions?.noGoto?.parts;
  const locked = reportLocked(meta, outer);
  return Object.entries(spec ?? {}).flatMap(([part, actions]) =>
    matches(when?.[part], holder, outer, meta.deviceDataFlags) && hasPart(meta, holder, part, item)
      ? actions
          .filter((action) => {
            if (!matches(when?.[`${part}.${action}`], holder, outer, meta.deviceDataFlags)) return false;
            if (!item) {
              const record = recordActionAt(meta, part, action);
              if (record && record.target(holder) === undefined) return false;
              return !locked || !reportConfirmation(meta, part, action);
            }
            const edit =
              recordEditAllowed(meta, outer, holder, part, action, data) ??
              itemEditOffer(meta, holder, part, action, wire);
            return edit === undefined || (edit && !locked);
          })
          .map((action) => {
            const localEvent = localEventOffer(meta, part, action, item ? String(holder.id) : undefined);
            const address = part === "root" ? base : `${base}/${part}`;
            const hostSecret = secretControl(meta, part, action, item);
            if (hostSecret) return { address, part, action, detail: "", hostSecret };
            if (action === "press" && meta.actions?.reveal?.[item ? "items" : "parts"]?.includes(part))
              return revealOffer(address, part, action);
            const nested = nestedHolder(holder, part);
            const record = item ? recordEdit(meta, part) : undefined;
            const flag = item && part === "root" && meta.select?.runtime ? meta.select.prop : undefined;
            const localPress = !item && componentPressAt(meta, part, action);
            const suppressLink = Boolean(
              localEvent ||
              isSelectAll(meta, part, action, item) ||
              (item && itemControlAt(meta, part)) ||
              (action === "press" && (localPress || (nested === holder && noGoto?.includes(part)))),
            );
            return {
              address,
              part,
              action,
              ...(localEvent && { localEvent }),
              detail:
                record?.action === "check"
                  ? `:${holder[record.date] === undefined ? "todo" : "done"}`
                  : detailOf(action, nested, suppressLink, flag),
              ...withLiveInput(meta, part, action, holder, item),
            };
          })
      : [],
  );
}
