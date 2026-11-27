# Widgets, notifications, and Live Activities

Choose the surface by the person's need, not by the shape of a card. A widget is for recurring glanceable value, a notification for an exceptional event worth interrupting for, and a Live Activity for an ongoing event with a definite end. Host and OS control availability, budgets, privacy, and presentation.

## Widgets

Choose a task the person can check in seconds. Small, medium, and large system-family sizes vary by platform; accessory circular, inline and rectangular variants are separate Lock Screen representations on iPhone. Give each size a useful hierarchy: small = one value and its context; medium = a little more comparison or one more useful action, not the same layout stretched. Apple recommends 16 pt margins for most widgets and notes 11 pt can work for tighter internal groupings; system margins vary by context. Verify light/dark full color, accented rendering for tinted and clear appearances, and vibrant accessory rendering where applicable. Don't depend on two full-color series or faint separators surviving tinting.

Show a privacy-safe gallery preview and a meaningful placeholder that resembles the final hierarchy. Preserve a usable last value with its timestamp rather than hiding it behind a persistent skeleton. WidgetKit refreshes on a system-budgeted timeline; it isn't a live feed. Let the system advance time labels where supported. Deep-link to the relevant place; offer only direct, useful interactions on supported widget surfaces.

## Notifications

A title sets context when necessary, a short body communicates the event, and actions should be useful and preferably reversible. Don't repeat the icon/name (the system provides them). Send once per event and don't put secrets into Lock Screen previews. Supply neutral copy when previews are hidden. In the foreground, update the relevant record quietly rather than replaying a system-like alert. Keep unread app-icon badges accurate and never make the badge the only source of essential information. Respect Focus, permissions, and in-app management; Time Sensitive means it matters now, not that engagement would be nice. Don't send duplicate push notifications for Live Activity updates.

## Live Activities

For a timer, pickup, ride, delivery, or match, design **compact**, **minimal**, **expanded**, and **Lock Screen** presentations. Compact uses the sides of the Dynamic Island; minimal is the shortest identity and state cue; expanded adds context and narrowly scoped actions; Lock Screen needs a fully understandable, privacy-safe snapshot. Don't hard-code a Dynamic Island layout from a 390px screen. For example, Apple's table lists a 393 × 852 pt screen with a 371pt-wide expanded/Lock Screen presentation, 84–160pt high, and a compact leading region roughly 52 × 37pt. Use provided layouts, test narrower widths and StandBy, and don't assume compact text can fit what the expanded view can show.

Start when the relevant event begins or the person expects tracking, tell them how to stop it, distinguish stale from current, and end promptly with a final state. ActivityKit's maximum active period is eight hours; a finished view can remain on the Lock Screen up to four more by system policy. Custom and system content update animation has a two-second maximum on the Live Activity surface, not a target for ordinary UI animation; Always-On reduced-luminance presentations don't animate. Deep-link to the precise record.

A system Control (e.g., in Control Center) instead offers the most useful single action or toggle; use a recognizable symbol, protect locked-device actions, and don't use it to show a dashboard. An App Shortcut exposes a task to the system. A Siri snippet can show a brief result or a confirmation with a specific action label and a Cancel option; the dialogue still needs to communicate the result or decision on an audio-only device.

On native, these surfaces use WidgetKit, UserNotifications, ActivityKit, or related app-intent features with system policies. Web notifications, if supported and opted into, are browser/OS capabilities with different presentation and timing; the web preview cannot expose iOS system widgets or Dynamic Island through an ordinary view. Simulate a safe static snapshot rather than implying a real scheduled or lock-screen capability.

## For lmthing

`Timer`, `Progress`, `Banner`, `Stats`, and `HandoffReceipt` can show status or destinations inside the mock; they are not OS capabilities. Dispatch, dining, sports, booking, and weather have useful candidates if the host can supply trustworthy time, permissions, and lifecycle. Validate a single event identity and deduplication across the in-app status, notifications, and Live Activity; prioritize a host capability and privacy contract before any new component id. Use catalog tiers and the component guide's host-owned boundaries so the Writer cannot imply that a remote or system action succeeded.

Sources: [Apple HIG: Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets), [Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications), [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications), [Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities), [Controls](https://developer.apple.com/design/human-interface-guidelines/controls), [App Shortcuts](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts), [Snippets](https://developer.apple.com/design/human-interface-guidelines/snippets), [ActivityKit: Displaying live data](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities).
