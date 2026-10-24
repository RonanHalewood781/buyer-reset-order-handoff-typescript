import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const forgotPasswordBody = z.object({ email: z.string().email(), returnTo: z.string().url().optional() });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordBody>;

export type ResetResult = { accepted: true; email: string; messageId: string };

export async function forgotPassword(input: unknown, client: InfraiClient): Promise<ResetResult> {
  const request = forgotPasswordBody.parse(input);
  await client.resetRequest(request.email);
  const link = new URL(request.returnTo ?? "http://localhost:3000/reset-password");
  const email = await client.sendResetEmail(request.email, link.toString());
  return { accepted: true, email: request.email, messageId: email.message_id };
}

async function main(): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example.");
  const email = process.env.RESET_EMAIL;
  if (!email) throw new Error("Set RESET_EMAIL before running the example.");
  const result = await forgotPassword({ email }, new InfraiClient(key));
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
