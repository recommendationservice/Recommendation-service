import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActionLog } from "./action-log";
import type { ActionEntry } from "./use-feed-state";

describe("ActionLog", () => {
  it("renders nothing when actions array is empty", () => {
    const { container } = render(<ActionLog actions={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all action entries", () => {
    const actions: ActionEntry[] = [
      { id: "1", userName: "User1", actionText: "лайкнув фільм" },
      { id: "2", userName: "User2", actionText: "додав фільм до улюбленого" },
    ];

    render(<ActionLog actions={actions} />);

    expect(screen.getByText("User1")).toBeInTheDocument();
    expect(screen.getByText("User2")).toBeInTheDocument();
  });

  it("renders userName in bold", () => {
    const actions: ActionEntry[] = [
      { id: "1", userName: "TestUser", actionText: "лайкнув фільм" },
    ];

    render(<ActionLog actions={actions} />);

    const userNameEl = screen.getByText("TestUser");
    expect(userNameEl.tagName).toBe("SPAN");
    expect(userNameEl.className).toContain("font-bold");
  });

  it("renders 'фільм' in bold within action text", () => {
    const actions: ActionEntry[] = [
      { id: "1", userName: "User", actionText: "лайкнув фільм" },
    ];

    render(<ActionLog actions={actions} />);

    const boldFilm = screen.getByText("фільм");
    expect(boldFilm.tagName).toBe("SPAN");
    expect(boldFilm.className).toContain("font-bold");
  });

  it("renders action text without 'фільм' normally", () => {
    const actions: ActionEntry[] = [
      { id: "1", userName: "User", actionText: "виконав дію" },
    ];

    render(<ActionLog actions={actions} />);
    expect(screen.getByText("виконав дію")).toBeInTheDocument();
  });
});
