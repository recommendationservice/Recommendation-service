import { describe, expect, it } from "vitest";

import { bootstrapBody, bootstrapResponse } from "recommendation-service/src/lib/schemas";

import type { BootstrapInput, BootstrapResult } from "../types";
import { createRecoClient } from "../client";

describe("Contract: SDK BootstrapInput ↔ reco bootstrapBody Zod (REQ-9)", () => {
  it("happy SDK input parses against reco Zod schema", () => {
    const sdkInput: BootstrapInput = {
      externalUserId: "u1",
      rawPrompt: "Дарк-триллери 90-х",
    };
    const { externalUserId: _ignored, ...body } = sdkInput;
    const parsed = bootstrapBody.parse(body);
    expect(parsed).toEqual({ rawPrompt: "Дарк-триллери 90-х" });
  });

  it("skip path: SDK input without rawPrompt parses (optional)", () => {
    const sdkInput: BootstrapInput = { externalUserId: "u1" };
    const { externalUserId: _ignored, ...body } = sdkInput;
    const parsed = bootstrapBody.parse(body);
    expect(parsed.rawPrompt).toBeUndefined();
  });

  it("rejects rawPrompt empty string (Zod min(1))", () => {
    expect(() =>
      bootstrapBody.parse({ rawPrompt: "" }),
    ).toThrow();
  });

  it("rejects rawPrompt > 2000 chars (Zod max)", () => {
    expect(() =>
      bootstrapBody.parse({ rawPrompt: "x".repeat(2001) }),
    ).toThrow();
  });
});

describe("Contract: reco bootstrapResponse ↔ SDK BootstrapResult (REQ-9)", () => {
  it("happy reco response parses into SDK type shape", () => {
    const recoResponse = {
      preferenceVectorSet: true,
      enrichedText: "A user enjoys drama.",
    };
    const parsed = bootstrapResponse.parse(recoResponse);
    const asSdk: BootstrapResult = parsed;
    expect(asSdk.preferenceVectorSet).toBe(true);
    expect(asSdk.enrichedText).toBe("A user enjoys drama.");
  });

  it("skip path: reco response without enrichedText parses", () => {
    const recoResponse = { preferenceVectorSet: false };
    const parsed = bootstrapResponse.parse(recoResponse);
    const asSdk: BootstrapResult = parsed;
    expect(asSdk.preferenceVectorSet).toBe(false);
    expect(asSdk.enrichedText).toBeUndefined();
  });

  it("rejects missing preferenceVectorSet", () => {
    expect(() => bootstrapResponse.parse({ enrichedText: "x" })).toThrow();
  });
});

describe("Contract: SDK serialization (REQ-9)", () => {
  it("client.bootstrapUser POSTs to /users/:id/bootstrap with JSON body", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const fakeFetch: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(
        JSON.stringify({ preferenceVectorSet: false }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = createRecoClient({
      baseUrl: "http://reco",
      fetch: fakeFetch,
    });

    await client.bootstrapUser({
      externalUserId: "user-abc",
      rawPrompt: "hello",
    });

    expect(capturedUrl).toBe("http://reco/users/user-abc/bootstrap");
    expect(capturedInit?.method).toBe("POST");
    const body = JSON.parse(capturedInit?.body as string);
    expect(body).toEqual({ rawPrompt: "hello" });
  });

  it("omits rawPrompt from body if undefined (skip path)", async () => {
    let capturedBody = "";
    const fakeFetch: typeof fetch = async (_url, init) => {
      capturedBody = init?.body as string;
      return new Response(
        JSON.stringify({ preferenceVectorSet: false }),
        { status: 200 },
      );
    };

    const client = createRecoClient({
      baseUrl: "http://reco",
      fetch: fakeFetch,
    });
    await client.bootstrapUser({ externalUserId: "u1" });

    const parsed = JSON.parse(capturedBody);
    expect(parsed).not.toHaveProperty("rawPrompt");
  });

  it("URL-encodes externalUserId", async () => {
    let capturedUrl = "";
    const fakeFetch: typeof fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({ preferenceVectorSet: false }),
        { status: 200 },
      );
    };
    const client = createRecoClient({
      baseUrl: "http://reco",
      fetch: fakeFetch,
    });
    await client.bootstrapUser({ externalUserId: "user/with slash" });
    expect(capturedUrl).toContain("user%2Fwith%20slash");
  });
});

describe("Contract: SDK error surface (REQ-9)", () => {
  it("503 from reco → throws RecoApiError with status=503", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { message: "AI down" } }), {
        status: 503,
      });
    const { RecoApiError } = await import("../errors");
    const client = createRecoClient({
      baseUrl: "http://reco",
      fetch: fakeFetch,
    });
    await expect(
      client.bootstrapUser({ externalUserId: "u1", rawPrompt: "x" }),
    ).rejects.toBeInstanceOf(RecoApiError);
    await expect(
      client.bootstrapUser({ externalUserId: "u1", rawPrompt: "x" }),
    ).rejects.toMatchObject({ status: 503 });
  });
});

describe("Contract: SDK validates reco response shape at the wire (REQ-9, drift-guard)", () => {
  it("malformed 200 response (missing preferenceVectorSet) → client throws", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ enrichedText: "drifted" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const client = createRecoClient({
      baseUrl: "http://reco",
      fetch: fakeFetch,
    });
    await expect(
      client.bootstrapUser({ externalUserId: "u1", rawPrompt: "x" }),
    ).rejects.toThrow();
  });

  it("response with wrong type for preferenceVectorSet → client throws", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({ preferenceVectorSet: "yes" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    const client = createRecoClient({
      baseUrl: "http://reco",
      fetch: fakeFetch,
    });
    await expect(
      client.bootstrapUser({ externalUserId: "u1", rawPrompt: "x" }),
    ).rejects.toThrow();
  });
});
