import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MovieDialog } from "./movie-dialog";
import type { Movie } from "./movies-data";

const testMovie: Movie = {
  id: "1",
  title: "Тестовий фільм",
  year: 2024,
  genre: ["Драма", "Комедія"],
  rating: 8.5,
  posterUrl: "https://example.com/poster.jpg",
  description: "Повний опис фільму",
  trailerUrl: "https://youtube.com/embed/test",
  cast: ["Актор 1", "Актор 2", "Актор 3"],
};

describe("MovieDialog", () => {
  it("renders nothing when movie is null", () => {
    const { container } = render(
      <MovieDialog movie={null} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders movie details when movie is provided", () => {
    render(<MovieDialog movie={testMovie} onClose={vi.fn()} />);

    expect(screen.getByText("Тестовий фільм")).toBeInTheDocument();
    expect(
      screen.getByText("2024 · Драма, Комедія · ⭐ 8.5")
    ).toBeInTheDocument();
    expect(screen.getByText("Повний опис фільму")).toBeInTheDocument();
    expect(
      screen.getByText("Актор 1, Актор 2, Актор 3")
    ).toBeInTheDocument();
  });

  it("renders cast section title", () => {
    render(<MovieDialog movie={testMovie} onClose={vi.fn()} />);
    expect(screen.getByText("Акторський склад")).toBeInTheDocument();
  });

  it("renders iframe with trailer URL", () => {
    render(<MovieDialog movie={testMovie} onClose={vi.fn()} />);

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.src).toBe("https://youtube.com/embed/test");
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MovieDialog movie={testMovie} onClose={onClose} />);

    const closeButton = screen.getAllByRole("button")[0];
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MovieDialog movie={testMovie} onClose={onClose} />);

    const backdrop = document.querySelector(".fixed.inset-0")!;
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when dialog content is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MovieDialog movie={testMovie} onClose={onClose} />);

    await user.click(screen.getByText("Повний опис фільму"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(<MovieDialog movie={testMovie} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
