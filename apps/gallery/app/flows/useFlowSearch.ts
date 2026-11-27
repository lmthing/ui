import { useMemo, useSyncExternalStore } from "react";
import type { FlowSearch } from "@lmthing/ui/catalog";
import type { InteractionStore } from "@lmthing/ui/kit";

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
