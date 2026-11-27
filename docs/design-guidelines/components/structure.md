# Structure

- **Anatomy:** `Header` has a page title, optional scope and Back only for a real parent. `SectionTitle` sits next to its content; `Steps` names the current step in a real sequence; `TabBar` keeps stable peer destinations and one selected tab.
- **States:** Test root, pushed screen, selected peer, available Back, first/middle/last step, and long tab and scope labels. A preview that cannot navigate looks noninteractive.
- **Variants:** Use Header's plain/back structure, Steps `detail` and TabBar `trail` for real badges; retain stable labels, targets and selection. Use a quiet SectionTitle rather than another hero.
- **Motion:** Fix the navigation rail on peer changes. On ordered navigation, use the host transition and restore trigger/scroll on return. Step labels change without moving the surrounding controls; reduced motion commits immediately.
- **Do / don't:** Show “Vaccinations · North clinic” once. Do not repeat it in a banner or reuse a tab for a one-off action. Never use “Step 2” for unrelated tabs.
