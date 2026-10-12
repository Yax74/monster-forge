# Monster Forge To-do

## Tabbed dialog and independently optional sections

- [x] Replace the current long scrolling dialog with clear tabs: **Build**, **Foundation & Attributes**, **Boosts**, **Attacks & Riders**, and **Review**.
- [x] Put an **Apply this section** checkbox on every tab that can change the actor.
- [x] Visually dim and disable an inactive section's write controls while retaining their values. Build inputs remain editable because they are also shared planning inputs for attacks-only work.
- [x] Exclude disabled sections from the apply plan entirely; they do not update actor fields, import boosts, create items, or replace existing items.
- [x] Support an attacks-only workflow using the selected CR benchmark and current actor statistics without foundation writes.
- [x] Support foundation-only and boosts-without-attacks workflows.
- [x] Show each tab's state in its label and summarize the exact enabled sections on Review.
- [x] Preserve per-section checkbox states in client defaults.
- [x] Keep each operation rollback-safe and restore only the fields and item groups it changed.
- [x] Cover section defaults, attacks-only, foundation-only, disabled item groups, scoped Replace, and Undo with regression tests.

## Alternative attack profiles

- [x] Allow attack profiles to be marked as alternatives and display them with **or**, such as **Longsword or Longbow**.
- [x] Treat alternative profiles as different ways to spend the same action/DPR allocation rather than adding their DPR together.
- [x] Retain each alternative's own range, ability, damage type, rider, and attack formula.
- [x] Generate clear Multiattack descriptions for equal-count and unequal-count alternatives.
- [x] Distinguish alternatives from genuinely combined routines using **and** wording.
- [x] Add live explanation/warnings and regression tests for cadence, mixed routines, melee/ranged alternatives, and DPR totals.

