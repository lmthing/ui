import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta(
  "tracker",
  "Log an activity again and again",
  {
    counter: "Header Counter Note Bars Button",
    scale: "Header Scale:mood Bars Button",
    timer: "Header Timer Note Bars Button",
  },
  {
    counter: [
      "The Counter shows today's supplied amount. Include a short Note explaining that plus/minus changes today and Save records the entry. Its plus/minus controls change that amount; the Button saves the daily entry. Bars show only prior-day entries using labels Mon, Tue, Wed, Thu, Fri, Sat or Sun. Today belongs in the Counter, not the bars. Use one shared unit.",
    ],
    scale: [
      "This is a daily mood check-in for the person, not a rating of objects or a count of unrelated actions. Scale uses mood style, the supplied current value, readonly false and meta null. Bars show only the supplied earlier days and their same one-to-five rating, with four-character day labels. The Button saves today's rating and continues to checkin_saved. Keep optional Header actions null.",
    ],
    timer: [
      "The Timer measures the current supplied session, using seconds. Include a short Note explaining Start, Stop and saving the finished session. Bars compare only completed prior-day sessions in minutes, using labels Mon, Tue, Wed, Thu, Fri, Sat or Sun. Today belongs in the Timer, not the bars. The Button saves the finished session; do not make it duplicate Start or Stop.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
