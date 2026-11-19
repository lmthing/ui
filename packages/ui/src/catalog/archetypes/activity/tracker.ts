import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
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
      "This is a daily mood check-in for the person, not a rating of objects. Scale uses mood style, the supplied current value, readonly false and meta null. Bars must copy only the supplied prior-day ratings and their three-letter labels (Mon, Tue, Wed and so on). Do not write full day names or include Today in Bars. The Button saves today's rating and continues to checkin_saved. Keep Header action null.",
      "Make the sequence clear: Header says to rate today's mood and save it; Scale asks how the person feels today; Bars is titled as recent mood ratings and labels the same rating unit; the primary Button says Save mood. Keep prior ratings as context, not a second task.",
    ],
    timer: [
      "The Timer measures the current supplied session, using seconds. A short Note explains Start, Stop and saving the finished session. Bars show exactly the supplied completed sessions, using each record's minutes and three-letter day label. Do not pad the chart with missing days or zeroes; Today belongs only in the Timer. The Header may link to completed-session history; leave its action null if there is no useful history destination. The Button saves the finished session; it does not duplicate Start or Stop.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
