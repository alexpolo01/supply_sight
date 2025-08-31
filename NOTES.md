## Proposed UI Enhancements

1) Row‑level actions (Edit/Delete)
- Add explicit Edit and Delete action buttons at the end of each product row to provide clear affordances for common operations.
- Include delete confirmation and ensure keyboard accessibility and focus states.

2) Flexible date range selection
- Support custom Start and End date pickers in addition to the quick presets (7/14/30 days).
- Validate ranges and propagate the selection to products, KPIs, and charts.

3) Column sorting with visual indicators
- Enable sorting by clicking table headers (Product, SKU, Warehouse, Stock, Demand, Status).
- Display ascending/descending icons to reflect the current sort direction.

4) Chart type flexibility
- Allow switching between multiple chart types (e.g., line, bar, area, pie) depending on the metric or user preference.
- Maintain consistent legends, tooltips, and color mapping across chart types.

Acceptance criteria (for each item)
- Functionality is discoverable and accessible (keyboard and screen reader friendly).
- State persists during navigation where appropriate (e.g., sorting, date range).
- Behavior is covered by basic tests and documented in the README/Notes.