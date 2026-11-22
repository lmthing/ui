## Purpose

Decide whether to buy one product and add the desired quantity.

## Pick

One product for sale with a description, stock, saving or quantity and add controls. Not a price alone (Amount), several products (ProductGrid), or a timed service (ServiceMenu).

## Writer

- Write the current price and the optional old price as numbers, with no currency. Write stock only when known. Leave qty null unless asked to start with a specific quantity.
- When only asked to hide the description, keep its text and write "detail":"brief".
- Store name, aisle and storeStock describe the physical store; stock is for online quantity. Use cleanTags for short shopping claims. For a barcode scan use scan: {"goto":"scan_barcode"} with the requested Camera scan screen id.
