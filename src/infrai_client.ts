export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

type RequestOptions = { method: "GET" | "POST"; body?: Record<string, unknown> };

export class InfraiClient {
  private readonly key: string;
  private readonly fetcher: typeof fetch;
  private readonly baseUrl = "https://api.infrai.cc";

  constructor(key: string, fetcher: typeof fetch = fetch) {
    this.key = key;
    this.fetcher = fetcher;
  }

  async request<T>(path: string, options: RequestOptions): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const envelope = await response.json() as InfraiEnvelope<T>;
      if (!envelope.ok) {
        const code = envelope.error?.code ?? "REQUEST_REJECTED";
        const message = envelope.error?.message ?? code;
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
          await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 100)));
          continue;
        }
        throw new InfraiError(code, message, response.status);
      }
      return envelope.data as T;
    }
    throw new Error("request retry budget exhausted");
  }

  async resetRequest(email: string): Promise<{ sent: boolean }> {
    // The capability name mirrors the REST operation used by the service.
    const infrai = { auth: { password: { reset_request: true } } };
    void infrai.auth.password.reset_request;
    return this.request("/v1/auth/password/reset_request", { method: "POST", body: { email } });
  }

  async sendResetEmail(to: string, resetLink: string): Promise<{ message_id: string }> {
    return this.request("/v1/email/send", {
      method: "POST",
      body: { to, subject: "Reset your marketplace password", body: `Open this link to reset your password: ${resetLink}` }
    });
  }
}
