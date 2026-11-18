# Hold-out validation (blind mode, 12 worlds, seeds 1-12)

None of these were used for tuning. Median [middle half] of worlds vs real history. Pass = median inside a generous band around history.

| Measure | Real history | Simulated | Pass |
|---|---|---|---|
| Black Death: share of Europe lost 1345-1360 | 25-50% | n/a in blind mode | – |
| Largest war before 1800 | 10-40M | 3.1M [2.5M–3.8M] | ❌ |
| Largest war 1900-1999 | 70-85M | 8.4M [0.9M–18M] | ❌ |
| Lifespan of states that peak above 10M people (years) | a few centuries (150-500) | 134 [16–419] | ✅ |
| Largest city in 1000 | ~0.45M (Cordoba/Kaifeng) | 1.2M [0.8M–1.9M] | ❌ |
| Largest city in 1500 | ~0.7M (Beijing) | 1.1M [1.0M–1.2M] | ✅ |
| Largest city in 1800 | ~1.1M (Beijing) | 14M [1.8M–22M] | ❌ |
| Largest city in 1900 | 6.5M (London) | 28M [11M–107M] | ❌ |
| Largest city in 2000 | ~35M (Tokyo) | 124M [41M–204M] | ❌ |
| Urban share 1800 | ~7% | 38% [14%–44%] | ❌ |
| Urban share 1900 | ~16% | 58% [38%–61%] | ❌ |
| Urban share 1950 | ~30% | 61% [48%–62%] | ❌ |
| Urban share 2000 | ~47% | 63% [58%–63%] | ❌ |
| Life expectancy 1800 (crude) | ~29 | 30 [26–40] | ✅ |
| Life expectancy 1950 (crude) | ~46 | 80 [50–80] | ❌ |
| Life expectancy 2020 (crude) | ~72 | 80 [79–80] | ✅ |
| Christianity share of world 2020 | 31% | n/a in blind mode | – |
| Islam share of world 2020 | 25% | n/a in blind mode | – |
| Hinduism share of world 2020 | 15% | n/a in blind mode | – |
| Buddhism share of world 2020 | 7% | n/a in blind mode | – |
| Christianity share of world 1500 | ~19% | n/a in blind mode | – |
| Islam share of world 1500 | ~13% | n/a in blind mode | – |
| Two largest faiths together, 2020 | ~56% (Christianity + Islam) | 60% [55%–70%] | ✅ |
| States above 1M people, 1000 | dozens | 20 [18–23] | ✅ |
| States above 1M people, 1800 | ~60 | 55 [49–65] | ✅ |
| States above 1M people, 2000 | ~150 | 86 [77–94] | ❌ |
| Democracies among states above 1M, 1900 | ~10% | 34% [0%–50%] | ❌ |
| Democracies among states above 1M, 2000 | ~50% | 63% [30%–70%] | ✅ |

**8 of 21 pass.**
