# WorldSim roadmap: "much deeper simulation of nearly everything"

Status: **approved** (18 Nov 2026). Stage 0 done (player mode, custom families, rivers, crisper map, blind mode, validation, regression tests). Stage A first drop done (18 Nov): year-1 peoples from GREG plus a correction layer, assimilation, migration carrying peoples, ethnogenesis, identity revolts and nationalism, people-named states, city renaming. Still to do in A: diasporas and the language-family tree view. Stage F first drop done (18 Nov): what-if branching (fork any year, one change, A and B run side by side with a comparison card), charts (states over time, faiths, language families, this world vs ours with invention dates), generated flags that change with revolutions and dynasties, state pages, and a history book written by the local AI a century at a time. Second drop: side-by-side globes for what-if branches, and in-browser video recording (title card, captions with year and big events, camera that follows them, end card; .webm). Still to do in F: encyclopedia pages for rulers, wars and faiths; branch narration by the AI. Stage B first drop done (18 Nov): crops and animals spreading separately (Columbian exchange crop by crop, replacing the single tech), bread prices and silver inflation, social classes with an inequality index, institutions (serfdom, slavery, guilds, property rights, votes, unions, welfare), class revolts, and big works on the map. Second drop: 14 goods with supply, demand and prices in every state; trade routes earn by the price gaps they close and are named by what they carry (silk, spice and wine routes emerge); exports and imports; taxes that rise with debt; interest, and defaults. Stage B done. Stage B2 first drop done (18 Nov): ideologies born when their conditions first exist (liberalism, conservatism, nationalism, socialism, fascism; invented names in blind mode), spreading through neighbours, trade routes, printing and schools; support by class and crisis per province; elections, ideological revolutions, purges and exported revolutions; ideology shapes research, war appetite, alliances (blocs) and enemies; nation-building (nationhood rises with print, schools, railways, radio); policy toward peoples (one nation, autonomy, repression); dynastic marriages, personal unions and wars of succession; a League of Nations after a world war. Still to do in B2: tributary systems, customs unions and federations, irredentism and population exchanges. Stage C first drop done (19 Nov): field armies on the map with named generals and traits, troop mix by era, marching over terrain (roads and railways faster), living off the land with hunger and disease, named battles, sieges of walled cities (gunpowder shortens them), celebrated generals and coups; the front now moves where the armies are. Research speed recalibrated 1.15 → 1.08 because bigger conquests sped up invention (12-world medians: printing 1462, contact 1489, factories 1786). Phones: the map fills the screen, the panel slides up, pinch to zoom. Second drop (19 Nov): war goals (land, tribute, holy war, regime change, independence, the throne) and named peace treaties (land, reparations, forced conversion, imposed governments); navies, naval battles, blockades and landings; explorers and a 'Known world' map of what each state knows; pirates on unguarded sea lanes and bandits in weak states. Research speed now 1.10 (12-world medians: printing 1402, contact 1451, factories 1761). Play as a governor of any province (serve, skim taxes, protect your people's customs, raise a militia, rise in revolt; a successful revolt makes you the ruler of a new state). Guided families gained many choices (move to the city, better land, the frontier, abroad or the colonies, or anywhere you pick; schooling, marriages, savings, faith). Stage C done. Stage D first drop done (19 Nov): forests cut and regrowing (wood shortage pushes coal), erosion on cleared slopes and salt in irrigated dry land, malaria for newcomers and city immunity to crowd diseases, floods and the Yellow River changing course, droughts, locusts and cattle plague, and emissions that warm the world, shift harvests and raise the sea. Medians unchanged (printing 1434, contact 1444, factories 1783). Side panel reorganised into tabs (World, Inspect, Play, Families, Chronicle).

## Ground rules (apply to every stage)

1. **Mechanisms, not scripts.** Every effect comes from a rule that would also make sense in a world that never existed. No event is forced to happen at a date, except the clearly labelled year-1 inputs and the dated shocks, which blind mode can switch off.
2. **Calibrate on few targets, judge on many.** Tuning is allowed only against a short, fixed list:
   - the world population curve
   - median invention dates

   Everything else is a **hold-out** test the model must pass without being tuned to it (see "Validation"). If a new mechanism is added only because a result "looks wrong", it gets logged as such in this file.
3. **Blind mode stays first-class.** Every stage must also run with random plagues, volcanoes and prophets, so we can tell "our history" apart from "a history".
4. **Speed: whatever it takes, but the page stays responsive.** The simulation moves into a background worker (stage 0). The globe and controls stay smooth even if a full run takes 10+ minutes. Batch runs can go overnight.
5. **Every stage ends with:**
   - a recalibration run
   - the validation report
   - a 50-world batch
   - delivery to your folder and the repo

---

## Stage 0: finishing what's in flight (before the roadmap starts)

- [x] Recalibration after rulers/alliances and Rome's legitimacy (12-world medians: printing 1473, contact 1492, factories 1738)
- [x] Recalibration after the peoples layer: research speed 1.12 → 1.15, and kin peoples (same language branch) no longer break away first in civil wars (12-world medians: printing 1450, contact 1483, factories 1757)
- [x] Family jobs: realistic job mix by era (most people farm until modern times), job changes during life (pressed into the army, leaving the land, new trades)
- [x] Blind mode in the engine (random plagues, eruptions, earthquakes, climate swings, invented prophets)
- [~] Map: 4096×2048 province map, coastlines from the 1 km climate raster, sharper hill shading, **major rivers** (Natural Earth). Textures are built; wiring them into the globe is next.
- [ ] **Hold-out validation report** (`validate.mjs`): scores the model on untuned history, normal vs blind
- [ ] Move the simulation into a Web Worker, so long runs never freeze the page
- [ ] **Automated regression tests** (GitHub Actions). Every push runs:
  - a small headless batch (e.g. 8 worlds) plus the hold-out checks
  - a few deterministic seed tests: the same seed must give the same history

  The push gets flagged if a change knocks medians or hold-outs outside agreed bands. A test report is attached to each commit.
- [ ] **Player mode: you are the council.** A fourth council option next to Off / Rules / AI:
  - **Pick your state:** "Play as this state" on any state's inspector.
  - **Council years:** every N years (your choice) the world pauses on your state's briefing, the same one Qwen gets. You choose:
    - a priority (science, farming, army, expansion, stability or trade)
    - a war target, peace with enemies, or an alliance to propose or leave
    - optionally, a proclamation of your own, which goes into the chronicle
  - **Between councils:** you can act at any time with buttons such as "declare war", "offer peace" and "propose alliance".
  - **Everyone else:** other big states keep their own councils (rules or Qwen), so you're playing against AI rulers.
  - **If your state falls,** you're offered its largest successor, or any state you click.
  - **Grows with the roadmap:** each later stage adds the player's levers.
- [ ] **Custom families.** "Add a family" in the Families panel:
  - **Setup:** choose the surname, the first head's given name and sex, a job (from those possible there and then), and a few optional traits (e.g. stubborn, devout, restless, scholarly) that nudge their choices.
  - **Placement:** click any province on the globe; the family starts there in the current year. You can also restart from year 1 with the family placed.
  - **Following them:** they're followed like the built-in three. Their lives come from what happens to their province, with your names and traits carried down the generations.
  - **Optional "guide them" mode:** at big moments (famine, war at the door, a new trade arriving, a child coming of age) the world pauses and you choose: stay or flee, and where to; enlist or hide; keep the family trade or learn the new one; marry locally or move to the city.
  - **Keep them:** save a family to reuse in other worlds and seeds, and see how the same family fares in different histories.
  - **Built-in families stay** and become optional. Stage A: grant autonomy or impose your language. Stage B: tax rate and serfdom. Stage C: move armies and pick generals. Stage D: protect forests.

## Stage A: peoples & languages *(why no Đại Việt appears)*

**Data (as built):** the GREG modern ethnic map projected back to year 1, with a curated correction layer of ~165 year-1 peoples where modern groups arrived later. Originally planned: a fully curated map of about 200 peoples. Examples: Lạc Việt, Yue, Han, Xiongnu, Xianbei, Koreans (Samhan, Buyeo), Yayoi Wa; Tamils, Sinhalese, Indo-Aryans by region; Persians, Parthians, Sogdians, Bactrians; Arabs, Nabataeans, Aramaeans, Jews; Greeks, Latins, Celts by region, Iberians, Berbers, Egyptians, Nubians; Germanic and Gothic peoples, Balts, Slavs, Finns, Sarmatians, Scythians; Bantu groups, Khoisan; Mon, Khmer, Pyu, Cham, Tai; Mesoamerican, Andean and Amazonian peoples.

Each people gets:
- a language
- a place in a language family tree (about 25 families, ~120 languages)
- a home area
- a default religion
- an identity strength

**Mechanisms:**
- **Assimilation.** Language and identity shift over generations, driven by who rules, the faith they share, cities and schooling. Sinicisation, Latinisation and Arabisation emerge from this, and so does resistance to them (Viet, Basques).
- **Ethnogenesis.** When peoples mix after migration or conquest, a new people can form, with a name and language derived from its parents (think Bulgars, Magyars, English).
- **Migrations.** Nomads and farmers move under climate pressure, famine or being pushed by a stronger people. This produces the Völkerwanderung, the Bantu expansion and Turkic migrations without scripting them.
- **Identity revolts.**
  - Before printing: elite-led revolts by a distinct people under foreign rule, more likely when the ruler is far away, weak, or of another faith. This is the Trưng sisters → Ngô Quyền → Đại Việt pattern.
  - After printing: mass nationalism.
- **New states named after their people,** in their own language (Đại Việt, Goryeo, Rus', Mali…).

- **Diasporas and migration flows:** merchants, refugees, exiles and labour migrants move between states as tracked groups, carrying their faith, language, ideas and skills. Diaspora quarters appear in big cities.
- **Names that evolve:** city and place names change with the language of whoever lives there (a Lutetia → Paris pattern, emergent). Conquerors rename cities, and old names come back after independence.

**UI:** map modes for peoples, languages and language families. Clicking a province shows "peoples here" (several, with their shares).

## Stage B: economy & society

**Goods:**
- grain, livestock, fish, cloth, metal, timber, salt
- luxuries: silk, spices, porcelain, wine
- later: coal, oil, manufactures

**Production:** each province produces goods from its land, resources, tools and workers.

**Markets and money:**
- Regional markets with **prices** set by supply and demand. Famine shows up as grain prices soaring.
- Trade routes carry goods by value, so the Silk Road and spice routes emerge from prices.
- Money and silver: new mines make prices rise (a Spanish-price-revolution effect).
- Taxes, debt and state bankruptcy.

**Crops and animals:**
- Wheat, barley, rice, millet, maize, potatoes, cassava, sugar, cotton and tea; horses, cattle, sheep and camels.
- Each grows where the climate suits it and spreads separately. The Columbian exchange becomes crops and animals actually moving, which replaces the single "New World crops" tech.

**Big works:**
- Walls, canals, roads, ports, bridges, dams, palaces, temples, cathedrals and pyramids.
- Projects take years and cost money and labour (sometimes forced labour). They change the map (canals link markets, walls stop raids) and their prestige feeds stability.

**Social classes in every province:**
- peasants, serfs/slaves, artisans, merchants, clergy, nobles
- later: workers, middle class, professionals

Their shares change with land, trade, tech and law. Inequality is tracked.

**Institutions:**
- serfdom and slavery (they appear and are abolished)
- guilds, property rights, literacy and schooling
- voting rights, unions, welfare

**Unrest by class:** peasant revolts, urban riots, strikes, and revolutions with a class base, feeding into the existing government changes.

**Health by class:** life expectancy and famine deaths differ by class. The rich survive famines.

## Stage B2: nations & ideologies

**Ideologies as ideas that spread** (like faiths and techs):
- **Where they come from:** an idea appears when its conditions exist. Mass printing plus a merchant class produces liberal ideas. Factories plus a large working class produce socialism. Defeat and humiliation plus mass politics produce militarist nationalism. Older idea systems (legalism, Confucian statecraft, divine kingship, tribal confederation) are there from the start.
- **Names:** in normal mode they carry real names; in blind mode they get invented ones.
- **Who follows them:** support is tracked per province and per class. Workers lean socialist, merchants and professionals liberal, nobles and clergy conservative or theocratic, peasants agrarian or traditional.
- **How they spread:** cities, trade, printing, schools, exiles and propaganda. Crises such as famine, lost wars and depressions push people toward the radical ones.
- **Ideological states:** governments adopt an ideology (liberal democracy, socialist republic, one-party state, absolutist monarchy, theocracy…). That changes their policies (taxes, rights, research, war appetite) and their friends. Ideological blocs, a cold war, revolutions exported abroad and purges can emerge from this, unscripted.
- **Politics inside states:** parties and factions per ideology, elections where they exist, coups and revolutions where they don't, and reforms that head off a revolution.

**Dynasties and diplomacy:**
- **Dynastic marriages** between ruling houses, leading to personal unions, inheritance of crowns (Habsburg-style empires built by marriage) and wars of succession when claims collide.
- **Tributary systems:** a hegemon receives tribute and ritual submission and grants trade rights (a Chinese-style tributary order), plus embassies and hostages.

**Nation-building:**
- **Building the nation:** a state can *build* a nation out of its peoples. It standardises a language and schools, conscripts, builds railways, writes national myths and symbols (a flag, anthem and founding story generated per nation), and runs a capital-centred bureaucracy. Peasants become citizens, and regional peoples blend into one national identity, or resist.
- **Holding peoples together:** empires choose between assimilation, autonomy or federation, and repression. Each choice changes how often regions break away.
- **Independence and borders:** colonial independence movements, the rise of nation-states, irredentism ("our people across the border"), population exchanges, and borders hardening in the modern era.
- **Supranational blocs:** customs unions, federations, and a league or United Nations that can emerge after a world war.

**UI:** map modes for ideologies and national identity. The inspector shows party strengths. The player gets nation-building levers (language policy, schooling, autonomy, ideology).

## Stage C: armies & war

**Armies as real units:**
- a location, size and mix (infantry, cavalry, archers, siege, guns, tanks…)
- a commander: a named general with traits
- supply: they eat from the provinces they stand in, so long campaigns starve themselves and the land

**Movement and fighting:**
- **Movement** follows terrain, rivers, roads and later railways. Mountains and deserts channel armies, so passes matter.
- **Battles** are resolved by size, tech, terrain, general skill, morale and supply, and named after the nearest city ("Battle of Kaifeng, 1127").
- **Sieges and fortresses:** cities have walls, sieges take time, and gunpowder changes the balance.
- **Navies:** fleets, sea control, blockades and invasions across the sea.

**Wars and peace:**
- War goals (provinces, tribute, faith, independence, regime change) and **peace treaties** (cede provinces, vassalage, reparations).
- Conscription and mercenaries by era and government. War exhaustion and the home front.

**Exploration:**
- **Fog of war:** each civilisation only knows the parts of the world it has seen.
- **Explorers:** named expeditions by land and sea fill in each civilisation's map, find new trade partners and lead to contact.
- The globe can be shown "as known to" any state.

**Lawlessness:** piracy on busy sea lanes, banditry in weakly held land, smuggling around high taxes, and the navies and garrisons that fight them.

**UI:** armies and fleets on the globe, plus battle markers and war arrows in the replay.

## Stage D: environment

- **Forests:** cut for farms, fuel and ships, regrowing when people leave. Shortages of timber and fuel help push the switch to coal.
- **Erosion and salt:** soil erosion on cleared slopes, and salt building up in irrigated land (Mesopotamia's decline as a mechanism).
- **Disease ecology:**
  - crowd diseases endemic in dense cities, so city-dwellers gain immunity and first-contact epidemics get worse
  - malaria in wetlands and the tropics
  - diseases passed on from livestock
- **Rivers that misbehave:** floods and the Yellow River changing course (hitting the provinces downstream), plus droughts and locust swarms. Dykes and dams become big works that reduce them.
- **Industrial pollution and climate change:** emissions accumulate, warming shifts growing zones, sea level rises, and extreme weather increases. A modern world can damage its own harvests.

## Stage E and beyond: "nearly everything"

- **Health & medicine** as a field with discoveries; a hospital and doctor supply.
- **Education & literacy** per province, universities, a brain drain.
- **Ideas and culture:**
  - schools of thought, scientific discoveries as named events (a person, a city, a year)
  - art and architecture eras
  - censorship versus free inquiry, affecting research
- **More named people:** scientists, generals, prophets, revolutionaries and explorers, with Qwen writing short biographies on demand.
- **Families:** branches that split (siblings who emigrate, marriages joining two lines). Custom families move to stage 0.
- **Law & governance:** codified law, bureaucracy quality, corruption.
- **After 2026:** keep running, with space settlement, AI and the like, but only as extensions of the existing mechanisms.

## Stage F: stories, what-ifs and videos

- **What-if switches and branching:**
  - Freeze any world at any year, change one thing, and run both branches side by side. Examples: no Black Death; Rome never splits; this ruler lives 20 more years; the Han reach America first; and the original video's world-rule switches, like "everyone has IQ 200".
  - Split-screen globes and "branch A vs branch B" comparison cards.
- **A history book by Qwen:**
  - A chapter per century, written from the chronicle. Plus encyclopedia-style pages for every state, ruler, war, faith and family.
  - Exportable as a document. It doubles as video narration.
- **Generated flags and coats of arms** per state, from culture, faith and ideology. They change with revolutions and dynasties.
- **Statistics dashboard:** charts over time for any state or for the world (people, wealth, army, tech, territory, faiths, ideologies), plus "our world vs this world" cards.
- **Video pipeline (phase 5):**
  - Record a run, including AI council answers and family stories.
  - Camera moves, title cards and comparison cards, rendered to video.

## Stage G: worlds, scenarios and play

- **Start scenarios:** year 1, 1000, 1500, 1800 or 1914 with the real map of that time, or "design your own start" (place states, peoples and faiths by painting on the globe).
- **Custom worlds:** load your own map (a heightmap plus a painted climate/biome map, or a simple image). Provinces, rivers and coasts are generated, so any fantasy world can be run through history (Hodaem, say).
- **Hot-seat multiplayer:** several players each take a state in the same world and take turns at council years.
- **Scenario and mod editor** in the page: edit techs, faiths, peoples, ideologies, events and start conditions; save and share them as files.

## Map & presentation (alongside the stages)

- 4K province map, rivers, coastlines from 1 km data (in progress)
- roads and railways drawn as they're built; trade routes by goods
- a **timeline scrubber**: record a run, drag back and forth in time
- the video pipeline itself is in stage F

---

## Validation (the hold-out list)

Targets the model is **never tuned to**. Each is reported as the median and spread over 50 worlds, against real history:

| Measure | Real history (approx.) |
|---|---|
| Black Death deaths, Europe share | 30–50% of Europe |
| Largest pre-1800 war | 10–40 M (Mongols, Taiping later) |
| Largest 20th-century war | 70–85 M |
| Lifespan of big empires | a few centuries |
| Largest city in 1000 / 1500 / 1800 / 1900 / 2000 | ~0.45 M / 0.7 M / 1.1 M / 6.5 M / 35 M |
| Urban share in 1800 / 1900 / 1950 / 2000 | 7% / 16% / 30% / 47% |
| Life expectancy in 1800 / 1950 / 2020 | ~29 / ~46 / ~72 |
| Religion shares in 1500 and 2020 | Christianity 31%, Islam 25%, Hinduism 15%, Buddhism 7% (2020) |
| Number of states with over 1 M people, 1000 / 1800 / 2000 | dozens / ~60 / ~150 |

Stages A–D add their own hold-outs: the number of independent peoples, language survival, price swings in famines, battle casualties, deforestation by 1900. Stage B2 adds: share of democracies over time (~10% of states in 1900, ~50% in 2000), the number of nation-states versus empires in 1900 and 2000, and whether ideological blocs form at all.

## Suggested order and rough size

| Stage | Size | Why here |
|---|---|---|
| 0: finish, validation, worker, player mode, custom families | 2 sessions | everything later depends on these; player mode and families reuse existing hooks |
| A: peoples & languages | 1–2 sessions | your Đại Việt point; identity feeds society and war |
| B: economy & society | 2–3 sessions | biggest system; classes feed unrest and war |
| B2: nations & ideologies | 2 sessions | needs peoples (identity) and classes (who believes what) |
| C: armies & war | 2–3 sessions | needs economy (supply, money), peoples and ideologies (war goals) |
| D: environment | 1–2 sessions | builds on economy (fuel, timber) |
| E: everything else, ongoing | — | — |
| F: stories, what-ifs, videos | 2–3 sessions | any time after stage 0; the history book and branching get richer as stages land |
| G: worlds, scenarios, play | 2–3 sessions | custom worlds need the map pipeline generalised; scenarios need stages A and B2 data |

## Decisions (approved 18 Nov 2026)

1. **Order:** 0 → A → F → B → B2 → C → D → G (stories and videos early, then the deep systems).
2. **Peoples data:** modern ethnic data (GREG, from the *Atlas Narodov Mira*) projected back to year 1, with a **correction layer** that undoes the big known migrations (Turks, Arabs, Magyars, Slavs, Bantu, the Han moving south, Europeans in the Americas…). If GREG can't be fetched, fall back to a curated atlas map.
3. **Armies:** visible units on the globe.
4. **Default mode:** normal (real dated shocks); blind mode one click away.
5. **Calibration:** tune only the population curve and median tech dates; everything else is a hold-out.
6. **Player mode:** full decisions at council years, plus action buttons at any time.
7. **Repo:** the roadmap lives in the repo, and you enable GitHub Pages for a public playable link.
