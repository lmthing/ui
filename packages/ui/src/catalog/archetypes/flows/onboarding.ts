import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "onboarding",
  "The first few steps in the app",
  { single: "Hero Note Steps Button", steps: "Hero Note Steps Choice? Button" },
  {
    single: [
      "Welcome a first-time person into setup, not into an urgent status report. Hero welcomes them; Note explains the first setup task; Steps shows step one of three with that task's label; Button starts it and navigates to setup. All four components describe the same first-time flow, not activity that has already been logged.",
    ],
    steps: [
      "Show the first step of a short setup flow. Hero introduces setup, Note explains the specific task on this step, and Steps labels that same task. Use the optional Choice only if it completes that task using the supplied content. The Button clearly continues to the next setup screen; do not report sample data as already set up.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
