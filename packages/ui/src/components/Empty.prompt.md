## Purpose

A calm message on a screen that has no content yet.

## Pick

When nothing has been added, no results match the current filter, or no work remains. Not the screen's main statement about what exists or needs attention (Hero), a separate warning or status notice (Banner), or a supporting sentence (Note).

## Writer

- An instruction to show just the title or hide the explanation sets detail to "brief"; retain the exact explanation in sub. If the explanation should be visible, write it in sub and set detail to null.
- Use kind "error" or "offline" only for a failed result or disconnected state; those provide a retry action.
- For first use leave kind null and explain how records will get here. For no matches use kind "filtered" and name the filter or suggest changing it. For no remaining work use kind "complete" and name what is done. None of these provides retry.
