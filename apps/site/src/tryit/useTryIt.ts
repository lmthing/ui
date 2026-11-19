import { useMemo, useState } from "react";
import { components, readScreen, type ScreenLike } from "@lmthing/ui/catalog";
import { useActing } from "./useActing";
import { useEngines } from "./useEngines";
import { useWriter } from "./useWriter";

export type { Written } from "./useWriter";

/** Everything the Try-it panel needs: which engines exist, a run, the streamed lines and the act step. */
export function useTryIt() {
  const [status, setStatus] = useState("");
  const engines = useEngines(setStatus);
  const writer = useWriter(engines.pick, setStatus);
  const screen = useMemo(
    () =>
      ({
        id: "tryit",
        components: writer.written.flatMap((w) => (w.outcome.line ? [w.outcome.line] : [])),
      }) as unknown as ScreenLike,
    [writer.written],
  );
  const view = useMemo(
    () => (screen.components.length ? readScreen(screen, components as never) : ""),
    [screen],
  );
  const acting = useActing(writer.engine, screen, view, setStatus);
  const run = (request: string) => (acting.clear(), writer.run(request));
  return { ...engines, ...writer, ...acting, status, screen, view, run };
}
