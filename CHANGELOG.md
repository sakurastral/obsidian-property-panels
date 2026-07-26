# Changelog

## 0.5.1

- Prevented Backspace in an empty Multi-select search field from removing the last selected value.
- Fixed folder option sources so selecting or editing a folder reloads matching notes, including optional subfolders.
- Rendered wikilink option values without brackets and made selected wikilinks openable as Obsidian internal links.

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
