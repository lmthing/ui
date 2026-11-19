import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "onboarding",
  "The first few steps in the app",
  { single: "Hero Note Steps Button", steps: "Hero Note Steps Choice? Button" },
  {
    single: [
      "Welcome a first-time person into setup, not into an urgent status report. Hero welcomes them; Note explains the first setup task; Steps shows step one of three with that task's label; Button starts it and navigates to setup. All four components describe the same first-time flow, not activity that has already been logged.",
      "Give one concrete starting point. If sample records are supplied, name one and use a real detail to show what the person can set up, without claiming they already did. Use the Hero for the benefit of setup, the Note for this practical example, and the Button for the specific first action. Do not repeat the same instruction in each component.",
    ],
    steps: [
      "Show one decision on the first step of a short setup flow. If there are two to five supplied examples, the Choice lets the person pick one as a starting point, using the real names and concise facts to distinguish them. Hero explains why to do setup; Note explains what happens after this choice; Steps names the current decision. Label the Button for the next task and link to the matching setup screen. Do not offer unrelated tasks or claim the samples are already set up.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
