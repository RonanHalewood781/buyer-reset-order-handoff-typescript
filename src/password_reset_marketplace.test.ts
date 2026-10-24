import assert from "node:assert/strict";
import test from "node:test";
import { forgotPassword } from "./password_reset_marketplace.ts";

test("sends one reset link after validating a marketplace buyer email", async () => {
  const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
  const client = {
    resetRequest: async (email: string) => { calls.push({ path: "reset_request", body: { email } }); return { sent: true }; },
    sendResetEmail: async (to: string, link: string) => { calls.push({ path: "email.send", body: { to, link } }); return { message_id: "message-1" }; }
  } as never;
  const result = await forgotPassword({ email: "buyer@example.com" }, client);
  assert.deepEqual(result, { accepted: true, email: "buyer@example.com", messageId: "message-1" });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.link, "http://localhost:3000/reset-password");
});

test("rejects a malformed email before any Infrai request", async () => {
  let called = false;
  await assert.rejects(() => forgotPassword({ email: "buyer" }, { resetRequest: async () => { called = true; return {}; } } as never));
  assert.equal(called, false);
});
