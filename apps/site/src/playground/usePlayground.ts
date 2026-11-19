import { useMemo, useState } from "react";
import { components, readScreen, type ScreenLike } from "@lmthing/ui/catalog";
import { schemaOf } from "./schema";

type Def = {
  meta: Record<string, unknown> & { id: string; states?: readonly string[]; parts?: readonly string[] };
  props: {
    safeParse: (v: unknown) => {
      success: boolean;
      error?: { issues: { path: PropertyKey[]; message: string }[] };
    };
  };
  examples: unknown[];
};

/** Props, state and the validated screen for one component's playground. */
export function usePlayground(id: string) {
  const def = (components as unknown as Record<string, Def | undefined>)[id];
  const [example, setExample] = useState(0);
  const [props, setProps] = useState<Record<string, unknown>>(() =>
    structuredClone((def?.examples[0] ?? {}) as Record<string, unknown>),
  );
  const [state, setState] = useState("filled");
  const [last, setLast] = useState<Record<string, unknown>>(props);
  const result = def?.props.safeParse(props);
  const valid = Boolean(result?.success);
  const live = valid ? props : last;
  if (valid && live !== last) setLast(live);
  const instance = "c1";
  const screen = useMemo(
    () =>
      ({
        id: "play",
        components: [{ id: instance, c: id, ...(state !== "filled" ? { state } : {}), ...live }],
      }) as unknown as ScreenLike,
    [id, live, state],
  );
  const text = useMemo(() => {
    if (!def) return "";
    try {
      return readScreen(screen, components as never);
    } catch (error) {
      // A prop set the catalog cannot read (mid-edit, or a new axis) must not take the page down.
      const issues = (error as { issues?: { path: PropertyKey[]; message: string }[] }).issues;
      return `The agent read is unavailable for these props: ${issues?.map((i) => `${i.path.join(".")} ${i.message}`).join("; ") ?? String(error)}`;
    }
  }, [screen, def]);
  return {
    def,
    schema: useMemo(() => (def ? schemaOf(def.props) : null), [def]),
    props,
    setProps,
    example,
    pick: (i: number) => (
      setExample(i),
      setProps(structuredClone((def?.examples[i] ?? {}) as Record<string, unknown>))
    ),
    state,
    setState,
    issues:
      result && !result.success
        ? (result.error?.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) ?? [])
        : [],
    screen,
    line: JSON.stringify({ id: instance, c: id, ...props }),
    text,
  };
}
