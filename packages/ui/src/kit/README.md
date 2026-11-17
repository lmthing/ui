# kit

React infrastructure the views use. Imports `src/catalog` and peer dependencies only.

Built in step U2. Read plan 5 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `provider/` `tamagui/` `base/` `part/` `archetypes/` `signature/` `screen/` `report/` `registry/` `interact/`, `index.ts`

Rules:
- Peer deps: react, react-native, react-native-web, tamagui, @tamagui/core, reanimated, lucide icons, react-native-svg. No Expo dependency.
- The kit never navigates, fetches, stores or touches `window`. It calls interfaces the host implements.
- No hex colours, pixel numbers or z-index. No comparison with a preset name: use `KitStyle`.
- Views are pure: no state, timers or fetching.
