import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "onboarding",
  "The first few steps in the app",
  { single: "Hero Note Steps Button", steps: "Hero Note Steps Choice? Button" },
  {
    single: [
      "Welcome a first-time person into setup, not into an urgent status report. Hero welcomes them; Note explains the first setup task; Steps shows step one of three with that task's label; Button starts it and navigates to setup. All four components describe the same first-time flow, not activity that has already been logged.",
      "Give one concrete starting point. If sample records are supplied, use the same named record throughout the first task and copy one of its supplied facts accurately in the Note. The Hero explains the benefit of setup, not a status report. Keep Hero and Note axes null. Steps names the current task and the Button explains the next action with a destination; avoid repeating the same label verbatim.",
    ],
    steps: [
      "Show one decision on the first step of a short setup flow. If there are two to five supplied examples, the Choice lets the person pick one as a starting point, using the real names and concise facts to distinguish them. Hero explains why to do setup; Note explains what happens after this choice; Steps names the current decision. Label the Button for the next task and link to the matching setup screen. Do not offer unrelated tasks or claim the samples are already set up.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
