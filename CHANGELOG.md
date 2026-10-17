# Changelog

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
