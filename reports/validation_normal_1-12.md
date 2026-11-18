# Hold-out validation (normal mode, 12 worlds, seeds 1-12)

None of these were used for tuning. Median [middle half] of worlds vs real history. Pass = median inside a generous band around history.

| Measure | Real history | Simulated | Pass |
|---|---|---|---|
| Black Death: share of Europe lost 1345-1360 | 25-50% | 32% [31%–32%] | ✅ |
| Largest war before 1800 | 10-40M | 2.9M [2.4M–3.9M] | ❌ |
| Largest war 1900-1999 | 70-85M | 11M [8.7M–21M] | ❌ |
| Lifespan of states that peak above 10M people (years) | a few centuries (150-500) | 148 [20–429] | ✅ |
| Largest city in 1000 | ~0.45M (Cordoba/Kaifeng) | 1.0M [0.9M–1.4M] | ✅ |
| Largest city in 1500 | ~0.7M (Beijing) | 0.9M [0.9M–1.5M] | ✅ |
| Largest city in 1800 | ~1.1M (Beijing) | 14M [2.5M–34M] | ❌ |
| Largest city in 1900 | 6.5M (London) | 44M [22M–131M] | ❌ |
| Largest city in 2000 | ~35M (Tokyo) | 153M [101M–212M] | ❌ |
| Urban share 1800 | ~7% | 38% [14%–55%] | ❌ |
| Urban share 1900 | ~16% | 58% [41%–61%] | ❌ |
| Urban share 1950 | ~30% | 62% [57%–63%] | ❌ |
| Urban share 2000 | ~47% | 63% [62%–63%] | ❌ |
| Life expectancy 1800 (crude) | ~29 | 31 [28–50] | ✅ |
| Life expectancy 1950 (crude) | ~46 | 80 [51–80] | ❌ |
| Life expectancy 2020 (crude) | ~72 | 80 [80–80] | ✅ |
| Christianity share of world 2020 | 31% | 32% [25%–42%] | ✅ |
| Islam share of world 2020 | 25% | 3% [2%–9%] | ❌ |
| Hinduism share of world 2020 | 15% | 5% [4%–9%] | ❌ |
| Buddhism share of world 2020 | 7% | 9% [6%–36%] | ✅ |
| Christianity share of world 1500 | ~19% | 14% [9%–17%] | ✅ |
| Islam share of world 1500 | ~13% | 1% [1%–1%] | ❌ |
| Two largest faiths together, 2020 | ~56% (Christianity + Islam) | 58% [52%–62%] | ✅ |
| States above 1M people, 1000 | dozens | 20 [18–25] | ✅ |
| States above 1M people, 1800 | ~60 | 66 [59–79] | ✅ |
| States above 1M people, 2000 | ~150 | 98 [86–106] | ✅ |
| Democracies among states above 1M, 1900 | ~10% | 31% [0%–50%] | ❌ |
| Democracies among states above 1M, 2000 | ~50% | 53% [39%–66%] | ✅ |

**14 of 28 pass.**
