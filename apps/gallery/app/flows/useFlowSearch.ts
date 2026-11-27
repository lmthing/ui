import { useMemo, useSyncExternalStore } from "react";
import { flowScreenId, type FilledFlow, type FlowSearch } from "@lmthing/ui/catalog";
import { createInteractionStore, type InteractionStore } from "@lmthing/ui/kit";

export function useFlowSearch(store: InteractionStore | undefined, screen: string): FlowSearch {
  const base = `${screen}/filter`;
  const query = useSyncExternalStore(store?.subscribe ?? idle, () =>
    String(store?.get(`${base}/field`) ?? ""),
  );
  const category = useSyncExternalStore(store?.subscribe ?? idle, () =>
    String(store?.get(`${base}/$selection/r1`) ?? ""),
  );
  return useMemo(() => ({ query, category }), [query, category]);
}

const idle = () => () => {};

export function emptySearchStore(flow: FilledFlow, index: number) {
  const rows = flow.frames[index]?.search?.results;
  if (!rows) return;
  const first = rows[0]!;
  const other = rows.find((row) => flow.record[row.category] !== flow.record[first.category]);
  if (!other) return;
  const base = `${flowScreenId(index)}/filter`;
  return createInteractionStore({
    [`${base}/field`]: flow.record[other.title],
    [`${base}/$type/field`]: flow.record[other.title],
    [`${base}/$selection/r1`]: flow.record[first.category],
  });
}
