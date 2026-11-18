# WorldSim

A world-history simulation from year 1 to today and beyond, one step per year. It starts from the real world of year 1: Rome, the Han, Parthia, the Kushan, Teotihuacan and 20 other states, with real population, climate and terrain. From there everything is simulated. Open `index.html` in a browser. Nothing to install, and it works offline.

`v1/index.html` is the earlier, coarser version (2,921 provinces).

## What's simulated
**Map**
- 11,421 land provinces (~100 km), from the Köppen-Geiger climate map (Beck et al. 2018) and NOAA ETOPO1 relief, plus 40 major rivers.
- Terrain matters: mountains defend in war, slow conquest and plague, and hold less farmland.

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

## Using it
- **Playing:** open `index.html`. Drag to rotate, scroll to zoom, click land to inspect it.
  - Map modes: political, people, food, deaths, height, soil, cleared farmland, weather, tech, religion, culture, government, resources, trade routes, wealth and fish.
- **Chronicle:** filters, plus export to `.md` (readable) or `.json` (everything).
- **Many worlds:** runs dozens of seeds in the background. Click a row to open that world.
- **AI councils:** install Ollama and pull a model (e.g. `ollama pull qwen2.5:7b`). On Windows, set the user environment variable `OLLAMA_ORIGINS=*` and restart Ollama, because the page is opened from a file. Then pick *AI councils* and press **Test**.

## Building
```
npm install
node build.mjs          # -> dist/index.html (one self-contained file)
node run.mjs 1 2026     # headless run
node batch.mjs 50 1 2026
```
To regenerate the map data (`src/world2.json`, `src/idmap.bin`, `src/elev.bin`):
1. Get `kg.tif` from the `koppengeiger` repo or pip package (`KG_simplified_uint8.tif`).
2. Get `etopo1.jpg` from the `basemap-data` pip package.
3. Run `python make_elev.py`, then `python prep2.py`.

## Files
- `src/engine.js`: the core simulation (food, people, plagues, tech, states, war, cities, councils)
- `src/systems.js`: resources, trade, money, religion, culture, governments
- `src/politics.js`: rulers, dynasties, alliances, vassals, truces, great wars
- `src/families.js`: the followed families
- `src/scenario.js`: editable data (techs, year-1 states, population, plagues, volcanoes, names)
- `src/cities.js`: historic city sites
- `src/globe.js`: WebGL globe
- `src/ui.js` and `src/template.html`: the interface
- `src/council.js`: Ollama client
- `src/batchworker.js`: background worlds
