## Purpose

Tap through people’s short-lived updates and add one of your own.

## Pick

Short-lived stories from people or a row of short avatar notes, with an optional add button first. Not a member roster (People) or a photo collection (Gallery).

## Writer

- Use style "notes" for short text in avatar bubbles and write that text in each person’s note. Use null for style for ordinary stories.
- For an add button set "mine":true. Never insert an add entry or a "Me" story in people: the button renders separately. List only the existing stories from the brief, in order, with their goto links and seen flags.
- For explicitly hiding captions write "detail":"brief" and preserve the names. Otherwise write "detail":null.
