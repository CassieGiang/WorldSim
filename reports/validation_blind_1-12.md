# Hold-out validation (blind mode, 12 worlds, seeds 1-12)

None of these were used for tuning. Median [middle half] of worlds vs real history. Pass = median inside a generous band around history.

| Measure | Real history | Simulated | Pass |
|---|---|---|---|
| Black Death: share of Europe lost 1345-1360 | 25-50% | n/a in blind mode | – |
| Largest war before 1800 | 10-40M | 2.8M [2.3M–3.5M] | ❌ |
| Largest war 1900-1999 | 70-85M | 2.4M [1.4M–12M] | ❌ |
| Lifespan of states that peak above 10M people (years) | a few centuries (150-500) | 336 [133–639] | ✅ |
| Largest city in 1000 | ~0.45M (Cordoba/Kaifeng) | 1.2M [0.8M–1.5M] | ❌ |
| Largest city in 1500 | ~0.7M (Beijing) | 0.9M [0.7M–1.2M] | ✅ |
| Largest city in 1800 | ~1.1M (Beijing) | 2.4M [1.3M–9.5M] | ✅ |
| Largest city in 1900 | 6.5M (London) | 14M [6.3M–33M] | ❌ |
| Largest city in 2000 | ~35M (Tokyo) | 47M [25M–163M] | ✅ |
| Urban share 1800 | ~7% | 13% [13%–31%] | ❌ |
| Urban share 1900 | ~16% | 38% [31%–57%] | ❌ |
| Urban share 1950 | ~30% | 52% [38%–61%] | ❌ |
| Urban share 2000 | ~47% | 60% [55%–61%] | ❌ |
| Life expectancy 1800 (crude) | ~29 | 27 [25–29] | ✅ |
| Life expectancy 1950 (crude) | ~46 | 50 [31–77] | ✅ |
| Life expectancy 2020 (crude) | ~72 | 80 [51–80] | ✅ |
| Christianity share of world 2020 | 31% | n/a in blind mode | – |
| Islam share of world 2020 | 25% | n/a in blind mode | – |
| Hinduism share of world 2020 | 15% | n/a in blind mode | – |
| Buddhism share of world 2020 | 7% | n/a in blind mode | – |
| Christianity share of world 1500 | ~19% | n/a in blind mode | – |
| Islam share of world 1500 | ~13% | n/a in blind mode | – |
| Two largest faiths together, 2020 | ~56% (Christianity + Islam) | 49% [43%–61%] | ✅ |
| States above 1M people, 1000 | dozens | 20 [17–23] | ✅ |
| States above 1M people, 1800 | ~60 | 53 [49–58] | ✅ |
| States above 1M people, 2000 | ~150 | 79 [73–84] | ❌ |
| Democracies among states above 1M, 1900 | ~10% | 0% [0%–4%] | ❌ |
| Democracies among states above 1M, 2000 | ~50% | 20% [1%–39%] | ❌ |

**10 of 21 pass.**
