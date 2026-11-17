import type { z } from "zod";
import type { Meta } from "./meta";

type WithId<T> = T extends readonly (infer Item)[] ? (Item & { id: string })[] : T;
export type Props<S extends z.ZodType, M extends Meta> = {
  [K in keyof z.output<S>]: M extends { items: { key: K } }
    ? WithId<z.output<S>[K]> : z.output<S>[K];
};
