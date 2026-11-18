import type { ChooseProbe, ReadProbe, WriteProbe } from "..";

/** Probe data in the same property order as the component declarations. */
export function probesFor(component: string) {
  return {
    choose(need: string, expect = component): ChooseProbe {
      return { kind: "choose", need, expect };
    },
    write(brief: string): WriteProbe {
      return { kind: "write", brief, expect: component };
    },
    read(task: string, expect: ReadProbe["expect"], screen = 0): ReadProbe {
      return { kind: "read", screen, task, expect };
    },
  };
}
