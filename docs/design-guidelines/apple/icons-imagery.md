# Icons, SF Symbols, and imagery

## Interface symbols

Start with a glyph people already associate with the action. Keep weight, size, and optical placement consistent with adjacent type, especially in rows with chevrons and thumbnail leads. A 20-unit glyph in a 44-unit hit box is a reasonable 390-wide preview example, not a universal Apple icon spec. Align by what the eye sees, not only the icon's path bounds. Use a distinct selected shape or checkmark with a programmatic state, not merely a tint change. A label is better than an obscure symbol for important or unfamiliar actions.

SF Symbols pairs glyph weights and scales with system text. Use monochrome for most functional marks; hierarchical for tiers of a single color; palette for purposeful separate foreground roles; multicolor when recognizable intrinsic colors help. Variable color represents a change in value (signal or progress), not depth. Use a symbol replacement when meaning changes, or a short draw-on for completion where supported. Avoid adding a bounce to every tap, or embedding a badge/shape that the native variant system already provides. Name icon-only actions by their effect, not by the drawing; hide ornaments that duplicate adjacent spoken text. Mirror only symbols whose meaning follows reading direction.

Native SF Symbols availability evolves with the OS (Draw On/Off is a Symbols 7 capability). Use native system glyphs where available, check availability and Apple's use terms, and use a licensed equivalent web glyph with the same meaning. Don't depend on a symbol font download to make navigation understandable.

## Images and app icons

- **Content:** choose an aspect ratio and a focal point. Crop a feed thumbnail predictably; don't crop away meaningful evidence in a detail view. Use fit with the original aspect ratio for video. A sensible 390-wide starting point for an illustrative hero is a 16:9 well; this is a layout choice, not an Apple requirement. For a 358-pt display width, a matching raster is about 716 px wide at @2x or 1074 px at @3x, before any extra crop requirement. Avoid decoding a full original to show a small thumbnail.
- **Overlay:** put text outside a busy image unless the overlay adds meaning or saves space without harming reading. If overlaid, use a dependable protective surface or scrim and test both dark and light actual subjects. Captions and alt text are different: one gives editorial context, the other conveys relevant visual information.
- **Assets:** use vectors for simple custom glyphs, appropriate density assets for bitmap imagery, and an embedded color profile (sRGB baseline, P3 where supported and useful). On web use responsive image sources and reserve the aspect ratio before the asset arrives; on iOS use asset scale and system rendition support. Keep a purposeful missing/failed-image state and a stable frame during loading.
- **Launcher icon:** don't enlarge a toolbar glyph, screenshot the UI or bake the system's mask and reflection into the file. Apple's current approach uses centered, unmasked layers with simple silhouettes and foreground separation, prepared in Icon Composer where applicable. Preview light, dark, clear and tinted appearances. The web favicon or PWA icon needs its own platform-appropriate assets.

## For lmthing

`KitIcon` and the catalog icon set should own semantic and decorative treatment; component variants needn't invent glyph families. `Photo`, `Gallery`, `Hero`, and pack rails in media, marketplace, and realestate need predictable crop, stable skeleton geometry, and meaningful alternatives. Use the component guide's shared media recipes and the rubric's first-line alignment checks. Gaps: test image overlays against worst-case assets and map symbol states/availability in one place rather than per view.

Sources: [Apple HIG: Icons](https://developer.apple.com/design/human-interface-guidelines/icons), [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols), [Images](https://developer.apple.com/design/human-interface-guidelines/images), [Image views](https://developer.apple.com/design/human-interface-guidelines/image-views), [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons), [Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video).
