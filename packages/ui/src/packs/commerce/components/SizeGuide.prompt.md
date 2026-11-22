## Purpose

Compare product measurements and fit across sizes before choosing one.

## Pick

Compare garment or footwear measurements across sizes, switch centimetres and inches, and check how the product fits. Not facts about a single item (KeyValue), a generic data grid (Table), or choosing a purchasable option (VariantPicker).

## Writer

- Use the unit of the supplied measurements. For columns ["Chest","Neck"], a row is {"size":"Small","values":[18,12]}. Do not include a Size column or unit suffixes in the column names. Every row must have exactly one number per measurement column, in order.
- Use style "fit" only if fit and model information belong before the measurements. Fit scores: 1 runs small, 3 true to size, 5 runs large.
- Use detail "brief" to hide the model note but keep modelNote in the data. Use null for every unrequested variant, including density and surface. Do not write surface "card" unless requested.
