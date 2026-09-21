import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("player fixture journey", () => {
  beforeEach(() => window.history.replaceState({}, "", "/"));

  it("moves from the library through valid setup into active play", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /choose the world/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /prepare your arrival/i }),
      ).toHaveFocus(),
    );
    expect(screen.getByRole("button", { name: "Start story" })).toBeDisabled();
    await user.clear(screen.getByLabelText("Protagonist name"));
    await user.type(screen.getByLabelText("Protagonist name"), "Arden");
    await user.click(screen.getByRole("button", { name: "Start story" }));
    expect(
      screen.getByRole("heading", { name: "The receiver wakes" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "The receiver wakes" }),
      ).toHaveFocus(),
    );
    await user.click(screen.getByLabelText("Say"));
    expect(
      screen.getByRole("button", { name: "Submit Say action" }),
    ).toBeEnabled();
  });

  it("resets scroll and focuses each SPA destination heading", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /choose the world/i }),
      ).toHaveFocus(),
    );
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /how this story responds/i }),
      ).toHaveFocus(),
    );
    await user.click(
      screen.getByRole("button", { name: /^Wallet$/ }),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "84 credits" })).toHaveFocus(),
    );
    await user.click(screen.getByRole("button", { name: "Library" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /choose the world/i }),
      ).toHaveFocus(),
    );
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
  });

  it("retains distinct partial prose and draft through disconnect and retry", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/play");
    render(<App />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "The receiver wakes" }),
      ).toHaveFocus(),
    );
    const draft = screen.getByLabelText("Do action");
    await user.clear(draft);
    await user.type(draft, "Keep this exact player draft.");
    await user.click(screen.getByRole("button", { name: "streaming" }));
    const partial = /coordinates just beyond the northern ridge/i;
    expect(screen.getByText(partial)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "disconnect" }));
    expect(screen.getByText(partial)).toBeInTheDocument();
    expect(screen.getByLabelText("Do action")).toHaveValue(
      "Keep this exact player draft.",
    );
    await user.click(
      screen.getByRole("button", { name: /resume generation/i }),
    );
    expect(screen.getByText(partial)).toBeInTheDocument();
    expect(screen.getByLabelText("Do action")).toHaveValue(
      "Keep this exact player draft.",
    );
  });

  it("preserves reading actions when quota blocks generation", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/play");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "quota" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "12 more credits required",
    );
    expect(
      screen.getByRole("button", { name: /submit do action/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Undo to turn 13" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Open wallet" }));
    expect(
      screen.getByRole("heading", { name: "84 credits" }),
    ).toBeInTheDocument();
  });

  it("shows settings inheritance, validation, and immediate preview", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/settings");
    render(<App />);
    expect(
      screen.getByText("Inherited from your defaults"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/locked on by the quiet meridian/i),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Sliding window turns"));
    await user.type(screen.getByLabelText("Sliding window turns"), "3");
    expect(
      screen.getByText(/enter −1 or a number from 5 to 100/i),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("Font family"),
      "Atkinson Hyperlegible",
    );
    expect(screen.getByText(/rain writes silver lines/i)).toHaveStyle({
      fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif",
    });
  });

  it("resets inherited context and discards every settings draft field", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/settings");
    render(<App />);
    const family = screen.getByLabelText("Font family");
    const size = screen.getByLabelText(/font size/i);
    const motion = screen.getByRole("checkbox", { name: /reduce motion/i });
    const windowTurns = screen.getByLabelText("Sliding window turns");
    const autoSummary = screen.getByRole("checkbox", {
      name: /override auto-summary/i,
    });

    await user.selectOptions(family, "Atkinson Hyperlegible");
    fireEvent.change(size, { target: { value: "26" } });
    await user.click(motion);
    await user.clear(windowTurns);
    await user.type(windowTurns, "3");
    await user.click(autoSummary);
    expect(
      screen.getByText("Adventure override · unsaved"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/enter −1 or a number from 5 to 100/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Reset to inherited" }),
    );
    expect(windowTurns).toHaveValue("-1");
    expect(autoSummary).not.toBeChecked();
    expect(
      screen.getByText("Inherited from your defaults"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/enter −1 or a number from 5 to 100/i),
    ).not.toBeInTheDocument();
    expect(family).toHaveValue("Atkinson Hyperlegible");
    expect(size).toHaveValue("26");
    expect(motion).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(family).toHaveValue("Newsreader");
    expect(size).toHaveValue("18");
    expect(motion).toBeChecked();
    expect(windowTurns).toHaveValue("-1");
    expect(autoSummary).not.toBeChecked();
    expect(
      screen.getByText("Inherited from your defaults"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByText(/rain writes silver lines/i)).toHaveStyle({
      fontFamily: "Newsreader, Georgia, serif",
      fontSize: "18px",
    });
  });

  it("exposes semantic branch history and reversible controls", () => {
    window.history.replaceState({}, "", "/play");
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "The receiver wakes" }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Branch history" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Undo to turn 13" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Retry as sibling branch" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Redo existing child" }),
    ).toBeVisible();
  });

  it("uses explicit handoff and supports referral controls", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/wallet");
    render(<App />);
    expect(
      screen.getByRole("radio", { name: /wallet payment/i }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: /review external checkout handoff/i }),
    );
    expect(
      screen.getByText(/returning to this page never grants credits/i),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /continue to fake provider/i }),
    );
    expect(screen.getByText(/verified provider webhook/i)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /copy referral link/i }),
    );
    expect(screen.getByText("Referral link copied.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /revoke code/i }));
    expect(screen.getByText("Code revoked")).toBeInTheDocument();
  });
});
