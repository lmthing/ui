## Purpose

Enter or change one labelled piece of information on a form.

## Pick

Enter one named value, such as a name, date, amount or form choice. Not finding things by typing a query (Search), standalone collection filters and quick choices (Chips), several lines of writing (Composer) or options that each need a sentence (Choice).

## Writer

- For a recurring schedule use kind: "repeat" and repeat: "weekly" (or another repeat enum). Omit value; never use kind: "text" with repeat.
- Date values use YYYY-MM-DD, time values HH:MM and photo values lib:<tag> or local:<n>. Fields are one line.
- For a two-ended numeric field use kind "range" with integers min, max, lower and upper, in that order (min <= lower <= upper <= max, min < max). For a microphone input use kind "voice"; omit value for either kind.
- To hide an authored helper hint, keep its text in hint and set detail to "brief".
