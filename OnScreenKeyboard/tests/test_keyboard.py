"""Tests for keyboard layout and coordinate mapping."""

import pytest
from keyboard import DEFAULT_LAYOUT, build_index


class TestDefaultLayout:
    """Verify the default keyboard layout structure."""

    def test_layout_has_six_rows(self):
        assert len(DEFAULT_LAYOUT) == 6

    def test_each_row_has_six_columns(self):
        for row in DEFAULT_LAYOUT:
            assert len(row) == 6

    def test_contains_all_letters(self):
        flat = "".join(DEFAULT_LAYOUT)
        for char in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            assert char in flat

    def test_contains_all_digits(self):
        flat = "".join(DEFAULT_LAYOUT)
        for digit in "0123456789":
            assert digit in flat

    def test_total_characters(self):
        flat = "".join(DEFAULT_LAYOUT)
        assert len(flat) == 36  # 26 letters + 10 digits


class TestBuildIndex:
    """Verify coordinate mapping from layout."""

    @pytest.fixture
    def index(self):
        return build_index(DEFAULT_LAYOUT)

    # --- Corners ---

    def test_top_left_is_A(self, index):
        assert index["A"] == (0, 0)

    def test_top_right_is_F(self, index):
        assert index["F"] == (0, 5)

    def test_bottom_left_is_5(self, index):
        assert index["5"] == (5, 0)

    def test_bottom_right_is_0(self, index):
        assert index["0"] == (5, 5)

    # --- Row boundaries ---

    def test_first_of_each_row(self, index):
        expected = [("A", 0), ("G", 1), ("M", 2), ("S", 3), ("Y", 4), ("5", 5)]
        for char, row in expected:
            assert index[char] == (row, 0)

    def test_last_of_each_row(self, index):
        expected = [("F", 0), ("L", 1), ("R", 2), ("X", 3), ("4", 4), ("0", 5)]
        for char, row in expected:
            assert index[char] == (row, 5)

    # --- Specific positions used in sample ---

    def test_I_position(self, index):
        assert index["I"] == (1, 2)

    def test_T_position(self, index):
        assert index["T"] == (3, 1)

    def test_C_position(self, index):
        assert index["C"] == (0, 2)

    def test_R_position(self, index):
        assert index["R"] == (2, 5)

    def test_O_position(self, index):
        assert index["O"] == (2, 2)

    def test_W_position(self, index):
        assert index["W"] == (3, 4)

    def test_D_position(self, index):
        assert index["D"] == (0, 3)

    # --- Index completeness ---

    def test_index_has_36_entries(self, index):
        assert len(index) == 36

    def test_no_duplicate_positions(self, index):
        positions = list(index.values())
        assert len(positions) == len(set(positions))

    # --- Custom layout ---

    def test_custom_layout(self):
        custom = ["AB", "CD"]
        idx = build_index(custom)
        assert idx == {"A": (0, 0), "B": (0, 1), "C": (1, 0), "D": (1, 1)}

    def test_single_row_layout(self):
        idx = build_index(["XYZ"])
        assert idx == {"X": (0, 0), "Y": (0, 1), "Z": (0, 2)}

    def test_single_char_layout(self):
        idx = build_index(["Q"])
        assert idx == {"Q": (0, 0)}

    def test_duplicate_characters_raises(self):
        with pytest.raises(ValueError, match="duplicate character"):
            build_index(["AA", "BC"])


# ============================================================
# main.py — basic integration / import tests
# ============================================================


class TestMainImport:
    """Verify main.py can be imported without side effects."""

    def test_import_main_does_not_crash(self):
        """Importing main should succeed (guarded by __name__ check)."""
        import importlib
        import sys

        # Ensure clean import
        if "main" in sys.modules:
            del sys.modules["main"]
        mod = importlib.import_module("main")
        assert hasattr(mod, "main")

    def test_main_without_args_exits(self):
        """Calling main() with no CLI args prints usage and exits."""
        import importlib
        import sys

        if "main" in sys.modules:
            del sys.modules["main"]
        mod = importlib.import_module("main")

        original_argv = sys.argv
        try:
            sys.argv = ["main.py"]
            with pytest.raises(SystemExit) as exc_info:
                mod.main()
            assert exc_info.value.code == 1
        finally:
            sys.argv = original_argv
