# Journey patterns: start, navigate, search, and configure

## Launch and onboarding

A launch screen is a system bridge, not an ad. Approximate the first screen's background, avoid text that won't localize or scale, and get useful content on screen quickly. Restore the last meaningful location or draft when appropriate. On web start with usable structure and preserved state; don't turn a route transition into an imitation native launch screen.

On first use, let the person do one useful thing, then teach uncommon tools in context. Keep tips short and targeted to people who haven't used the function. Defer nonessential preference setup, sign-in, rating, permissions, and large downloads. If a permission is central to the task, make the request when the benefit is understandable. Use the real system request on native, not an imitation. An essential Apple-style explanatory pre-alert has one next-step action that opens the system prompt, not a lookalike Allow button; always design a usable state after denial. Show a real first action, not a generic four-page carousel. If a prerequisite flow is genuinely necessary, name the next step and show completion.

## Navigation and modality

Sort the journey into top-level peer destinations (tabs), hierarchy (a push with Back), and a short focused branch (a sheet with Close/Cancel). At 390 wide keep one main scroll region and put the title, next action, and escape path in their expected places. Keep track of focus, scroll, selected item, and unsaved draft. Example: open result five, inspect it, go Back to result five with the same query and filters; selecting a different tab shouldn't clear the original tab's position. Deep links should open the named record with a sensible way back. Web state should survive actual Back and Forward, not only the author's Back button.

Prefer an inline change to modal interruption. A modal has a bounded task, named exit and saved versus discarded outcome; Back within a long flow is not equivalent to dismiss. Don't force a tray of stacked sheets or an unrelated alert over a sheet. See [presentation components](components-presentation.md) for focus and detents.

## Search

Choose one recognizable entry point for each scope, make scope visible, and default broad unless the context clearly narrows it. Suggest searchable terms or recent searches only when helpful and with privacy in mind. Keep query, filters and sort editable. Rank relevant results near the top and simplify the row anatomy; say why a result matches where it's otherwise unclear.

Exercise the search states separately: no query (prompts or browse), typing (suggestions), results, no matches (edit query or clear filters), pending (retain prior results where truthful), and network error (retry same query). Keep older responses from replacing a newer query. At 390 wide don't let chips plus keyboard conceal all results or make Clear an untargetable glyph. The native toolbar or search tab is a placement option; web should use a semantic search field and meaningful submit/clear behavior even when live updates are available.

## Settings and data entry

Choose useful defaults. Put frequent, task-specific options near the task and group app-wide settings into familiar named rows. Don't duplicate controls like system text size or Reduce Motion. Only rarely changed app-specific settings belong in the iOS Settings app; give a direct route to system permissions when the platform supports it. Show a setting's scope and effect, especially notification or privacy preferences.

Minimize fields by offering known choices, appropriate autofill, paste, and system input types. Keep required information and validation close to the field, not in a separate unexplained alert. Persist safe drafts across Back or backgrounding, never save raw passwords as drafts, and give a meaningful completion state. On web honor the browser's mechanisms for editing and autofill; on native verify keyboard behavior and the permission-denied return path.

## For lmthing

A journey recipe should include entry, useful work, and return context, not just a stack of primary screens. `Header`, `TabBar`, `Steps`, `Search`, `Chips`, `List`, `Choice`, `Field`, and `Composer` cover much of this; reuse their roles and existing layouts before creating a component. Propose host-level retention for query/draft/scroll per destination and explicit permission-denied examples for `Camera`, map and media journeys. Exercise result return in places/marketplace, task-local options in studio, and editable drafts in booking. Use the component guide's host-owned actions instead of implying that a visual walkthrough actually obtained permissions.

Sources: [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding), [Launching](https://developer.apple.com/design/human-interface-guidelines/launching), [Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help), [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy), [Searching](https://developer.apple.com/design/human-interface-guidelines/searching), [Settings](https://developer.apple.com/design/human-interface-guidelines/settings), [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data), [Modality](https://developer.apple.com/design/human-interface-guidelines/modality), [SwiftUI: NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack).
