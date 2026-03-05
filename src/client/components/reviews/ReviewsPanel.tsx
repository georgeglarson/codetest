import { useState } from "react";
import { UserSection } from "./UserSection.js";
import { RestaurantSection } from "./RestaurantSection.js";
import { ReviewSection } from "./ReviewSection.js";
import { styles } from "./styles.js";
import { ContextBox, Lang, Stat } from "../ContextBox.js";

export function ReviewsPanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleMutate = () => setRefreshKey((k) => k + 1);

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Restaurant Reviews</h2>
      <p style={styles.desc}>
        Create, browse, edit, and delete users, restaurants, and reviews. Blocked users cannot
        submit new reviews.
      </p>

      <ContextBox>
        <ContextBox.Section heading="Problem">
          Build a restaurant review application where you can create, browse, edit, and delete
          users, restaurants, and reviews. Support user blocking, relational integrity, and a
          functional web interface.
        </ContextBox.Section>
        <ContextBox.Section heading="Solution">
          <Lang>TypeScript / React</Lang>. TrueFit's core stack. Express + better-sqlite3 on
          the backend with RESTful routes for all three entities. React frontend with data tables,
          inline editing, entity picker dropdowns, and client-side filtering. This panel also serves
          as a <em>unified control panel</em> integrating all 5 other exercises as live, interactive
          demos.
        </ContextBox.Section>
        <ContextBox.Section heading="Testing">
          <Stat>371 tests</Stat>: 46 model tests (CRUD operations, FK constraints, email
          uniqueness), 103 API route tests (all HTTP verbs, validation, 404/409 error paths), 133
          client tests (rendering, inline edit flows, entity pickers, cross-section refresh,
          city filtering), plus 89 tests covering the other 5 exercise panels and their
          visualizers.
        </ContextBox.Section>
      </ContextBox>

      <div style={styles.grid}>
        <UserSection refreshKey={refreshKey} onMutate={handleMutate} />
        <RestaurantSection refreshKey={refreshKey} onMutate={handleMutate} />
        <ReviewSection refreshKey={refreshKey} onMutate={handleMutate} />
      </div>
    </div>
  );
}
