import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();

vi.mock("@/shared/lib/supabase", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  }),
}));

import { AuthPage } from "./auth-page";

describe("AuthPage", () => {
  it("renders email and password inputs", () => {
    render(<AuthPage />);

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Пароль")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("email@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("renders sign in and sign up buttons", () => {
    render(<AuthPage />);

    expect(screen.getByText("Увійти")).toBeInTheDocument();
    expect(screen.getByText("Зареєструватись")).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<AuthPage />);
    expect(screen.getByText("Вхід")).toBeInTheDocument();
  });

  it("allows typing in email and password fields", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    const emailInput = screen.getByPlaceholderText("email@example.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("calls signInWithPassword on sign in button click", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(
      screen.getByPlaceholderText("email@example.com"),
      "test@example.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "pass123");
    await user.click(screen.getByText("Увійти"));

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "pass123",
    });
  });

  it("calls signUp on sign up button click", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(
      screen.getByPlaceholderText("email@example.com"),
      "new@example.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "newpass");
    await user.click(screen.getByText("Зареєструватись"));

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "newpass",
    });
  });

  it("displays error message on sign in failure", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(
      screen.getByPlaceholderText("email@example.com"),
      "bad@example.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "wrong");
    await user.click(screen.getByText("Увійти"));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("displays error message on sign up failure", async () => {
    mockSignUp.mockResolvedValue({
      error: { message: "Email already registered" },
    });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(
      screen.getByPlaceholderText("email@example.com"),
      "existing@example.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "pass");
    await user.click(screen.getByText("Зареєструватись"));

    expect(
      await screen.findByText("Email already registered")
    ).toBeInTheDocument();
  });
});
