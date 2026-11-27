# Settings: group by what people want to control

- **Find:** Put general, infrequent settings behind a familiar settings entry. Put frequent, contextual controls where they take effect. Use headings such as Notifications, Privacy, Appearance, instead of grouping by internal service. Show current values for linked rows; a switch is for an independent binary preference, not a link or confirmation.
- **Change:** Show effective value and where it comes from (“Use system setting” versus a local override). An instant switch changes the effective value immediately if local, or shows bounded pending and rollback if remote. Use Save for interdependent changes. If policy or permissions block the change, give the reason and the exact recovery destination. Separate destructive settings from ordinary preferences and disclose the effect before a hard-to-undo operation.
- **Return:** Handle loading, unavailable options, system settings changed outside the app, pending sync, failed persistence, and restored defaults. Don't silently reset values. Use a quiet inline confirmation for a meaningful saved change, not confetti on every toggle.

Apple and Android both distinguish general choices, contextual choices and device-level settings. Use native settings destinations for permissions the OS owns. Web needs conventional labels, visible focus and a non-drag alternative to reordering; don't link to a settings panel that only exists on another platform. Keep a static status when a setting, including reduced motion, changes from outside the UI.

**For lmthing:** Start at the `settings` archetype with `List` grouped sections/trailing toggles, `Choice`, `Note`, and `Button` confirmation if warranted. Use live controls for supported local parameters and host operations for persisted settings, keeping the view and reader in sync. Gap: add examples for inherited versus effective values and failure while toggling twice, including a preference changed externally during a cue.

Sources: [Apple HIG Settings](https://developer.apple.com/design/human-interface-guidelines/settings) · [Android Settings](https://developer.android.com/design/ui/mobile/guides/patterns/settings)
