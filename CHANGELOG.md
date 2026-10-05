# Changelog

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
