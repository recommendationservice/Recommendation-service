import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFeedState } from "./use-feed-state";

describe("useFeedState", () => {
  it("starts with empty likes, bookmarks, and actions", () => {
    const { result } = renderHook(() => useFeedState("TestUser"));

    expect(result.current.likes.size).toBe(0);
    expect(result.current.bookmarks.size).toBe(0);
    expect(result.current.actions).toHaveLength(0);
  });

  it("toggleLike adds a movie to likes", () => {
    const { result } = renderHook(() => useFeedState("TestUser"));

    act(() => result.current.toggleLike("movie-1"));

    expect(result.current.likes.has("movie-1")).toBe(true);
    expect(result.current.actions).toHaveLength(1);
    expect(result.current.actions[0].actionText).toBe("лайкнув фільм");
    expect(result.current.actions[0].userName).toBe("TestUser");
  });

  it("toggleLike removes a movie from likes on second call", () => {
    const { result } = renderHook(() => useFeedState("TestUser"));

    act(() => result.current.toggleLike("movie-1"));
    act(() => result.current.toggleLike("movie-1"));

    expect(result.current.likes.has("movie-1")).toBe(false);
    expect(result.current.actions).toHaveLength(2);
    expect(result.current.actions[1].actionText).toBe(
      "прибрав лайк з фільму"
    );
  });

  it("toggleBookmark adds a movie to bookmarks", () => {
    const { result } = renderHook(() => useFeedState("TestUser"));

    act(() => result.current.toggleBookmark("movie-1"));

    expect(result.current.bookmarks.has("movie-1")).toBe(true);
    expect(result.current.actions).toHaveLength(1);
    expect(result.current.actions[0].actionText).toBe(
      "додав фільм до улюбленого"
    );
  });

  it("toggleBookmark removes a movie from bookmarks on second call", () => {
    const { result } = renderHook(() => useFeedState("TestUser"));

    act(() => result.current.toggleBookmark("movie-1"));
    act(() => result.current.toggleBookmark("movie-1"));

    expect(result.current.bookmarks.has("movie-1")).toBe(false);
    expect(result.current.actions[1].actionText).toBe(
      "прибрав закладку з фільму"
    );
  });

  it("tracks multiple movies independently", () => {
    const { result } = renderHook(() => useFeedState("TestUser"));

    act(() => {
      result.current.toggleLike("movie-1");
      result.current.toggleLike("movie-2");
    });

    expect(result.current.likes.has("movie-1")).toBe(true);
    expect(result.current.likes.has("movie-2")).toBe(true);
    expect(result.current.likes.size).toBe(2);
  });

  it("generates unique action IDs", () => {
    const { result } = renderHook(() => useFeedState("TestUser"));

    act(() => result.current.toggleLike("movie-1"));
    act(() => result.current.toggleBookmark("movie-2"));

    const ids = result.current.actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
