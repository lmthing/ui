# Private marks

A host provides a local mark resolver and drawing surface through `PrivateMarkContext`.
Mounted pads permit `set` only through their own capture callback, and only for a
reference the current host resolves at that address. Strokes never go to the controller.
