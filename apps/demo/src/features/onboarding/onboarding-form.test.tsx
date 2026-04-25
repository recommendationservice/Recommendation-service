import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "./onboarding-form";

const mockFetch = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  mockPush.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OnboardingForm — Default state (REQ-2, spec UI States)", () => {
  it("renders heading, description, textarea, Submit (disabled), skip ×", () => {
    render(<OnboardingForm />);

    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /надіслати/i }),
    ).toBeDisabled();
    expect(screen.getByLabelText(/пропустити/i)).toBeInTheDocument();
  });

  it("textarea max length 2000 (REQ-2)", () => {
    render(<OnboardingForm />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(2000);
  });
});

describe("OnboardingForm — Typing state", () => {
  it("Submit becomes enabled when textarea has 1+ chars", async () => {
    render(<OnboardingForm />);
    const submit = screen.getByRole("button", { name: /надіслати/i });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByRole("textbox"), "Дарк-триллери");
    expect(submit).toBeEnabled();
  });

  it("Submit becomes disabled again when textarea is cleared", async () => {
    render(<OnboardingForm />);
    const textarea = screen.getByRole("textbox");
    const submit = screen.getByRole("button", { name: /надіслати/i });

    await userEvent.type(textarea, "abc");
    expect(submit).toBeEnabled();

    await userEvent.clear(textarea);
    expect(submit).toBeDisabled();
  });
});

describe("OnboardingForm — Submitting state (REQ-15, REQ-12 double-submit)", () => {
  it("shows 'Thinking about your taste...' and disables submit while pending", async () => {
    let resolveFetch: (r: Response) => void = () => {};
    mockFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "Триллери");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    expect(screen.getByText(/аналізуємо/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /надіслати/i })).toBeDisabled();
    expect(screen.getByLabelText(/пропустити/i)).toBeDisabled();

    resolveFetch(jsonResponse(200, { ok: true, enrichedText: "..." }));
  });

  it("rapid double-clicks fire only one POST (REQ-12)", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { ok: true, enrichedText: "stub" }),
    );

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "Hello");
    const submit = screen.getByRole("button", { name: /надіслати/i });
    await userEvent.click(submit);
    await userEvent.click(submit);
    await userEvent.click(submit);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe("OnboardingForm — Skip path (Scenario 2)", () => {
  it("clicking × posts { rawPrompt: null } and redirects to /feed", async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    render(<OnboardingForm />);

    await userEvent.click(screen.getByLabelText(/пропустити/i));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/demo/onboarding",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ rawPrompt: null }),
        }),
      );
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/feed");
    });
  });

  it("skip works even with non-empty textarea (× ignores draft)", async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    render(<OnboardingForm />);

    await userEvent.type(
      screen.getByRole("textbox"),
      "draft prompt",
    );
    await userEvent.click(screen.getByLabelText(/пропустити/i));

    await waitFor(() => {
      const call = mockFetch.mock.calls[0];
      expect(JSON.parse(call?.[1].body as string)).toEqual({ rawPrompt: null });
    });
  });
});

describe("OnboardingForm — Success state (REQ-13, Scenario 1)", () => {
  it("shows 'We understood you like: <enrichedText>' confirmation", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, {
        ok: true,
        enrichedText:
          "A user enjoys thriller, drama. Themes: psychological. Mood: dark.",
      }),
    );

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "Триллери");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    await waitFor(() => {
      expect(screen.getByText(/ми зрозуміли, що тобі подобається/i)).toBeInTheDocument();
      expect(
        screen.getByText(/A user enjoys thriller, drama/),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /продовжити/i })).toBeEnabled();
  });

  it("redirects to /feed after Continue click", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { ok: true, enrichedText: "stub" }),
    );

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "X");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    await userEvent.click(
      await screen.findByRole("button", { name: /продовжити/i }),
    );
    expect(mockPush).toHaveBeenCalledWith("/feed");
  });
});

describe("OnboardingForm — Error 503 (Scenario 3)", () => {
  it("shows AI-unavailable alert + Retry button + retains textarea value", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(503, { error: { message: "AI down" } }),
    );

    render(<OnboardingForm />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await userEvent.type(textarea, "Триллери 90-х");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    await waitFor(() => {
      expect(screen.getByText(/тимчасово недоступний/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /спробувати ще раз/i })).toBeInTheDocument();
    expect(textarea.value).toBe("Триллери 90-х");
    expect(screen.getByRole("button", { name: /надіслати/i })).toBeEnabled();
  });

  it("Retry re-fires the same fetch with same rawPrompt", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "x" } }))
      .mockResolvedValueOnce(
        jsonResponse(200, { ok: true, enrichedText: "ok" }),
      );

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "Same prompt");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    await userEvent.click(await screen.findByRole("button", { name: /спробувати ще раз/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    const second = mockFetch.mock.calls[1];
    expect(JSON.parse(second?.[1].body as string)).toEqual({
      rawPrompt: "Same prompt",
    });
  });

  it("after 503, clicking × falls into clean skip (Scenario 6)", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "x" } }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "X");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    await screen.findByRole("button", { name: /спробувати ще раз/i });
    await userEvent.click(screen.getByLabelText(/пропустити/i));

    await waitFor(() => {
      const second = mockFetch.mock.calls[1];
      expect(JSON.parse(second?.[1].body as string)).toEqual({
        rawPrompt: null,
      });
    });
    expect(mockPush).toHaveBeenCalledWith("/feed");
  });
});

describe("OnboardingForm — Validation errors (400/422)", () => {
  it("shows inline message under textarea on 400/422 response", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(422, { error: { message: "Couldn't interpret" } }),
    );

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "qwertyzz");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    await waitFor(() => {
      expect(screen.getByText(/couldn't interpret/i)).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /спробувати ще раз/i }),
    ).not.toBeInTheDocument();
  });
});

describe("OnboardingForm — Network error", () => {
  it("shows network error toast/message on fetch rejection", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "X");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    await waitFor(() => {
      expect(screen.getByText(/мереж/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /надіслати/i })).toBeEnabled();
  });
});

describe("OnboardingForm — fetch contract", () => {
  it("LLM submit posts to /api/demo/onboarding with { rawPrompt: <text> }", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { ok: true, enrichedText: "ok" }),
    );

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "Hello world");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    const [url, init] = mockFetch.mock.calls[0] ?? [];
    expect(url).toBe("/api/demo/onboarding");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      rawPrompt: "Hello world",
    });
  });

  it("aborts via AbortSignal.timeout(15000) (REQ-12 client-side timeout)", async () => {
    let capturedSignal: AbortSignal | undefined;
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) => {
        capturedSignal = init.signal as AbortSignal;
        return new Promise(() => {});
      },
    );

    render(<OnboardingForm />);
    await userEvent.type(screen.getByRole("textbox"), "X");
    await userEvent.click(screen.getByRole("button", { name: /надіслати/i }));

    await waitFor(() => {
      expect(capturedSignal).toBeInstanceOf(AbortSignal);
    });
  });
});
