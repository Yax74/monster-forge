# Scaling and assumptions

Monster Forge uses the baseline statistics in the freely published [*Forge of Foes* preview](https://slyflourish_content.s3.amazonaws.com/forge_of_foes_preview.pdf). The module reads total damage per round, proficient ability bonus, and AC/DC directly from that table.

The **FoF attacks** column is preserved for reference. **Suggested attacks** is Monster Forge's compressed schedule for quicker Foundry turns: 1 attack through CR 1/2, 2 attacks at CR 1–4, 3 attacks at CR 5–25, and 4 attacks at CR 26–30. The user can override it at any time.

| CR | FoF DPR | Suggested attacks | FoF attacks | Attack bonus | Save DC |
|---:|---:|---:|---:|---:|---:|
| 0 | 2 | 1 | 1 | +2 | 10 |
| 1/8 | 3 | 1 | 1 | +3 | 11 |
| 1/4 | 5 | 1 | 1 | +3 | 11 |
| 1/2 | 10 | 1 | 1 | +4 | 12 |
| 1 | 12 | 2 | 2 | +5 | 12 |
| 2 | 17 | 2 | 2 | +5 | 13 |
| 3 | 23 | 2 | 2 | +5 | 13 |
| 4 | 29 | 2 | 2 | +6 | 14 |
| 5 | 35 | 3 | 3 | +7 | 15 |
| 6 | 41 | 3 | 3 | +7 | 15 |
| 7 | 47 | 3 | 3 | +7 | 15 |
| 8 | 53 | 3 | 3 | +7 | 15 |
| 9 | 59 | 3 | 3 | +8 | 16 |
| 10 | 65 | 3 | 4 | +9 | 17 |
| 11 | 71 | 3 | 4 | +9 | 17 |
| 12 | 77 | 3 | 4 | +9 | 17 |
| 13 | 83 | 3 | 4 | +10 | 18 |
| 14 | 89 | 3 | 4 | +11 | 19 |
| 15 | 95 | 3 | 5 | +11 | 19 |
| 16 | 101 | 3 | 5 | +11 | 19 |
| 17 | 107 | 3 | 5 | +12 | 20 |
| 18 | 113 | 3 | 5 | +13 | 21 |
| 19 | 119 | 3 | 5 | +13 | 21 |
| 20 | 132 | 3 | 5 | +13 | 21 |
| 21 | 150 | 3 | 5 | +14 | 22 |
| 22 | 168 | 3 | 5 | +15 | 23 |
| 23 | 186 | 3 | 5 | +15 | 23 |
| 24 | 204 | 3 | 5 | +15 | 23 |
| 25 | 222 | 3 | 5 | +16 | 24 |
| 26 | 240 | 4 | 5 | +17 | 25 |
| 27 | 258 | 4 | 5 | +17 | 25 |
| 28 | 276 | 4 | 5 | +17 | 25 |
| 29 | 294 | 4 | 5 | +18 | 26 |
| 30 | 312 | 4 | 5 | +19 | 27 |

## Allocation

1. Start with the published total DPR for the selected CR.
2. Apply the optional Monster Forge damage adjustment (−20% to +20%). This changes DPR only; it does not imply a minion, elite, or boss defensive package.
3. Subtract the optional tertiary feature's average damage multiplied by its expected uses per round.
4. Divide the remaining budget between primary and secondary profiles.
5. Divide each profile's budget by its selected number of attacks.
6. Subtract the relevant actor ability modifier from each per-hit target.
7. Find the compact dice combination whose average is closest to that remaining target.

This calculation always works backward from **total DPR**. It does not multiply the rounded damage-per-attack examples in the published table, so changing the number of attacks does not accidentally inflate total damage.

At least one base weapon die is retained. When an extra damage type is selected, at least one extra die is retained as well. This can make very low-CR or high-ability attacks exceed their target, which the preview reports rather than hiding.

## What the preview does not model

- Chance to hit or chance to fail a save
- Advantage, disadvantage, critical hits, resistances, or vulnerabilities
- Expected targets hit by an area effect (the source recommends halving damage for effects that target two or more creatures)
- Recharge probabilities or limited daily uses
- Reactions, legendary actions, lair actions, or off-turn damage
- The effect of debilitating conditions on encounter difficulty
- Defensive statistics or final encounter difficulty

Treat the result as a transparent starting point and perform a final encounter-design review.
