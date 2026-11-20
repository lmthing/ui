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
      'Header title is "Daily mood"; its subtitle is "Rate how you feel, then tap Save mood". Scale asks how the person feels today. Title Bars "Recent ratings out of 5", set detail "brief" to hide the meaningless sum of separate ratings, and leave density null. Keep every supplied prior rating unchanged as context, not a second task. Use one primary Button labelled "Save mood".',
    ],
    timer: [
      "Name the supplied activity in Header.title, e.g. Time your care session. Header.action, detail, density and emphasis are null; avoid a generic subtitle. Timer counts up from the supplied current seconds. The Note gives one clear sequence using the visible control labels: Start when you begin, Stop when finished, then Save session to review the saved entry. Note.media, tone, emphasis and density stay null.",
      "Bars are context, not a second task: title them Recent session lengths and show only completed sessions, with each supplied minute value and three-letter day label. No padding or Today in Bars. Use one primary Button labeled Save session with goto session_saved; it does not duplicate Start or Stop.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
