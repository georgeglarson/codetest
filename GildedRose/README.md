# GildedRose

A Go solution for the Gilded Rose inventory management system.

## Approach

Each item category's degradation rules are encapsulated in a separate **Updater implementation** behind a common interface. A **Registry** maps category names (and item names for special cases like Aged Brie) to their updater. Adding a new special-case item type means adding one file and one registry entry, with no changes to existing code.

## Structure

```
item/
  item.go              # Core Item type
parser/
  parser.go            # Flat-file inventory parsing
updater/
  updater.go           # Updater interface + clampQuality helper
  normal.go            # Standard items: degrade 1/day, 2x past sell-by
  aged.go              # Aged items: increase quality over time
  sulfuras.go          # Legendary: never changes (quality locked at 80)
  backstage.go         # Backstage passes: accelerating increase, then crash
  conjured.go          # Conjured: degrade 2x normal rate
  registry.go          # Maps categories/names → updater strategies
inventory/
  inventory.go         # Inventory state + day progression orchestration
main.go               # Interactive REPL (list, item, next, trash)
```

## Run

```sh
# requires go 1.21+
make run
```

Interactive commands:
- `list` show all inventory
- `item <name>` show details for a single item
- `next` advance to the next day
- `trash` list items with Quality = 0
- `quit` exit

## Test

```sh
make test
```

82 tests across four packages:

| Package | Tests | Coverage |
|---------|-------|----------|
| `item` | 4 | IsTrash, String format |
| `parser` | 16 | Valid/invalid input, whitespace, blank lines, error messages, full inventory, CSV quoting, quality validation |
| `updater` | 41 | Every category (Normal, Aged, Sulfuras, Backstage, Conjured), boundary conditions, quality clamping, registry dispatch, name vs category priority, Aged Milk |
| `inventory` | 22 | CRUD operations, copy semantics, day progression, multi-day simulations, trash detection, **100-day invariant checks** (quality never negative, never > 50 except Sulfuras) |

## Design Considerations

- **Interface-based extensibility**: New item types implement the `Updater` interface (one method: `Update(*Item)`). The registry wires them in. Existing updaters and tests are untouched.
- **Two-tier dispatch**: The registry checks item name first, then category, then falls back to Normal. This handles both category-wide rules (Conjured, Backstage Passes) and one-off items (Aged Brie) without special-casing in the logic.
- **Invariant tests**: The test suite runs the full inventory through 100 simulated days and asserts that quality constraints are never violated, serving as a safety net against future regressions.
- **Copy semantics**: `Items()` and `FindByName()` return copies, preventing callers from accidentally mutating inventory state.
