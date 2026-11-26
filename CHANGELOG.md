# Changelog

## 1.11.0

- Added core actor effects for initiative, saving throw, weapon attack, and spell attack boosts; automated initiative advantage and Magic Resistance, while keeping condition-specific saves manual to avoid overgranting advantage.
- Added proper D&D5e activities and uses for limited-use species traits, including Stonecunning, Healing Hands, Adrenaline Rush, and Relentless Endurance.
- Added supported species trait effects for poison resistance, darkvision, Gnomish Cunning, Brave, and Fey Ancestry.
- Gave command and leadership activities ally targeting and removed non-rules workflow notes from generated item descriptions.
- Fixed trait card layout, grouped all species traits together, simplified the tab label to Traits, and made enabling Foundation select all four managed fields.
- Reviewed the full bundled library and documented which entries are automated and which still require GM adjudication or configuration.

## 1.10.0

- Reworked recommended ability scores so CR proficiency benchmarks affect only role-relevant attack and save abilities; unrelated scores now follow the selected role and species profile.
- Moved NPC boosts into the same icon-card selection library as actions and traits, with descriptions on hover, category rollups, search, and selected-only filtering.
- Compiled boost Items with their native activities, uses, DAE effects, and Midi-QOL changes where supported; replaced monochrome boost icons with coloured Foundry core icons.
- Kept secondary attack profiles selectable in combined mode at every CR and stopped CR refreshes from overwriting the GM's selection.
- Removed the duplicate species selector from the new-creature Build tab; Identity remains the source of species for new NPCs.

## 1.9.0

- Made the Monster Forge token control handle both selected-NPC editing and new creature creation; removed the separate create control.
- Moved new-creature identity to its own tab, removed Culture, and locked species to creature type for non-humanoids.
- Combined NPC actions and traits with Boosts while keeping their application toggle and undo scope independent.
- Added a GM Setup tab for linking Item compendiums and choosing the default species-trait behavior.
- Moved boost definitions into the bundled Item compendium and made boost categories derive from item metadata.
- Added editable Item-backed species profiles for every creature type; toned down beast, undead, and construct ability recommendations and defaulted suggested scores to avoid forcing CR attack math into ability scores.
- Replaced campaign-specific attacks with standard D&D 2024 weapon presets and validated the added core icon paths against the supplied Foundry icon catalog.

## 1.8.0

- Added a create-from-scratch NPC flow with name, image, creature type, species/lineage, and culture fields; the actor is created only after submission and removed if forging fails.
- Separated creature type from species, added the 2024 creature type list, and normalized legacy Half-Orc species metadata to Orc. Species presets no longer apply legacy ability-score bonuses.
- Added an NPC-only Features tab for selecting reusable Action, Trait, and Species Trait Items from the bundled Item compendium and GM-linked Item compendiums.
- Added a species-trait toggle during new NPC creation, enabled by default, and bundled starter trait Items plus blank Action, Trait, and Species Feature templates.
- Included selected content Items in section-scoped replacement, cleanup, and undo, preserving their D&D5e activities and Active Effects.
- Added the bundled Item pack to the Foundry package and release archive.

## 1.7.0

- Added client-scoped named build profiles that save and restore the full NPC setup across actors.
- Added a Quick build view that reduces the visible workflow while preserving explicit section apply states.
- Added editable reach and normal/long range for custom melee and ranged attacks.
- Added an optional existing-damage reserve to the DPR allocation. The conservative estimate assumes each offensive item is used once per round and warns that multiattack, recharge, and limited-use features need review.
- Expanded the Review tab with directional HP, AC, attack, and save-DC benchmark diagnostics and a clear reminder that this is not a complete CR calculation.

## 1.6.0

- Replaced runtime compendium scanning with 55 built-in boost variants across Initiative, Movement, Defence, Saving Throws, Recovery, Weapon Accuracy, Spellcasting, and Leadership.
- Added categorized, collapsible selectors with search, selected-only filtering, per-category and global clearing, selected counts, and role/tier recommendations.
- Added optional custom actor-item names while preserving stable boost IDs, exclusive families, replacement behavior, and actor-state restoration.
- Generated native D&D5e feat items, activities, healing rolls, item uses, and version-aware Active Effects for D&D5e 5.x and 6.x; conditional traits retain clear manual fallbacks and optional Midi-QOL/DAE enhancement.
- Added power, action-economy, automation, and FoF-impact badges plus a live after-foundation impact review for AC, speed, initiative, saves, accuracy, spell DC, recovery, and special actions.
- Added likely-duplicate actor-feature detection, strong-combination warnings, safe migration messaging for old compendium UUID selections, and name-based restoration for compatible legacy generated boosts.
- Expanded regression coverage for built-in catalog structure, stable selection normalization, recommendations, custom names, actor restoration, cross-version effects, generated activities, impact math, Replace, and Undo.

## 1.5.0

- Replaced the scrolling workflow with Build, Foundation, Boosts, Attacks, and Review tabs, including persistent per-section apply controls and an exact Review summary.
- Added attacks-only, foundation-only, and boosts-without-attacks workflows. Replace and Undo now affect only the enabled actor fields and generated item groups.
- Added combined (**and**) versus alternative (**or**) attack routines. Alternatives receive separate full-round DPR budgets and are compared rather than added together.
- Rewrote generated Multiattack text in standard stat-block language for single, combined, equal-count alternative, and unequal-count alternative routines.
- Expanded regression coverage for saved section states, actor-profile selection, section-scoped replacement and undo, alternative DPR, attack cadence, and Multiattack wording.

## 1.4.1

- Fixed the Monster Forge button failing to open when Wraeclast NPC Generator was inactive. Optional legacy species metadata is now read directly from the actor's stored flags without requiring the source module to be active.
- Added regression coverage for inactive legacy flag scopes.

## 1.4.0

- Added a live six-attribute preview with separate suggested and final scores plus visible per-ability overrides.
- Role, CR, species, attack profile, and spellcasting-ability changes now immediately recalculate the suggested array.
- Added explicit spell-led role handling. Caster can derive both spell attack and save DC from Intelligence, Wisdom, or Charisma; Controller, Support, and Leader can derive their role-led save DC from the selected mental ability.
- Added Arcane Bolt, Divine Bolt, and Occult Bolt spell-attack presets and a warning when a Caster uses only weapon attacks.
- Added dynamic Item-compendium boost discovery through an **NPC Boost**/**NPC Boosts** folder hierarchy or the `flags.monster-forge.boost` opt-in flag.
- Grouped `I`/`II`/`III` and `1`/`2`/`3` source items as ranked choices, including the existing quarter-, half-, and full-caster progression items.
- Boosts are copied from their source compendium with effects and automation intact, marked as generated, and included in Replace and Undo transactions.
- Blocked legacy CR, HP, DPR, and minion-HP items that would conflict with the FoF foundation.
- Added console boost-catalog inspection and expanded regression coverage for role switching, nested compendium folders, rank conflicts, source resolution, and boost rollback.

## 1.2.0

- Added a FoF-first NPC foundation stage before attack generation.
- Added nine transparent combat roles: Balanced, Brute, Soldier, Skirmisher, Sniper, Controller, Support, Caster, and Leader.
- Added separate Minion, Standard, Elite, and Boss tiers without conflating tier with combat role.
- Added the thirteen species used by Wraeclast NPC Generator, plus a preserve-actor option; species affects recommended body data and ability tendencies but never culture or faction.
- Added automatic species pickup from Wraeclast NPC Generator actor flags.
- Added recommended HP, AC, attack bonus, save DC, DPR, proficiency, six ability scores, size, walk speed, and darkvision.
- Added manual overrides for every recommended statistic and checkboxes for the actor fields Monster Forge may manage.
- Added preview-only foundation mode, preserve-current-HP-percentage and heal-to-full policies, and a clear before/after preview.
- Added **Apply foundation only** for a stats-first workflow before attacks or later ranked boosts are added.
- Attack damage, flat accuracy, and flat save DC now consume the selected final foundation benchmark.
- Added D&D5e 5.x/6.x-aware actor paths for AC, movement, and senses.
- Foundation updates and generated items now share one rollback-safe operation; **Undo last** restores both actor data and items.
- Stored foundation provenance distinguishes published *Forge of Foes* values from Monster Forge role, tier, species, and override decisions.
- Expanded automated coverage for foundation math, overrides, D&D5e 6 actor updates, HP preservation, and full transaction undo.

## 1.1.0

- Renamed the DPR-only role selector to the more accurate **Damage adjustment**.
- Added a live actor-versus-*Forge of Foes* audit for HP, AC, attack bonus, and save DC.
- Shows exact actor-derived attack bonuses and ability-derived save DCs in the preview.
- Added an ability override to every preset and custom attack profile.
- Detects existing ungenerated offensive items and warns that their output is outside the generated DPR budget.
- Separated suggested attack cadence from the number of distinct attack profiles.
- Added **Follow CR count**, with manual count edits automatically disabling it.
- Added optional Midi-QOL and DAE rider automation: successful hits trigger the rider save, and failed saves apply a native condition effect.
- Generated descriptions now use D&D5e's native attack, damage, save, and condition enrichers for standard NPC-statblock output.
- Expanded automated coverage for attack distribution, actor audits, ability overrides, and Midi-QOL item data.

## 1.0.0

- Converted the ScriptWright macro into an installable Foundry module.
- Uses the complete published *Forge of Foes* DPR, proficient ability bonus, and AC/DC progression from CR 0 to 30.
- Recalculates each hit from total DPR and the selected attack count instead of multiplying rounded per-attack examples.
- Adds a compressed 1/2/3/4 attack schedule for faster high-CR turns while preserving the published count for comparison.
- Corrected D&D5e attack activity type/classification data.
- Added live damage, accuracy, save DC, and attack-count checks.
- Added reversible apply, explicit undo, generated-item removal, and failure rollback.
- Added module-scoped flags and legacy macro item recognition.
- Added actor sheet, Token Controls, keybinding, and console entry points.
- Added custom attacks, Wraeclast weapon presets, deterministic icons, and remembered client defaults.
- Added automated tests and GitHub release packaging.
