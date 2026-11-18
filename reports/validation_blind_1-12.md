# Hold-out validation (blind mode, 12 worlds, seeds 1-12)

None of these were used for tuning. Median [middle half] of worlds vs real history. Pass = median inside a generous band around history.

| Measure | Real history | Simulated | Pass |
|---|---|---|---|
| Black Death: share of Europe lost 1345-1360 | 25-50% | n/a in blind mode | – |
| Largest war before 1800 | 10-40M | 3.0M [2.2M–3.3M] | ❌ |
| Largest war 1900-1999 | 70-85M | 1.8M [1.3M–14M] | ❌ |
| Lifespan of states that peak above 10M people (years) | a few centuries (150-500) | 179 [33–557] | ✅ |
| Largest city in 1000 | ~0.45M (Cordoba/Kaifeng) | 1.0M [0.8M–1.5M] | ❌ |
| Largest city in 1500 | ~0.7M (Beijing) | 0.9M [0.7M–1.0M] | ✅ |
| Largest city in 1800 | ~1.1M (Beijing) | 1.7M [1.0M–12M] | ✅ |
| Largest city in 1900 | 6.5M (London) | 14M [1.9M–40M] | ❌ |
| Largest city in 2000 | ~35M (Tokyo) | 55M [13M–201M] | ✅ |
| Urban share 1800 | ~7% | 12% [12%–34%] | ❌ |
| Urban share 1900 | ~16% | 39% [13%–56%] | ❌ |
| Urban share 1950 | ~30% | 55% [15%–61%] | ❌ |
| Urban share 2000 | ~47% | 61% [38%–63%] | ❌ |
| Life expectancy 1800 (crude) | ~29 | 28 [25–30] | ✅ |
| Life expectancy 1950 (crude) | ~46 | 51 [28–80] | ✅ |
| Life expectancy 2020 (crude) | ~72 | 80 [36–80] | ✅ |
| Christianity share of world 2020 | 31% | n/a in blind mode | – |
| Islam share of world 2020 | 25% | n/a in blind mode | – |
| Hinduism share of world 2020 | 15% | n/a in blind mode | – |
| Buddhism share of world 2020 | 7% | n/a in blind mode | – |
| Christianity share of world 1500 | ~19% | n/a in blind mode | – |
| Islam share of world 1500 | ~13% | n/a in blind mode | – |
| Two largest faiths together, 2020 | ~56% (Christianity + Islam) | 62% [56%–69%] | ✅ |
| States above 1M people, 1000 | dozens | 21 [20–23] | ✅ |
| States above 1M people, 1800 | ~60 | 56 [51–62] | ✅ |
| States above 1M people, 2000 | ~150 | 88 [80–96] | ❌ |
| Democracies among states above 1M, 1900 | ~10% | 0% [0%–18%] | ❌ |
| Democracies among states above 1M, 2000 | ~50% | 20% [0%–62%] | ❌ |

**10 of 21 pass.**
