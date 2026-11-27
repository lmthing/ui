## Purpose

Log in to an existing account or recover access before returning to the member area.

## Pick

Choose for returning members who log in, verify access, or need a forgot-password path in the generated app.

## Avoid

Not for first-time sign-up and onboarding, invitations, apps without accounts, or lmthing’s private keep link.

## Writer

- Use fictional contact details and blank password and code fields. Never put passwords or codes in bindings, Writer props, reads, or saved mock state.
- Bind account_email to the fictional email, member_area to the real in-app member destination name, and next_up to a useful piece of content there.
- Reuse the signin and verify archetype guidance and existing Field and Button controls. Keep Forgot password? secondary to Log in.
- Confirm verification before changing a password. Keep expired or invalid proof from advancing and offer a safe retry without revealing whether an account exists.
- Return recovery to login, not directly to the signed-in destination. Finish at useful member content, not a generic success card.
- Authentication, message delivery, verification, password reset, and protected content need an outside service. In the mock use local links only; never send, verify, reset, or create a real session.
