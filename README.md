# Monster Forge

Monster Forge turns a one-off NPC attack macro into a safe, updateable Foundry VTT module for the D&D5e system. It allocates an offensive damage budget across one or two attacks and an optional on-hit feature, then creates native weapon, feature, and Multiattack items on the selected NPC.

## Install

After the first GitHub release is published, paste this manifest URL into **Foundry Setup → Add-on Modules → Install Module**:

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
3. Choose CR, attacks, and any tertiary feature.
4. Review the live DPR and warnings.
5. Click **Forge attacks**.

The console API is also available:

```js
game.monsterForge.open();
game.monsterForge.undo();
game.monsterForge.removeGenerated();
```

## What changed from the macro

- Uses the published *Forge of Foes* total DPR, proficient ability bonus, and AC/DC values for every CR from 0 to 30.
- Recalculates damage from total DPR whenever the attack count changes; it never multiplies the table's rounded per-attack examples.
- Uses a table-friendly attack schedule of 1 attack through CR 1/2, 2 at CR 1–4, 3 at CR 5–25, and 4 at CR 26–30, while showing the published count for comparison.
- Keeps attack count fully editable and offers a one-click reset to the suggested count.
- Uses D&D5e's current activity schema for melee/ranged and weapon/spell attacks.
- Replaces only items flagged by Monster Forge; unrelated actor items are never deleted.
- Provides explicit **Undo last** and **Remove generated** actions instead of treating every rerun as a revert.
- Rolls back a partially failed apply operation.
- Shows generated DPR, per-hit formulas, attack count, suggested attack bonus, suggested save DC, and rounding warnings before writing anything.
- Offers actor-derived or flat *Forge of Foes* accuracy/DC modes.
- Preserves the campaign presets: Karui Chopper, Oriathan Halberd, Ezomyte Warhammer, and Maraketh Bow.
- Uses deterministic core icons and client-scoped defaults.
- Recognizes items created by the original macro's `world.monsterForge` flag and can safely replace them.

## Rules limits

Monster Forge is an attack **budgeting** tool, not a complete CR calculator. Generated DPR assumes attacks hit and failed saves, matching the damage side of the *Forge of Foes* benchmark; it does not calculate hit probability. Area attacks expected to hit multiple targets, recharge powers, legendary actions, reactions, and off-turn damage need separate judgment.

Status riders create a native Save activity and clear rules text. The condition is intentionally not auto-applied because automation behavior varies between core D&D5e, Midi-QOL, and other modules.

See [Scaling and assumptions](docs/scaling.md) for the full table and calculation details.

The baseline statistics are transcribed from the freely published [*Forge of Foes* preview](https://slyflourish_content.s3.amazonaws.com/forge_of_foes_preview.pdf). Monster Forge is an independent, unofficial utility and is not affiliated with the book's authors or publisher.

## Updating

Foundry checks the `manifest` URL in `module.json`. Each GitHub release automatically runs tests, builds `monster-forge.zip`, and attaches an updated manifest. Once a release is published, Foundry's normal module updater can install it.

## Development

```bash
npm test
npm run check
```

Release tags must match `module.json`, for example `v1.0.0`.

## License

MIT. See [LICENSE](LICENSE).
