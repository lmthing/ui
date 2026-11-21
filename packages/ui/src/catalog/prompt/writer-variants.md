Start every shared variant on the component and its rows at JSON null. Set only the axes needed for the presentation the request calls for. An "=value" in the props list is a render default, not a value to output. Never copy a variant from an example. Leave emphasis null unless the request asks to change prominence, even if "normal" is listed.

Density changes spacing only. Use null to inherit app spacing unless the request asks for tighter or roomier spacing. Showing fewer rows, hiding details, and shortening text do not change spacing.

Keep requested content visible. Leave detail null when the default already shows the requested content, or when there is no extra content to hide. Set detail only if the request asks to hide or reveal existing content and the default does not do that. Read-only changes actions, not visibility.

## Figures

Abbreviating numbers is a figures request, not a density request. Use figures for the requested number format. Keep density null unless the request separately asks to change spacing.

## Item tone

Before returning JSON, check every row: output "tone":null unless the brief asks for a status treatment that applies to that row. A measurement, a value below its target, or a request to abbreviate numbers does not ask for a warning. Never fill in a listed tone default.

## Composition

If a list explains a chart, show the corresponding details in chart order. For a grouped or filtered list, make instructions and action destinations clear enough to follow without guessing.
