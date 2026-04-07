import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt} />
  ),
}));

import { FeedPage } from "./feed-page";

describe("FeedPage", () => {
  const defaultProps = {
    displayName: "TestUser",
    avatarUrl: null as string | null,
    onLogout: vi.fn(),
    actionLog: <div data-testid="action-log">Log</div>,
    children: <div data-testid="children">Content</div>,
  };

  it("renders greeting with display name", () => {
    render(<FeedPage {...defaultProps} />);
    expect(screen.getByText("TestUser")).toBeInTheDocument();
    expect(screen.getByText(/Привіт/)).toBeInTheDocument();
  });

  it("renders grey circle when no avatar", () => {
    const { container } = render(<FeedPage {...defaultProps} />);
    const greyCircle = container.querySelector(".bg-\\[\\#d9d9d9\\]");
    expect(greyCircle).toBeInTheDocument();
  });

  it("renders avatar image when avatarUrl provided", () => {
    render(
      <FeedPage {...defaultProps} avatarUrl="https://example.com/avatar.jpg" />
    );
    const img = screen.getByRole("presentation");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("renders logout button", () => {
    render(<FeedPage {...defaultProps} />);
    expect(screen.getByText("Вийти")).toBeInTheDocument();
  });

  it("calls onLogout when logout button clicked", async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    render(<FeedPage {...defaultProps} onLogout={onLogout} />);

    await user.click(screen.getByText("Вийти"));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("renders children in main area", () => {
    render(<FeedPage {...defaultProps} />);
    expect(screen.getByTestId("children")).toBeInTheDocument();
  });

  it("renders action log in sidebar", () => {
    render(<FeedPage {...defaultProps} />);
    expect(screen.getByTestId("action-log")).toBeInTheDocument();
  });

  it("renders page headings", () => {
    render(<FeedPage {...defaultProps} />);
    expect(screen.getByText("Рекомендації")).toBeInTheDocument();
    expect(screen.getByText("Логування")).toBeInTheDocument();
  });
});
