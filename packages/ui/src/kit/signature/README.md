# kit/signature

One hand-tuned animation per signature moment.

Built in step U6. Read plan 5.7 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `useRingFill.ts` `useBarsGrow.ts` `useCheckBurst.ts` `useCountUp.ts` `useCalendarSweep.ts` `useTimerSpin.ts` `useCardSwipe.ts` `useDayUnfold.ts` `useStreakFlame.ts` `useRouteDraw.ts`
- `useSignature.ts`, `index.ts`

Rules:
- Each plays once when its component gets a `cue` prop from the host and shows its end state otherwise.
- Only transform and opacity animate. Nothing loops at rest. With reduce motion, show the end state.
- Tune against the reference mock in the gallery. Springs come from `kitSprings`.
