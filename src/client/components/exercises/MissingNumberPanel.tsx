import { ExercisePanel } from "./ExercisePanel.js";
import { ContextBox, Lang, Stat } from "../ContextBox.js";

export function MissingNumberPanel() {
  return (
    <ExercisePanel
      title="Missing Number"
      description="Paste a sequence of numbers with one value missing, and it finds the gap."
      endpoint="/api/exercises/missing-number"
      placeholder="comma-separated numbers"
      buttonLabel="Find It"
      loadingLabel="Searching..."
      defaultValue={"1,2,3,4,5,6,7,8,9,10,12\n24,26,27,29,28\n1,2,4,5"}
    >
      <ContextBox>
        <ContextBox.Section heading="Problem">
          Given a sequence of numbers with exactly one value missing, find the gap. The sequence may
          be unsorted and can use any consistent step size (1, 2, 3, etc.).
        </ContextBox.Section>
        <ContextBox.Section heading="Solution">
          <Lang>Zig</Lang>. A tight algorithmic problem suited to a systems language. Zig's
          explicit allocator model and comptime features show well on small, performance-sensitive
          code. The solution detects the step size from the sorted input, then uses arithmetic sum
          comparison to pinpoint the missing value in O(n log n) time.
        </ContextBox.Section>
        <ContextBox.Section heading="Testing">
          <Stat>53 tests</Stat> covering step sizes of 1 through 5, unsorted input, negative
          numbers, missing first/last elements, two-element sequences, large sequences (1000+
          elements), and malformed input rejection. Uses a custom test runner for verbose per-test
          output.
        </ContextBox.Section>
      </ContextBox>
    </ExercisePanel>
  );
}
