# OnScreenKeyboard

A Python solution for scripting cursor paths on a grid-based on-screen keyboard.

## Approach

Builds a coordinate index from the keyboard layout, then computes the Manhattan distance path (U/D/L/R) between successive characters. The layout is data, not code. Swapping to a different keyboard arrangement means changing a single list.

## Structure

```
keyboard.py          # Layout definition + coordinate indexing
navigator.py         # Cursor movement + path scripting
main.py              # CLI driver: file I/O only
tests/
  test_keyboard.py   # 24 tests: layout structure, coordinate mapping, custom layouts, duplicate detection
  test_navigator.py  # 50 tests: movement, paths, spaces, edges, errors, custom layouts
```

## Run

```sh
# requires python 3.10+, pytest
make run
# or
python3 main.py input.txt
```

## Test

```sh
make test
```

74 tests covering the sample input, every letter and digit individually, all four corners, diagonal traversals, space handling (leading/trailing/multiple/cursor preservation), case insensitivity, repeated characters, mixed alpha-numeric, manhattan distance correctness verification, custom layout support, empty input, and error paths for invalid characters.

## Design Considerations

- **Layout as data**: The keyboard grid is a plain list of strings, no hardcoded positions. Changing from alphanumeric to any other layout is a one-line change. The `build_index` function dynamically maps characters to coordinates from any grid shape.
- **Separation of concerns**: `keyboard.py` owns the layout, `navigator.py` owns the movement logic, `main.py` is pure I/O. Each has a single reason to change.
- **Input flexibility**: The core functions accept strings and dicts. The file-reading is only in `main.py`. Switching from file to stream means changing only the driver, not the logic.
