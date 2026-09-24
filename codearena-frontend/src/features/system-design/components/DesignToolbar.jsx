import { DESIGN_VIEW_OPTIONS, LEVEL_OPTIONS } from "@/features/system-design/utils/designFilters";
import { FilterBar, SegmentedControl, TextField } from "@/shared/ui";

export function DesignToolbar({ filters, onChange, placeholder = "Search questions (e.g. payments, booking)" }) {
  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <FilterBar>
      <SegmentedControl label="Show" options={DESIGN_VIEW_OPTIONS} value={filters.view} onChange={(view) => update({ view })} />
      <SegmentedControl label="Level" options={LEVEL_OPTIONS} value={filters.level} onChange={(level) => update({ level })} />
      <TextField
        id="design-search"
        label="Search questions"
        hideLabel
        type="search"
        placeholder={placeholder}
        value={filters.query}
        onChange={(e) => update({ query: e.target.value })}
      />
    </FilterBar>
  );
}
