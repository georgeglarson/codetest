"""Tests for cursor navigation and path scripting."""

import pytest
from keyboard import DEFAULT_LAYOUT, build_index
from navigator import navigate, script_path, format_path


# ============================================================
# navigate() — low-level movement between coordinates
# ============================================================


class TestNavigate:
    """Test raw cursor movement between grid positions."""

    def test_same_position_no_moves(self):
        assert navigate((0, 0), (0, 0)) == []

    def test_move_right(self):
        assert navigate((0, 0), (0, 3)) == ["R", "R", "R"]

    def test_move_left(self):
        assert navigate((0, 3), (0, 0)) == ["L", "L", "L"]

    def test_move_down(self):
        assert navigate((0, 0), (3, 0)) == ["D", "D", "D"]

    def test_move_up(self):
        assert navigate((3, 0), (0, 0)) == ["U", "U", "U"]

    def test_diagonal_down_right(self):
        moves = navigate((0, 0), (2, 3))
        assert moves.count("D") == 2
        assert moves.count("R") == 3
        assert len(moves) == 5

    def test_diagonal_up_left(self):
        moves = navigate((2, 3), (0, 0))
        assert moves.count("U") == 2
        assert moves.count("L") == 3
        assert len(moves) == 5

    def test_diagonal_down_left(self):
        moves = navigate((0, 5), (3, 0))
        assert moves.count("D") == 3
        assert moves.count("L") == 5
        assert len(moves) == 8

    def test_diagonal_up_right(self):
        moves = navigate((5, 0), (0, 5))
        assert moves.count("U") == 5
        assert moves.count("R") == 5
        assert len(moves) == 10

    def test_single_step_right(self):
        assert navigate((0, 0), (0, 1)) == ["R"]

    def test_single_step_down(self):
        assert navigate((0, 0), (1, 0)) == ["D"]

    def test_single_step_left(self):
        assert navigate((0, 1), (0, 0)) == ["L"]

    def test_single_step_up(self):
        assert navigate((1, 0), (0, 0)) == ["U"]

    def test_vertical_only_contains_no_horizontal(self):
        moves = navigate((0, 2), (4, 2))
        assert all(m in ("U", "D") for m in moves)

    def test_horizontal_only_contains_no_vertical(self):
        moves = navigate((3, 0), (3, 5))
        assert all(m in ("L", "R") for m in moves)

    def test_corner_to_corner_bottom_left_to_top_right(self):
        moves = navigate((5, 0), (0, 5))
        assert moves.count("U") == 5
        assert moves.count("R") == 5

    def test_corner_to_corner_top_right_to_bottom_left(self):
        moves = navigate((0, 5), (5, 0))
        assert moves.count("D") == 5
        assert moves.count("L") == 5

    def test_vertical_first_then_horizontal_down_right(self):
        """Movement order is always vertical before horizontal."""
        moves = navigate((0, 0), (2, 3))
        assert moves == ["D", "D", "R", "R", "R"]

    def test_vertical_first_then_horizontal_up_left(self):
        """Movement order is always vertical before horizontal."""
        moves = navigate((3, 4), (1, 1))
        assert moves == ["U", "U", "L", "L", "L"]

    def test_vertical_first_then_horizontal_down_left(self):
        moves = navigate((0, 5), (3, 0))
        assert moves == ["D", "D", "D", "L", "L", "L", "L", "L"]

    def test_vertical_first_then_horizontal_up_right(self):
        moves = navigate((4, 1), (1, 4))
        assert moves == ["U", "U", "U", "R", "R", "R"]


# ============================================================
# script_path() — full path scripting
# ============================================================


class TestScriptPath:
    """Test end-to-end path generation for input strings."""

    @pytest.fixture
    def index(self):
        return build_index(DEFAULT_LAYOUT)

    # --- Sample from problem statement ---

    def test_sample_it_crowd(self, index):
        path = script_path("IT Crowd", index)
        expected = "D,R,R,#,D,D,L,#,S,U,U,U,R,#,D,D,R,R,R,#,L,L,L,#,D,R,R,#,U,U,U,L,#"
        assert format_path(path) == expected

    # --- Single characters ---

    def test_single_A_from_origin(self, index):
        path = script_path("A", index)
        assert path == ["#"]

    def test_single_F_top_right(self, index):
        path = script_path("F", index)
        assert path == ["R", "R", "R", "R", "R", "#"]

    def test_single_5_bottom_left(self, index):
        path = script_path("5", index)
        assert path == ["D", "D", "D", "D", "D", "#"]

    def test_single_0_bottom_right(self, index):
        path = script_path("0", index)
        assert path == ["D", "D", "D", "D", "D", "R", "R", "R", "R", "R", "#"]

    # --- Spaces ---

    def test_space_produces_S(self, index):
        path = script_path("A B", index)
        # A at origin: #, space: S, B at (0,1): R,#
        assert path == ["#", "S", "R", "#"]

    def test_multiple_spaces(self, index):
        path = script_path("A  B", index)
        assert path == ["#", "S", "S", "R", "#"]

    def test_leading_space(self, index):
        path = script_path(" A", index)
        assert path == ["S", "#"]

    def test_trailing_space(self, index):
        path = script_path("A ", index)
        assert path == ["#", "S"]

    # --- Space does not move cursor ---

    def test_cursor_unchanged_after_space(self, index):
        # "A A" — select A, space, select A again (already there)
        path = script_path("A A", index)
        assert path == ["#", "S", "#"]

    # --- Case insensitivity ---

    def test_lowercase_input(self, index):
        path_lower = script_path("dog", index)
        path_upper = script_path("DOG", index)
        assert path_lower == path_upper

    def test_mixed_case(self, index):
        path = script_path("Ab", index)
        assert path == ["#", "R", "#"]

    # --- Repeated character ---

    def test_same_char_twice(self, index):
        path = script_path("AA", index)
        assert path == ["#", "#"]

    def test_same_char_three_times(self, index):
        path = script_path("BBB", index)
        # B is at (0,1): first R,# then #,#
        assert path == ["R", "#", "#", "#"]

    # --- Digits ---

    def test_digits(self, index):
        path = script_path("123", index)
        # 1=(4,2) 2=(4,3) 3=(4,4)
        assert path == [
            "D", "D", "D", "D", "R", "R", "#",  # 1
            "R", "#",  # 2
            "R", "#",  # 3
        ]

    def test_zero(self, index):
        path = script_path("0", index)
        assert path == ["D", "D", "D", "D", "D", "R", "R", "R", "R", "R", "#"]

    # --- Mixed alpha and numeric ---

    def test_alpha_then_digit(self, index):
        path = script_path("A1", index)
        # A=(0,0), 1=(4,2)
        assert path == ["#", "D", "D", "D", "D", "R", "R", "#"]

    # --- Path always starts from A (0,0) ---

    def test_cursor_resets_per_call(self, index):
        path1 = script_path("Z", index)
        path2 = script_path("Z", index)
        assert path1 == path2  # Both start from A

    # --- Traversal patterns ---

    def test_top_left_to_bottom_right(self, index):
        path = script_path("A0", index)
        # A=#, 0=(5,5): D*5 R*5 #
        assert path == ["#"] + ["D"] * 5 + ["R"] * 5 + ["#"]

    def test_bottom_right_to_top_left(self, index):
        path = script_path("0A", index)
        # 0=(5,5): D*5 R*5 #, A=(0,0): U*5 L*5 #
        assert path == ["D"] * 5 + ["R"] * 5 + ["#"] + ["U"] * 5 + ["L"] * 5 + ["#"]

    def test_zigzag_across_rows(self, index):
        path = script_path("AF", index)
        # A=#, F=(0,5): R*5 #
        assert path == ["#"] + ["R"] * 5 + ["#"]

    def test_zigzag_down_columns(self, index):
        path = script_path("A5", index)
        # A=#, 5=(5,0): D*5 #
        assert path == ["#"] + ["D"] * 5 + ["#"]

    # --- Every letter in sequence ---

    def test_every_letter_produces_valid_path(self, index):
        for char in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            path = script_path(char, index)
            assert path[-1] == "#", f"path for {char} must end with #"
            assert all(m in ("U", "D", "L", "R", "#") for m in path)

    # --- Every digit ---

    def test_every_digit_produces_valid_path(self, index):
        for digit in "0123456789":
            path = script_path(digit, index)
            assert path[-1] == "#", f"path for {digit} must end with #"
            assert all(m in ("U", "D", "L", "R", "#") for m in path)

    # --- Path length correctness (manhattan distance + selects) ---

    def test_path_length_equals_manhattan_plus_selects(self, index):
        """For any input, total moves = sum of manhattan distances + one # per char."""
        text = "IT CROWD"
        path = script_path(text, index)
        selects = path.count("#")
        spaces = path.count("S")
        moves = len(path) - selects - spaces

        # Count expected manhattan distance
        cursor = (0, 0)
        expected_moves = 0
        chars_on_keyboard = 0
        for char in text.upper():
            if char == " ":
                continue
            target = index[char]
            expected_moves += abs(target[0] - cursor[0]) + abs(target[1] - cursor[1])
            cursor = target
            chars_on_keyboard += 1

        assert moves == expected_moves
        assert selects == chars_on_keyboard

    # --- Error: character not on keyboard ---

    def test_unknown_character_raises(self, index):
        with pytest.raises(ValueError, match="Character not on keyboard"):
            script_path("hello!", index)

    def test_special_char_raises(self, index):
        with pytest.raises(ValueError, match="Character not on keyboard"):
            script_path("@", index)

    # --- Empty input ---

    def test_empty_string(self, index):
        assert script_path("", index) == []

    # --- Whitespace / control character rejection ---

    def test_tab_in_input_raises(self, index):
        with pytest.raises(ValueError, match="Character not on keyboard"):
            script_path("A\tB", index)

    def test_newline_in_input_raises(self, index):
        with pytest.raises(ValueError, match="Character not on keyboard"):
            script_path("A\nB", index)

    # --- Only spaces ---

    def test_only_spaces(self, index):
        path = script_path("     ", index)
        assert path == ["S", "S", "S", "S", "S"]

    # --- Horizontal same-row traversal ---

    def test_horizontal_same_row_ABCDEF(self, index):
        path = script_path("ABCDEF", index)
        assert path == [
            "#",           # A at (0,0)
            "R", "#",      # B at (0,1)
            "R", "#",      # C at (0,2)
            "R", "#",      # D at (0,3)
            "R", "#",      # E at (0,4)
            "R", "#",      # F at (0,5)
        ]

    # --- Vertical same-column traversal ---

    def test_vertical_same_column_AGMSY5(self, index):
        path = script_path("AGMSY5", index)
        assert path == [
            "#",           # A at (0,0)
            "D", "#",      # G at (1,0)
            "D", "#",      # M at (2,0)
            "D", "#",      # S at (3,0)
            "D", "#",      # Y at (4,0)
            "D", "#",      # 5 at (5,0)
        ]

    # --- Movement order is vertical-first for diagonal paths ---

    def test_movement_order_vertical_before_horizontal(self, index):
        """For any diagonal move, D/U always precede L/R in the path segment."""
        # I=(1,2), W=(3,4) — diagonal move: 2 down, 2 right
        path = script_path("IW", index)
        # I from origin: D,R,R,#  W from I: D,D,R,R,#
        i_to_w = path[4:9]  # moves from I to W including select
        moves_only = [m for m in i_to_w if m != "#"]
        # All D moves should come before all R moves
        last_d = -1
        first_r = len(moves_only)
        for i, m in enumerate(moves_only):
            if m == "D":
                last_d = i
            if m == "R" and i < first_r:
                first_r = i
        assert last_d < first_r, "vertical moves must precede horizontal moves"

    # --- Unicode rejection ---

    def test_unicode_raises(self, index):
        with pytest.raises(ValueError, match="Character not on keyboard"):
            script_path("caf\u00e9", index)

    # --- More special characters ---

    @pytest.mark.parametrize("char", ["#", "$", "%", "&", "*"])
    def test_special_characters_raise(self, index, char):
        with pytest.raises(ValueError, match="Character not on keyboard"):
            script_path(char, index)

    # --- Reverse traversal (bottom-right to top-left) ---

    def test_reverse_traversal_0A(self, index):
        path = script_path("0A", index)
        assert path == (
            ["D"] * 5 + ["R"] * 5 + ["#"] +  # 0 at (5,5)
            ["U"] * 5 + ["L"] * 5 + ["#"]     # A at (0,0)
        )

    # --- Select count property ---

    def test_select_count_equals_non_space_chars(self, index):
        """For any input, count of '#' equals number of non-space characters."""
        for text in ["IT CROWD", "HELLO WORLD", "A B C", "   X   ", "12345", "A"]:
            path = script_path(text, index)
            non_space_chars = sum(1 for c in text if c != " ")
            assert path.count("#") == non_space_chars, (
                f"For {text!r}: expected {non_space_chars} selects, got {path.count('#')}"
            )

    # --- Custom layout ---

    def test_custom_2x2_layout(self):
        custom_index = build_index(["AB", "CD"])
        path = script_path("DCBA", custom_index)
        # D=(1,1): D,R,# C=(1,0): L,# B=(0,1): U,R,# A=(0,0): L,#
        assert path == ["D", "R", "#", "L", "#", "U", "R", "#", "L", "#"]


# ============================================================
# format_path() — output formatting
# ============================================================


class TestFormatPath:
    """Test comma-delimited formatting."""

    def test_single_element(self):
        assert format_path(["#"]) == "#"

    def test_multiple_elements(self):
        assert format_path(["D", "R", "#"]) == "D,R,#"

    def test_empty_path(self):
        assert format_path([]) == ""

    def test_space_in_path(self):
        assert format_path(["#", "S", "R", "#"]) == "#,S,R,#"
