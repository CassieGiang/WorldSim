# Hold-out validation (normal mode, 12 worlds, seeds 1-12)

None of these were used for tuning. Median [middle half] of worlds vs real history. Pass = median inside a generous band around history.

| Measure | Real history | Simulated | Pass |
|---|---|---|---|
| Black Death: share of Europe lost 1345-1360 | 25-50% | 31% [31%–31%] | ✅ |
| Largest war before 1800 | 10-40M | 4.1M [2.5M–4.9M] | ❌ |
| Largest war 1900-1999 | 70-85M | 2.2M [1.2M–27M] | ❌ |
| Lifespan of states that peak above 10M people (years) | a few centuries (150-500) | 330 [122–677] | ✅ |
| Largest city in 1000 | ~0.45M (Cordoba/Kaifeng) | 1.2M [0.8M–1.6M] | ❌ |
| Largest city in 1500 | ~0.7M (Beijing) | 0.8M [0.7M–1.2M] | ✅ |
| Largest city in 1800 | ~1.1M (Beijing) | 2.0M [1.6M–37M] | ✅ |
| Largest city in 1900 | 6.5M (London) | 10M [8.4M–159M] | ✅ |
| Largest city in 2000 | ~35M (Tokyo) | 33M [24M–157M] | ✅ |
| Urban share 1800 | ~7% | 12% [12%–57%] | ❌ |
| Urban share 1900 | ~16% | 35% [31%–63%] | ❌ |
| Urban share 1950 | ~30% | 42% [39%–63%] | ❌ |
| Urban share 2000 | ~47% | 58% [57%–63%] | ✅ |
| Life expectancy 1800 (crude) | ~29 | 25 [25–51] | ✅ |
| Life expectancy 1950 (crude) | ~46 | 37 [31–133] | ❌ |
| Life expectancy 2020 (crude) | ~72 | 73 [51–133] | ✅ |
| Christianity share of world 2020 | 31% | 30% [24%–45%] | ✅ |
| Islam share of world 2020 | 25% | 2% [1%–6%] | ❌ |
| Hinduism share of world 2020 | 15% | 5% [4%–6%] | ❌ |
| Buddhism share of world 2020 | 7% | 24% [13%–50%] | ❌ |
| Christianity share of world 1500 | ~19% | 14% [8%–17%] | ✅ |
| Islam share of world 1500 | ~13% | 1% [1%–2%] | ❌ |
| States above 1M people, 1000 | dozens | 20 [19–24] | ✅ |
| States above 1M people, 1800 | ~60 | 50 [44–75] | ✅ |
| States above 1M people, 2000 | ~150 | 75 [66–78] | ❌ |
| Democracies among states above 1M, 1900 | ~10% | 0% [0%–53%] | ❌ |
| Democracies among states above 1M, 2000 | ~50% | 23% [6%–76%] | ❌ |

**13 of 27 pass.**
