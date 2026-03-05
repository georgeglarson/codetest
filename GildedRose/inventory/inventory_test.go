package inventory

import (
	"testing"

	"gildedrose/item"
)

func sampleItems() []item.Item {
	return []item.Item{
		{Name: "Sword", Category: "Weapon", SellIn: 10, Quality: 20},
		{Name: "Aged Brie", Category: "Food", SellIn: 5, Quality: 10},
		{Name: "Hand of Ragnaros", Category: "Sulfuras", SellIn: 80, Quality: 80},
		{Name: "Raging Ogre", Category: "Backstage Passes", SellIn: 10, Quality: 10},
		{Name: "Giant Slayer", Category: "Conjured", SellIn: 5, Quality: 20},
		{Name: "Cheese", Category: "Food", SellIn: 1, Quality: 1},
	}
}

// ============================================================
// Inventory basics
// ============================================================

func TestNew_startsAtDayZero(t *testing.T) {
	inv := New(sampleItems())
	if inv.Day() != 0 {
		t.Errorf("expected day 0, got %d", inv.Day())
	}
}

func TestItems_returnsAllItems(t *testing.T) {
	inv := New(sampleItems())
	items := inv.Items()
	if len(items) != 6 {
		t.Fatalf("expected 6 items, got %d", len(items))
	}
}

func TestItems_returnsCopy(t *testing.T) {
	inv := New(sampleItems())
	items := inv.Items()
	items[0].Quality = 999
	// Original should be unmodified
	if inv.Items()[0].Quality == 999 {
		t.Error("Items() should return a copy, not a reference")
	}
}

// ============================================================
// FindByName
// ============================================================

func TestFindByName_found(t *testing.T) {
	inv := New(sampleItems())
	itm := inv.FindByName("Sword")
	if itm == nil {
		t.Fatal("expected to find Sword")
	}
	if itm.Quality != 20 {
		t.Errorf("expected quality 20, got %d", itm.Quality)
	}
}

func TestFindByName_notFound(t *testing.T) {
	inv := New(sampleItems())
	itm := inv.FindByName("Nonexistent")
	if itm != nil {
		t.Error("expected nil for nonexistent item")
	}
}

func TestFindByName_returnsCopy(t *testing.T) {
	inv := New(sampleItems())
	itm := inv.FindByName("Sword")
	itm.Quality = 999
	if inv.FindByName("Sword").Quality == 999 {
		t.Error("FindByName should return a copy")
	}
}

// ============================================================
// Trash
// ============================================================

func TestTrash_noTrashInitially(t *testing.T) {
	inv := New(sampleItems())
	trash := inv.Trash()
	if len(trash) != 0 {
		t.Errorf("expected no trash, got %d items", len(trash))
	}
}

func TestTrash_findsZeroQualityItems(t *testing.T) {
	items := []item.Item{
		{Name: "Good", Category: "Weapon", SellIn: 10, Quality: 10},
		{Name: "Bad", Category: "Food", SellIn: 0, Quality: 0},
	}
	inv := New(items)
	trash := inv.Trash()
	if len(trash) != 1 {
		t.Fatalf("expected 1 trash item, got %d", len(trash))
	}
	if trash[0].Name != "Bad" {
		t.Errorf("expected 'Bad' in trash, got %q", trash[0].Name)
	}
}

// ============================================================
// NextDay
// ============================================================

func TestNextDay_incrementsDay(t *testing.T) {
	inv := New(sampleItems())
	inv.NextDay()
	if inv.Day() != 1 {
		t.Errorf("expected day 1, got %d", inv.Day())
	}
}

func TestNextDay_normalItemDegrades(t *testing.T) {
	inv := New(sampleItems())
	inv.NextDay()
	sword := inv.FindByName("Sword")
	if sword.Quality != 19 {
		t.Errorf("expected Sword quality 19, got %d", sword.Quality)
	}
	if sword.SellIn != 9 {
		t.Errorf("expected Sword sellIn 9, got %d", sword.SellIn)
	}
}

func TestNextDay_agedBrieIncreases(t *testing.T) {
	inv := New(sampleItems())
	inv.NextDay()
	brie := inv.FindByName("Aged Brie")
	if brie.Quality != 11 {
		t.Errorf("expected Aged Brie quality 11, got %d", brie.Quality)
	}
}

func TestNextDay_sulfurasUnchanged(t *testing.T) {
	inv := New(sampleItems())
	inv.NextDay()
	sulfuras := inv.FindByName("Hand of Ragnaros")
	if sulfuras.Quality != 80 {
		t.Errorf("expected Sulfuras quality 80, got %d", sulfuras.Quality)
	}
	if sulfuras.SellIn != 80 {
		t.Errorf("expected Sulfuras sellIn 80, got %d", sulfuras.SellIn)
	}
}

func TestNextDay_backstageIncreases(t *testing.T) {
	inv := New(sampleItems())
	inv.NextDay()
	pass := inv.FindByName("Raging Ogre")
	// SellIn was 10, now 9 (< 10), so +2 -> 12
	if pass.Quality != 12 {
		t.Errorf("expected Backstage quality 12, got %d", pass.Quality)
	}
}

func TestNextDay_conjuredDegradesFast(t *testing.T) {
	inv := New(sampleItems())
	inv.NextDay()
	conj := inv.FindByName("Giant Slayer")
	if conj.Quality != 18 {
		t.Errorf("expected Conjured quality 18, got %d", conj.Quality)
	}
}

// ============================================================
// Multi-day scenarios
// ============================================================

func TestMultiDay_cheeseBecomesTrash(t *testing.T) {
	inv := New(sampleItems())
	// Cheese: SellIn=1, Quality=1
	// Day 1: SellIn=0, Quality=0
	inv.NextDay()
	trash := inv.Trash()
	found := false
	for _, itm := range trash {
		if itm.Name == "Cheese" {
			found = true
		}
	}
	if !found {
		t.Error("expected Cheese to be trash after day 1")
	}
}

func TestMultiDay_backstageDropsAfterConcert(t *testing.T) {
	items := []item.Item{
		{Name: "Concert", Category: "Backstage Passes", SellIn: 1, Quality: 50},
	}
	inv := New(items)

	// Day 1: SellIn=0, +3 -> 50 (capped)
	inv.NextDay()
	if inv.FindByName("Concert").Quality != 50 {
		t.Errorf("expected 50 on last day, got %d", inv.FindByName("Concert").Quality)
	}

	// Day 2: SellIn=-1, drops to 0
	inv.NextDay()
	if inv.FindByName("Concert").Quality != 0 {
		t.Errorf("expected 0 after concert, got %d", inv.FindByName("Concert").Quality)
	}
}

func TestMultiDay_agedBrieCapsAt50(t *testing.T) {
	items := []item.Item{
		{Name: "Aged Brie", Category: "Food", SellIn: 5, Quality: 48},
	}
	inv := New(items)

	for i := 0; i < 10; i++ {
		inv.NextDay()
	}
	brie := inv.FindByName("Aged Brie")
	if brie.Quality != 50 {
		t.Errorf("expected Aged Brie capped at 50, got %d", brie.Quality)
	}
}

func TestMultiDay_normalDegradesFasterPastSellBy(t *testing.T) {
	items := []item.Item{
		{Name: "Sword", Category: "Weapon", SellIn: 2, Quality: 10},
	}
	inv := New(items)

	inv.NextDay() // SellIn=1, Quality=9
	inv.NextDay() // SellIn=0, Quality=8
	inv.NextDay() // SellIn=-1, Quality=6 (2x)

	sword := inv.FindByName("Sword")
	if sword.Quality != 6 {
		t.Errorf("expected quality 6, got %d", sword.Quality)
	}
}

func TestMultiDay_conjuredHitsZeroFast(t *testing.T) {
	items := []item.Item{
		{Name: "Conjured Mana Cake", Category: "Conjured", SellIn: 3, Quality: 6},
	}
	inv := New(items)

	inv.NextDay() // SellIn=2, Quality=4
	inv.NextDay() // SellIn=1, Quality=2
	inv.NextDay() // SellIn=0, Quality=0

	conj := inv.FindByName("Conjured Mana Cake")
	if conj.Quality != 0 {
		t.Errorf("expected quality 0, got %d", conj.Quality)
	}
}

func TestMultiDay_sulfurasNeverChanges(t *testing.T) {
	items := []item.Item{
		{Name: "Sulfuras", Category: "Sulfuras", SellIn: 80, Quality: 80},
	}
	inv := New(items)

	for i := 0; i < 100; i++ {
		inv.NextDay()
	}
	s := inv.FindByName("Sulfuras")
	if s.Quality != 80 || s.SellIn != 80 {
		t.Errorf("expected Sulfuras unchanged, got SellIn=%d Quality=%d", s.SellIn, s.Quality)
	}
}

func TestMultiDay_100DaysNoNegativeQuality(t *testing.T) {
	inv := New(sampleItems())
	for i := 0; i < 100; i++ {
		inv.NextDay()
		for _, itm := range inv.Items() {
			if itm.Quality < 0 {
				t.Fatalf("day %d: %s has negative quality %d", i+1, itm.Name, itm.Quality)
			}
		}
	}
}

func TestMultiDay_backstageAt50SellIn6_cappedThenDrops(t *testing.T) {
	items := []item.Item{
		{Name: "VIP Pass", Category: "Backstage Passes", SellIn: 6, Quality: 50},
	}
	inv := New(items)

	// Day 1: SellIn=5, +2 → capped at 50
	inv.NextDay()
	if inv.FindByName("VIP Pass").Quality != 50 {
		t.Errorf("day 1: expected 50, got %d", inv.FindByName("VIP Pass").Quality)
	}

	// Day 2: SellIn=4, +3 → capped at 50
	inv.NextDay()
	if inv.FindByName("VIP Pass").Quality != 50 {
		t.Errorf("day 2: expected 50, got %d", inv.FindByName("VIP Pass").Quality)
	}

	// Days 3–6: keep advancing through SellIn 3,2,1,0
	for i := 3; i <= 6; i++ {
		inv.NextDay()
		if inv.FindByName("VIP Pass").Quality != 50 {
			t.Errorf("day %d: expected 50, got %d", i, inv.FindByName("VIP Pass").Quality)
		}
	}

	// Day 7: SellIn=-1, concert over → quality drops to 0
	inv.NextDay()
	if inv.FindByName("VIP Pass").Quality != 0 {
		t.Errorf("day 7 (post-concert): expected 0, got %d", inv.FindByName("VIP Pass").Quality)
	}
}

func TestMultiDay_itemStartingPastSellBy(t *testing.T) {
	items := []item.Item{
		{Name: "Old Sword", Category: "Weapon", SellIn: -5, Quality: 10},
	}
	inv := New(items)

	// Already past sell-by: degrades by 2 per day
	inv.NextDay() // SellIn=-6, Quality=8
	if inv.FindByName("Old Sword").Quality != 8 {
		t.Errorf("day 1: expected 8, got %d", inv.FindByName("Old Sword").Quality)
	}

	inv.NextDay() // SellIn=-7, Quality=6
	if inv.FindByName("Old Sword").Quality != 6 {
		t.Errorf("day 2: expected 6, got %d", inv.FindByName("Old Sword").Quality)
	}

	inv.NextDay() // SellIn=-8, Quality=4
	inv.NextDay() // SellIn=-9, Quality=2
	inv.NextDay() // SellIn=-10, Quality=0

	if inv.FindByName("Old Sword").Quality != 0 {
		t.Errorf("day 5: expected 0, got %d", inv.FindByName("Old Sword").Quality)
	}
	if inv.FindByName("Old Sword").SellIn != -10 {
		t.Errorf("day 5: expected sellIn -10, got %d", inv.FindByName("Old Sword").SellIn)
	}
}

// ============================================================
// Empty inventory
// ============================================================

func TestNew_emptyInventory_itemsReturnsEmptySlice(t *testing.T) {
	inv := New([]item.Item{})
	items := inv.Items()
	if len(items) != 0 {
		t.Errorf("expected 0 items, got %d", len(items))
	}
}

func TestNew_emptyInventory_trashReturnsEmpty(t *testing.T) {
	inv := New([]item.Item{})
	trash := inv.Trash()
	if trash != nil && len(trash) != 0 {
		t.Errorf("expected nil or empty trash, got %d items", len(trash))
	}
}

// ============================================================
// FindByName edge cases
// ============================================================

func TestFindByName_emptyString_returnsNil(t *testing.T) {
	inv := New(sampleItems())
	itm := inv.FindByName("")
	if itm != nil {
		t.Error("expected nil for empty string search")
	}
}

// ============================================================
// Multiple trash items
// ============================================================

func TestTrash_multipleTrashItems(t *testing.T) {
	items := []item.Item{
		{Name: "Good Sword", Category: "Weapon", SellIn: 10, Quality: 10},
		{Name: "Broken Shield", Category: "Armor", SellIn: 0, Quality: 0},
		{Name: "Rotten Cheese", Category: "Food", SellIn: -5, Quality: 0},
		{Name: "Cursed Ring", Category: "Misc", SellIn: -3, Quality: -2},
	}
	inv := New(items)
	trash := inv.Trash()
	if len(trash) != 3 {
		t.Fatalf("expected 3 trash items, got %d", len(trash))
	}
	names := map[string]bool{}
	for _, itm := range trash {
		names[itm.Name] = true
	}
	for _, expected := range []string{"Broken Shield", "Rotten Cheese", "Cursed Ring"} {
		if !names[expected] {
			t.Errorf("expected %q in trash", expected)
		}
	}
}

func TestMultiDay_100DaysNoQualityAbove50_exceptSulfuras(t *testing.T) {
	inv := New(sampleItems())
	for i := 0; i < 100; i++ {
		inv.NextDay()
		for _, itm := range inv.Items() {
			if itm.Category == "Sulfuras" {
				if itm.Quality != 80 {
					t.Fatalf("day %d: Sulfuras quality should be 80, got %d", i+1, itm.Quality)
				}
			} else if itm.Quality > 50 {
				t.Fatalf("day %d: %s has quality %d (> 50)", i+1, itm.Name, itm.Quality)
			}
		}
	}
}
