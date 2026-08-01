# Changelog

## 0.9.5

- Added Link Field context-menu actions to edit, copy, or clear the raw frontmatter value.
- Marked Link Clear value and Multi-select Remove context-menu actions with Obsidian's theme-aware warning red.

## 0.9.4

- Vertically centered **Left, align end** labels within the first field-control line.
- Replaced the fixed percentage-based label column with a shared width based on the longest visible label plus 8px.
- Recalculated the label column when label content, visibility, fonts, or panel dimensions change.
- Reset the first-line minimum height when the layout becomes stacked on narrow screens.

## 0.9.3

- Aligned **Left, align end** labels with the first line of multi-line or taller field controls instead of vertically centering them across the complete field height.

## 0.9.2

- Added a **Left, align end** label position to the default layout, panel overrides, and rule overrides.
- Reused the Left two-column layout while aligning labels to the end of their label column.
- Restored stacked labels to start alignment on narrow screens.

## 0.9.1

- Kept inline field labels on one line without clipping or ellipsis truncation.
- Fixed Multi-select drag-grip colors by applying Style Settings values to Obsidian icon variables and SVG strokes.
- Kept configured field-input background colors active when the Borderless input style is selected.

## 0.9.0

- Fixed Multi-select chip alignment on Windows by constraining chip line height, sizing icon buttons explicitly, and replacing font-glyph controls with SVG icons.
- Replaced the text drag handle with Obsidian's built-in `grip-vertical` icon.
- Added Style Settings controls for drag-grip color and size, defaulting the grip to `--text-faint`.
- Added per-field Obsidian icon autocomplete backed by the icons registered in Obsidian.
- Added field-label display modes for icon and label, label only, icon only, or hidden.
- Kept field labels on one line with ellipsis and made inline Multi-select search controls fill their available column.
- Added theme-aware Select text and background colors and rounded Select controls.
- Reorganized Style Settings into Panel, Field, Select, Rating and Progress, and Multi-select groups.
- Moved the Multi-select `Add “…”` result above fuzzy matches.

## 0.8.0

- Added a persistent `Add “…”` result beneath fuzzy Multi-select matches for custom values.
- Removed the experimental Bases view, cache, option source, settings, diagnostics, styles, and tests.
- Changed the default Delete empty values and Show in source mode settings to off.
- Made every Field settings card independently collapsible while preserving its expanded state during rerenders.
- Replaced folder-only rules with note rules that can filter by folder, tag, or wikilink, including automatic migration of legacy folder rules.
- Made Multi-select chip text selectable and added right-click copy, edit, move, and remove actions.
- Added double-click chip editing and drag-handle reordering that persists the frontmatter list order.
- Added token-based fuzzy option search and displayed all available options when the search field is focused.
- Reduced Multi-select chip vertical padding for a more compact shape.
- Added Style Settings controls for theme-aware or custom field-input text and background colors.
- Added a dedicated readonly Link field for HTTP(S), wikilink, and Markdown-link text values.

## 0.7.0

- Added a setting to hide panels in plain Source Mode while leaving Live Preview visible.
- Added horizontal-divider fields with a full-width default span.
- Added a Style Settings option for theme-default or borderless field inputs.
- Added per-field control over visibility when the frontmatter value is empty.
- Added per-panel control over panel-title visibility.
- Limited placeholder controls and stored placeholder values to supported text field types.
- Removed the predefined default panel so new installations start with an empty panel list.

## 0.6.0

- Added clickable HTTP(S) URLs and Markdown links alongside wikilinks in option chips and readonly fields.
- Added per-field long-value display settings for break-word wrapping or single-line truncation.
- Fixed repeated panel repositioning that caused inputs to lose focus when multiple panels shared an insertion point.
- Prevented Backspace in an empty Multi-select search field from removing the last selected value.
- Fixed folder option sources so selecting or editing a folder reloads matching notes, including optional subfolders.
- Added a folder-source setting that stores selected notes as wikilinks by default.
- Rendered wikilink option values without brackets and made selected wikilinks openable as Obsidian internal links.
- Added theme-aware field value font-size presets using official Obsidian typography variables and a custom size control.
- Removed the unused panel header spacing when a non-collapsible panel has no name.
- Added a per-field Column span setting with panel-column clamping and a single-column mobile fallback.
- Preserved intentionally blank panel names after settings reload.

## 0.5.0

- Added theme-aware Style Settings presets using official Obsidian CSS variables.
- Added custom light/dark color pickers alongside the theme-variable presets.
- Added background, border, title, label, readonly value, Rating, Progress, and Chip color controls.
- Added border width/style and panel padding controls.
- Triggered Style Settings reparsing when Property Panels loads.
- Preserved settings-page scroll position during structural edits.
- Preserved expanded panel, rule, layout, and advanced-editor sections during rerenders.
- Added automated YAML and Style Settings definition validation.

## 0.4.0

- Added complete keyboard navigation and ARIA active-option handling for Multi-select.
- Added arrow, Home, End, and clear-key controls for Rating.
- Replaced global option-cache clearing with source-aware file and folder invalidation.
- Added a privacy-preserving diagnostics command and Settings section.
- Added configuration JSON copying and confirmation-protected default restoration.
- Added keyboard-navigation and option-invalidation regression tests.

## 0.3.0

- Added Vault folder Intellisense to folder rule paths and folder option sources.
- Added `date` and `datetime` property field types.
- Added explicit option loading, empty, and error states.
- Added the experimental **Property Panels Options** Bases view and in-memory option cache.
- Added Bases cache-key, value-property, and label-property configuration.
- Increased the minimum Obsidian version to 1.10.0 for the public Bases View API.
- Added settings and Bases cache regression tests.

## 0.2.0

- Added visual editors for global layout, panels, fields, option sources, and folder rules.
- Added add, duplicate, delete, and reorder actions.
- Added type-specific settings for number, progress, rating, select, and multi-select fields.
- Added editable panel IDs for folder-rule inheritance overrides.
- Added folder-source exclusion editing.
- Kept the JSON editor as a collapsible advanced tool.
- Added settings normalization and validation tests.
- Prevented no-op DOM placement from creating MutationObserver refresh loops.
- Cleaned up mounts and observers for Markdown views that leave the workspace.
- Applied configured panel gaps to mounted containers.
