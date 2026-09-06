import { describe, expect, it } from "vitest";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("https://example.com", { headers });
}

describe("getClientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = requestWithHeaders({ "x-real-ip": "9.9.9.9" });
    expect(getClientIp(request)).toBe("9.9.9.9");
  });

  it("falls back to a shared 'unknown' bucket when no header is present", () => {
    const request = requestWithHeaders({});
    expect(getClientIp(request)).toBe("unknown");
  });
});

describe("rateLimitResponse", () => {
  it("sets a Retry-After header and pluralizes the minute count", async () => {
    const reset = Date.now() + 5 * 60 * 1000;
    const response = rateLimitResponse(reset);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).not.toBeNull();

    const body = await response.json();
    expect(body.error).toMatch(/try again in 5 minutes/);
  });

  it("uses singular 'minute' when only one minute remains", async () => {
    const reset = Date.now() + 30 * 1000;
    const response = rateLimitResponse(reset);

    const body = await response.json();
    expect(body.error).toMatch(/try again in 1 minute\./);
  });

  it("defaults to a 60s wait when reset is 0 (limiting disabled)", async () => {
    const response = rateLimitResponse(0);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
