# Sports component tests

- `Fixtures.test.ts` covers fixtures contracts, rendering states and navigation.
- `Standings.test.ts` covers standings contracts, variants, reading and team-row actions.
- `Squad.test.ts` covers availability, coach selection, variants and states.
- `MatchFeed.test.ts` covers incident bounds, sided rows, states and the add-event picker.
- `Bracket.test.ts` covers round bounds, tie addresses, variants, loading and press actions.
- `Lineup.test.ts` covers formation and bench bounds, player addresses, variants and press actions.
- `Scoreboard.test.ts` covers score bounds, display and keeper states, and clock controls.
- `Scoreboard.record.test.tsx` checks both views before and after goal confirmation and cancellation.
- `MatchStats.test.ts` covers comparison bounds, rendering and live period selection.
- `MatchStats.browser.test.ts` checks period chips and missing slices in Chromium.
- `BoxScore.test.ts` covers line scores, player tables, states, roster switching and profile links.
- `MomentumChart.test.ts` covers chart bounds, variants, fallback and marker selection.
- `MomentumChart.browser.test.ts` checks marker activation by pointer and keyboard.
