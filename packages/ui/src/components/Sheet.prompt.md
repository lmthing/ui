## Purpose

A panel over the screen for more detail, a longer pick or a few extra actions.

## Pick

More about one thing without leaving the screen, picking from six or more options, or a few extra actions behind the header. Not a message that stays on the screen (Banner), two to five options shown inline (Choice, Chips), or a whole new task (a new screen).

## Writer

- Extra actions use style "menu", with 2 to 6 items. A dangerous action has item tone "bad". Do not use style "detail" for a menu.
- Detail requires a value on every fact and is the only style with action. Picker needs 6 to 12 options; only picker may use at.
- For ordinary facts, choices and actions, leave detail and item tone null. For a panel without an explicit request to change the leading presentation, always output `"lead":null`. Do not copy the `icon` render default into lead or invent item icons.
- To hide the subtitle and fact notes only, use `"detail":"brief","lead":null`. Keep the supplied subtitle in sub and each supplied fact note verbatim in that item’s meta. Never replace these strings with null; the renderer hides them.
