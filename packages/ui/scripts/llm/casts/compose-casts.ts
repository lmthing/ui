import type { CastLike } from "@lmthing/ui/catalog";
import { counterCast, timerCast } from "./tracker-casts";
import { cast, plansCast, chatCast, settingsCast } from "./default-casts";

const casts: Record<string, CastLike> = { plans: plansCast, chat: chatCast, settings: settingsCast };
export function compositionCast(id: string, layout: string): CastLike {
  const tracker =
    id === "tracker"
      ? layout === "counter"
        ? counterCast
        : layout === "timer"
          ? timerCast
          : undefined
      : undefined;
  const fixture = tracker ?? casts[id];
  return fixture ? structuredClone(fixture) : cast;
}
