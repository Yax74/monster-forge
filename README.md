# Monster Forge

Monster Forge is a reversible, *Forge of Foes*-first NPC builder for Foundry VTT's D&D5e system. It recommends the selected NPC's core statistics from CR, layers on a transparent combat role, creature tier, species/body profile, and optional built-in boosts, then allocates the final offensive budget across one or two attacks and an optional on-hit feature.

## Install

Paste this manifest URL into **Foundry Setup → Add-on Modules → Install Module**:

```text
https://github.com/Yax74/monster-forge/releases/latest/download/module.json
```

Enable **Monster Forge** in the world's Manage Modules screen.

## Compatibility

| Foundry | D&D5e | Support |
|---|---|---|
| 13 | 5.1.x–5.3.x | Supported |
| 14 | 5.3.x–6.0.x | Supported |

D&D5e 6.x itself requires Foundry V14. Monster Forge uses the attack/save activity shape shared by the supported D&D5e versions: attack range is `melee` or `ranged`, while classification is `weapon` or `spell`.

## Use

1. Select exactly one NPC token, or open an NPC actor sheet.
2. Click the hammer in Token Controls, use the NPC sheet header control, or press **Alt+M**.
3. Work through the **Build**, **Foundation**, **Boosts**, and **Attacks** tabs, then check the exact enabled-section summary on **Review**.
4. Clear a tab's apply checkbox to leave that part of the actor untouched. Choices are retained for the next use; Build choices remain available as planning inputs even when CR writing is off.
5. Choose CR, combat role, creature tier, and species. Spell-led roles also expose an Intelligence, Wisdom, or Charisma selector. Choose **Preview only** if no build or foundation actor fields should be written.
6. Review the live suggested/final ability scores and enter only the overrides you want to lock. Role and build changes recalculate every blank score immediately.
7. Optionally choose categorized built-in boosts. Search or filter them, apply role/tier suggestions, and give any selected boost a custom actor-item name. Then choose a single, combined (**and**), or alternative (**or**) attack routine and any tertiary feature.
8. Click **Apply build & foundation** for actor fields only, or **Forge NPC** to apply exactly the enabled sections. **Undo last** restores only the actor fields and generated item groups changed by that operation.

With Build enabled, Foundation apply mode writes the selected CR. HP, AC, ability scores, and body data are independently gated by the Foundation tab and its field controls. HP can preserve the actor's current health percentage or be set to full. Preview-only mode still uses the selected role/tier DPR benchmark for generated attacks, but it does not change the actor's statistics. An attacks-only run can use the selected CR budget and the actor's current ability scores/proficiency without writing foundation data.

The console API is also available:

```js
game.monsterForge.open();
game.monsterForge.undo();
game.monsterForge.removeGenerated();
game.monsterForge.getFoundation();
game.monsterForge.getBoostCatalog();
```

## Built-in boosts

Monster Forge includes 55 choices organized under **Initiative**, **Movement**, **Defence**, **Saving Throws**, **Recovery**, **Weapon Accuracy**, **Spellcasting**, and **Leadership**. Each pull-down is an exclusive family: choosing another rank replaces the earlier rank instead of allowing accidental stacking. Stable internal IDs keep custom names separate from replacement and migration logic.

Selected boosts are generated directly as D&D5e feat items. Straight numerical bonuses use transferable, version-aware Active Effects; actions, reactions, healing, recharge features, and recovery use native activities and item uses where practical. Conditional features keep complete rule text and a manual fallback. Midi-QOL and DAE can enhance supported advantage effects but are never required to read or use the feature.

Boosts apply after the FoF foundation and may intentionally move the finished actor beyond its benchmark. The Review tab shows safely calculable before/after changes and calls out recovery or action-economy additions. Reopening an actor restores Monster Forge's generated boost selections and custom names. Older generated compendium boosts are mapped by stable known names where safe; unmapped saved UUIDs produce a migration warning and are never silently substituted.

## What changed from the macro

- Builds a complete NPC foundation before allocating attacks: CR, HP, AC, attack bonus, save DC, DPR, proficiency, abilities, size, speed, and darkvision.
- Keeps published *Forge of Foes* values separate from Monster Forge's role, tier, species, and manual adjustments, and shows those sources in the dialog.
- Offers Balanced, Brute, Soldier, Skirmisher, Sniper, Controller, Support, Caster, and Leader roles.
- Recalculates and displays suggested and final ability scores whenever CR, role, species, attacks, or spellcasting ability changes; any score can be explicitly overridden.
- Gives spell-led roles a configurable mental ability and includes Intelligence-, Wisdom-, and Charisma-based spell-attack presets.
- Treats Minion, Standard, Elite, and Boss as a separate layer from combat role.
- Generates categorized NPC boosts without requiring a campaign compendium, with search, recommendations, custom names, migration handling, and live impact review.
- Uses the same Human, Half-Elf, Dwarf, Halfling, Gnome, Elf, Tiefling, Half-Orc, Orc, Goliath, Drow, Duergar, and Deep Gnome species vocabulary as Wraeclast NPC Generator.
- Reads species from Wraeclast NPC Generator actors when available, without turning culture or faction into mechanical statistics.
- Applies actor statistics and generated items as one rollback-safe operation, with a one-step undo for both.
- Separates Build, Foundation, Boosts, and Attacks into independently optional tabs; Replace and Undo are scoped to only the enabled generated-item groups.
- Uses the published *Forge of Foes* total DPR, proficient ability bonus, and AC/DC values for every CR from 0 to 30.
- Recalculates damage from total DPR whenever the attack count changes; it never multiplies the table's rounded per-attack examples.
- Uses a table-friendly attack schedule of 1 attack through CR 1/2, 2 at CR 1–4, 3 at CR 5–25, and 4 at CR 26–30, while showing the published count for comparison.
- Keeps attack count fully editable, can follow CR changes automatically, and does not force multiple weapon profiles for multiple attacks.
- Supports combined attack routines that split DPR and use both profiles, plus alternative routines that give each profile the full round budget and produce standard **or** wording without double-counting DPR.
- Uses D&D5e's current activity schema for melee/ranged and weapon/spell attacks.
- Replaces only items flagged by Monster Forge; unrelated actor items are never deleted.
- Provides explicit **Undo last** and **Remove generated** actions instead of treating every rerun as a revert.
- Rolls back a partially failed apply operation.
- Shows generated DPR, per-hit formulas, exact actor-derived attack bonuses, save DCs, and rounding warnings before writing anything.
- Produces standard D&D5e stat-block descriptions using native attack, damage, save, and condition links.
- Compares the actor's HP and AC plus the generated accuracy/DC against the selected *Forge of Foes* benchmark.
- Allows every preset attack to override its associated ability score.
- Warns when existing ungenerated offensive items are outside the new damage budget.
- Offers actor-derived or flat *Forge of Foes* accuracy/DC modes.
- Preserves the campaign presets: Karui Chopper, Oriathan Halberd, Ezomyte Warhammer, and Maraketh Bow.
- Uses deterministic core icons and client-scoped defaults.
- Recognizes items created by the original macro's `world.monsterForge` flag and can safely replace them.

## Rules limits

Monster Forge is a transparent **starting-stat and attack-budgeting** tool, not a complete CR calculator. Role, tier, species ability tendencies, derived ability arrays, spell-led role handling, and built-in boost effects are Monster Forge or campaign recommendations rather than additional *Forge of Foes* tables. Generated DPR assumes attacks hit and failed saves, matching the damage side of the benchmark; it does not calculate hit probability. Area attacks expected to hit multiple targets, recharge powers, legendary actions, reactions, recovery, and off-turn damage need separate judgment. In particular, Minion and Boss tier multipliers do not solve action economy.

Status riders always create a native Save activity, an embedded condition effect, and clickable save/condition links. In **Midi-QOL** mode, the attack also receives a Midi triggered-activity link. With Midi-QOL and DAE active—and Midi-QOL configured to apply item effects—the save is triggered for hit targets and the condition is applied to failed-save targets. Manual mode leaves the save and effect application under GM control through the native D&D5e chat card.

Midi-QOL and DAE are recommended rather than required. Monster Forge remains usable with core D&D5e when either module is absent; the dialog reports whether both integrations are active.

See [Scaling and assumptions](docs/scaling.md) for the full table and calculation details.

The baseline statistics are transcribed from the freely published [*Forge of Foes* preview](https://slyflourish_content.s3.amazonaws.com/forge_of_foes_preview.pdf). Monster Forge is an independent, unofficial utility and is not affiliated with the book's authors or publisher.

## Updating

Foundry checks the `manifest` URL in `module.json`. Each GitHub release automatically runs tests, builds `monster-forge.zip`, and attaches an updated manifest. Once a release is published, Foundry's normal module updater can install it.

## Development

```bash
npm test
npm run check
```

Release tags must match `module.json`, for example `v1.6.0`.

## License

MIT. See [LICENSE](LICENSE).
