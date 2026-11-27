# Accessibility: the same job with different input and output

Use Material's recommendations as design targets and WCAG 2.2 as the web standard, not as interchangeable units or permission to design to the lowest number. Compose provides useful default semantics for Material components; custom controls and cloned visual components must supply equivalent behavior themselves.

## Targets, text and contrast

| Check                 | Apply at 390                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Size**              | Material recommends 48 × 48 dp native and 48 × 48 CSS px in its web density guidance, with about 8 dp spacing between targets in most layouts. Center a 24 dp glyph in a larger hit box; never silently overlap two expanded targets. WCAG 2.2 AA target minimum is 24 × 24 CSS px with exceptions, not the Material touch recommendation. |
| **Text contrast**     | At least 4.5:1 for text; 3:1 for qualifying large text (18 pt regular or 14 pt bold in WCAG, roughly 24 CSS px and 18.7 CSS px). Check text on the actual composited surface and photo.                                                                                                                                                    |
| **Non-text contrast** | At least 3:1 where a boundary, essential graphic or selected/focus state must be seen to identify a control or use it. Not all decorative borders need that ratio. Google distinguishes an isolated, unmistakable FAB silhouette from subtle clustered controls; that doesn't excuse an illegible FAB icon.                                |
| **Resize and reflow** | Test web text zoom to 200% and reflow at 320 CSS px equivalent without two-dimensional scrolling except where essential. Respect Android font size and display scale; reflow, stack or grow rows, rather than shrink critical text. Check sticky chrome, keyboard and safe areas so focus is never hidden.                                 |
| **Redundant cues**    | Use selected labels/marks, meaningful shapes or positions and visible error help. Color, time, haptic, sound or motion can't be the only evidence of state. Disabled controls have different contrast requirements; explanatory and recovery text stays readable.                                                                          |

### For lmthing

Use existing token pairs and extend hit areas in kit bases before creating per-component geometry. Audit `Header`, `Gallery`, `TabBar`, `List` accessories, charts and dense packs at 390, light/dark and with scaled text. Gap: test actual hit rectangles and contrast while surfaces, photos, eyes-free labels and overlays interact, not just static palette values.

## Names, semantics and reading order

Match the visual, DOM/semantic and focus order; use one clear screen heading and nested meaningful headings. Web landmarks such as `main`, `nav` and `search` let people jump to sections; label repeated landmarks distinctly. Native accessibility traversal should expose the same hierarchy with platform semantics, not by copying ARIA syntax.

Define each control's **name, role, state and value**. Use explicit selected/checked/mixed/expanded states, current values and visible units; name an icon-only control by its action. Group a read-only label/value where one announcement is useful, but don't merge away independent row controls. Label errors and tie them to the field; surface important async status without moving focus unnecessarily (polite live region on web, appropriate native announcement). Hide purely decorative icons and skeletons from accessibility services and provide equivalents for images that inform a task.

### For lmthing

Keep `meta.parts`, runtime availability and accessible controls in agreement, and take button/field names from the same copy as the visible action when possible. `Search`, `Calendar`, groups of `Field` controls, `List`, `Progress`, `Success` and all chart packs benefit. Gap: compare an agent part read to a real screen-reader traversal without treating either as a substitute for the other.

## Input, overlays and motion

- **Keyboard/focus:** All actions work without pointer input. Show visible focus independent of hover; support widget-specific arrows, Space/Enter and Escape. Never change navigation merely on focus in a way the person didn't initiate. For a modal, contain focus, scope announcements, make background inert, then restore focus to the opener unless a more logical place was created.
- **Gesture alternatives:** For carousel, swipe archive, range slider, sheet dismissal and reorder, provide buttons, single-pointer taps or direct input; a keyboard-only fallback doesn't cover a touch user unable to drag. Keep screen reader gestures, Android system Back and touch interaction from fighting one another. Press and cancel preserve the previous committed state.
- **Motion:** Honor OS animation settings and `prefers-reduced-motion`; remove large travel, parallax, bounce, auto-scroll and choreographed novelty when requested. Static selected state, value and feedback are mandatory. Avoid content that flashes more than three times per second unless below the WCAG thresholds; provide a way to pause, stop or hide applicable auto-moving content lasting over five seconds.
- **Verify:** Use TalkBack and an Android device with large font/display size, and use a screen reader, keyboard, zoom and touch emulation on web. Include hover/focus behavior where a mouse exists. For each path verify start, open, move, cancel, settle, focus return and repaired error. For authored media, check that speech-related information is available in text and controls can be operated without sound.

### For lmthing

`PhoneScreen` already describes overlay focus containment and host preference/insets, and `KitMotion` provides reduced behavior. Extend acceptance for `Sheet`, confirmation, `SwipeStack`, `Gallery`, `Scale`, `Calendar`, `Player` and side-by-side action rows. Gap: native device validation and a per-family acceptance matrix that includes keyboard, screen reader, reduced motion and pointer-only alternatives. Passing screenshot checks at 390 is necessary, not sufficient.

Sources: [M3 accessibility principles](https://m3.material.io/foundations/overview/principles) · [Structure and targets](https://m3.material.io/foundations/designing/structure) · [Color and contrast](https://m3.material.io/foundations/designing/color-contrast) · [Density](https://m3.material.io/foundations/layout/grids-spacing/density) · [Accessibility text](https://m3.material.io/foundations/writing) · [M3 reduced transition guidance](https://m3.material.io/styles/motion/transitions/applying-transitions) · [Compose semantics and targets](https://developer.android.com/develop/ui/compose/accessibility/api-defaults) · [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/) · [ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
