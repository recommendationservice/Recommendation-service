import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { getDisplayName } from "./get-display-name";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "123",
    email: "test@example.com",
    user_metadata: {},
    app_metadata: {},
    aud: "authenticated",
    created_at: "",
    ...overrides,
  };
}

describe("getDisplayName", () => {
  it("returns full_name from user metadata when available", () => {
    const user = makeUser({
      user_metadata: { full_name: "Denis Sevcuk" },
    });
    expect(getDisplayName(user)).toBe("Denis Sevcuk");
  });

  it("falls back to email prefix when no full_name", () => {
    const user = makeUser({ email: "john@example.com", user_metadata: {} });
    expect(getDisplayName(user)).toBe("john");
  });

  it("returns 'User' when no full_name and no email", () => {
    const user = makeUser({ email: undefined, user_metadata: {} });
    expect(getDisplayName(user)).toBe("User");
  });

  it("prefers full_name over email prefix", () => {
    const user = makeUser({
      email: "john@example.com",
      user_metadata: { full_name: "John Doe" },
    });
    expect(getDisplayName(user)).toBe("John Doe");
  });

  it("handles empty full_name by falling back to email", () => {
    const user = makeUser({
      email: "alice@test.com",
      user_metadata: { full_name: "" },
    });
    expect(getDisplayName(user)).toBe("alice");
  });
});
