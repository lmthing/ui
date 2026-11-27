# Material 3 Expressive: make importance visible

M3 Expressive is an evolution of M3, introduced in May 2025, not a replacement called M4. It keeps the role system and adds stronger contrasts of size, type, color and shape; connected controls; and physics-based feedback. Google I/O 2026 extended adaptive scaffolds and spacing and highlighted expressive lists/menus and search updates. Google's November Compose 1.5.0 announcement describes most Expressive APIs graduating to stable in Compose, not blanket parity in Android Views, Flutter or web.

## Emphasis and emotion

Google combined eye tracking, preference studies, experiments and usability research across 46 studies and more than 18,000 participants. In some study screens people identified key elements up to four times faster; that is not a universal performance multiplier. The transferable idea is that expression can help when it clarifies the priority. Google also cautions against breaking established patterns or emphasizing everything.

Choose a target feeling and a task: calm recovery, confident payment, playful learning. Pick the one item to land on first. Use **scale** to emphasize it, **containment** to group related actions, **color** to distinguish it from its surroundings, and **type** to distinguish role from decoration. Example at 390: make the single next action 56 dp high while its secondary alternative is text, or use one 36/44 figure above 16/24 body. These are starting examples, not a prescription to make both the main button and the metric the loudest thing. A secondary item can feel quiet and still have a full target and proper contrast.

### For lmthing

Use the rubric's one focal point, existing `emphasis` and density axes, theme, and signature. A mind/health screen can avoid playfulness without looking generic; learning/play can use one reward moment. Compare distinct designs for the same task with identical underlying data, then check first actionable target, recognition and return. Gap: house examples that vary hierarchy and composition, not just accent.

## Shape and interaction

Rounded forms organize and invite; sharp-to-round contrast gives a focal element energy. Material's 35-shape library supports avatars, crops and expressive loading; not everything needs a special silhouette. Use morphing to communicate cause and effect: show the actively pressed shape, retain a distinct selected shape, or grow the originating control into its own surface. Keep the label, icon center, semantic state and touch bound stable when only the silhouette changes. On release from a canceled press, restore the shape with no logical mutation.

For a 390-wide phone, start with one family of grouped choices: quieter round outer corners, smaller inside corners, and one shape change for the committed selection. Avoid morphing text, randomly changing corner direction, broken edges mid-frame, and crowding neighbors by enlarging the hit areas. On web a radius interpolation suffices for round-rectangle states; for arbitrary paths, match topology or choose a cross-fade. Compose offers Material shape support; visual shape never automatically supplies accessibility semantics or matching hit testing.

### For lmthing

`Choice`, `Segmented`, `Chips`, `Actions`, `List` and `Button` can use shared shape recipes while their addresses and roles stay stable. For `Card`, `Gallery` and `Hero`, morph only when the subject survives the transition. Gap: kit tokens for adjacent-corner/selected states and screenshot plus frame-sequence fixtures where input interrupts a morph.

## Expressive motion with restraint

Treat motion as a verb: compress on press, snap into a changed state, expand from the place you tapped, or celebrate completion once. Apply spatial springs to shape and geometry, effects springs to color and opacity. On a small toggle the thumb is the protagonist; only its travel may overshoot, not the data value or the label. For a split button, opening the menu and keeping the main action in place is stronger than animating the whole toolbar. For long waits, communicate actual progress; a short expressive loading indicator is not permission to animate the entire screen.

Match motion to frequency and stakes. Repeated work in dense lists needs tight, interruptible feedback; a hero transition or one-shot success can be more distinct. In reduced motion, the selected shape or finished status must be equally clear without a morph. The [motion reference](motion.md) has values, transition decisions and a review sequence.

### For lmthing

Keep expressive motion on meaningful cues `Progress`, `Checklist`, `Streak`, `Timer`, `Route` and `Success` already have reason to express, not on every stage load. Let the user interrupt and keep their place. Gap: compare still and frame-sequence reviews for standard/reduced modes, rapid reversal, and low-spec devices before adding closed signature choices.

Sources: [Google Design research](https://design.google/library/expressive-material-design-google-research) · [Expressive launch and official intro video](https://m3.material.io/blog/building-with-m3-expressive) · [Shape principles](https://m3.material.io/styles/shape/overview-principles) · [Typography](https://m3.material.io/styles/typography/overview) · [I/O 2026 updates](https://m3.material.io/blog/whats-new-at-io26) · [Compose 1.5.0](https://m3.material.io/blog/compose-material-3-is-stable).
