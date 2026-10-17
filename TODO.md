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

## Built-in categorized boosts

Implemented in v1.6.0. Named loadouts and the advanced catalogue remain future work.

### Catalogue and application model

- [x] Replace runtime compendium discovery/import with a built-in Monster Forge boost registry. Generate the selected feat items and Active Effects inside the module and apply them through the existing section-scoped Replace and Undo transaction.
- [x] Give every boost a stable ID, category, subcategory, family, rank/power label, compatibility requirements, and optional exclusive group. Saved selections use stable IDs rather than compendium UUIDs.
- [x] Preserve existing generated boost items until Boosts is enabled and applied. Provide a one-time migration warning for saved compendium UUID selections that cannot be mapped safely.
- [x] Replace the flat family grid with categorized pull-downs. Each pull-down has a **None** option; categories show their selected count and remember their collapsed state.
- [x] Add an optional custom display name beside every selected boost. A blank value uses the built-in name; custom names affect only the generated actor item and never its stable ID, family, rank, replacement, or migration logic.
- [x] Add search, **Selected only**, and role/tier recommendations without preventing manual choices.
- [x] Preview the generated rule text, formula, affected statistic, action economy, and automation support before applying a boost.
- [x] Treat category as navigation, family as the ranked choice, and exclusive group as the stacking rule. Do not rely on similar names to prevent incompatible selections.
- [x] When reopening Monster Forge, recognise its existing generated boosts and restore their selections and custom names rather than showing only the last client defaults.
- [x] Add **Clear category**, **Clear all boosts**, and **Use role/tier suggestions** controls with no actor changes until Forge NPC is pressed.
- [x] Show compact badges for power level, action economy, required module support, and whether a boost changes a FoF benchmarked statistic.
- [x] Add a before/after Boosts summary on Review for values that can be calculated safely, plus explicit feature/action-economy notes.
- [x] Detect equivalent existing non-Monster-Forge actor features and warn before creating a likely duplicate; never delete or replace those external items automatically.
- [ ] Consider named boost loadouts after the core workflow is stable, allowing recurring archetypes to be reused without batch-generating NPCs.

### Initial boost catalogue

- [x] **Initiative → Initiative Bonus:** +1, +2, +3, +PB, +2 × PB, or advantage. These are mutually exclusive; +2 × PB is labelled a major-power option.
- [x] **Movement → Speed Bonus:** +5 ft., +10 ft., or +15 ft.
- [x] **Movement → Movement Ability:** Nimble Dash, Fleet Footed, Cunning Action, Skirmisher, Flyby, Wall Crawler, Arcane Blink, or Void Step.
- [x] **Defence → Passive AC:** +1, +2, or +3 AC. Permanent +PB AC is omitted because it scales beyond the FoF defensive bands.
- [x] **Defence → Defensive Reaction:** Parry (+PB against one triggering attack), Greater Parry (+2 × PB), Defensive Roll, Uncanny Dodge, or Deflect Missiles.
- [x] **Defence → Saving Throws:** +1, +2, or +3 to all saves; alternatively choose a focused resilience trait for Constitution, mental saves, charm/frightened, poison, or magic.
- [x] **Recovery → Recovery Feature:** Second Wind, Relentless Endurance, or PB-scaled Regeneration ranks with reviewed usage limits.
- [x] **Accuracy → Weapon Attacks:** +1, +2, or +3. Permanent +PB accuracy is omitted because the FoF baseline already includes proficiency scaling.
- [x] **Spellcasting → Spell Potency:** +1, +2, or +3 to spell attacks, and a separate +1 or +2 save DC selector. Review shows the resulting value where it can be calculated safely.
- [x] **Spellcasting → Progression:** Quarter, Half, or Full Caster. Reuse the Foundation tab's Intelligence/Wisdom/Charisma choice instead of creating duplicate casting-ability boosts.
- [x] **Leadership → Command Feature:** Master of Tactics, Tactical Guidance, Rally, Command Ally, Command I, or Command II.

### Later or advanced catalogue

- [ ] Add condition auras, offensive stances, signature creature traits, legendary actions, boss resilience, and team tactics after the core selectors are stable.
- [ ] Keep Multiattack in **Attacks & Riders**, not Boosts.
- [ ] Defer bonus damage dice, Sneak Attack, Divine Smite, elemental strikes, and other DPR-changing riders until they can either consume the existing attack budget or be explicitly marked as exceeding it.
- [ ] Quarantine incomplete, helper-only, duplicated, or actor-specific legacy items rather than recreating them in the built-in catalogue.

### Validation and compatibility

- [x] Use native D&D5e activities and effects where possible, with optional Midi-QOL/DAE enhancement and a clear manual fallback.
- [x] Generate version-aware effect data for supported D&D5e versions and update live previews when CR, role, tier, proficiency, or a boost selection changes.
- [x] Prevent same-family stacking structurally and warn about unusually strong major-power combinations.
- [x] Add regression coverage for generated boost data, exclusivity, formula scaling, role recommendations, section disabling, Replace, Undo, and legacy-selection migration.

