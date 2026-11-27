# Layout, spacing, and safe areas

## Build the layout around the task

Put the title, decision, or most useful piece of content near the top and leading edge. Use a small number of alignment edges and make gaps show relationships: the gap between a label and its value should be smaller than the gap to the next field. Use headings and whitespace before adding boxes or dividers. Reveal secondary detail when asked instead of shrinking the whole screen to fit it.

At a **390-wide reference viewport**, 16 logical units on each side leave 358 for content before any additional inset. Two 16-unit gutters and a 12-unit gap give two 173-unit tiles. For a compact item, start with 8 units inside a label/detail pair, 12–16 inside a group, and 24 between sections. These are **lmthing layout starting points**, not an Apple spacing spec; defer to the system component's own margins on native. Use the actual layout and type size to decide when to switch from two columns to one. Keep a 44 × 44 pt iPhone touch target even when the visible icon or row chrome is smaller, and don't let neighboring hit areas overlap.

## Separate the edge from what's safe to touch

- **Background:** photos, backgrounds, and scrolling content may continue behind a bar or to the device edge. A status bar still needs a legible backdrop; a toolbar over scrolling content may need a system scroll edge treatment.
- **Content:** keep meaningful text and required controls clear of the camera housing, system gestures, pinned bars, and keyboard. A safe inset is not a content gutter. Reserve enough scroll end space to reveal the last item and focus it above fixed chrome.
- **Native:** use the safe area and container layout guides, including the keyboard layout guide where appropriate. Read the actual traits and insets; an image of a 390-pt device is not a sizing API. Retain the same functions and context when a regular split view becomes a compact stack.
- **Web:** if opting into edge-to-edge with `viewport-fit=cover`, use `env(safe-area-inset-*)` with a gutter floor (or add a gutter inside the inset if the two layers are distinct). Recheck when Safari's bars or the software keyboard change the visible viewport. 390 CSS px is a preview size, not a hardware measurement.

Localize leading/trailing edges and directional navigation. Don't mirror a photo, brand mark, literal direction, or the digits inside a number. Test long titles, larger text, the bottom-most control with the keyboard open, and a return from detail to a scrolled list. Never solve those cases by obscuring a focused control or putting a horizontal scroll on ordinary reading text.

## For lmthing

`PhoneScreen` already pins top and bottom, owns a body scroller, and has native insets/keyboard hooks and web viewport observation. Build `Header`, `Steps`, `TabBar`, and pinned `Button` around those regions, not fake status or home bars inside components. Adopt the component guide's shared layouts and the visual rubric's 4px rhythm; `List` is the alignment reference. Audit last-row focus with pinned `Composer` or a sheet keyboard, and pack grids such as commerce and curation for reflow at large type. Capture a host-level keyboard/inset test rather than adding padding to each pack.

Sources: [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios), [Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left), [Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views), [WebKit: Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/).
