import type { Meta } from "../../meta";
import type { DeviceData } from "../device-data";
import { matches } from "../visibility";
import { withLiveInput } from "../live-inputs";
import { linkedInput } from "../linked-edits";
import { isSelectAll } from "../selection-binding";
import {
  itemEditOffer,
  recordEdit,
  recordEditAllowed,
  reportConfirmation,
  reportLocked,
} from "../report-edits";
type Props = Record<string, unknown>;

const firstBoolean = (value: Props) => Object.values(value).find((v) => typeof v === "boolean");
function detailOf(action: string, holder: Props, suppressLink: boolean): string {
  if (!suppressLink && (action === "press" || action === "select") && typeof holder.goto === "string")
    return `→${holder.goto}`;
  if (action === "toggle" && ["on", "off"].includes(String(holder.value))) return `:${holder.value}`;
  if (action === "toggle" || action === "check") {
    const on = firstBoolean(holder);
    if (on !== undefined) return action === "check" ? `:${on ? "done" : "todo"}` : `:${on ? "on" : "off"}`;
  }
  return "";
}

type When = Record<string, Record<string, string | boolean>> | undefined;

export function partsOf(
  spec: Record<string, readonly string[]> | undefined,
  holder: Props,
  base: string,
  when: When,
  outer: Props,
  meta: Meta,
  item = false,
  data?: DeviceData,
) {
  const noGoto = item ? meta.actions?.noGoto?.items : meta.actions?.noGoto?.parts;
  const locked = reportLocked(meta, outer);
  return Object.entries(spec ?? {}).flatMap(([part, actions]) =>
    matches(when?.[part], holder, outer) &&
    (!(part in holder) ||
      holder[part] !== undefined ||
      (item && (recordEdit(meta, part) || Object.hasOwn(meta.items?.edits ?? {}, part))) ||
      (!item &&
        (meta.selections?.[part]?.runtime ||
          Object.hasOwn(meta.live?.text ?? {}, part) ||
          linkedInput(meta, part))))
      ? actions
          .filter((action) => {
            if (!matches(when?.[`${part}.${action}`], holder, outer)) return false;
            if (!item) return !locked || !reportConfirmation(meta, part, action);
            const edit =
              recordEditAllowed(meta, outer, holder, part, action, data) ??
              itemEditOffer(meta, holder, part, action);
            return edit === undefined || (edit && !locked);
          })
          .map((action) => {
            const target = holder[part];
            const nested = target && typeof target === "object" ? (target as Props) : holder;
            const record = item ? recordEdit(meta, part) : undefined;
            const itemControl = item && (record || meta.items?.edits?.[part] || meta.items?.pickers?.[part]);
            const localPress =
              !item &&
              (meta.clear?.[part] ||
                meta.linkedEdits?.swap.part === part ||
                reportConfirmation(meta, part, action));
            const suppressLink = Boolean(
              isSelectAll(meta, part, action, item) ||
              itemControl ||
              (action === "press" && (localPress || (nested === holder && noGoto?.includes(part)))),
            );
            return {
              address: part === "root" ? base : `${base}/${part}`,
              part,
              action,
              detail:
                record?.action === "check"
                  ? `:${holder[record.date] === undefined ? "todo" : "done"}`
                  : detailOf(action, nested, suppressLink),
              ...withLiveInput(meta, part, action, holder, item),
            };
          })
      : [],
  );
}
