import { components, type ScreenLike } from "@lmthing/ui/catalog";

export type RawScreen = {
  id: string;
  title?: string;
  components: ({ id: string; c: string } & Record<string, unknown>)[];
};

/** The repair every recorded reply gets: absent optional fields were written as null, so they are dropped. */
export function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, stripNulls(v)]),
    );
  }
  return value;
}

/** Keeps only components the catalog has whose props validate, so one bad line never blanks a screen. */
export function cleanScreen(screen: RawScreen): ScreenLike {
  const defs = components as unknown as Record<
    string,
    { props: { safeParse: (v: unknown) => { success: boolean } } }
  >;
  const kept = screen.components.flatMap((entry) => {
    const cleaned = stripNulls(entry) as RawScreen["components"][number];
    const { id: _id, c, state: _state, ...props } = cleaned;
    return defs[c]?.props.safeParse(props).success ? [cleaned] : [];
  });
  return { id: screen.id, ...(screen.title ? { title: screen.title } : {}), components: kept } as ScreenLike;
}

/** JSON lines (one component per line, `{"id","c",...}`) as a screen. Lines that do not parse are skipped. */
export function screenOfLines(id: string, lines: string[]): RawScreen {
  const parsed = lines.flatMap((line) => {
    try {
      return [JSON.parse(line) as RawScreen["components"][number]];
    } catch {
      return [];
    }
  });
  return { id, components: parsed };
}
