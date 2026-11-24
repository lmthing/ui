## Purpose

Choose a trusted way to log in or create an account.

## Pick

Offer account sign-in methods such as Apple, Google, email, or phone. Not ordinary screen shortcuts (Actions) or the main submit control for a completed form (Button).

## Writer

- Use one to four distinct providers, in display order. Each item needs a `provider` enum value and a `goto` for the mock app's next screen, never an external URL.
- Provider button labels and icons are built in. To separate these choices from a form, set `divider` to a short label such as "or"; leave it out when the options stand alone.
- To keep a divider label in the data but hide it on screen, include the label in `divider` and set `detail` to "brief".
- These links illustrate a flow. They do not authenticate anyone or open a real provider.
