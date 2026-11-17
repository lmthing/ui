import { useContext } from "react";
import { KitContext } from "./context";

export function useKit() {
  const kit = useContext(KitContext);
  if (!kit) throw new Error("Kit views require KitProvider");
  return kit;
}
