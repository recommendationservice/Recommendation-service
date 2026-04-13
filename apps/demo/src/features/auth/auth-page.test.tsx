import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AuthPage } from "./auth-page";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AuthPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders login input", () => {
    render(<AuthPage />);

    expect(screen.getByText("Логін")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Введіть логін")).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    render(<AuthPage />);

    expect(screen.getByText("Увійти")).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<AuthPage />);
    expect(screen.getByText("Вхід")).toBeInTheDocument();
  });

  it("allows typing in login field", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    const loginInput = screen.getByPlaceholderText("Введіть логін");
    await user.type(loginInput, "testuser");

    expect(loginInput).toHaveValue("testuser");
  });

  it("calls login API on button click", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => ({ ok: true }) });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByPlaceholderText("Введіть логін"), "testuser");
    await user.click(screen.getByText("Увійти"));

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "testuser" }),
    });
  });

  it("displays error on failed login", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Something went wrong" }),
    });

    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByPlaceholderText("Введіть логін"), "baduser");
    await user.click(screen.getByText("Увійти"));

    expect(
      await screen.findByText("Something went wrong")
    ).toBeInTheDocument();
  });

  it("disables button when login is empty", () => {
    render(<AuthPage />);

    expect(screen.getByText("Увійти")).toBeDisabled();
  });
});
