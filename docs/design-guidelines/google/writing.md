# Writing: make the state and next action clear

Material content guidance favors plain, concise, accurate language and sentence case. Personality comes from useful specificity and the relationship to the user, not from padding every message with cheerful filler. Copy is part of the interaction: the label predicts the result, the next screen confirms it, and an error gives a repair.

## Labels, prompts and outcomes

| Place                | Prefer                                                                                                     | Avoid                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Screen title         | A short noun or task: “Saved routes”, “Edit reminder”.                                                     | Generic labels like “Overview” when the subject is unclear.            |
| Action               | Short verb + object where helpful, usually 1–3 words; “Save route”, “Send invite”, “Keep draft”.           | “OK”, “Yes”, or “Continue” when there is a specific consequence.       |
| Field                | Persistent label, known unit, and an example only where it helps: “Starting time”, “For example, 9:30 AM”. | Placeholder as the label or program terms such as “Invalid input”.     |
| Error                | Explain the problem, then the next step: “That time is already booked. Choose another time.”               | Blame, a code by itself, false certainty, or clearing the field.       |
| Empty                | Name the reason if known, then the next useful action: “No routes match. Clear filters.”                   | “Nothing here” for both first run and failed load.                     |
| Pending or completed | State what is true: “Sending invite…” while pending; “Invite sent” after acknowledgement.                  | A generic animation with no state, or claiming completion at tap time. |
| Confirmation         | Name the object and consequence, then say “Keep draft” / “Delete draft”.                                   | Negative questions, vague yes/no actions, or alarming embellishment.   |

Use the control's actual label in instructions. Don't rely on “the green button” or “the item on the right”. Address the user directly when useful; omit pronouns if the message is simpler, and don't mix “My” and “Your” in the same surface. Keep danger and recovery language neutral. At 390 reserve enough room for errors/action labels to wrap; never shorten a label to the point of ambiguity to save a line.

### For lmthing

Use props or cast for specific data and the owning `lang/en` fragment or shared copy helper for product words; Writer selection guidance belongs in `.prompt.md`. `Header`, `Field`, `Sheet`, `Empty`, `Success`, `Banner` and `HandoffReceipt` should agree about the noun and action across screens. Gap: copy/replay fixtures for the full journey, checking that action, spoken text, on-screen result, and actual tier/state tell the same story.

## Localization, accessible names and notifications

- **Localization:** Use short sentences and plain words; avoid local jokes, unexplained abbreviations, and pronouns whose subjects are lost in translation. Google notes many translations need much more room than English; about 1.5× is a useful stress test, not a guarantee. Format numbers, currencies, plurals, dates and times with locale-aware helpers. Never concatenate separate English fragments to build one localized sentence.
- **Accessible text:** Use the visible label as the accessible name where possible. Name icon-only buttons by action and add instance context when needed (“Remove Tuesday reminder”). An informative image's alternative should convey its useful content in context; omit a redundant “image of”, and provide an adjacent explanation or data table when a short alternative cannot convey the information. Decorative images should be ignored, not announced as “graphic.” Time-dependent updates should be scoped and not interrupt or repeat.
- **Notifications:** Put the change first, then a useful action. Use a date or weekday for messages that may be read later instead of a relative “tomorrow”, and keep personal record details out of lock-screen previews where privacy requires it. Offer opt-in/out at the right time. Respect different truncation and announcement behavior in native notifications and on the web; important details need a durable in-app home.

### For lmthing

English-only speech does not remove the need for text equivalents, longer cast names or clear nonvisual labels. Preserve the typed path and mirror spoken status in text. Check `Composer`, `Player`, `Search`, reminder and dispatch packs, and chart/image components. Gap: fixtures for long copy, units and dates, descriptive image fallbacks and screen-reader names scoped to a named item.

Sources: [M3 content design](https://m3.material.io/foundations/content-design/overview) · [Style guide](https://m3.material.io/foundations/content-design/style-guide) and [word choice](https://m3.material.io/foundations/content-design/style-guide/word-choice) · [Global writing](https://m3.material.io/foundations/content-design/global-writing/word-choice) · [Accessibility writing](https://m3.material.io/foundations/writing) and [alt text](https://m3.material.io/m3/pages/alt-text) · [Notifications](https://m3.material.io/foundations/content-design/notifications) · [Button labels](https://m3.material.io/components/buttons/guidelines).
