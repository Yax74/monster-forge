# Scaling and assumptions

Monster Forge uses the baseline statistics in the freely published [*Forge of Foes* preview](https://slyflourish_content.s3.amazonaws.com/forge_of_foes_preview.pdf). The module reads total damage per round, proficient ability bonus, and AC/DC directly from that table.

The **FoF attacks** column is preserved for reference. **Suggested attacks** is Monster Forge's compressed schedule for quicker Foundry turns: 1 attack through CR 1/2, 2 attacks at CR 1–4, 3 attacks at CR 5–25, and 4 attacks at CR 26–30. The user can override it at any time.

## Foundation layers

The selected CR row is always the published baseline. The following layers are Monster Forge recommendations and are identified that way in both the dialog and the actor flag.

| Role | HP | AC | Attack | Save DC | DPR | Speed |
|---|---:|---:|---:|---:|---:|---:|
| Balanced | — | — | — | — | — | — |
| Brute | +20% | −2 | −1 | — | +10% | — |
| Soldier | −15% | +2 | +1 | — | −10% | — |
| Skirmisher | −10% | — | — | — | — | +10 ft |
| Sniper | −15% | −1 | +1 | — | — | — |
| Controller | — | — | — | +1 | −15% | — |
| Support | +10% | — | — | — | −20% | — |
| Caster | −20% | −1 | +1 | +1 | +10% | — |
| Leader | +10% | — | — | +1 | −10% | — |

Tier is applied after the role HP/DPR adjustment. It does not change bounded-accuracy values.

| Tier | HP multiplier | DPR multiplier |
|---|---:|---:|
| Minion | ×0.25 | ×0.75 |
| Standard | ×1 | ×1 |
| Elite | ×1.5 | ×1.1 |
| Boss | ×2 | ×1.2 |

Species is a separate body-and-ability recommendation. Its vocabulary matches Wraeclast NPC Generator, but it never implies a culture, faction, or profession. Manual overrides are applied last.

Recommended proficiency follows the standard CR progression. For each ability actually used by a configured attack, Monster Forge derives the required modifier as `attack bonus − proficiency bonus`. For each configured save DC ability, it derives `save DC − 8 − proficiency bonus`. It converts that modifier to a score with `10 + 2 × modifier`, capped at 30. The rest of the array starts from the selected role and species recommendations. The dialog shows this result as **Suggested** before applying any explicit per-score override, then shows the post-override **Final** value. This ability-array derivation is a Monster Forge convenience, not a *Forge of Foes* table.

Caster treats the selected Intelligence, Wisdom, or Charisma score as both its spell-attack and spell-save ability. Controller, Support, and Leader use the selected mental score for their role-led save DC but do not automatically gain a spell attack. Actual configured attack and rider abilities remain part of the calculation, so a weapon-using caster can intentionally become a multi-ability gish.

## Compendium boost layer

Selected NPC boosts are imported only after the foundation and generated attack plan have been calculated. Their source Item data, Active Effects, and third-party automation flags are retained. Consequently, a boost can intentionally change a final score beyond the foundation preview; Monster Forge reports this rather than trying to reverse-engineer arbitrary Active Effects.

Only one item from a ranked family can be selected at once. Source items named **NPC Hitpoints**, **Damage per Round**, **CR Boost**, and **Minion 15 HP Lock** are blocked because they duplicate or invalidate the foundation calculation. Boosts participate in the same Replace and Undo transaction as generated attacks.

## Published baseline

| CR | HP | AC | FoF DPR | Suggested attacks | FoF attacks | Attack bonus | Save DC |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 3 | 10 | 2 | 1 | 1 | +2 | 10 |
| 1/8 | 9 | 11 | 3 | 1 | 1 | +3 | 11 |
| 1/4 | 13 | 11 | 5 | 1 | 1 | +3 | 11 |
| 1/2 | 22 | 12 | 10 | 1 | 1 | +4 | 12 |
| 1 | 33 | 12 | 12 | 2 | 2 | +5 | 12 |
| 2 | 45 | 13 | 17 | 2 | 2 | +5 | 13 |
| 3 | 65 | 13 | 23 | 2 | 2 | +5 | 13 |
| 4 | 85 | 14 | 29 | 2 | 2 | +6 | 14 |
| 5 | 95 | 15 | 35 | 3 | 3 | +7 | 15 |
| 6 | 112 | 15 | 41 | 3 | 3 | +7 | 15 |
| 7 | 127 | 15 | 47 | 3 | 3 | +7 | 15 |
| 8 | 136 | 15 | 53 | 3 | 3 | +7 | 15 |
| 9 | 145 | 16 | 59 | 3 | 3 | +8 | 16 |
| 10 | 155 | 17 | 65 | 3 | 4 | +9 | 17 |
| 11 | 165 | 17 | 71 | 3 | 4 | +9 | 17 |
| 12 | 175 | 17 | 77 | 3 | 4 | +9 | 17 |
| 13 | 184 | 18 | 83 | 3 | 4 | +10 | 18 |
| 14 | 196 | 19 | 89 | 3 | 4 | +11 | 19 |
| 15 | 210 | 19 | 95 | 3 | 5 | +11 | 19 |
| 16 | 229 | 19 | 101 | 3 | 5 | +11 | 19 |
| 17 | 246 | 20 | 107 | 3 | 5 | +12 | 20 |
| 18 | 266 | 21 | 113 | 3 | 5 | +13 | 21 |
| 19 | 285 | 21 | 119 | 3 | 5 | +13 | 21 |
| 20 | 300 | 21 | 132 | 3 | 5 | +13 | 21 |
| 21 | 325 | 22 | 150 | 3 | 5 | +14 | 22 |
| 22 | 350 | 23 | 168 | 3 | 5 | +15 | 23 |
| 23 | 375 | 23 | 186 | 3 | 5 | +15 | 23 |
| 24 | 400 | 23 | 204 | 3 | 5 | +15 | 23 |
| 25 | 430 | 24 | 222 | 3 | 5 | +16 | 24 |
| 26 | 460 | 25 | 240 | 4 | 5 | +17 | 25 |
| 27 | 490 | 25 | 258 | 4 | 5 | +17 | 25 |
| 28 | 540 | 25 | 276 | 4 | 5 | +17 | 25 |
| 29 | 600 | 26 | 294 | 4 | 5 | +18 | 26 |
| 30 | 666 | 27 | 312 | 4 | 5 | +19 | 27 |

## Allocation

1. Start with the published total DPR for the selected CR.
2. Apply the selected role adjustment.
3. Apply the selected tier multiplier.
4. Apply any manual DPR override.
5. Apply the optional fine DPR adjustment (−20% to +20%).
6. Subtract the optional tertiary feature's average damage multiplied by its expected uses per round.
7. Divide the remaining budget between primary and secondary profiles.
8. Divide each profile's budget by its selected number of attacks.
9. Subtract the relevant actor ability modifier from each per-hit target.
10. Find the compact dice combination whose average is closest to that remaining target.

This calculation always works backward from **total DPR**. It does not multiply the rounded damage-per-attack examples in the published table, so changing the number of attacks does not accidentally inflate total damage.

At least one base weapon die is retained. When an extra damage type is selected, at least one extra die is retained as well. This can make very low-CR or high-ability attacks exceed their target, which the preview reports rather than hiding.

## What the preview does not model

- Chance to hit or chance to fail a save
- Advantage, disadvantage, critical hits, resistances, or vulnerabilities
- Expected targets hit by an area effect (the source recommends halving damage for effects that target two or more creatures)
- Recharge probabilities or limited daily uses
- Reactions, legendary actions, lair actions, or off-turn damage
- The effect of debilitating conditions on encounter difficulty
- Final encounter difficulty or the action-economy requirements of elite and boss creatures

Treat the result as a transparent starting point and perform a final encounter-design review.
