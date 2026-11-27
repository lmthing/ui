## Purpose

A screen's main task action or a quiet secondary action.

## Pick

One explicit action to take now. Not two to four shortcuts (Actions), a tappable summary (Card), or a passive state or record name (KeyValue).

## Writer

- Give the one main Button a short verb-first label that names what happens: "View saved tracks", not "Saved tracks"; "Share playlist", not "Ready to share". One action only. Never put a record name, readiness, pending or completion message in a Button; use KeyValue for a record's status.
- Set media to "none" only to hide an icon explicitly supplied and kept in icon. If no icon was requested, both icon and media are null. Hiding an icon does not change a filled Button's emphasis.
- Use emphasis "quiet" for a secondary action or link in the scrolling content. Leave emphasis null for the screen's own main action. Use a row link to open its record and the Header back control to return.
- For a link to a supplied screen id, copy the id to goto.
- For a destructive action, set kind to "danger" and supply confirm. Otherwise leave kind null.
