## Purpose

A panel over the screen for more detail, a longer pick or a few extra actions.

## Pick

More about one thing without leaving the screen, picking from six or more options, or a few extra actions behind the header. Not a message that stays on the screen (Banner), two to five options shown inline (Choice, Chips), or a whole new task (a new screen).

## Writer

- Extra actions use style "menu", with 2 to 6 items. A dangerous action has item tone "bad". Do not use style "detail" for a menu.
- Detail requires a value on every fact and is the only style with action. Picker needs 6 to 12 options; only picker may use at.
- For ordinary facts, choices and actions, write detail:null, lead:null and item tone:null. Do not invent row icons. To hide notes, set detail to "brief" and keep lead null.
- With detail "brief", keep the supplied subtitle in sub and each supplied fact note verbatim in that item’s meta. Never replace these strings with null; the renderer hides them.
