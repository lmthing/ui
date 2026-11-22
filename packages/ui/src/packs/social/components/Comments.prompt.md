## Purpose

Read and respond to replies under a shared post.

## Pick

Public replies beneath a post, with author avatars, like and reply controls, and one level of indentation. Not a two-person private conversation (Bubbles) or a business review (Review).

## Writer

- Use "reply":false for each top-level comment (including the first) and "reply":true for answers under it. Consecutive answers share that same parent. Use zero for unknown likes.
- Use JSON null for each unrequested variant, never an explicit default such as "surface":"card". When the only presentation request is to hide timestamps, write "density":null, "surface":null, "detail":"brief"; retain every comment’s time value.
