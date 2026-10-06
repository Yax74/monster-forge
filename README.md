# Monster Forge

Monster Forge is a reversible, *Forge of Foes*-first NPC builder for Foundry VTT's D&D5e system. It recommends the selected NPC's core statistics from CR, layers on a transparent combat role, creature tier, and species/body profile, then allocates the final offensive budget across one or two attacks and an optional on-hit feature.

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
3. Choose CR, combat role, creature tier, and species. Choose **Preview only** if actor statistics should not be written.
4. Select the actor fields Monster Forge may manage, or open **Manual overrides** to replace any recommendation.
5. Choose attack profiles, condition automation, and any tertiary feature.
6. Review the foundation sources, before/after statistics, live DPR, and warnings.
7. Click **Apply foundation only** to stop after the core statistics, or **Forge NPC** to apply the foundation and create attacks together. **Undo last** restores the actor statistics and generated items from that operation.

Foundation apply mode always writes the selected CR. HP, AC, ability scores, and body data each have separate management controls. HP can preserve the actor's current health percentage or be set to full. Preview-only mode still uses the selected role/tier DPR benchmark for generated attacks, but it does not change the actor's statistics.

The console API is also available:

```js
game.monsterForge.open();
game.monsterForge.undo();
game.monsterForge.removeGenerated();
game.monsterForge.getFoundation();
```

## What changed from the macro

- Builds a complete NPC foundation before allocating attacks: CR, HP, AC, attack bonus, save DC, DPR, proficiency, abilities, size, speed, and darkvision.
- Keeps published *Forge of Foes* values separate from Monster Forge's role, tier, species, and manual adjustments, and shows those sources in the dialog.
- Offers Balanced, Brute, Soldier, Skirmisher, Sniper, Controller, Support, Caster, and Leader roles.
- Treats Minion, Standard, Elite, and Boss as a separate layer from combat role.
- Uses the same Human, Half-Elf, Dwarf, Halfling, Gnome, Elf, Tiefling, Half-Orc, Orc, Goliath, Drow, Duergar, and Deep Gnome species vocabulary as Wraeclast NPC Generator.
- Reads species from Wraeclast NPC Generator actors when available, without turning culture or faction into mechanical statistics.
- Applies actor statistics and generated items as one rollback-safe operation, with a one-step undo for both.
- Uses the published *Forge of Foes* total DPR, proficient ability bonus, and AC/DC values for every CR from 0 to 30.
- Recalculates damage from total DPR whenever the attack count changes; it never multiplies the table's rounded per-attack examples.
- Uses a table-friendly attack schedule of 1 attack through CR 1/2, 2 at CR 1–4, 3 at CR 5–25, and 4 at CR 26–30, while showing the published count for comparison.
- Keeps attack count fully editable, can follow CR changes automatically, and does not force multiple weapon profiles for multiple attacks.
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

Monster Forge is a transparent **starting-stat and attack-budgeting** tool, not a complete CR calculator. Role, tier, species ability tendencies, and derived ability arrays are Monster Forge recommendations rather than additional *Forge of Foes* tables. Generated DPR assumes attacks hit and failed saves, matching the damage side of the benchmark; it does not calculate hit probability. Area attacks expected to hit multiple targets, recharge powers, legendary actions, reactions, and off-turn damage need separate judgment. In particular, Minion and Boss tier multipliers do not solve action economy.

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

Release tags must match `module.json`, for example `v1.2.0`.

## License

MIT. See [LICENSE](LICENSE).
