import { createContext, useContext, type ReactNode } from "react";
import type { StateName } from "../../catalog";

type PartContextValue = {
  screen: string;
  component: string;
  item?: string;
  rev: number;
  state: StateName;
  signature?: string;
  cue?: number;
  /** The thing type this component shows (from the cast), used for empty-state copy. */
  thing?: string;
};
export const PartContext = createContext<PartContextValue | null>(null);

/** Set by the host (Screen, gallery) around each component instance. */
export function PartScope({ children, ...value }: PartContextValue & { children: ReactNode }) {
  return <PartContext.Provider value={value}>{children}</PartContext.Provider>;
}
export function usePartContext() {
  const context = useContext(PartContext);
  if (!context) throw new Error("Kit parts require PartScope");
  return context;
}
export function useComponentState() {
  return usePartContext().state;
}
export function useEmptyThing() {
  return usePartContext().thing;
}
