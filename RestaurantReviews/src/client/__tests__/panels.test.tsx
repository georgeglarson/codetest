// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function noContentResponse() {
  return Promise.resolve({
    ok: true,
    status: 204,
    json: () => Promise.reject(new Error("no content")),
  });
}

function mockInitialLoads(
  users: unknown[] = [],
  restaurants: unknown[] = [],
  reviews: unknown[] = []
) {
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/users") return jsonResponse(users);
    if (url === "/api/restaurants") return jsonResponse(restaurants);
    if (url === "/api/reviews") return jsonResponse(reviews);
    return jsonResponse({ error: "not found" }, 404);
  });
}

// ── TabNav ARIA ─────────────────────────────────────────────────────

describe("TabNav accessibility", () => {
  it("has role=tablist on nav", () => {
    mockInitialLoads();
    render(<App />);
    const nav = screen.getByRole("tablist");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("aria-label", "Exercise panels");
  });

  it("has role=tab on each tab button", () => {
    mockInitialLoads();
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(7);
  });

  it("marks active tab with aria-selected=true", () => {
    mockInitialLoads();
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    const activeTab = tabs.find((t) => t.textContent === "Overview");
    expect(activeTab).toHaveAttribute("aria-selected", "true");
  });

  it("marks inactive tabs with aria-selected=false", () => {
    mockInitialLoads();
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    const inactiveTabs = tabs.filter((t) => t.textContent !== "Overview");
    for (const tab of inactiveTabs) {
      expect(tab).toHaveAttribute("aria-selected", "false");
    }
  });

  it("updates aria-selected on tab switch", () => {
    mockInitialLoads();
    render(<App />);
    const cashTab = screen.getByRole("tab", { name: "Cash Register" });
    expect(cashTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(cashTab);
    expect(cashTab).toHaveAttribute("aria-selected", "true");

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    expect(overviewTab).toHaveAttribute("aria-selected", "false");
  });
});

// ── Morse Code mode switching ───────────────────────────────────────

describe("MorseCodePanel mode switching", () => {
  function goToMorse() {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Morse Code", { selector: "button[role='tab']" }));
  }

  it("pre-fills encode default text on load", () => {
    goToMorse();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("HELLO WORLD");
  });

  it("switches to decode with empty input when no output exists", () => {
    goToMorse();
    const decodeButtons = screen.getAllByText("Morse to Text");
    fireEvent.click(decodeButtons[0]);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });

  it("feeds encode output into decode input on mode switch", async () => {
    goToMorse();
    const morseOutput = "....|.|.-..|.-..|---||||.--|---|-.|.-..|-..|";
    mockFetch.mockReturnValueOnce(jsonResponse({ output: morseOutput }));

    // Encode first (click "Convert" button)
    fireEvent.click(screen.getByText("Convert"));
    await waitFor(() => {
      expect(screen.getByText(morseOutput)).toBeInTheDocument();
    });

    // Switch to decode — should prefill with encode output
    const decodeButtons = screen.getAllByText("Morse to Text");
    fireEvent.click(decodeButtons[0]);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe(morseOutput);
  });

  it("restores encode default text on Text to Morse click when no output", () => {
    goToMorse();
    const decodeButtons = screen.getAllByText("Morse to Text");
    fireEvent.click(decodeButtons[0]);
    const encodeButtons = screen.getAllByText("Text to Morse");
    fireEvent.click(encodeButtons[0]);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    // When switching back with no prior output, feeds output if available, else keeps default
    expect(textarea.value).toBe("HELLO WORLD");
  });

  it("sends to correct endpoint based on mode", async () => {
    goToMorse();

    // Type some morse manually so input is non-empty for decode
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    const decodeButtons = screen.getAllByText("Morse to Text");
    fireEvent.click(decodeButtons[0]);
    fireEvent.change(textarea, { target: { value: "....|.-.." } });

    mockFetch.mockReturnValueOnce(jsonResponse({ output: "decoded text" }));

    fireEvent.click(screen.getByText("Convert"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/exercises/morse-code/decode",
        expect.any(Object)
      );
    });
  });
});

// ── ReviewsPanel — user table ───────────────────────────────────────

/** Navigate from Overview to Restaurant Reviews tab */
function goToReviews() {
  fireEvent.click(screen.getByText("Restaurant Reviews", { selector: "button[role='tab']" }));
}

describe("ReviewsPanel — user table", () => {
  it("renders users in a data table on load", async () => {
    mockInitialLoads([
      { id: 1, name: "Alice", email: "alice@example.com", blocked: 0, created_at: "2024-01-01" },
      { id: 2, name: "Bob", email: "bob@example.com", blocked: 1, created_at: "2024-01-01" },
    ]);
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.getByText("blocked")).toBeInTheDocument();
    });
  });

  it("shows empty state when no users", async () => {
    mockInitialLoads();
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText(/No users yet/)).toBeInTheDocument();
    });
  });

  it("inline edit flow — click Edit, modify, Save", async () => {
    const alice = {
      id: 1,
      name: "Alice",
      email: "alice@example.com",
      blocked: 0,
      created_at: "2024-01-01",
    };
    mockInitialLoads([alice]);
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Click Edit button
    fireEvent.click(screen.getAllByText("Edit")[0]);

    // Should show edit inputs
    const nameInput = screen.getByLabelText("Edit name") as HTMLInputElement;
    expect(nameInput.value).toBe("Alice");

    // Modify name
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Alicia");

    // Mock the PUT call and refresh
    const updatedAlice = { ...alice, name: "Alicia" };
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "PUT") return jsonResponse(updatedAlice);
      if (url === "/api/users") return jsonResponse([updatedAlice]);
      if (url === "/api/restaurants") return jsonResponse([]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({}, 200);
    });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Alicia")).toBeInTheDocument();
    });
  });

  it("inline edit — Cancel reverts without saving", async () => {
    mockInitialLoads([
      { id: 1, name: "Alice", email: "alice@example.com", blocked: 0, created_at: "2024-01-01" },
    ]);
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Edit")[0]);
    fireEvent.click(screen.getByText("Cancel"));

    // Should show Alice again, not edit inputs
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit name")).not.toBeInTheDocument();
  });

  it("block/unblock toggle", async () => {
    const alice = {
      id: 1,
      name: "Alice",
      email: "alice@example.com",
      blocked: 0,
      created_at: "2024-01-01",
    };
    mockInitialLoads([alice]);
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Block")).toBeInTheDocument();
    });

    // Mock block call + refresh
    const blockedAlice = { ...alice, blocked: 1 };
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "PATCH") return jsonResponse(blockedAlice);
      if (url === "/api/users") return jsonResponse([blockedAlice]);
      if (url === "/api/restaurants") return jsonResponse([]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({}, 200);
    });

    fireEvent.click(screen.getByText("Block"));

    await waitFor(() => {
      expect(screen.getByText("blocked")).toBeInTheDocument();
      expect(screen.getByText("Unblock")).toBeInTheDocument();
    });
  });

  it("delete user with FK error shows inline message", async () => {
    const alice = {
      id: 1,
      name: "Alice",
      email: "alice@example.com",
      blocked: 0,
      created_at: "2024-01-01",
    };
    mockInitialLoads([alice]);
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Mock DELETE returning 409
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "DELETE")
        return jsonResponse({ error: "cannot delete user with existing reviews" }, 409);
      if (url === "/api/users") return jsonResponse([alice]);
      if (url === "/api/restaurants") return jsonResponse([]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({}, 200);
    });

    fireEvent.click(screen.getByText("Delete"));

    // Confirm the delete
    await waitFor(() => {
      expect(screen.getByText("Confirm?")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Confirm?"));

    await waitFor(() => {
      expect(screen.getByText("cannot delete user with existing reviews")).toBeInTheDocument();
    });
  });
});

// ── ReviewsPanel — restaurant table ─────────────────────────────────

describe("ReviewsPanel — restaurant table", () => {
  it("renders restaurants in a data table", async () => {
    mockInitialLoads(
      [],
      [
        {
          id: 1,
          name: "Pizza Palace",
          city: "Pittsburgh",
          cuisine: "Italian",
          created_at: "2024-01-01",
        },
      ]
    );
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Pizza Palace")).toBeInTheDocument();
      expect(screen.getByText("Pittsburgh")).toBeInTheDocument();
    });
  });

  it("shows empty state when no restaurants", async () => {
    mockInitialLoads();
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText(/No restaurants/)).toBeInTheDocument();
    });
  });

  it("client-side city filter works", async () => {
    mockInitialLoads(
      [],
      [
        { id: 1, name: "Place A", city: "Pittsburgh", cuisine: "", created_at: "2024-01-01" },
        { id: 2, name: "Place B", city: "Philadelphia", cuisine: "", created_at: "2024-01-01" },
      ]
    );
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Place A")).toBeInTheDocument();
      expect(screen.getByText("Place B")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText("Filter by city..."), "pitt");

    expect(screen.getByText("Place A")).toBeInTheDocument();
    expect(screen.queryByText("Place B")).not.toBeInTheDocument();
  });

  it("delete restaurant with FK error shows inline message", async () => {
    const restaurant = { id: 1, name: "Pizza", city: "NYC", cuisine: "", created_at: "2024-01-01" };
    mockInitialLoads([], [restaurant]);
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Pizza")).toBeInTheDocument();
    });

    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "DELETE")
        return jsonResponse({ error: "cannot delete restaurant with existing reviews" }, 409);
      if (url === "/api/users") return jsonResponse([]);
      if (url === "/api/restaurants") return jsonResponse([restaurant]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({}, 200);
    });

    // First click shows confirmation
    const deleteBtns = screen.getAllByText("Delete");
    fireEvent.click(deleteBtns[deleteBtns.length - 1]);

    // Second click confirms
    await waitFor(() => {
      expect(screen.getByText("Confirm?")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Confirm?"));

    await waitFor(() => {
      expect(
        screen.getByText("cannot delete restaurant with existing reviews")
      ).toBeInTheDocument();
    });
  });
});

// ── ReviewsPanel — review table ─────────────────────────────────────

describe("ReviewsPanel — review table", () => {
  it("renders reviews with user/restaurant names", async () => {
    mockInitialLoads(
      [{ id: 1, name: "Alice", email: "alice@example.com", blocked: 0, created_at: "2024-01-01" }],
      [
        {
          id: 1,
          name: "Pizza Palace",
          city: "Pittsburgh",
          cuisine: "Italian",
          created_at: "2024-01-01",
        },
      ],
      [
        {
          id: 1,
          user_id: 1,
          restaurant_id: 1,
          rating: 5,
          body: "Amazing!",
          user_name: "Alice",
          restaurant_name: "Pizza Palace",
          created_at: "2024-01-01",
        },
      ]
    );
    render(<App />);
    goToReviews();

    await waitFor(() => {
      // Verify names appear (not just IDs)
      const cells = screen.getAllByText("Alice");
      expect(cells.length).toBeGreaterThanOrEqual(1);
      const palaceCells = screen.getAllByText("Pizza Palace");
      expect(palaceCells.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Amazing!")).toBeInTheDocument();
    });
  });

  it("shows empty state when no reviews", async () => {
    mockInitialLoads();
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    });
  });

  it("entity picker dropdowns are populated", async () => {
    mockInitialLoads(
      [
        { id: 1, name: "Alice", email: "alice@example.com", blocked: 0, created_at: "2024-01-01" },
        { id: 2, name: "Bob", email: "bob@example.com", blocked: 1, created_at: "2024-01-01" },
      ],
      [
        {
          id: 1,
          name: "Pizza Palace",
          city: "Pittsburgh",
          cuisine: "Italian",
          created_at: "2024-01-01",
        },
      ]
    );
    render(<App />);
    goToReviews();

    await waitFor(() => {
      // User picker
      const userSelect = screen.getByLabelText("Select user") as HTMLSelectElement;
      expect(userSelect.options.length).toBe(3); // "Select user..." + 2 users
      expect(userSelect.options[1].text).toContain("Alice");
      expect(userSelect.options[2].text).toContain("[blocked]");

      // Restaurant picker
      const restaurantSelect = screen.getByLabelText("Select restaurant") as HTMLSelectElement;
      expect(restaurantSelect.options.length).toBe(2); // "Select restaurant..." + 1 restaurant
      expect(restaurantSelect.options[1].text).toContain("Pizza Palace");
    });
  });

  it("creates review via dropdowns", async () => {
    const users = [
      { id: 1, name: "Alice", email: "alice@example.com", blocked: 0, created_at: "2024-01-01" },
    ];
    const restaurants = [
      {
        id: 1,
        name: "Pizza Palace",
        city: "Pittsburgh",
        cuisine: "Italian",
        created_at: "2024-01-01",
      },
    ];
    mockInitialLoads(users, restaurants);
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByLabelText("Select user")).toBeInTheDocument();
    });

    // Select user, restaurant, rating
    await userEvent.selectOptions(screen.getByLabelText("Select user"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Select restaurant"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Select rating"), "5");
    await userEvent.type(screen.getByPlaceholderText("Comment (optional)"), "Wonderful!");

    // Mock create + refresh
    const newReview = {
      id: 1,
      user_id: 1,
      restaurant_id: 1,
      rating: 5,
      body: "Wonderful!",
      user_name: "Alice",
      restaurant_name: "Pizza Palace",
      created_at: "2024-01-01",
    };
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") return jsonResponse(newReview, 201);
      if (url === "/api/users") return jsonResponse(users);
      if (url === "/api/restaurants") return jsonResponse(restaurants);
      if (url === "/api/reviews") return jsonResponse([newReview]);
      return jsonResponse({}, 200);
    });

    const createBtns = screen.getAllByText("Create");
    fireEvent.click(createBtns[createBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("Wonderful!")).toBeInTheDocument();
    });
  });

  it("shows error when blocked user tries to create review", async () => {
    mockInitialLoads(
      [{ id: 1, name: "Alice", email: "alice@example.com", blocked: 1, created_at: "2024-01-01" }],
      [
        {
          id: 1,
          name: "Pizza Palace",
          city: "Pittsburgh",
          cuisine: "Italian",
          created_at: "2024-01-01",
        },
      ]
    );
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByLabelText("Select user")).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByLabelText("Select user"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Select restaurant"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Select rating"), "5");

    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") return jsonResponse({ error: "user is blocked" }, 403);
      if (url === "/api/users")
        return jsonResponse([
          {
            id: 1,
            name: "Alice",
            email: "alice@example.com",
            blocked: 1,
            created_at: "2024-01-01",
          },
        ]);
      if (url === "/api/restaurants")
        return jsonResponse([
          {
            id: 1,
            name: "Pizza Palace",
            city: "Pittsburgh",
            cuisine: "Italian",
            created_at: "2024-01-01",
          },
        ]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({}, 200);
    });

    const createBtns = screen.getAllByText("Create");
    fireEvent.click(createBtns[createBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("user is blocked")).toBeInTheDocument();
    });
  });

  it("inline edit review — change rating", async () => {
    const review = {
      id: 1,
      user_id: 1,
      restaurant_id: 1,
      rating: 3,
      body: "OK",
      user_name: "Alice",
      restaurant_name: "Pizza",
      created_at: "2024-01-01",
    };
    mockInitialLoads([], [], [review]);
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("OK")).toBeInTheDocument();
    });

    // Find the Edit button in the review section (last one)
    const editBtns = screen.getAllByText("Edit");
    fireEvent.click(editBtns[editBtns.length - 1]);

    // Change rating
    const ratingSelect = screen.getByLabelText("Edit rating");
    await userEvent.selectOptions(ratingSelect, "5");

    // Mock save + refresh
    const updated = { ...review, rating: 5 };
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "PUT") return jsonResponse(updated);
      if (url === "/api/users") return jsonResponse([]);
      if (url === "/api/restaurants") return jsonResponse([]);
      if (url === "/api/reviews") return jsonResponse([updated]);
      return jsonResponse({}, 200);
    });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      // The updated rating "5" should be in the table
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reviews/1",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  it("deletes a review", async () => {
    const review = {
      id: 1,
      user_id: 1,
      restaurant_id: 1,
      rating: 5,
      body: "Great!",
      user_name: "Alice",
      restaurant_name: "Pizza",
      created_at: "2024-01-01",
    };
    mockInitialLoads([], [], [review]);
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Great!")).toBeInTheDocument();
    });

    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "DELETE") return noContentResponse();
      if (url === "/api/users") return jsonResponse([]);
      if (url === "/api/restaurants") return jsonResponse([]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({}, 200);
    });

    const deleteBtns = screen.getAllByText("Delete");
    fireEvent.click(deleteBtns[deleteBtns.length - 1]);

    // Confirm the delete
    await waitFor(() => {
      expect(screen.getByText("Confirm?")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Confirm?"));

    await waitFor(() => {
      expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    });
  });
});

// ── MorseCodePanel — audio and output ────────────────────────────────

describe("MorseCodePanel — audio and output", () => {
  function goToMorse() {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Morse Code", { selector: "button[role='tab']" }));
  }

  it("shows audio play button after successful encode", async () => {
    goToMorse();
    mockFetch.mockReturnValueOnce(jsonResponse({ output: "....||." }));

    fireEvent.click(screen.getByText("Convert"));

    await waitFor(() => {
      expect(screen.getByLabelText("Play Morse audio")).toBeInTheDocument();
    });
  });

  it("does not show audio button in decode mode", async () => {
    goToMorse();
    const decodeButtons = screen.getAllByText("Morse to Text");
    fireEvent.click(decodeButtons[0]);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "....||." } });

    mockFetch.mockReturnValueOnce(jsonResponse({ output: "HE" }));
    fireEvent.click(screen.getByText("Convert"));

    await waitFor(() => {
      expect(screen.getByText("HE")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Play Morse audio")).not.toBeInTheDocument();
  });

  it("shows 'Converting...' on the button while loading", async () => {
    goToMorse();
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // never resolves

    fireEvent.click(screen.getByText("Convert"));

    await waitFor(() => {
      expect(screen.getByText("Converting...")).toBeInTheDocument();
      expect(screen.getByText("Converting...")).toBeDisabled();
    });
  });

  it("shows decode hint only in decode mode", () => {
    goToMorse();

    // In encode mode, no hint about separators
    expect(screen.queryByText(/Separate letters with/)).not.toBeInTheDocument();

    // Switch to decode mode
    const decodeButtons = screen.getAllByText("Morse to Text");
    fireEvent.click(decodeButtons[0]);
    expect(screen.getByText(/Separate letters with/)).toBeInTheDocument();

    // Switch back to encode mode
    const encodeButtons = screen.getAllByText("Text to Morse");
    fireEvent.click(encodeButtons[0]);
    expect(screen.queryByText(/Separate letters with/)).not.toBeInTheDocument();
  });

  it("renders output in a pre element after successful encode", async () => {
    goToMorse();
    mockFetch.mockReturnValueOnce(jsonResponse({ output: "....||." }));

    fireEvent.click(screen.getByText("Convert"));

    await waitFor(() => {
      const pre = screen.getByText("....||.");
      expect(pre.tagName).toBe("PRE");
    });
  });

  it("shows 'Reverse it' button only after successful conversion", async () => {
    goToMorse();

    // No swap button initially
    expect(screen.queryByText(/Reverse it/)).not.toBeInTheDocument();

    mockFetch.mockReturnValueOnce(jsonResponse({ output: "....||." }));
    fireEvent.click(screen.getByText("Convert"));

    await waitFor(() => {
      expect(screen.getByText(/Reverse it/)).toBeInTheDocument();
    });
  });

  it("swap button shows correct direction per mode", async () => {
    goToMorse();

    // Encode mode: arrow points right
    mockFetch.mockReturnValueOnce(jsonResponse({ output: "....||." }));
    fireEvent.click(screen.getByText("Convert"));

    await waitFor(() => {
      expect(screen.getByText("Reverse it \u2192")).toBeInTheDocument();
    });

    // Click swap — switches to decode, arrow points left
    fireEvent.click(screen.getByText("Reverse it \u2192"));

    await waitFor(() => {
      expect(screen.getByText("\u2190 Reverse it")).toBeInTheDocument();
    });
  });

  it("displays error message on failed API call", async () => {
    goToMorse();
    mockFetch.mockReturnValueOnce(jsonResponse({ error: "Invalid input characters" }, 400));

    fireEvent.click(screen.getByText("Convert"));

    await waitFor(() => {
      expect(screen.getByText("Invalid input characters")).toBeInTheDocument();
    });
  });

  it("does not submit when input is empty", () => {
    goToMorse();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "" } });

    mockFetch.mockClear();
    fireEvent.click(screen.getByText("Convert"));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── Cross-section refresh ───────────────────────────────────────────

describe("ReviewsPanel — cross-section refresh", () => {
  it("creating a user updates review section dropdown", async () => {
    mockInitialLoads();
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const newUser = {
      id: 1,
      name: "Charlie",
      email: "charlie@example.com",
      blocked: 0,
      created_at: "2024-01-01",
    };

    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") return jsonResponse(newUser, 201);
      if (url === "/api/users") return jsonResponse([newUser]);
      if (url === "/api/restaurants") return jsonResponse([]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({}, 200);
    });

    await userEvent.type(screen.getAllByPlaceholderText("Name")[0], "Charlie");
    await userEvent.type(screen.getByPlaceholderText("Email"), "charlie@example.com");
    fireEvent.click(screen.getByText("Create User"));

    await waitFor(() => {
      const userSelect = screen.getByLabelText("Select user") as HTMLSelectElement;
      const options = Array.from(userSelect.options).map((o) => o.text);
      expect(options.some((t) => t.includes("Charlie"))).toBe(true);
    });
  });
});

// ── GildedRose session interaction ──────────────────────────────────

describe("GildedRosePanel — session interaction", () => {
  it("starts simulation, parses items, and shows data table", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Gilded Rose", { selector: "button[role='tab']" }));

    mockFetch
      .mockReturnValueOnce(jsonResponse({ sessionId: "abc-123", day: 0 }))
      .mockReturnValueOnce(
        jsonResponse({
          output:
            "Aged Brie (Aged) — SellIn: 2, Quality: 0\nElixir of the Mongoose (Normal) — SellIn: 5, Quality: 7",
          day: 0,
        })
      );
    fireEvent.click(screen.getByText("Start Simulation"));

    await waitFor(() => {
      expect(screen.getByText("Aged Brie")).toBeInTheDocument();
      expect(screen.getByText("Elixir of the Mongoose")).toBeInTheDocument();
    });
  });

  it("end session calls DELETE and resets to start form", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Gilded Rose", { selector: "button[role='tab']" }));

    mockFetch
      .mockReturnValueOnce(jsonResponse({ sessionId: "abc-123", day: 0 }))
      .mockReturnValueOnce(
        jsonResponse({
          output: "Aged Brie (Aged) — SellIn: 2, Quality: 0",
          day: 0,
        })
      );
    fireEvent.click(screen.getByText("Start Simulation"));

    await waitFor(() => {
      expect(screen.getByText("End")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("End"));

    await waitFor(() => {
      expect(screen.getByText("Start Simulation")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/exercises/gilded-rose/abc-123",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

// ── OnScreenKeyboardPanel — visualizer controls ─────────────────────

describe("OnScreenKeyboardPanel — visualizer controls", () => {
  function goToOSK() {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(
      screen.getByText("On-Screen Keyboard", {
        selector: "button[role='tab']",
      })
    );
  }

  const OSK_OUTPUT = "D,R,R,R,#,S,U,L,L,L,#";

  async function runSpellIt() {
    goToOSK();
    mockFetch.mockReturnValueOnce(jsonResponse({ output: OSK_OUTPUT }));
    fireEvent.click(screen.getByText("Spell It"));
    await waitFor(() => {
      expect(screen.getByText("Raw output")).toBeInTheDocument();
    });
  }

  it("visualizer appears after successful run", async () => {
    await runSpellIt();
    expect(screen.getByText("Output:")).toBeInTheDocument();
    expect(screen.getByTitle("Play")).toBeInTheDocument();
  });

  it("raw output collapsible exists", async () => {
    await runSpellIt();
    const summary = screen.getByText("Raw output");
    expect(summary).toBeInTheDocument();
    expect(summary.tagName).toBe("SUMMARY");
  });

  it("play button exists", async () => {
    await runSpellIt();
    expect(screen.getByTitle("Play")).toBeInTheDocument();
  });

  it("reset button exists", async () => {
    await runSpellIt();
    expect(screen.getByTitle("Reset")).toBeInTheDocument();
  });

  it("step back and step forward controls exist", async () => {
    await runSpellIt();
    expect(screen.getByTitle("Step back")).toBeInTheDocument();
    expect(screen.getByTitle("Step forward")).toBeInTheDocument();
  });

  it("speed buttons exist (0.5x, 1x, 2x, 5x)", async () => {
    await runSpellIt();
    expect(screen.getByText("0.5x")).toBeInTheDocument();
    expect(screen.getByText("1x")).toBeInTheDocument();
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("5x")).toBeInTheDocument();
  });

  it("step counter shows 0/N initially", async () => {
    await runSpellIt();
    // OSK_OUTPUT has 11 moves → 12 steps (including start), so 0/11
    expect(screen.getByText("0/11")).toBeInTheDocument();
  });

  it("move indicator shows 'Cursor at A — ready' at start", async () => {
    await runSpellIt();
    expect(screen.getByText(/Cursor at A — ready/)).toBeInTheDocument();
  });

  it("empty input is not submitted", () => {
    goToOSK();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "" } });
    mockFetch.mockClear();
    fireEvent.click(screen.getByText("Spell It"));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows loading state while spelling", async () => {
    goToOSK();
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByText("Spell It"));
    await waitFor(() => {
      const btn = screen.getByText("Spelling...");
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });
  });

  it("displays error on API failure", async () => {
    goToOSK();
    mockFetch.mockReturnValueOnce(jsonResponse({ error: "backend exploded" }, 500));
    fireEvent.click(screen.getByText("Spell It"));
    await waitFor(() => {
      expect(screen.getByText("backend exploded")).toBeInTheDocument();
    });
  });
});

// ── GildedRosePanel — simulation details ────────────────────────────

describe("GildedRosePanel — simulation details", () => {
  function goToGR() {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Gilded Rose", { selector: "button[role='tab']" }));
  }

  const LIST_DAY0_OUTPUT =
    "Aged Brie (Aged) — SellIn: 2, Quality: 0\nElixir (Normal) — SellIn: 5, Quality: 7";

  const LIST_DAY1_OUTPUT =
    "Aged Brie (Aged) — SellIn: 1, Quality: 1\nElixir (Normal) — SellIn: 4, Quality: 6";

  function mockStartSession() {
    mockFetch
      .mockReturnValueOnce(jsonResponse({ sessionId: "test-1", day: 0 }))
      .mockReturnValueOnce(jsonResponse({ output: LIST_DAY0_OUTPUT, day: 0 }));
  }

  it("default inventory textarea is pre-filled with 5 items", () => {
    goToGR();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Aged Brie,Aged,2,0");
    expect(textarea.value).toContain("Elixir of the Mongoose,Normal,5,7");
    expect(textarea.value).toContain("Sulfuras Hand of Ragnaros,Legendary,0,80");
    expect(textarea.value).toContain("Backstage passes");
    expect(textarea.value).toContain("Conjured Mana Cake,Conjured,3,6");
  });

  it("category rules box is visible with all 5 categories", () => {
    goToGR();
    expect(screen.getByText("Category Rules")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Aged")).toBeInTheDocument();
    expect(screen.getByText("Legendary")).toBeInTheDocument();
    expect(screen.getByText("BackstagePass")).toBeInTheDocument();
    expect(screen.getByText("Conjured")).toBeInTheDocument();
  });

  it("CSV label is visible", () => {
    goToGR();
    expect(screen.getByText(/Inventory CSV — one item per line/)).toBeInTheDocument();
  });

  it("start button is disabled and shows 'Starting...' during loading", async () => {
    goToGR();
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByText("Start Simulation"));
    await waitFor(() => {
      const btn = screen.getByText("Starting...");
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });
  });

  it("day counter updates after next day", async () => {
    goToGR();
    mockStartSession();
    fireEvent.click(screen.getByText("Start Simulation"));

    await waitFor(() => {
      expect(screen.getByText("Day 0")).toBeInTheDocument();
    });

    // Mock Next Day: command "next" then command "list"
    mockFetch
      .mockReturnValueOnce(jsonResponse({ output: "advanced", day: 1 }))
      .mockReturnValueOnce(jsonResponse({ output: LIST_DAY1_OUTPUT, day: 1 }));

    fireEvent.click(screen.getByText(/Next Day/));

    await waitFor(() => {
      expect(screen.getByText("Day 1")).toBeInTheDocument();
    });
  });

  it("end button is visible during session", async () => {
    goToGR();
    mockStartSession();
    fireEvent.click(screen.getByText("Start Simulation"));

    await waitFor(() => {
      expect(screen.getByText("End")).toBeInTheDocument();
    });
  });

  it("shows 'Advancing...' state on next day click", async () => {
    goToGR();
    mockStartSession();
    fireEvent.click(screen.getByText("Start Simulation"));

    await waitFor(() => {
      expect(screen.getByText(/Next Day/)).toBeInTheDocument();
    });

    // Mock a pending promise so advancing state stays visible
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByText(/Next Day/));

    await waitFor(() => {
      expect(screen.getByText("Advancing...")).toBeInTheDocument();
    });
  });

  it("displays error during session on command failure", async () => {
    goToGR();
    mockStartSession();
    fireEvent.click(screen.getByText("Start Simulation"));

    await waitFor(() => {
      expect(screen.getByText(/Next Day/)).toBeInTheDocument();
    });

    mockFetch.mockReturnValueOnce(jsonResponse({ error: "session expired" }, 500));
    fireEvent.click(screen.getByText(/Next Day/));

    await waitFor(() => {
      expect(screen.getByText("session expired")).toBeInTheDocument();
    });
  });

  it("next day button shows arrow text", async () => {
    goToGR();
    mockStartSession();
    fireEvent.click(screen.getByText("Start Simulation"));

    await waitFor(() => {
      expect(screen.getByText(/Next Day \u2192/)).toBeInTheDocument();
    });
  });
});

// ── Exercise panels — error and network failure ─────────────────────

describe("Exercise panels — edge cases", () => {
  it("handles network failure gracefully", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Cash Register", { selector: "button[role='tab']" }));
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("disables button while loading", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Cash Register", { selector: "button[role='tab']" }));

    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("Calculating...")).toBeInTheDocument();
      expect(screen.getByText("Calculating...")).toBeDisabled();
    });
  });

  it("does not submit empty input", () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Missing Number", { selector: "button[role='tab']" }));

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "" } });

    // Reset mock to track only new calls
    mockFetch.mockClear();
    fireEvent.click(screen.getByText("Find It"));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── CashRegisterPanel — structured input ────────────────────────────

describe("CashRegisterPanel — structured input", () => {
  function goToCashRegister() {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Cash Register", { selector: "button[role='tab']" }));
  }

  // Helper to get owed/paid inputs by their labels
  function getOwedInput(): HTMLInputElement {
    const labels = screen.getAllByText("Owed");
    const label = labels.find((el) => el.tagName === "LABEL");
    // The input is a sibling inside the same parent group
    const group = label!.closest("div")!;
    return group.querySelector("input[type='number']") as HTMLInputElement;
  }

  function getPaidInput(): HTMLInputElement {
    const labels = screen.getAllByText("Paid");
    const label = labels.find((el) => el.tagName === "LABEL");
    const group = label!.closest("div")!;
    return group.querySelector("input[type='number']") as HTMLInputElement;
  }

  // ── Transaction list defaults ──

  it("pre-loads 3 default transactions", () => {
    goToCashRegister();
    expect(screen.getByText("$2.12")).toBeInTheDocument();
    expect(screen.getByText("$3.00")).toBeInTheDocument();
    expect(screen.getByText("$1.97")).toBeInTheDocument();
    expect(screen.getByText("$2.00")).toBeInTheDocument();
    expect(screen.getByText("$3.33")).toBeInTheDocument();
    expect(screen.getByText("$5.00")).toBeInTheDocument();
  });

  it("shows transaction count badge with correct count", () => {
    goToCashRegister();
    // The count badge shows "3" for the 3 default transactions
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
  });

  it("shows correct change due for each default transaction", () => {
    goToCashRegister();
    // $3.00 - $2.12 = $0.88, $2.00 - $1.97 = $0.03, $5.00 - $3.33 = $1.67
    expect(screen.getByText("$0.88 change")).toBeInTheDocument();
    expect(screen.getByText("$0.03 change")).toBeInTheDocument();
    expect(screen.getByText("$1.67 change")).toBeInTheDocument();
  });

  // ── Add transaction ──

  it("adds a transaction when owed and paid are filled and Add is clicked", () => {
    goToCashRegister();
    const owedInput = getOwedInput();
    const paidInput = getPaidInput();

    fireEvent.change(owedInput, { target: { value: "4.50" } });
    fireEvent.change(paidInput, { target: { value: "5.00" } });
    fireEvent.click(screen.getByText("+ Add"));

    // New transaction should appear
    expect(screen.getByText("$4.50")).toBeInTheDocument();
    // Count badge should update to 4
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("clears inputs after adding a transaction", () => {
    goToCashRegister();
    const owedInput = getOwedInput();
    const paidInput = getPaidInput();

    fireEvent.change(owedInput, { target: { value: "1.00" } });
    fireEvent.change(paidInput, { target: { value: "2.00" } });
    fireEvent.click(screen.getByText("+ Add"));

    expect(owedInput.value).toBe("");
    expect(paidInput.value).toBe("");
  });

  it("formats added transaction amounts to 2 decimal places", () => {
    goToCashRegister();
    const owedInput = getOwedInput();
    const paidInput = getPaidInput();

    fireEvent.change(owedInput, { target: { value: "1.5" } });
    fireEvent.change(paidInput, { target: { value: "2" } });
    fireEvent.click(screen.getByText("+ Add"));

    expect(screen.getByText("$1.50")).toBeInTheDocument();
  });

  // ── Remove transaction ──

  it("removes a transaction when × button is clicked", () => {
    goToCashRegister();
    const removeBtns = screen.getAllByLabelText("Remove transaction");
    expect(removeBtns).toHaveLength(3);

    // Remove first transaction ($2.12 -> $3.00)
    fireEvent.click(removeBtns[0]);

    expect(screen.queryByText("$2.12")).not.toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // count updates
  });

  it("removes correct transaction when middle × is clicked", () => {
    goToCashRegister();
    const removeBtns = screen.getAllByLabelText("Remove transaction");

    // Remove middle transaction ($1.97 -> $2.00)
    fireEvent.click(removeBtns[1]);

    expect(screen.getByText("$2.12")).toBeInTheDocument(); // first still there
    expect(screen.queryByText("$1.97")).not.toBeInTheDocument(); // middle gone
    expect(screen.getByText("$3.33")).toBeInTheDocument(); // last still there
  });

  it("hides transaction list when all transactions are removed", () => {
    goToCashRegister();
    const removeBtns = screen.getAllByLabelText("Remove transaction");

    // Remove all 3
    fireEvent.click(removeBtns[0]);
    fireEvent.click(screen.getAllByLabelText("Remove transaction")[0]);
    fireEvent.click(screen.getAllByLabelText("Remove transaction")[0]);

    expect(screen.queryByText("Transactions")).not.toBeInTheDocument();
  });

  // ── Add button disabled states ──

  it("Add button is disabled when owed is empty", () => {
    goToCashRegister();
    const paidInput = getPaidInput();
    fireEvent.change(paidInput, { target: { value: "5.00" } });

    expect(screen.getByText("+ Add")).toBeDisabled();
  });

  it("Add button is disabled when paid is empty", () => {
    goToCashRegister();
    const owedInput = getOwedInput();
    fireEvent.change(owedInput, { target: { value: "3.00" } });

    expect(screen.getByText("+ Add")).toBeDisabled();
  });

  it("Add button is disabled when both inputs are empty", () => {
    goToCashRegister();
    expect(screen.getByText("+ Add")).toBeDisabled();
  });

  it("Add button is disabled when paid < owed", () => {
    goToCashRegister();
    const owedInput = getOwedInput();
    const paidInput = getPaidInput();

    fireEvent.change(owedInput, { target: { value: "5.00" } });
    fireEvent.change(paidInput, { target: { value: "3.00" } });

    expect(screen.getByText("+ Add")).toBeDisabled();
  });

  it("Add button is enabled when paid >= owed", () => {
    goToCashRegister();
    const owedInput = getOwedInput();
    const paidInput = getPaidInput();

    fireEvent.change(owedInput, { target: { value: "3.00" } });
    fireEvent.change(paidInput, { target: { value: "5.00" } });

    expect(screen.getByText("+ Add")).not.toBeDisabled();
  });

  it("Add button is enabled when paid equals owed (exact change)", () => {
    goToCashRegister();
    const owedInput = getOwedInput();
    const paidInput = getPaidInput();

    fireEvent.change(owedInput, { target: { value: "3.00" } });
    fireEvent.change(paidInput, { target: { value: "3.00" } });

    expect(screen.getByText("+ Add")).not.toBeDisabled();
  });

  // ── Make Change disabled state ──

  it("Make Change is disabled when no transactions exist", () => {
    goToCashRegister();

    // Remove all default transactions
    const removeBtns = screen.getAllByLabelText("Remove transaction");
    fireEvent.click(removeBtns[0]);
    fireEvent.click(screen.getAllByLabelText("Remove transaction")[0]);
    fireEvent.click(screen.getAllByLabelText("Remove transaction")[0]);

    expect(screen.getByText("Make Change")).toBeDisabled();
  });

  it("Make Change is enabled when transactions exist", () => {
    goToCashRegister();
    expect(screen.getByText("Make Change")).not.toBeDisabled();
  });

  // ── Make Change API call ──

  it("sends correct payload to /api/exercises/cash-register", async () => {
    goToCashRegister();
    mockFetch.mockReturnValueOnce(
      jsonResponse({
        output:
          "3 quarters,1 dime,3 pennies\n3 pennies\n1 dollar,2 quarters,1 dime,1 nickel,2 pennies",
      })
    );

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/exercises/cash-register",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ input: "2.12,3.00\n1.97,2.00\n3.33,5.00" }),
        })
      );
    });
  });

  // ── Denomination chips after results ──

  it("shows denomination chips after successful run", async () => {
    goToCashRegister();
    mockFetch.mockReturnValueOnce(
      jsonResponse({
        output:
          "3 quarters,1 dime,3 pennies\n3 pennies\n1 dollar,2 quarters,1 dime,1 nickel,2 pennies",
      })
    );

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("3 quarters")).toBeInTheDocument();
      // "1 dime" appears in both first and third transaction rows
      expect(screen.getAllByText("1 dime")).toHaveLength(2);
      expect(screen.getByText("1 dollar")).toBeInTheDocument();
      expect(screen.getByText("2 quarters")).toBeInTheDocument();
      expect(screen.getByText("1 nickel")).toBeInTheDocument();
      expect(screen.getByText("2 pennies")).toBeInTheDocument();
    });
  });

  it("shows chips for each transaction row independently", async () => {
    goToCashRegister();
    mockFetch.mockReturnValueOnce(
      jsonResponse({
        output:
          "3 quarters,1 dime,3 pennies\n3 pennies\n1 dollar,2 quarters,1 dime,1 nickel,2 pennies",
      })
    );

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      // Second transaction should just have "3 pennies"
      // Verify all expected chips exist (they appear in different rows)
      const chipTexts = screen.getAllByText(/pennies/).map((el) => el.textContent);
      expect(chipTexts).toContain("3 pennies");
      expect(chipTexts).toContain("2 pennies");
    });
  });

  // ── Remove buttons hidden after results ──

  it("hides remove buttons after results are shown", async () => {
    goToCashRegister();
    expect(screen.getAllByLabelText("Remove transaction")).toHaveLength(3);

    mockFetch.mockReturnValueOnce(jsonResponse({ output: "3 quarters\n3 pennies\n1 dollar" }));

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("3 quarters")).toBeInTheDocument();
    });

    expect(screen.queryAllByLabelText("Remove transaction")).toHaveLength(0);
  });

  // ── Clear All ──

  it("Clear All button is not visible before results", () => {
    goToCashRegister();
    expect(screen.queryByText("Clear All")).not.toBeInTheDocument();
  });

  it("Clear All button appears after results", async () => {
    goToCashRegister();
    mockFetch.mockReturnValueOnce(jsonResponse({ output: "3 quarters\n3 pennies\n1 dollar" }));

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("Clear All")).toBeInTheDocument();
    });
  });

  it("clicking Clear All empties the transaction list", async () => {
    goToCashRegister();
    mockFetch.mockReturnValueOnce(jsonResponse({ output: "3 quarters\n3 pennies\n1 dollar" }));

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("Clear All")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Clear All"));

    // Transaction list should be gone
    expect(screen.queryByText("Transactions")).not.toBeInTheDocument();
    expect(screen.queryByText("$2.12")).not.toBeInTheDocument();
    expect(screen.queryByText("$3.00")).not.toBeInTheDocument();
  });

  it("Make Change is disabled after Clear All empties the list", async () => {
    goToCashRegister();
    mockFetch.mockReturnValueOnce(jsonResponse({ output: "3 quarters\n3 pennies\n1 dollar" }));

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("Clear All")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Clear All"));

    expect(screen.getByText("Make Change")).toBeDisabled();
  });

  // ── Change due calculation ──

  it("shows $0.00 change when paid equals owed", () => {
    goToCashRegister();

    // Remove all defaults, add exact change transaction
    const removeBtns = screen.getAllByLabelText("Remove transaction");
    fireEvent.click(removeBtns[0]);
    fireEvent.click(screen.getAllByLabelText("Remove transaction")[0]);
    fireEvent.click(screen.getAllByLabelText("Remove transaction")[0]);

    const owedInput = getOwedInput();
    const paidInput = getPaidInput();
    fireEvent.change(owedInput, { target: { value: "5.00" } });
    fireEvent.change(paidInput, { target: { value: "5.00" } });
    fireEvent.click(screen.getByText("+ Add"));

    expect(screen.getByText("$0.00 change")).toBeInTheDocument();
  });

  // ── Error handling ──

  it("shows error message on API failure", async () => {
    goToCashRegister();
    mockFetch.mockRejectedValueOnce(new Error("Server exploded"));

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("Server exploded")).toBeInTheDocument();
    });
  });
});
