// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App.js";

// Mock fetch globally
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

function _noContentResponse() {
  return Promise.resolve({
    ok: true,
    status: 204,
    json: () => Promise.reject(new Error("no content")),
  });
}

// Helper: mock initial data loads for ReviewsPanel (users, restaurants, reviews)
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

// ── App Shell ────────────────────────────────────────────────────────

describe("App", () => {
  it("renders the header", () => {
    mockInitialLoads();
    render(<App />);
    expect(screen.getByText("TrueFit Code Challenge")).toBeInTheDocument();
  });

  it("renders tab navigation", () => {
    mockInitialLoads();
    render(<App />);
    expect(screen.getByText("Overview", { selector: "button[role='tab']" })).toBeInTheDocument();
    expect(screen.getByText("Cash Register", { selector: "button[role='tab']" })).toBeInTheDocument();
    expect(screen.getByText("Missing Number", { selector: "button[role='tab']" })).toBeInTheDocument();
    expect(screen.getByText("Morse Code", { selector: "button[role='tab']" })).toBeInTheDocument();
    expect(screen.getByText("On-Screen Keyboard", { selector: "button[role='tab']" })).toBeInTheDocument();
    expect(screen.getByText("Gilded Rose", { selector: "button[role='tab']" })).toBeInTheDocument();
    expect(screen.getByText("Restaurant Reviews", { selector: "button[role='tab']" })).toBeInTheDocument();
  });

  it("shows Overview panel by default", () => {
    mockInitialLoads();
    render(<App />);
    expect(screen.getByText("Overview", { selector: "h2" })).toBeInTheDocument();
  });

  it("switches to Cash Register panel", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Cash Register", { selector: "button[role='tab']" }));
    expect(screen.getByText("Cash Register", { selector: "h2" })).toBeInTheDocument();
  });

  it("switches to Missing Number panel", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Missing Number", { selector: "button[role='tab']" }));
    expect(screen.getByText("Missing Number", { selector: "h2" })).toBeInTheDocument();
  });

  it("switches to Morse Code panel", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Morse Code", { selector: "button[role='tab']" }));
    expect(screen.getByText("Morse Code", { selector: "h2" })).toBeInTheDocument();
  });

  it("switches to On-Screen Keyboard panel", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("On-Screen Keyboard", { selector: "button[role='tab']" }));
    expect(screen.getByText("On-Screen Keyboard", { selector: "h2" })).toBeInTheDocument();
  });

  it("switches to Gilded Rose panel", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Gilded Rose", { selector: "button[role='tab']" }));
    expect(screen.getByText("Gilded Rose", { selector: "h2" })).toBeInTheDocument();
  });
});

// ── Exercise Panels ──────────────────────────────────────────────────

describe("CashRegisterPanel", () => {
  it("renders structured inputs and Make Change button", () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Cash Register", { selector: "button[role='tab']" }));
    // Has dollar amount inputs and the action button
    expect(screen.getByText("Make Change")).toBeInTheDocument();
    expect(screen.getByText("+ Add")).toBeInTheDocument();
    // Default transactions are pre-loaded
    expect(screen.getByText("$2.12")).toBeInTheDocument();
  });

  it("displays parsed change output on successful run", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Cash Register", { selector: "button[role='tab']" }));
    mockFetch.mockReturnValueOnce(
      jsonResponse({
        output: "3 quarters,1 dime,3 pennies\n3 pennies\n1 dollar,1 quarter,4 dimes,2 pennies",
      })
    );

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("3 quarters")).toBeInTheDocument();
      expect(screen.getByText("1 dime")).toBeInTheDocument();
    });
  });

  it("displays error on failure", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Cash Register", { selector: "button[role='tab']" }));
    mockFetch.mockReturnValueOnce(jsonResponse({ error: "exercise failed" }, 422));

    fireEvent.click(screen.getByText("Make Change"));

    await waitFor(() => {
      expect(screen.getByText("exercise failed")).toBeInTheDocument();
    });
  });
});

describe("MissingNumberPanel", () => {
  it("renders and runs", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Missing Number", { selector: "button[role='tab']" }));
    mockFetch.mockReturnValueOnce(jsonResponse({ output: "3" }));

    fireEvent.click(screen.getByText("Find It"));

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });
});

describe("MorseCodePanel", () => {
  it("has Text to Morse / Morse to Text toggle", () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Morse Code", { selector: "button[role='tab']" }));
    expect(screen.getByText("Text to Morse")).toBeInTheDocument();
    expect(screen.getByText("Morse to Text")).toBeInTheDocument();
  });

  it("converts text to morse", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Morse Code", { selector: "button[role='tab']" }));
    mockFetch.mockReturnValueOnce(jsonResponse({ output: ".... . .-.. .-.. ---" }));

    const textarea = screen.getByPlaceholderText("HELLO WORLD");
    await userEvent.type(textarea, "HELLO");
    fireEvent.click(screen.getByText("Convert"));

    await waitFor(() => {
      expect(screen.getByText(".... . .-.. .-.. ---")).toBeInTheDocument();
    });
  });

  it("switches to decode mode", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Morse Code", { selector: "button[role='tab']" }));
    fireEvent.click(screen.getByText("Morse to Text"));
    expect(screen.getByPlaceholderText(/\.\.\.\./)).toBeInTheDocument();
  });
});

describe("OnScreenKeyboardPanel", () => {
  it("renders and runs", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("On-Screen Keyboard", { selector: "button[role='tab']" }));
    mockFetch.mockReturnValueOnce(jsonResponse({ output: "D,R,R,R,S,U,L,L,L,S" }));

    fireEvent.click(screen.getByText("Spell It"));

    await waitFor(() => {
      expect(screen.getByText("D,R,R,R,S,U,L,L,L,S")).toBeInTheDocument();
    });
  });
});

describe("GildedRosePanel", () => {
  it("renders start simulation form", () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Gilded Rose", { selector: "button[role='tab']" }));
    expect(screen.getByText("Start Simulation")).toBeInTheDocument();
  });

  it("starts a session and shows day controls", async () => {
    mockInitialLoads();
    render(<App />);
    fireEvent.click(screen.getByText("Gilded Rose", { selector: "button[role='tab']" }));
    mockFetch
      .mockReturnValueOnce(jsonResponse({ sessionId: "test-123", day: 0 }))
      .mockReturnValueOnce(
        jsonResponse({
          output: "Aged Brie (Aged) — SellIn: 2, Quality: 0",
          day: 0,
        })
      );

    fireEvent.click(screen.getByText("Start Simulation"));

    await waitFor(() => {
      expect(screen.getByText("Day 0")).toBeInTheDocument();
      expect(screen.getByText(/Next Day/)).toBeInTheDocument();
    });
  });
});

// ── Reviews Panel ────────────────────────────────────────────────────

/** Navigate from Overview to Restaurant Reviews tab */
function goToReviews() {
  fireEvent.click(screen.getByText("Restaurant Reviews", { selector: "button[role='tab']" }));
}

describe("ReviewsPanel", () => {
  it("renders user creation form", () => {
    mockInitialLoads();
    render(<App />);
    goToReviews();
    expect(screen.getAllByPlaceholderText("Name").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByText("Create User")).toBeInTheDocument();
  });

  it("renders restaurant creation form", () => {
    mockInitialLoads();
    render(<App />);
    goToReviews();
    expect(screen.getByPlaceholderText("City")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Cuisine (optional)")).toBeInTheDocument();
  });

  it("creates a user and refreshes table", async () => {
    const newUser = {
      id: 1,
      name: "Alice",
      email: "alice@example.com",
      blocked: 0,
      created_at: "2024-01-01",
    };
    mockInitialLoads();
    render(<App />);
    goToReviews();

    // Wait for initial load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/users", expect.any(Object));
    });

    // Now mock the create call followed by refresh calls
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST" && url === "/api/users") return jsonResponse(newUser, 201);
      if (url === "/api/users") return jsonResponse([newUser]);
      if (url === "/api/restaurants") return jsonResponse([]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({ error: "not found" }, 404);
    });

    await userEvent.type(screen.getAllByPlaceholderText("Name")[0], "Alice");
    await userEvent.type(screen.getByPlaceholderText("Email"), "alice@example.com");
    fireEvent.click(screen.getByText("Create User"));

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
  });

  it("displays error when user creation fails", async () => {
    mockInitialLoads();
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") return jsonResponse({ error: "email already exists" }, 409);
      if (url === "/api/users") return jsonResponse([]);
      if (url === "/api/restaurants") return jsonResponse([]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({}, 200);
    });

    await userEvent.type(screen.getAllByPlaceholderText("Name")[0], "Alice");
    await userEvent.type(screen.getByPlaceholderText("Email"), "dup@example.com");
    fireEvent.click(screen.getByText("Create User"));

    await waitFor(() => {
      expect(screen.getByText("email already exists")).toBeInTheDocument();
    });
  });

  it("creates a restaurant", async () => {
    const newRestaurant = {
      id: 1,
      name: "Pizza Palace",
      city: "Pittsburgh",
      cuisine: "Italian",
      created_at: "2024-01-01",
    };
    mockInitialLoads();
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST" && url === "/api/restaurants")
        return jsonResponse(newRestaurant, 201);
      if (url === "/api/users") return jsonResponse([]);
      if (url === "/api/restaurants") return jsonResponse([newRestaurant]);
      if (url === "/api/reviews") return jsonResponse([]);
      return jsonResponse({}, 200);
    });

    // Second "Name" input is the restaurant one
    const nameInputs = screen.getAllByPlaceholderText("Name");
    await userEvent.type(nameInputs[1], "Pizza Palace");
    await userEvent.type(screen.getByPlaceholderText("City"), "Pittsburgh");
    await userEvent.type(screen.getByPlaceholderText("Cuisine (optional)"), "Italian");

    // "Create" buttons: [restaurant section, review section]
    const createBtns = screen.getAllByText("Create");
    fireEvent.click(createBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("Pizza Palace")).toBeInTheDocument();
    });
  });

  it("shows data tables on mount", async () => {
    mockInitialLoads(
      [
        {
          id: 1,
          name: "Alice",
          email: "alice@example.com",
          blocked: 0,
          created_at: "2024-01-01",
        },
      ],
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
      // Alice appears in user table + review table
      expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
      // Pizza Palace appears in restaurant table + review table
      expect(screen.getAllByText("Pizza Palace").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Amazing!")).toBeInTheDocument();
    });
  });

  it("renders review table with names instead of IDs", async () => {
    mockInitialLoads(
      [],
      [],
      [
        {
          id: 1,
          user_id: 1,
          restaurant_id: 1,
          rating: 4,
          body: "Good",
          user_name: "Bob",
          restaurant_name: "Taco Stand",
          created_at: "2024-01-01",
        },
      ]
    );
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Taco Stand")).toBeInTheDocument();
    });
  });

  it("filters restaurants by city client-side", async () => {
    mockInitialLoads(
      [],
      [
        {
          id: 1,
          name: "Place A",
          city: "Pittsburgh",
          cuisine: "",
          created_at: "2024-01-01",
        },
        {
          id: 2,
          name: "Place B",
          city: "Philadelphia",
          cuisine: "",
          created_at: "2024-01-01",
        },
      ]
    );
    render(<App />);
    goToReviews();

    await waitFor(() => {
      expect(screen.getByText("Place A")).toBeInTheDocument();
      expect(screen.getByText("Place B")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText("Filter by city..."), "Pitt");

    expect(screen.getByText("Place A")).toBeInTheDocument();
    expect(screen.queryByText("Place B")).not.toBeInTheDocument();
  });
});
