import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MovieCard } from "./movie-card";
import type { Movie } from "./movies-data";

const testMovie: Movie = {
  id: "1",
  title: "Тестовий фільм",
  year: 2024,
  genre: ["Драма", "Комедія"],
  rating: 8.5,
  posterUrl: "https://example.com/poster.jpg",
  description: "Опис фільму.\nДругий рядок опису.",
  trailerUrl: "https://youtube.com/embed/test",
  cast: ["Актор 1", "Актор 2"],
};

describe("MovieCard", () => {
  const defaultProps = {
    movie: testMovie,
    liked: false,
    bookmarked: false,
    disliked: false,
    onLike: vi.fn(),
    onBookmark: vi.fn(),
    onDislike: vi.fn(),
    onClick: vi.fn(),
  };

  it("renders movie title", () => {
    render(<MovieCard {...defaultProps} />);
    expect(screen.getByText("Тестовий фільм")).toBeInTheDocument();
  });

  it("renders year, genres, and rating", () => {
    render(<MovieCard {...defaultProps} />);
    expect(screen.getByText("2024 · Драма, Комедія · ⭐ 8.5")).toBeInTheDocument();
  });

  it("renders only first line of description", () => {
    render(<MovieCard {...defaultProps} />);
    expect(screen.getByText("Опис фільму.")).toBeInTheDocument();
    expect(screen.queryByText("Другий рядок опису.")).not.toBeInTheDocument();
  });

  it("renders 'Переглянути' button", () => {
    render(<MovieCard {...defaultProps} />);
    expect(screen.getByText("Переглянути")).toBeInTheDocument();
  });

  it("calls onClick when 'Переглянути' is clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<MovieCard {...defaultProps} onClick={onClick} />);

    await user.click(screen.getByText("Переглянути"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("calls onLike when heart button is clicked", async () => {
    const onLike = vi.fn();
    const user = userEvent.setup();
    render(<MovieCard {...defaultProps} onLike={onLike} />);

    const buttons = screen.getAllByRole("button");
    const heartButton = buttons[1];
    await user.click(heartButton);

    expect(onLike).toHaveBeenCalledOnce();
  });

  it("calls onBookmark when bookmark button is clicked", async () => {
    const onBookmark = vi.fn();
    const user = userEvent.setup();
    render(<MovieCard {...defaultProps} onBookmark={onBookmark} />);

    const buttons = screen.getAllByRole("button");
    const bookmarkButton = buttons[2];
    await user.click(bookmarkButton);

    expect(onBookmark).toHaveBeenCalledOnce();
  });

  it("does not propagate like click to onClick", async () => {
    const onClick = vi.fn();
    const onLike = vi.fn();
    const user = userEvent.setup();
    render(<MovieCard {...defaultProps} onClick={onClick} onLike={onLike} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]);

    expect(onLike).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not propagate bookmark click to onClick", async () => {
    const onClick = vi.fn();
    const onBookmark = vi.fn();
    const user = userEvent.setup();
    render(
      <MovieCard {...defaultProps} onClick={onClick} onBookmark={onBookmark} />
    );

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]);

    expect(onBookmark).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("calls onDislike when dislike button is clicked", async () => {
    const onDislike = vi.fn();
    const user = userEvent.setup();
    render(<MovieCard {...defaultProps} onDislike={onDislike} />);

    const buttons = screen.getAllByRole("button");
    const dislikeButton = buttons[3];
    await user.click(dislikeButton);

    expect(onDislike).toHaveBeenCalledOnce();
  });

  it("does not propagate dislike click to onClick", async () => {
    const onClick = vi.fn();
    const onDislike = vi.fn();
    const user = userEvent.setup();
    render(
      <MovieCard {...defaultProps} onClick={onClick} onDislike={onDislike} />
    );

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[3]);

    expect(onDislike).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });
});
