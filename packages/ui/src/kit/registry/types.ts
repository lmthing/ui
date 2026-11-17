export type Rect = { x: number; y: number; width: number; height: number };
export type PartEntry = { screen: string; rev: number; address: string; rect: Rect };
export interface PartRegistry {
  register(entry: PartEntry): void;
  unregister(entry: Omit<PartEntry, "rect">): void;
}
