# Changelog

## 1.3.0

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
