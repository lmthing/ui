## Purpose

Browse several pictures together, optionally opening one.

## Pick

Several pictures to browse together, in a grid or sideways strip. Not one picture on its own (Photo) or text-led rows of separate things (List).

## Writer

- Leave all axes null unless requested. For a sideways strip showing several pictures at once use arrange "strip"; for swiping one large picture at a time use style "carousel" and leave arrange null.
- A sideways strip by itself changes only arrange. Set aspect "tall" for tall portrait crops or "wide" for wide crops. Write "aspect":null and "detail":null unless the request asks for a crop or hidden captions.
- For a crop-only request, use "arrange":null, "style":null and "detail":null. Tall photos do not imply a sideways strip.
