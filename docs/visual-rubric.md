# Visual rubric

The [design review rubric](design-guidelines/rubric.md) is the standard for stills and movement. This page explains the static `look` workflow used by `ui-reviewer`; use the design rubric to review contact sheets and a component's motion contract.

Run `pnpm look --component <Id> --widths 390 --preset calm --mode light`. Read `issues.json`, the stills and the marked part addresses under `packages/ui/shots/<Id>/`. Look at filled examples and declared states. `look` generates fresh screenshots, not pixel-baseline comparisons. Its clipping, overflow, overlap, contrast, targets and rhythm checks are a starting point, not proof of semantic, keyboard, device or motion behavior.

## Still-frame checks

1. Read the main object, current state and next action first. One thing leads; supporting labels, units and metadata stay clear. Compare common rails, roles and target sizes with `List`, not the component's layout or personality.
2. Read long names and facts at 390 without clipping. Equal roles share edges, numeric columns share an end edge, and the next group has more space than the lines within this one. Count action labels toward the type-size budget in the design rubric.
3. Compare filled and loading slots at the same width. Skeletons preserve shape; absent metadata leaves no gap unless that slot intentionally aligns a group. Check the last item of a scroll rail by scrolling and keyboard. A completely offscreen item in a scroll region isn't clipped text.
4. Treat accent, surfaces and position as hierarchy. A destructive action is neutral or danger, not the positive accent. State isn't color alone. Purposeful imagery has a fallback; mark unrelated missing demo assets as fixture limitations.
5. Read empty, pending and terminal states as different outcomes. Show the required scoped empty reason when the catalog brief calls for one. Confirm a sample doesn't suggest that its controls acted or sent anything in the real world.

## Variants sheet

Compare the same realistic content in each alternative. There must be a visible reason to pick it; give a media slot, trail or brief view something to show or hide. Compact does not reduce targets. Hero draws attention once, within the same system, while retaining the screen's primary task. Use the [design review rubric](design-guidelines/rubric.md#static) to check variant meaning and part changes. A 390 light review is a baseline; report other surfaces and accessibility checks as unverified unless exercised.
