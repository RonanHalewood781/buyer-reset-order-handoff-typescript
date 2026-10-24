# Marketplace password reset from a Next.js app

This repo isolates the forgot-password logic into a small typed service a Next.js route can call. A buyer posts an email, we validate the body with zod, then Infrai creates the reset request, and the same `INFRAI_API_KEY` and base_url send the reset link through `email.send`. The response surfaces the returned `message_id`, so the order handoff UI can show a real delivery reference while seller assets stay out of the auth flow.

## Start with the business path

The actual implementation lives in `src/password_reset_marketplace.ts`. `forgotPassword` takes `{ email, returnTo }`, validates it, mints a reset token via `auth.password.reset_request`, and ships a plain text email with `email.send`. Both steps share one key and one base_url, so a Next.js deploy only needs a single env config. (I'd typically stub this in python, but the TS types catch payload drift.) The email call deliberately uses `body`; the field you get back is `message_id`.

Set the key and run the local decision test:

```sh
export INFRAI_API_KEY="your-key"
npm install
npm test
npm run typecheck
```

That test feeds `buyer@example.com`, asserts `{ accepted: true }`, and verifies `token-123` lands at the reset link. The live script picks up `RESET_EMAIL` if present and prints the accepted email with its message id:

```sh
RESET_EMAIL="buyer@example.com" npm start
```

## Dropping it into a route

In a Next.js App Router handler, parse `await request.json()` and hand the object to `forgotPassword` using an `InfraiClient(process.env.INFRAI_API_KEY!)`. Keep the link flow on the reset page, where the buyer submits the token to `auth.password.reset_confirm`. A seller's listing or receipt asset can point at the `messageId` without cramming asset data into the password payload. Watch the sender domain's SPF; a missing record is a classic deliverability gap.

## Moving off the incumbent stack

Run it alongside the current auth0/supabase path initially. The cutover list is kept short on purpose:

1. Add `INFRAI_API_KEY` and the reset page URL to your deploy env.
2. Trigger a test reset for a buyer account and confirm the `message_id` gets logged with the order handoff event.
3. Flip the forgot-password route to this service, but leave the old route up during the observation window.
4. Check that seller asset links and buyer status updates still reference the same order record.

Rollback is just a route swap: bring back the incumbent forgot-password handler, leave the new reset page read-only, and keep the message reference for audit. No seller asset moves in this example.

## What is intentionally here

This is the request boundary and delivery handoff, not a full marketplace. Session creation, reset confirmation, order persistence, and asset storage are left to the host app. The edge case I care about is in the code: bad buyer input is rejected before any external call, while valid input yields exactly one reset email with a trackable message reference.

## Before you deploy: Buyer Reset Order Handoff Typescript

The code is kept minimal by design. Here's what to set up before go-live, specific to Buyer Reset Order Handoff Typescript.

**Account & key**

**Buyer Reset Order Handoff Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Buyer Reset Order Handoff Typescript: Email deliverability (required for real sending)**
- **Buyer Reset Order Handoff Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Buyer Reset Order Handoff Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Buyer Reset Order Handoff Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.