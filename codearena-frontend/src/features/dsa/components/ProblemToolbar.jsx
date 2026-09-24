import { DIFFICULTY_OPTIONS, VIEW_OPTIONS } from "@/features/dsa/utils/filters";
import { FilterBar, SegmentedControl, TextField } from "@/shared/ui";

export function ProblemToolbar({ filters, onChange }) {
  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <FilterBar>
      <SegmentedControl label="Show" options={VIEW_OPTIONS} value={filters.view} onChange={(view) => update({ view })} />
      <SegmentedControl
        label="Difficulty"
        options={DIFFICULTY_OPTIONS}
        value={filters.difficulty}
        onChange={(difficulty) => update({ difficulty })}
      />
      <TextField
        id="problem-search"
        label="Search problems"
        hideLabel
        type="search"
        placeholder="Search by name or #number"
        value={filters.query}
        onChange={(e) => update({ query: e.target.value })}
      />
    </FilterBar>
  );
}
