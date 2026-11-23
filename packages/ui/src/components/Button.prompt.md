## Purpose

A screen's main task action or a quiet secondary action.

## Pick

One labelled action to press. Not two to four shortcuts (Actions), a tappable summary (Card), or a shortcut to one item in a list.

## Writer

- Set media to "none" only to hide an icon explicitly supplied and kept in icon. If no icon was requested, both icon and media are null. Hiding an icon does not change a filled Button's emphasis.
- Use emphasis "quiet" for a secondary action or link in the scrolling content. Leave emphasis null for the screen's own main action. Use a row link to open its record and the Header back control to return.
- For a link to a supplied screen id, copy the id to goto.
- For a destructive action, set kind to "danger" and supply confirm. Otherwise leave kind null.
