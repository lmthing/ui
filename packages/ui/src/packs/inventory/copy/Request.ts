import type { StateName } from "../../../catalog";
import { inventoryWordsFor, type InventoryWords } from "../lang";

type RequestCopy = {
  priority: keyof InventoryWords["request"]["priority"];
  status: keyof InventoryWords["request"]["status"];
  may_change_status?: boolean;
  who?: string | undefined;
  updates: readonly unknown[];
};

export function requestStatusChoices(statuses: readonly RequestCopy["status"][], lang?: string) {
  const {
    request: { status },
  } = inventoryWordsFor(lang);
  return statuses.map((value) => ({ value, label: status[value] }));
}

export function requestReading(input: RequestCopy, state: StateName, lang?: string): string[] {
  const { request: words } = inventoryWordsFor(lang);
  const fixed = state === "success";
  const status = words.status[fixed ? "fixed" : input.status];
  return [
    words.priority[input.priority],
    ...(input.who ? [words.assignee(input.who)] : []),
    words.statusLabel,
    status,
    ...(!fixed && input.may_change_status
      ? Object.values(words.status).filter((label) => label !== status)
      : []),
    ...(input.updates.length ? [words.updates] : []),
    ...(!fixed ? [words.update] : []),
  ];
}
