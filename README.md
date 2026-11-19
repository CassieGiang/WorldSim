# WorldSim

A world-history simulation from year 1 to today and beyond, one step per year. It starts from the real world of year 1: Rome, the Han, Parthia, the Kushan, Teotihuacan and 20 other states, with real population, climate and terrain. From there everything is simulated. Open `index.html` in a browser. Nothing to install, and it works offline.

`v1/index.html` is the earlier, coarser version (2,921 provinces).

## What's simulated
**Map**
- 11,421 land provinces (~100 km), from the Köppen-Geiger climate map (Beck et al. 2018) and NOAA ETOPO1 relief, plus 40 major rivers.
- Terrain matters: mountains defend in war, slow conquest and plague, and hold less farmland.

**Peoples and languages**
- About 650 peoples of year 1 in ~35 language families. Built from the GREG map of modern ethnic groups (Weidmann, Rød & Cederman 2010, from the Soviet *Atlas Narodov Mira*, 1964), projected back to year 1 with a correction layer for groups that arrived later (Slavs in the Balkans, Turks in Anatolia, Arabs in North Africa, Europeans in the Americas and Australia, Bantu in southern Africa…). The rules are in `data/year1_peoples.py`; `python prep_peoples.py <greg folder>` rebuilds `src/peoples.json`.
- Each province holds a main people and a minority. Peoples assimilate to their rulers (faster in towns, with a shared faith and later with schools), migrants and refugees carry their people with them, and nomad conquerors settle as an elite.
- Provinces that stay mixed for generations can form a new people (e.g. Gotho-Latins), whose tongue comes from the majority.
- Peoples under foreign rule rise up. Before printing these are revolts led by nobles; after printing, nationalism. Independent states take names from their people's own tradition (Đại Việt, Goryeo, Kartli…) or generated ones.
- Generated cities are renamed when a new people takes over, and old names come back.
- Learning survives: a state that takes a fallen state's capital takes over its half-finished inventions, and before the printing press research speeds up the longer the world has had paper (books pile up), so a slow medieval start no longer leaves a world centuries behind. This halved the spread of printing dates and ended the worlds that stayed pre-industrial.
- Diasporas: merchants follow trade routes and settle in foreign cities, and refugees flee war to the cities theirs traded with. A community of another faith than its hosts keeps its identity for centuries; one of the same faith melts in within generations.

**Economy and society**
- 19 crops and animals (wheat, rice, millet, maize, potatoes, cassava, sugar, cotton, tea, coffee, cacao, tobacco, cattle, sheep, horses, camels, llamas…), each growing where the climate suits it. They spread from province to province on their own; across the ocean only after first contact, carried by empires and trade routes. This replaces the old single "New World crops" invention: the Columbian exchange now happens crop by crop.
- 14 goods (grain, livestock, fish, cloth, metal, timber, wine, silk, spices, porcelain, plantation goods, coal, oil, manufactures) with supply, demand and a price in every state. Trade routes earn by the price gaps they close, so silk and spice routes emerge from prices; the trade map names the busiest routes by what they carry.
- Taxes rise when a state is in debt; debt carries interest (cheaper with banking and property rights); too much debt ends in default.
- Bread prices answer to hunger, and silver from new mines in the Americas drives prices up everywhere (a price revolution).
- Social classes in every state (nobles, clergy, merchants, artisans, free peasants, serfs, slaves; later workers, middle class, professionals) and an inequality index.
- Institutions appear and are abolished: serfdom, slavery (including plantation slavery after contact), guilds, property rights, votes for all, trade unions, the welfare state.
- Grievances build up by class and end in peasant revolts, slave risings, strikes and revolutions that can change the government.
- Big works: walls, canals, roads, harbours, temples and cathedrals, palaces, pyramids, railways and dams. They take years and money, can be abandoned, and help trade, reach or pride. They are shown on the map.

**Armies and war**
- Each side of a war fields an army with a named general (brilliant, bold, cautious, cruel, a master of supply…) and the troops of its era, from spearmen to tanks. Armies march over terrain, faster on roads and railways, and live off the land, so long campaigns starve themselves and the provinces they cross.
- Battles are named after the nearest city. Walled cities must be besieged; gunpowder shortens sieges. Generals with many victories become famous and may seize power.
- Wars have goals (land, tribute, holy war, regime change, independence, the throne) and end in named treaties (land, reparations, forced conversion, imposed governments).
- Tributaries: small neighbours of a great power send tribute missions for trade and favour; kindred tributaries are slowly absorbed. Industrial allies form customs unions; long unions of kindred states can merge into a federation. In the age of nations, states covet the border lands where their own people live and fight wars to unite them; the treaties that follow can move whole populations.
- Navies fight, blockade ports and land troops. Pirates prey on unguarded sea lanes; bandits rule the roads of weak states.
- Explorers fill in each state's map; the *Known world* map mode shows what the selected state (or yours) knows.
- The front moves where the armies are. Armies, their roads and recent battles are drawn on the political map; click one to see it.

**Environment**
- Forests are cut for fields, fuel and ships and grow back when people leave; states that run out of wood turn to coal sooner.
- Soil erodes on cleared slopes and salt builds up in irrigated dry land (Mesopotamia's decline as a mechanism); fertiliser and better farming repair it.
- Malaria kills newcomers (colonists and invading armies) in warm wetlands until germ theory; city-dwellers build up immunity to crowd diseases.
- River floods (and the Yellow River changing course), droughts, locust swarms and cattle plagues. Dams reduce floods.
- Factories emit CO₂; the world warms, tropical harvests suffer, cold lands gain, weather turns more extreme and the sea takes low coasts.

**Ideas and nations**
- Ideologies are born when their conditions first exist somewhere (liberalism needs print and merchants; socialism needs factories and workers; fascism needs defeat and hard times) and spread like faiths. In blind mode they get invented names.
- Support is tracked per province from its classes and crises. Democracies hold elections; elsewhere radical ideas bring revolutions, purges, and revolutions exported to neighbours. Ideology changes research, war appetite, allies and enemies.
- Nation-building: print, schools, railways and radio turn subjects into a nation. Each state chooses one nation, autonomy or repression toward its peoples (you choose, if you play it).
- Royal houses marry; a line that dies out can pass to a married house (personal union) or start a war of succession. A League of Nations may form after a world war.

**Food**
- Farms, with yield set by soil and the year's weather.
- Pasture, and fishing from stocks that regrow fastest when half full.
- Soil wears out under heavy farming. Farmland must be cleared over generations and returns to the wild when abandoned.
- Granaries store surplus, but stored food rots. States move food to hungry provinces.

**People**
- Births and deaths respond to food and medicine. Famine kills once a shortage is real, and the hungry migrate.
- The demographic transition: modern contraception, falling fertility, an ageing population.

**Disasters**
- Real plagues at their real dates (Antonine, Justinian, Black Death, cholera, Spanish flu, COVID), spreading province to province and along trade routes.
- Real volcanic winters, the Medieval Warm Period and the Little Ice Age.
- Smallpox reaches the Americas only after first contact.

**Cities**
- ~110 real historic sites (Byzantium → Constantinople → Istanbul …) plus generated cities.
- They grow, become capitals, get sacked and can be abandoned.

**Technology**
- 53 techs, from paper to the internet. Inventions spread between neighbours and trade partners.
- Ideas cross borders between literate states.

**Resources**
- Iron, tin, horses, timber, coal, oil and gold. Lacking iron, coal or oil (your own or a trade partner's) weakens the techs that depend on them.

**Trade and money**
- Trade routes link cities, with reach growing with roads, ships and railways.
- A treasury per state: taxes and trade minus army upkeep. Debt brings unrest.

**Religion**
- Year-1 faiths placed realistically. Prophets appear at real dates and places (Christianity 30, Manichaeism 240, Islam 610, Sikhism 1499), but whether their faith spreads is simulated.
- Conversion by neighbours, trade and state support. Rulers convert. Faith affects war and stability.

**Culture**
- Assimilates slowly under foreign rule, faster with printing and schooling.

**Government**
- Chiefdom, kingdom, empire, khanate, republic, theocracy, constitutional monarchy, democracy or dictatorship.
- Revolutions, reforms and coups rename states. Democracies rarely fight each other.

**States**
- They rise from tribal land, fight wars (front-line famine counts as war deaths), break apart in civil wars along cultural lines, change dynasties, and plant colonies once they have ocean ships.

**Rulers and dynasties**
- Every state has a named ruler with an age and traits: ambitious, cautious, wise, cruel, pious, a builder, a conqueror, a reformer and more. Traits shape war, research and stability.
- Rulers die. Young heirs bring regencies, and weak successions bring usurpers, new dynasties (and new Chinese dynasty names) or civil war. Republics and democracies elect leaders.

**Diplomacy**
- Threatened states form regional defensive alliances, preferring a shared faith and a common enemy. Allies answer calls to war, so chains of alliances can become named Great Wars and World Wars.
- Badly beaten states may become tribute-paying vassals that fight their overlord's wars and revolt when strong.
- Peace brings truces of 15–25 years.

**Families**
- Three families (on the Yellow River, in Campania, on the Ganges) are followed generation after generation.
- Their lives are read off their province: famine, plague, war, sacked cities, new rulers, new faiths, inventions arriving in their lifetime, and fleeing hard times.
- Their jobs follow their era: farmer, fisher, herder, scribe, smith, merchant, printer, sailor, factory worker, railway worker, nurse, teacher, programmer.
- "Write their story" asks your local model to turn a family's record into prose.

**Councils**
- Off, rule-based, or **AI councils** using a local model through Ollama (e.g. Qwen). Every N years the largest states get a briefing and choose a priority: science, farming, army, expansion, stability or trade. They can also declare war, make peace, or propose and leave alliances, and they announce it in their ruler's voice.

## How it's calibrated
1. **Replay mode** (`node force.mjs <seed>`): every tech appears at its real date. Food and demography were tuned until world population follows the real curve: the replay gives 8.3 billion in 2026 against 8.2 real.
2. **Tech costs** (`node costs.mjs`): each cost is the research the leading state produced between the date the tech became possible and its real date.
3. **Many worlds** (`node batch.mjs 50 1 2026`): free-running worlds then scatter around real history. An early lead feeds on itself, so the spread is wide.
   The only free knob is research speed (`RS`, default 1.14). It went 1.12 → 1.15 with the peoples layer (more breakaways), 1.15 → 1.08 with field armies (bigger conquests), 1.08 → 1.10 with navies, treaties and bandits, and 1.10 → 1.14 with the manuscript build-up (below); 12-world medians are now printing 1402, factories 1761, contact 1451.
4. **Hold-out validation** (`node validate.mjs 12 1 0` normal, `node validate.mjs 12 1 1` blind): wars, cities, urban share, life expectancy, faiths, number of states and democracies are never tuned. They are compared with history in `reports/`. Currently 13 of 27 pass in normal mode and 10 of 21 in blind mode. The failures are the to-do list in `ROADMAP.md`.

Only the population curve and the median tech dates are calibrated. Everything else is emergent or a fixed input (map, year-1 states, and in normal mode the dates of plagues, eruptions and prophets).

## Using it
- **Phones:** works on GitHub Pages in a phone browser: the map fills the screen, tap the bar at the bottom for the panel, pinch to zoom. AI features need Ollama on a PC.
- **Side panel:** tabs for World, Inspect (what you clicked), Play (your state or governorship), Families and Chronicle.
- **Playing:** open `index.html`. Drag to rotate, scroll to zoom, click land to inspect it.
  - Map modes: political, people, food, deaths, height, soil, cleared farmland, weather, tech, religion, peoples, languages, language families, crops and animals, bread prices, inequality, ideologies, nationhood, known world, forests, government, resources, trade routes, wealth and fish.
- **Chronicle:** filters, plus export to `.md` (readable) or `.json` (everything).
- **Many worlds:** runs dozens of seeds in the background. Click a row to open that world.
- **Play a state:** click a state, then *Play as this state*. Every council year (25 by default) the game pauses and you are the council: set the priority, declare war, make peace, join or leave alliances and write a proclamation. The YOU card also lets you act at any time. If your state falls you can take over its successor, pick another or just watch.
- **Dilemmas:** while you play a state, what is really happening in it raises a choice every few years: a famine, plague at the ports, a child on the throne, an empty treasury, an envoy with a marriage offer or a demand for tribute, a preacher of another faith, an over-mighty governor, an inventor seeking patronage, full coffers. Each choice has a cost and lasting effects, listed in the Play tab. Tick *ministers decide* to skip them.
- **Budget and orders:** in the Play tab, set taxes and how the money is split (army, learning, roads and works, court and alms); the effects are shown under the sliders. *March on…* or *Hold…* then click a province: your armies head there (shown with a ring and dashed lines). Marching on a state you are at peace with asks to declare war first.
- **Ambitions and challenges:** pick an ambition in the Play tab (unite your people, the greatest power, first to an invention, endure, outlast a rival, the richest land), or press *⚑ Challenges* for ready-made ones such as Đại Việt (win independence from the Han as a Viet governor) or The last Romans (hold Constantinople from 1000 to 1500). Each ends with a score card against the world and real history; your best scores are kept.
- **Pace:** *Turns* in the Play tab makes Play advance 1, 5, 10 or 25 years and stop. *Pause on events that concern us* stops when you are attacked, your ruler changes, a revolt breaks out or a plague reaches you. Each decision card starts with what changed since your last decision.
- **Your house:** the Play tab shows your ruling house, the ruler and the heir. Dilemmas ask how to educate the heir (the traits follow) and whom they marry; the heir succeeds when the ruler dies. If a usurper takes the throne you can serve the new house, raise the loyal provinces, or wait in exile and try to return.
- **Rivals remember:** other rulers remember what you did to them, shown under *What others think of us* (hover for the reasons). Grudges make war likelier and peace harder; friendship works the other way. Hostile, stronger neighbours send ultimatums; friends ask for help in their wars. With AI councils on, *Read the letter* has the local AI write it in the sender's voice.
- **Predictions:** in the World tab, predict the largest state, the world's population and the biggest faith for a year ahead; the game stops and scores you when the year comes. With AI councils on, tick *live commentary* to have the local AI narrate big events in a caption (handy for recordings).
- **Play as a governor:** *Govern this province* in the inspector. Choose your people (e.g. Lạc Việt inside the Han), then serve loyally, keep some taxes, protect your people's customs or quietly raise a militia while the capital's suspicion grows. If recalled, obey or rise. A successful revolt makes you ruler of a new state named by your people.
- **Families:** *+ Add a family* in the Families card. Pick a province (or use the selected one), choose names, sex, work and traits (stubborn, restless, devout, scholarly, brave, frugal). Traits run in the family and change its fortunes. *Guide* pauses at famines, wars, new chances and each new head of the family so you choose; *Decide…* lets you act at any time: move to the city, better land, the frontier, abroad, the colonies or any province you pick, change work, school the children, marry into a merchant family, save silver, keep or change faith. *Save* starts the family in every new world. The built-in families can be switched off.
- **What if…:** copies the world at the current year and changes one thing in branch B (a ruler lives or dies, a civil war, peace, a plague, a plague that never comes, no cold centuries, or just different luck). Both branches run side by side; the What if card compares them and you can view either or keep one.
- **Tell the difference:** with a what-if open and AI councils on, the local AI tells how the two timelines came apart.
- **Side by side:** with a what-if open, *Side by side* shows both branches on two globes that turn together.
- **Record:** records the globe (one or two) to a `.webm` video with a title card, captions (year, people, the latest big event), a camera that flies to big events, and an end card. Sizes 1920×1080, 1280×720, square and vertical.
- **Charts:** the largest states over time (people, territory, army, technology, wealth, towns, stability), world faiths and language families over time, and this world against ours, with every invention date compared.
- **Encyclopedia:** *Encyclopedia* in the Chronicle tab: pages for states, wars (sides, allies, battles, outcome, treaty), faiths (origin, believers over time, states that hold it), rulers (reign, wars begun, the rest of their house) and peoples (language, where they live, communities abroad, peoples formed from them), all linked to each other, plus a language family tree with every language and its speakers.
- **State pages:** flag, government, faith, peoples, a population chart, wars, rulers and the state's chronicle. Open one from the inspector, or double-click a state in the list.
- **History book:** your local AI writes a chapter per century from the chronicle; export it as `.md`.
- **Start scenarios:** *Start* in the top bar: year 1, or the real map of 1000, 1500, 1800 or 1914 (borders from historical-basemaps), with the techs, population, faiths, peoples and governments of that time. From there history runs freely.
- **Edit the world (✎ Edit):** *Paint* states, peoples, faiths and population by dragging on the globe (hold Shift to turn it). *Rules* renames inventions, makes them easier or harder or forbids them, renames faiths (zeal, colour) and peoples (how strongly they hold to who they are). *Events* schedules your own plagues, volcanic winters, earthquakes and prophets, anywhere or at the province you last clicked. *Save scenario* writes it all to a `.json` file; *Load scenario* brings it back.
- **Custom worlds:** *Start → custom world…*. Upload a heightmap (grey world map, dark low and light high, twice as wide as tall) and optionally a climate map painted in plain colours (blue sea, white ice, sandy desert, green land), or press *Random planet*. Provinces, coasts, climate, rivers, sea crossings and relief are worked out in the browser in a few seconds. History then starts in year 1 with made-up peoples, language families, folk faiths, a few cradles of farming and the first states. Plagues, eruptions and prophets are random, as in blind mode.
- **Hot-seat:** after taking a state, click another and press *+ Add as Player 2* (and so on). At council years each player decides in turn; switch between players in the Play tab.
- **Blind mode:** tick *Blind* before a new world. Plagues, eruptions, climate eras and prophets are then random rather than historical, which shows how much of the result comes from the scripted inputs.
- **AI councils:** install Ollama and pull a model (e.g. `ollama pull qwen2.5:7b`). On Windows, set the user environment variable `OLLAMA_ORIGINS=*` and restart Ollama, because the page is opened from a file. Then pick *AI councils* and press **Test**.

## Making videos

`video/make.mjs` turns a seed into a narrated documentary (MP4 plus an .srt subtitle file):

```
npm i puppeteer            # once: a browser to film in (or puppeteer-core with CHROME=path)
npm i kokoro-js            # optional, once: Kokoro voice (downloads an 80 MB model on first use)
node video/make.mjs --seed 7 --minutes 5 --model qwen2.5:7b
```

What it does:
1. Runs the world in the page once and reads the chronicle.
2. Picks the story beats (new faiths, falls and break-ups of empires, key inventions, the two halves of the world meeting, the deadliest wars and plagues), about one every 24 seconds.
3. Writes the narration with your local Ollama model; without one it uses plain sentences from the chronicle.
4. Voices it with Kokoro (`--kokoro-voice bm_george`), falling back to espeak-ng, or silent with subtitles (`--voice none`).
5. Films each scene in the page: a time-lapse from the previous beat while the camera flies to the next, then the event's caption. Scenes are encoded one by one (rerunning skips finished scenes; `--refilm` redoes them), joined without re-encoding, and the narration is laid over them.

Everything lands in `video/out/seed7/`. To change the words, edit `script.json` there and run `node video/make.mjs --script video/out/seed7/script.json --refilm`. Useful flags: `--plan-only` (stop after the script), `--stills` (a few full-size frames to check the look), `--blind`, `--scenario 1800`, `--to 1500`, `--width 1080 --height 1920` (vertical), `--title "…"`, `--ollama http://host:11434`, `--no-llm`.

Filming draws every frame on the graphics card; with software rendering it runs at about 5 frames a second.

## Building
```
npm install
node build.mjs          # -> dist/index.html (one self-contained file)
node run.mjs 1 2026     # headless run
node batch.mjs 50 1 2026
```
To regenerate the map data (`src/world2.json`, `src/idmap4k.bin`, `src/shade.jpg`, `src/rivers.png`):
1. Get `kg.tif` from the `koppengeiger` repo or pip package (`KG_simplified_uint8.tif`).
2. Get `etopo1.jpg` from the `basemap-data` pip package.
3. Run `python make_elev.py`, then `python prep2.py`, then `python prep_tex.py` (rivers come from Natural Earth).

Tests: `node test/determinism.mjs`, and `node test/check-batch.mjs` after a batch. GitHub Actions runs both, plus validation, on every push.

## Files
- `src/engine.js`: the core simulation (food, people, plagues, tech, states, war, cities, councils)
- `src/systems.js`: resources, trade, money, religion, culture, governments
- `src/politics.js`: rulers, dynasties, alliances, vassals, truces, great wars
- `src/families.js`: the followed families
- `src/economy.js`: crops and animals, prices and silver, classes, institutions, class revolts, big works
- `src/ideologies.js`: ideologies, elections and revolutions, nation-building, marriages, the league
- `src/environment.js`: forests, erosion and salt, disease ecology, floods and droughts, climate change
- `src/governor.js`: playing as a governor
- `src/armies.js`, `src/warfare2.js`: armies, battles, sieges, navies, treaties, explorers, pirates
- `src/peoples.js`: peoples, languages, assimilation, new peoples, identity revolts
- `src/scenario.js`: editable data (techs, year-1 states, population, plagues, volcanoes, names)
- `src/cities.js`: historic city sites
- `src/globe.js`: WebGL globe
- `src/ui.js` and `src/template.html`: the interface
- `src/council.js`: Ollama client
- `src/batchworker.js`: background worlds

## Licence and data

WorldSim is free software under the **GNU General Public License v3.0** (see `LICENSE`).

Data used:
- Climate: Beck et al. (2018), Köppen-Geiger maps (CC BY 4.0).
- Relief: NOAA ETOPO1.
- Rivers: Natural Earth (public domain).
- Peoples: GREG, Geo-Referencing of Ethnic Groups (Weidmann, Rød & Cederman 2010), from the *Atlas Narodov Mira* (1964), projected back with WorldSim's own correction layer.
- Historical borders for the 1000/1500/1800/1914 starts: [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik (GPL-3.0).
