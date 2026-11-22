## Purpose

One main thing the person does next.

## Pick

One labelled action to press. Not two to four shortcuts (Actions) or a tappable summary of one thing (Card).

## Writer

- Use literal JSON null for surface on a regular filled button; do not spell out the default as "card". Use "tinted" only for a requested softer fill and "plain" only for a requested text action.
- To hide an authored icon, keep its icon value and set media to "none". This changes only media: leave surface null unless a different surface is separately requested. Use null for all unrequested axes.
- For a destructive action, set kind to "danger" and supply confirm. Otherwise leave kind null.
