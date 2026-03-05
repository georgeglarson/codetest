package updater

import (
	"testing"

	"gildedrose/item"
)

// helper: create an item, apply the updater, return the result.
func applyUpdate(u Updater, sellIn, quality int) item.Item {
	i := item.Item{Name: "Test", Category: "Test", SellIn: sellIn, Quality: quality}
	u.Update(&i)
	return i
}

// ============================================================
// Normal items
// ============================================================

func TestNormal_degradesByOne(t *testing.T) {
	i := applyUpdate(Normal{}, 10, 20)
	if i.Quality != 19 {
		t.Errorf("expected quality 19, got %d", i.Quality)
	}
	if i.SellIn != 9 {
		t.Errorf("expected sellIn 9, got %d", i.SellIn)
	}
}

func TestNormal_degradesTwiceAfterSellBy(t *testing.T) {
	i := applyUpdate(Normal{}, 0, 20)
	if i.Quality != 18 {
		t.Errorf("expected quality 18 (2x degradation), got %d", i.Quality)
	}
}

func TestNormal_qualityNeverNegative(t *testing.T) {
	i := applyUpdate(Normal{}, 10, 0)
	if i.Quality != 0 {
		t.Errorf("expected quality 0, got %d", i.Quality)
	}
}

func TestNormal_qualityNeverNegativeAfterSellBy(t *testing.T) {
	i := applyUpdate(Normal{}, 0, 1)
	if i.Quality != 0 {
		t.Errorf("expected quality 0 (clamped), got %d", i.Quality)
	}
}

func TestNormal_sellInDecreases(t *testing.T) {
	i := applyUpdate(Normal{}, 5, 10)
	if i.SellIn != 4 {
		t.Errorf("expected sellIn 4, got %d", i.SellIn)
	}
}

func TestNormal_sellInGoesNegative(t *testing.T) {
	i := applyUpdate(Normal{}, 0, 10)
	if i.SellIn != -1 {
		t.Errorf("expected sellIn -1, got %d", i.SellIn)
	}
}

func TestNormal_alreadyPastSellBy_qualityClamped(t *testing.T) {
	i := applyUpdate(Normal{}, -1, 1)
	if i.Quality != 0 {
		t.Errorf("expected quality 0 (clamped from -1), got %d", i.Quality)
	}
}

func TestNormal_multipleUpdates(t *testing.T) {
	itm := item.Item{Name: "Test", Category: "Test", SellIn: 2, Quality: 10}
	u := Normal{}
	u.Update(&itm) // day 1: SellIn=1, Quality=9
	u.Update(&itm) // day 2: SellIn=0, Quality=8
	u.Update(&itm) // day 3: SellIn=-1, Quality=6 (2x)
	if itm.Quality != 6 {
		t.Errorf("expected quality 6 after 3 days, got %d", itm.Quality)
	}
}

// ============================================================
// Aged items (Aged Brie)
// ============================================================

func TestAged_qualityIncreases(t *testing.T) {
	i := applyUpdate(Aged{}, 20, 10)
	if i.Quality != 11 {
		t.Errorf("expected quality 11, got %d", i.Quality)
	}
}

func TestAged_qualityIncreasesTwiceAfterSellBy(t *testing.T) {
	i := applyUpdate(Aged{}, 0, 10)
	if i.Quality != 12 {
		t.Errorf("expected quality 12 (2x increase), got %d", i.Quality)
	}
}

func TestAged_qualityCapsAt50(t *testing.T) {
	i := applyUpdate(Aged{}, 20, 50)
	if i.Quality != 50 {
		t.Errorf("expected quality 50 (capped), got %d", i.Quality)
	}
}

func TestAged_qualityCapsAt50AfterSellBy(t *testing.T) {
	i := applyUpdate(Aged{}, 0, 49)
	if i.Quality != 50 {
		t.Errorf("expected quality 50 (capped at max), got %d", i.Quality)
	}
}

func TestAged_sellInDecreases(t *testing.T) {
	i := applyUpdate(Aged{}, 10, 10)
	if i.SellIn != 9 {
		t.Errorf("expected sellIn 9, got %d", i.SellIn)
	}
}

// ============================================================
// Sulfuras (legendary)
// ============================================================

func TestSulfuras_qualityAlways80(t *testing.T) {
	i := applyUpdate(Sulfuras{}, 80, 80)
	if i.Quality != 80 {
		t.Errorf("expected quality 80, got %d", i.Quality)
	}
}

func TestSulfuras_sellInNeverChanges(t *testing.T) {
	i := applyUpdate(Sulfuras{}, 80, 80)
	if i.SellIn != 80 {
		t.Errorf("expected sellIn unchanged at 80, got %d", i.SellIn)
	}
}

func TestSulfuras_resetsToEightyIfCorrupted(t *testing.T) {
	i := applyUpdate(Sulfuras{}, 80, 40)
	if i.Quality != 80 {
		t.Errorf("expected quality reset to 80, got %d", i.Quality)
	}
}

// ============================================================
// Backstage Passes
// ============================================================

func TestBackstage_qualityIncreasesBy1_moreThan10Days(t *testing.T) {
	i := applyUpdate(Backstage{}, 15, 10)
	if i.Quality != 11 {
		t.Errorf("expected quality 11, got %d", i.Quality)
	}
}

func TestBackstage_qualityIncreasesBy2_at10Days(t *testing.T) {
	i := applyUpdate(Backstage{}, 10, 10)
	// SellIn becomes 9 (< 10), so +2
	if i.Quality != 12 {
		t.Errorf("expected quality 12, got %d", i.Quality)
	}
}

func TestBackstage_qualityIncreasesBy2_at6Days(t *testing.T) {
	i := applyUpdate(Backstage{}, 6, 10)
	// SellIn becomes 5 (< 10 but not < 5), so +2
	if i.Quality != 12 {
		t.Errorf("expected quality 12, got %d", i.Quality)
	}
}

func TestBackstage_qualityIncreasesBy3_at5Days(t *testing.T) {
	i := applyUpdate(Backstage{}, 5, 10)
	// SellIn becomes 4 (< 5), so +3
	if i.Quality != 13 {
		t.Errorf("expected quality 13, got %d", i.Quality)
	}
}

func TestBackstage_qualityIncreasesBy3_at1Day(t *testing.T) {
	i := applyUpdate(Backstage{}, 1, 10)
	// SellIn becomes 0 (< 5), so +3
	if i.Quality != 13 {
		t.Errorf("expected quality 13, got %d", i.Quality)
	}
}

func TestBackstage_qualityDropsToZero_afterConcert(t *testing.T) {
	i := applyUpdate(Backstage{}, 0, 50)
	// SellIn becomes -1, concert passed
	if i.Quality != 0 {
		t.Errorf("expected quality 0 after concert, got %d", i.Quality)
	}
}

func TestBackstage_qualityStaysZero_wellAfterConcert(t *testing.T) {
	i := applyUpdate(Backstage{}, -5, 0)
	if i.Quality != 0 {
		t.Errorf("expected quality 0, got %d", i.Quality)
	}
}

func TestBackstage_qualityDropsToZero_alreadyPastConcertWithQuality(t *testing.T) {
	i := applyUpdate(Backstage{}, -5, 30)
	if i.Quality != 0 {
		t.Errorf("expected quality 0 (past concert), got %d", i.Quality)
	}
}

func TestBackstage_qualityCapsAt50(t *testing.T) {
	i := applyUpdate(Backstage{}, 5, 49)
	if i.Quality != 50 {
		t.Errorf("expected quality 50 (capped), got %d", i.Quality)
	}
}

func TestBackstage_fullLifecycle(t *testing.T) {
	itm := item.Item{Name: "Concert", Category: "Backstage Passes", SellIn: 12, Quality: 10}
	u := Backstage{}

	// Day 1: SellIn=11, +1 -> 11
	u.Update(&itm)
	if itm.Quality != 11 {
		t.Errorf("day 1: expected 11, got %d", itm.Quality)
	}

	// Day 2: SellIn=10, +1 -> 12
	u.Update(&itm)
	if itm.Quality != 12 {
		t.Errorf("day 2: expected 12, got %d", itm.Quality)
	}

	// Day 3: SellIn=9, +2 -> 14
	u.Update(&itm)
	if itm.Quality != 14 {
		t.Errorf("day 3: expected 14, got %d", itm.Quality)
	}
}

// ============================================================
// Conjured items
// ============================================================

func TestConjured_degradesTwiceAsNormal(t *testing.T) {
	i := applyUpdate(Conjured{}, 10, 20)
	if i.Quality != 18 {
		t.Errorf("expected quality 18 (2x normal), got %d", i.Quality)
	}
}

func TestConjured_degradesFourTimesAfterSellBy(t *testing.T) {
	i := applyUpdate(Conjured{}, 0, 20)
	if i.Quality != 16 {
		t.Errorf("expected quality 16 (4x after sell-by), got %d", i.Quality)
	}
}

func TestConjured_qualityNeverNegative(t *testing.T) {
	i := applyUpdate(Conjured{}, 10, 1)
	if i.Quality != 0 {
		t.Errorf("expected quality 0 (clamped), got %d", i.Quality)
	}
}

func TestConjured_qualityNeverNegativeAfterSellBy(t *testing.T) {
	i := applyUpdate(Conjured{}, 0, 3)
	if i.Quality != 0 {
		t.Errorf("expected quality 0 (clamped), got %d", i.Quality)
	}
}

func TestConjured_sellInDecreases(t *testing.T) {
	i := applyUpdate(Conjured{}, 10, 20)
	if i.SellIn != 9 {
		t.Errorf("expected sellIn 9, got %d", i.SellIn)
	}
}

// ============================================================
// Registry
// ============================================================

func TestRegistry_returnsNormalForUnknownCategory(t *testing.T) {
	reg := NewRegistry()
	u := reg.Get("Random Sword", "Weapon")
	if _, ok := u.(Normal); !ok {
		t.Error("expected Normal updater for unknown category")
	}
}

func TestRegistry_returnsSulfurasForSulfurasCategory(t *testing.T) {
	reg := NewRegistry()
	u := reg.Get("Hand of Ragnaros", "Sulfuras")
	if _, ok := u.(Sulfuras); !ok {
		t.Error("expected Sulfuras updater")
	}
}

func TestRegistry_returnsBackstageForBackstageCategory(t *testing.T) {
	reg := NewRegistry()
	u := reg.Get("Raging Ogre", "Backstage Passes")
	if _, ok := u.(Backstage); !ok {
		t.Error("expected Backstage updater")
	}
}

func TestRegistry_returnsConjuredForConjuredCategory(t *testing.T) {
	reg := NewRegistry()
	u := reg.Get("Giant Slayer", "Conjured")
	if _, ok := u.(Conjured); !ok {
		t.Error("expected Conjured updater")
	}
}

func TestRegistry_returnsAgedForAgedBrieByName(t *testing.T) {
	reg := NewRegistry()
	u := reg.Get("Aged Brie", "Food")
	if _, ok := u.(Aged); !ok {
		t.Error("expected Aged updater for Aged Brie")
	}
}

func TestRegistry_returnsAgedForAgedMilkByName(t *testing.T) {
	reg := NewRegistry()
	u := reg.Get("Aged Milk", "Food")
	if _, ok := u.(Aged); !ok {
		t.Error("expected Aged updater for Aged Milk")
	}
}

func TestRegistry_nameTakesPriorityOverCategory(t *testing.T) {
	reg := NewRegistry()
	// Aged Brie is in category "Food" which would normally be Normal,
	// but the name override selects Aged.
	u := reg.Get("Aged Brie", "Food")
	if _, ok := u.(Aged); !ok {
		t.Error("expected name-based Aged updater to take priority over category")
	}
}

// ============================================================
// clampQuality
// ============================================================

func TestClampQuality_withinRange(t *testing.T) {
	if clampQuality(25) != 25 {
		t.Error("expected 25")
	}
}

func TestClampQuality_belowZero(t *testing.T) {
	if clampQuality(-5) != 0 {
		t.Error("expected 0")
	}
}

func TestClampQuality_aboveMax(t *testing.T) {
	if clampQuality(55) != 50 {
		t.Error("expected 50")
	}
}

func TestClampQuality_atBoundaries(t *testing.T) {
	if clampQuality(0) != 0 {
		t.Error("expected 0")
	}
	if clampQuality(50) != 50 {
		t.Error("expected 50")
	}
}

// ============================================================
// Backstage: Quality=50 through full countdown stays capped
// ============================================================

func TestBackstage_qualityAt50StaysCappedThroughCountdown(t *testing.T) {
	itm := item.Item{Name: "Concert", Category: "Backstage Passes", SellIn: 12, Quality: 50}
	u := Backstage{}

	// Advance to SellIn=10 (2 updates from 12)
	u.Update(&itm) // SellIn=11, +1 capped at 50
	u.Update(&itm) // SellIn=10, +1 capped at 50
	if itm.Quality != 50 {
		t.Errorf("at SellIn 10: expected quality 50, got %d", itm.Quality)
	}

	// Advance to SellIn=5 (5 more updates)
	for i := 0; i < 5; i++ {
		u.Update(&itm)
	}
	if itm.SellIn != 5 {
		t.Errorf("expected SellIn 5, got %d", itm.SellIn)
	}
	if itm.Quality != 50 {
		t.Errorf("at SellIn 5: expected quality 50, got %d", itm.Quality)
	}

	// Advance to SellIn=0 (5 more updates)
	for i := 0; i < 5; i++ {
		u.Update(&itm)
	}
	if itm.SellIn != 0 {
		t.Errorf("expected SellIn 0, got %d", itm.SellIn)
	}
	if itm.Quality != 50 {
		t.Errorf("at SellIn 0: expected quality 50, got %d", itm.Quality)
	}

	// One more update: SellIn=-1, concert over, quality drops to 0
	u.Update(&itm)
	if itm.Quality != 0 {
		t.Errorf("after concert: expected quality 0, got %d", itm.Quality)
	}
}

// ============================================================
// Aged Brie: boundary clamping near 50
// ============================================================

func TestAged_qualityAt49SellIn0_clampsTo50(t *testing.T) {
	// SellIn=0: after decrement SellIn=-1 (<0), so +2 increment → 49+2=51, clamped to 50
	i := applyUpdate(Aged{}, 0, 49)
	if i.Quality != 50 {
		t.Errorf("expected quality 50 (clamped from 51), got %d", i.Quality)
	}
}

func TestAged_qualityAt50SellInNeg1_staysAt50(t *testing.T) {
	// Already at cap, past sell-by: +2 → 52, clamped to 50
	i := applyUpdate(Aged{}, -1, 50)
	if i.Quality != 50 {
		t.Errorf("expected quality 50 (still capped), got %d", i.Quality)
	}
}

// ============================================================
// Conjured: boundary clamping near 0
// ============================================================

func TestConjured_quality3SellIn0_clampsTo0(t *testing.T) {
	// SellIn=0: after decrement SellIn=-1 (<0), degrade by 4 → 3-4=-1, clamped to 0
	i := applyUpdate(Conjured{}, 0, 3)
	if i.Quality != 0 {
		t.Errorf("expected quality 0 (clamped), got %d", i.Quality)
	}
}

func TestConjured_quality5SellIn0_becomes1(t *testing.T) {
	// SellIn=0: after decrement SellIn=-1 (<0), degrade by 4 → 5-4=1
	i := applyUpdate(Conjured{}, 0, 5)
	if i.Quality != 1 {
		t.Errorf("expected quality 1, got %d", i.Quality)
	}
}

func TestConjured_quality1SellIn10_clampsTo0(t *testing.T) {
	// SellIn=10: after decrement SellIn=9 (>=0), degrade by 2 → 1-2=-1, clamped to 0
	i := applyUpdate(Conjured{}, 10, 1)
	if i.Quality != 0 {
		t.Errorf("expected quality 0 (clamped), got %d", i.Quality)
	}
}

// ============================================================
// Sulfuras: edge-case SellIn values
// ============================================================

func TestSulfuras_negativeSellIn_neverChanges(t *testing.T) {
	i := applyUpdate(Sulfuras{}, -5, 80)
	if i.Quality != 80 {
		t.Errorf("expected quality 80, got %d", i.Quality)
	}
	if i.SellIn != -5 {
		t.Errorf("expected sellIn -5, got %d", i.SellIn)
	}
}

func TestSulfuras_highSellIn_neverChanges(t *testing.T) {
	i := applyUpdate(Sulfuras{}, 999, 80)
	if i.Quality != 80 {
		t.Errorf("expected quality 80, got %d", i.Quality)
	}
	if i.SellIn != 999 {
		t.Errorf("expected sellIn 999, got %d", i.SellIn)
	}
}

// ============================================================
// Normal: Quality=50 (max) degrades to 49
// ============================================================

func TestNormal_qualityAt50_degradesTo49(t *testing.T) {
	i := applyUpdate(Normal{}, 10, 50)
	if i.Quality != 49 {
		t.Errorf("expected quality 49, got %d", i.Quality)
	}
}

// ============================================================
// Registry: edge cases
// ============================================================

func TestRegistry_emptyStringCategory_returnsNormal(t *testing.T) {
	reg := NewRegistry()
	u := reg.Get("Some Item", "")
	if _, ok := u.(Normal); !ok {
		t.Error("expected Normal updater for empty category")
	}
}

func TestRegistry_lowercaseSulfuras_returnsNormal(t *testing.T) {
	// Registry uses exact match; "sulfuras" != "Sulfuras"
	reg := NewRegistry()
	u := reg.Get("Some Item", "sulfuras")
	if _, ok := u.(Normal); !ok {
		t.Error("expected Normal updater for lowercase 'sulfuras' (case-sensitive miss)")
	}
}

// ============================================================
// Conjured: SellIn already negative
// ============================================================

func TestConjured_quality3SellInNeg1_clampsTo0(t *testing.T) {
	// SellIn=-1: after decrement SellIn=-2 (<0), degrade by 4 → 3-4=-1, clamped to 0
	i := applyUpdate(Conjured{}, -1, 3)
	if i.Quality != 0 {
		t.Errorf("expected quality 0 (clamped), got %d", i.Quality)
	}
}

// ============================================================
// Backstage: Quality=48 at SellIn=5 caps at 50
// ============================================================

func TestBackstage_quality48SellIn5_capsAt50(t *testing.T) {
	// SellIn=5: after decrement SellIn=4 (<5), so +3 → 48+3=51, clamped to 50
	i := applyUpdate(Backstage{}, 5, 48)
	if i.Quality != 50 {
		t.Errorf("expected quality 50 (capped from 51), got %d", i.Quality)
	}
}
