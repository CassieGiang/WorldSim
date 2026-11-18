// Year-0 starting scenario and fixed historical inputs. Everything here is data, easy to edit.
// Polygons are [lon, lat] rings, deliberately coarse (cells are ~2 degrees across).

export const START_YEAR = 1;

// ---------------- technologies ----------------
// ry = year it happened in our world (for comparison cards). cost = research points.
// folk = can spread between tribes without a state. fx = effects.
export const TECHS = [
  { id: 'agriculture', name: 'Agriculture', ry: -9000, cost: 1, folk: true, fx: {} },
  { id: 'pastoralism', name: 'Pastoralism', ry: -8000, cost: 1, folk: true, fx: { pasture: 1.6 } },
  { id: 'bronze', name: 'Bronze working', ry: -3300, cost: 40, pre: ['agriculture'], folk: true, fx: { mil: 1.1 } },
  { id: 'iron', name: 'Iron working', ry: -1200, cost: 80, pre: ['bronze'], folk: true, fx: { mil: 1.2, labor: 1.1 } },
  { id: 'writing', name: 'Writing', ry: -3200, cost: 60, pre: ['agriculture'], fx: { research: 1.6, stateCap: 10 } },
  { id: 'wheel', name: 'The wheel', ry: -3500, cost: 30, pre: ['agriculture'], folk: true, fx: { redistrib: 0.03 } },
  { id: 'irrigation', name: 'Irrigation', ry: -6000, cost: 30, pre: ['agriculture'], folk: true, fx: { river: 1.6 } },
  { id: 'horses', name: 'Horse riding', ry: -3500, cost: 30, pre: ['pastoralism'], folk: true, fx: { mil: 1.15 } },
  { id: 'sailing', name: 'Sailing', ry: -3000, cost: 30, folk: true, fx: { fish: 1.3, sea: 1 } },
  { id: 'masonry', name: 'Masonry', ry: -3000, cost: 30, pre: ['agriculture'], folk: true, fx: { defense: 1.15 } },
  { id: 'currency', name: 'Coinage', ry: -600, cost: 120, pre: ['writing', 'bronze'], fx: { research: 1.15, redistrib: 0.04, tax: 1.2 } },
  { id: 'philosophy', name: 'Philosophy', ry: -500, cost: 160, pre: ['writing'], fx: { research: 1.2 } },
  { id: 'mathematics', name: 'Mathematics', ry: -300, cost: 180, pre: ['writing'], fx: { research: 1.15 } },
  { id: 'roads', name: 'Paved roads', ry: -300, cost: 150, pre: ['masonry', 'wheel', 'writing'], fx: { redistrib: 0.05, stateCap: 25 } },
  { id: 'paper', name: 'Paper', ry: 105, cost: 1028, pre: ['writing', 'mathematics'], fx: { research: 1.3, stateCap: 10 } },
  { id: 'stirrup', name: 'Stirrup', ry: 400, cost: 4752, pre: ['horses', 'iron'], folk: true, fx: { mil: 1.15 } },
  { id: 'heavy_plough', name: 'Heavy plough', ry: 600, cost: 7792, pre: ['iron'], folk: true, fx: { coolYield: 1.2 } },
  { id: 'water_mills', name: 'Water mills', ry: 300, cost: 3358, pre: ['mathematics', 'iron'], fx: { labor: 1.15, research: 1.05 } },
  { id: 'crop_rotation', name: 'Crop rotation', ry: 800, cost: 3148, pre: ['heavy_plough'], folk: true, fx: { soilDep: 0.6, yield: 1.05 } },
  { id: 'compass', name: 'Compass', ry: 1100, cost: 15280, pre: ['sailing', 'mathematics', 'paper'], fx: { fish: 1.1, sea: 2 } },
  { id: 'gunpowder', name: 'Gunpowder', ry: 900, cost: 11476, pre: ['paper', 'iron'], fx: { mil: 1.1 } },
  { id: 'printing', name: 'Printing press', ry: 1440, cost: 21471, pre: ['paper'], fx: { research: 1.4, stateCap: 15 } },
  { id: 'banking', name: 'Banking', ry: 1400, cost: 21951, pre: ['currency', 'mathematics'], fx: { research: 1.1, tax: 1.2, redistrib: 0.05 } },
  { id: 'ocean_navigation', name: 'Ocean navigation', ry: 1450, cost: 196, pre: ['compass', 'printing'], fx: { ocean: 1, fish: 1.2 } },
  { id: 'firearms', name: 'Firearms', ry: 1500, cost: 11533, pre: ['gunpowder'], fx: { mil: 1.6, noNomad: 1 } },
  { id: 'new_world_crops', name: 'New World crops', ry: 1550, cost: 0, noResearch: true, folk: true, fx: { yield: 1.25 } },
  { id: 'scientific_method', name: 'Scientific method', ry: 1620, cost: 8933, pre: ['printing', 'mathematics'], fx: { research: 1.6 } },
  { id: 'inoculation', name: 'Inoculation', ry: 1720, cost: 14195, pre: ['scientific_method'], fx: { pox: 0.5, death: 0.002 } },
  { id: 'agri_revolution', name: 'Agricultural revolution', ry: 1730, cost: 16210, pre: ['crop_rotation', 'scientific_method'], fx: { yield: 1.3, labor: 1.4, soilDep: 0.7, death: 0.003, land: 1.25 } },
  { id: 'steam_engine', name: 'Steam engine', ry: 1712, cost: 12723, pre: ['scientific_method', 'water_mills'], fx: { labor: 1.1, research: 1.1 } },
  { id: 'industry', name: 'Factories', ry: 1780, cost: 16037, pre: ['steam_engine', 'banking'], fx: { labor: 1.5, research: 1.5, mil: 1.3, urban: 0.15 } },
  { id: 'vaccination', name: 'Vaccination', ry: 1796, cost: 24780, pre: ['inoculation'], fx: { pox: 0.15, death: 0.003 } },
  { id: 'railways', name: 'Railways', ry: 1830, cost: 55452, pre: ['industry'], fx: { redistrib: 0.2, stateCap: 60, mil: 1.1, land: 1.15 } },
  { id: 'steamships', name: 'Steamships', ry: 1840, cost: 72152, pre: ['industry', 'ocean_navigation'], fx: { trade: 1, fish: 1.3 } },
  { id: 'telegraph', name: 'Telegraph', ry: 1840, cost: 72152, pre: ['industry'], fx: { stateCap: 60, research: 1.1 } },
  { id: 'sanitation', name: 'Sanitation', ry: 1850, cost: 92774, pre: ['industry', 'scientific_method'], fx: { death: 0.006, plague: 0.6 } },
  { id: 'refrigeration', name: 'Refrigeration', ry: 1870, cost: 150225, pre: ['steam_engine', 'industry'], fx: { spoil: 0.5 } },
  { id: 'germ_theory', name: 'Germ theory', ry: 1870, cost: 57452, pre: ['sanitation'], fx: { death: 0.006, plague: 0.5 } },
  { id: 'public_education', name: 'Mass schooling', ry: 1870, cost: 150225, pre: ['printing', 'industry'], fx: { research: 1.4, birth: 0.005 } },
  { id: 'electricity', name: 'Electricity', ry: 1880, cost: 138386, pre: ['industry', 'telegraph'], fx: { research: 1.3, labor: 1.2, urban: 0.1 } },
  { id: 'combustion', name: 'Combustion engine', ry: 1885, cost: 256880, pre: ['industry'], fx: { mil: 1.3, redistrib: 0.1 } },
  { id: 'trawlers', name: 'Steam trawlers', ry: 1880, cost: 138386, pre: ['steamships'], fx: { fish: 3 } },
  { id: 'radio', name: 'Radio', ry: 1900, cost: 188185, pre: ['electricity'], fx: { stateCap: 60 } },
  { id: 'flight', name: 'Powered flight', ry: 1903, cost: 187346, pre: ['combustion'], fx: { mil: 1.2 } },
  { id: 'fertilizer', name: 'Synthetic fertiliser', ry: 1913, cost: 355051, pre: ['electricity', 'germ_theory'], fx: { yield: 1.8 } },
  { id: 'tractors', name: 'Tractors', ry: 1920, cost: 418426, pre: ['combustion'], fx: { labor: 2.5, land: 1.5 } },
  { id: 'antibiotics', name: 'Antibiotics', ry: 1928, cost: 643384, pre: ['germ_theory'], fx: { death: 0.012, plague: 0.3 } },
  { id: 'contraception', name: 'Modern contraception', ry: 1960, cost: 1127023, pre: ['antibiotics', 'public_education'], fx: { birth: 0.008 } },
  { id: 'fission', name: 'Nuclear fission', ry: 1942, cost: 728250, pre: ['radio', 'electricity'], fx: { mil: 1.5, bomb: 1 } },
  { id: 'computers', name: 'Computers', ry: 1946, cost: 845924, pre: ['electricity', 'radio'], fx: { research: 1.6 } },
  { id: 'spaceflight', name: 'Spaceflight', ry: 1957, cost: 503411, pre: ['computers', 'flight'], fx: {} },
  { id: 'green_revolution', name: 'Green revolution', ry: 1965, cost: 1598175, pre: ['fertilizer', 'tractors'], fx: { yield: 1.7, land: 1.3 } },
  { id: 'internet', name: 'Internet', ry: 1983, cost: 2568857, pre: ['computers'], fx: { research: 1.5 } },
];
export const TECH_INDEX = Object.fromEntries(TECHS.map((t, i) => [t.id, i]));

// starting tech packages
const OLD_CORE = ['agriculture', 'pastoralism', 'bronze', 'iron', 'writing', 'wheel', 'irrigation', 'horses', 'sailing', 'masonry', 'currency', 'philosophy', 'mathematics'];
export const PACKAGES = {
  core: OLD_CORE,
  rome: [...OLD_CORE, 'roads', 'water_mills'],
  han: [...OLD_CORE, 'roads'],
  barbarian: ['agriculture', 'pastoralism', 'bronze', 'iron', 'wheel', 'horses', 'sailing'],
  steppe: ['pastoralism', 'bronze', 'iron', 'wheel', 'horses', 'agriculture'],
  africa: ['agriculture', 'pastoralism', 'bronze', 'iron', 'sailing'],
  kush: ['agriculture', 'pastoralism', 'bronze', 'iron', 'writing', 'wheel', 'irrigation', 'masonry', 'sailing'],
  seasia: ['agriculture', 'pastoralism', 'bronze', 'iron', 'sailing', 'irrigation'],
  meso: ['agriculture', 'masonry', 'writing', 'mathematics', 'new_world_crops'],
  andes: ['agriculture', 'pastoralism', 'masonry', 'irrigation', 'bronze', 'new_world_crops'],
  americas: ['agriculture', 'new_world_crops'],
  foragers: ['sailing'],
  pacific: ['agriculture', 'sailing'],
};

// ---------------- states at year 1 ----------------
export const STATES = [
  { name: 'Roman Empire', culture: 'latin', color: '#b8323a', pkg: 'rome', cap: [12.5, 41.9],
    poly: [[-9.5,43.8],[-1.5,43.4],[-1.8,46.5],[-4.8,48.5],[1.5,51],[4,51.6],[6.2,51.8],[7,50.5],[8.3,49],[7.6,47.6],[10,47.3],[13,47.6],[16,48.3],[19,46],[22,44.5],[28,44],[29.5,42],[32,41.8],[36,41.5],[38,40],[39,38],[38.5,36.5],[40,35.5],[38.5,33],[36,30],[34.8,29.5],[34.5,27],[33.5,24],[32.8,23.5],[30,24],[28,29],[25,30],[20,30.5],[19,31],[15,32],[11,33],[10,35],[8,34],[5,35],[2,35],[-2,35],[-5.5,35.8],[-9.5,36.8],[-9.8,40]] },
  { name: 'Han Dynasty', culture: 'sinitic', color: '#d9a52b', pkg: 'han', cap: [108.9, 34.3],
    poly: [[121.5,40.8],[124.8,40],[127,39],[126.5,37.5],[122,37],[120,36],[121,32],[122,30],[121,28],[119.5,25.5],[117,23.5],[114,22.2],[110,21],[108,21.5],[106.5,20],[106,17.5],[105,18.5],[104,22.5],[100,22.5],[98.5,24.5],[98.5,27.5],[102,30],[102,33],[100,35],[97,38],[94,40],[90,40.5],[93,41.5],[97,40.5],[100,40],[103,39],[106,41.5],[111,41.8],[115,41.5],[118,41.5]] },
  { name: 'Parthian Empire', culture: 'persian', color: '#2f8f83', pkg: 'core', cap: [44.6, 33.1],
    poly: [[40,36.8],[43,37.5],[46,38.5],[48.5,38.5],[49,37.3],[54,37.2],[56,38],[60,38],[62.5,37.5],[62,35],[63,31],[61.5,29],[62,26],[57.5,25.5],[56,27],[52,27.8],[50,30],[48.5,30],[47.5,29.5],[44.5,31],[42.5,32.5],[41,34.5]] },
  { name: 'Armenia', culture: 'persian', color: '#c97b4a', pkg: 'core', cap: [44.5, 40.0],
    poly: [[41,41],[46,41],[48,39],[46,38.5],[43,37.5],[40,38.5]] },
  { name: 'Xiongnu', culture: 'mongolic', color: '#7a6a4f', pkg: 'steppe', nomad: true, cap: [102.8, 47.2],
    poly: [[90,48],[97,51],[104,52],[110,50.5],[118,50],[120,46],[116,42.5],[111,42],[106,41.8],[100,41],[95,43],[90,44]] },
  { name: 'Kushan', culture: 'persian', color: '#8d5fa8', pkg: 'core', cap: [68.8, 36.7],
    poly: [[62.5,37.5],[66,38.5],[70,38.5],[72,36.5],[73.5,34.5],[71,33],[69,31],[66,31],[63,31],[62,35]] },
  { name: 'Indo-Scythians', culture: 'indic', color: '#a3684b', pkg: 'core', cap: [73.0, 31.5],
    poly: [[66,31],[69,31],[71,33],[74.5,34],[76,32],[75,29],[73,27],[73,24],[72,21],[69.5,22.5],[67,24],[66,26]] },
  { name: 'Magadha', culture: 'indic', color: '#e07b39', pkg: 'core', cap: [85.1, 25.6],
    poly: [[76,32],[79,30.5],[84,27.5],[88.5,26.5],[89,23],[87,21.5],[84,22.5],[81,23.5],[78,24],[75,25],[75,29]] },
  { name: 'Satavahana', culture: 'indic', color: '#5f8f3e', pkg: 'core', cap: [75.4, 19.5],
    poly: [[72,21],[74,22.5],[78,24],[81,23.5],[84,22.5],[84,18],[82,16],[80,15.8],[78,14.5],[75,14.5],[73.5,16]] },
  { name: 'Pandya', culture: 'dravidian', color: '#3e6f9f', pkg: 'core', cap: [78.1, 9.9],
    poly: [[75,14.5],[78,14.5],[80.3,15.5],[80.3,10],[78.5,8],[77,8],[76,10],[74.8,12.5]] },
  { name: 'Anuradhapura', culture: 'indic', color: '#9a8b2e', pkg: 'core', cap: [80.4, 8.3],
    poly: [[79.5,9.9],[81.9,7.5],[81,5.8],[79.8,6.5]] },
  { name: 'Kush', culture: 'sudanic', color: '#b5893a', pkg: 'kush', cap: [33.7, 16.9],
    poly: [[30,24],[33.5,24],[36,21],[37,18],[35.5,13],[32,12],[31,16],[30,20]] },
  { name: 'Aksum', culture: 'ethiopic', color: '#6e4a8e', pkg: 'kush', cap: [38.7, 14.1],
    poly: [[36.5,16],[39.5,16.5],[41,14],[39,12.5],[37,13]] },
  { name: 'Himyar', culture: 'arabic', color: '#4a8c6e', pkg: 'core', cap: [44.2, 15.3],
    poly: [[42.5,17],[45,17.5],[48,16],[52,16.5],[52,14.5],[45,12.5],[43,12.7]] },
  { name: 'Nabataea', culture: 'arabic', color: '#c46b6b', pkg: 'core', cap: [35.4, 30.3],
    poly: [[36,30],[38.5,33],[39,29],[38,27.5],[36,27],[35,28]] },
  { name: 'Bosporan Kingdom', culture: 'greek', color: '#5b7fb8', pkg: 'core', cap: [36.5, 45.3],
    poly: [[35,45.5],[37.5,45.8],[39,47],[38,45],[36.5,44.8]] },
  { name: 'Goguryeo', culture: 'korean', color: '#3b8a8a', pkg: 'han', cap: [126.0, 41.1],
    poly: [[124.8,40],[127,39],[129,41.5],[128,43],[125.5,43],[124.5,41.5]] },
  { name: 'Dacia', culture: 'dacian', color: '#8a6d3b', pkg: 'barbarian', cap: [23.3, 45.6],
    poly: [[22.5,45],[22,47.5],[24.5,48],[27,47.5],[28,45.5],[26,44],[23,44.5]] },
  { name: 'Sarmatians', culture: 'turkic', color: '#9b8a6a', pkg: 'steppe', nomad: true, cap: [40.0, 48.0],
    poly: [[30,46.5],[40,47.5],[47,48],[50,51],[40,51],[33,50],[29,48]] },
  { name: 'Wusun', culture: 'turkic', color: '#a39a5c', pkg: 'steppe', nomad: true, cap: [78.0, 43.0],
    poly: [[74,42],[80,44],[84,44.5],[82,42],[78,41]] },
  { name: 'Teotihuacan', culture: 'mesoamerican', color: '#c0573a', pkg: 'meso', cap: [-98.8, 19.7],
    poly: [[-100.5,20.5],[-98,20.8],[-97,19],[-98.5,18.2],[-100,18.8]] },
  { name: 'El Mirador', culture: 'maya', color: '#4f9a5a', pkg: 'meso', cap: [-89.9, 17.8],
    poly: [[-92,18.5],[-88,21.5],[-87,21],[-88,16],[-91,15.5],[-92,16.5]] },
  { name: 'Moche', culture: 'andean', color: '#a24d6b', pkg: 'andes', cap: [-79.0, -8.1],
    poly: [[-80.5,-4],[-78,-4],[-77,-10.5],[-79,-10.5]] },
  { name: 'Nazca', culture: 'andean', color: '#c28f3f', pkg: 'andes', cap: [-75.0, -14.8],
    poly: [[-76.5,-12.5],[-74,-12.5],[-73.5,-16],[-76,-16]] },
];

// ---------------- population targets at year 1 (millions) ----------------
// first matching region wins; cells in a region share its total by carrying capacity.
export const POP_REGIONS = [
  { state: 'Han Dynasty', pop: 58 },
  { state: 'Roman Empire', pop: 46 },
  { state: 'Parthian Empire', pop: 8 }, { state: 'Armenia', pop: 1 },
  { state: 'Kushan', pop: 3 }, { state: 'Indo-Scythians', pop: 6 }, { state: 'Magadha', pop: 22 },
  { state: 'Satavahana', pop: 12 }, { state: 'Pandya', pop: 7 }, { state: 'Anuradhapura', pop: 1 },
  { state: 'Kush', pop: 1 }, { state: 'Aksum', pop: 0.5 }, { state: 'Himyar', pop: 1.5 }, { state: 'Nabataea', pop: 0.3 },
  { state: 'Goguryeo', pop: 0.6 }, { state: 'Teotihuacan', pop: 0.5 }, { state: 'El Mirador', pop: 1 },
  { state: 'Moche', pop: 0.3 }, { state: 'Nazca', pop: 0.2 },
  { box: [-11, 42, 45, 71], pop: 9 },        // rest of Europe
  { box: [34, 12, 60, 34], pop: 1 },         // rest of Arabia
  { box: [45, 35, 120, 56], pop: 4 },        // steppe and central Asia
  { box: [124, 30, 146, 46], pop: 2.6 },     // Korea, Japan
  { box: [92, -11, 141, 28], pop: 6 },       // Southeast Asia
  { box: [-18, 17, 33, 37], pop: 1.5 },      // Maghreb/Sahara remainder
  { box: [-18, -35, 52, 17], pop: 14 },      // sub-Saharan Africa
  { box: [-118, 7, -77, 30], pop: 4.5 },     // Mesoamerica
  { box: [-82, -56, -34, 12], pop: 5.5 },    // South America
  { box: [-170, 25, -50, 72], pop: 2 },      // North America
  { box: [45, 55, 180, 78], pop: 0.5 },      // Siberia
  { box: [110, -50, 180, -11], pop: 0.4 },   // Australia, NZ
];

// ---------------- cultures (for names) ----------------
// boxes [lonMin, latMin, lonMax, latMax], first match wins
export const CULTURE_ZONES = [
  ['tibetan', [78, 27, 100, 37]], ['korean', [124, 33, 131, 43]], ['japanese', [129, 30, 146, 46]],
  ['mongolic', [98, 42, 135, 55]], ['sinitic', [98, 20, 123, 42]], ['seasian', [92, 5, 110, 28]],
  ['austronesian', [95, -11, 180, 20]], ['dravidian', [72, 6, 82, 17]], ['indic', [62, 6, 92, 36]],
  ['persian', [44, 25, 66, 40]], ['egyptian', [25, 21, 36, 32]], ['arabic', [34, 12, 60, 34]],
  ['berber', [-18, 20, 25, 37]], ['latin', [-10, 36, 17, 47]], ['greek', [19, 34, 44, 42]],
  ['celtic', [-11, 49, 2, 59]], ['germanic', [-6, 47, 18, 60]], ['norse', [4, 55, 31, 71]],
  ['dacian', [20, 43, 30, 49]], ['slavic', [14, 44, 45, 62]], ['finnic', [20, 58, 65, 71]],
  ['turkic', [44, 36, 98, 56]], ['siberian', [45, 55, 180, 78]], ['ethiopic', [33, 3, 52, 17]],
  ['sudanic', [16, 3, 33, 21]], ['westafrican', [-18, 3, 16, 20]], ['bantu', [-18, -35, 52, 5]],
  ['maya', [-93, 13, -86, 22]], ['mesoamerican', [-118, 7, -77, 30]], ['andean', [-82, -40, -64, 7]],
  ['amazonian', [-82, -56, -34, 12]], ['northamerican', [-170, 25, -50, 72]], ['australian', [110, -50, 160, -10]],
  ['austronesian', [-180, -50, -100, 30]], ['austronesian', [160, -50, 180, 30]],
];
export const NEW_WORLD_BOXES = [[-170, -56, -34, 72], [110, -50, 180, -10]]; // Americas, Australia/Oceania

// syllables: [starts, middles, ends]
export const NAME_PARTS = {
  latin: [['Aur','Val','Cor','Lav','Sab','Ter','Ven','Ost','Bru','Cal','Mar','Luc','Ner','Tav'], ['e','i','a','o','u'], ['nia','ria','tium','lia','na','tia','cum','sia','ona']],
  greek: [['Ach','Theb','Mak','Ion','Kar','Lyk','Phry','Ep','Kor','Arg','Thes','Pon'], ['a','o','e','y'], ['dia','nia','sos','ros','kia','lis','tos','me']],
  celtic: [['Bri','Cal','Dun','Gal','Ard','Mor','Eb','Lug','Can','Cym'], ['a','e','o'], ['donia','ria','dun','nach','gal','ros','lan']],
  germanic: [['Thur','Sax','Frank','Ala','Burg','Lang','Swab','Hess','Ost','Wend','Fris','Got'], ['e','a','i',''], ['land','mark','ia','heim','burg','gau','reich']],
  norse: [['Sva','Dan','Nor','Got','Upp','Hal','Skan','Vin','Jut','Ros'], ['a','e',''], ['land','mark','heim','vik','sund','gard']],
  dacian: [['Dak','Get','Sar','Buri','Kar','Apu','Tyr'], ['i','a','e'], ['dava','sia','gia','ria']],
  slavic: [['Pol','Rus','Mor','Vlad','Kiev','Novg','Sor','Lut','Krak','Bel','Ser','Chorv'], ['o','a','i','e'], ['via','nia','grad','slav','sk','ovia','ia']],
  finnic: [['Suo','Kar','Est','Ves','Mer','Per','Ugr'], ['o','a','e'], ['mi','la','nia','ra']],
  persian: [['Pars','Med','Khor','Sog','Bakt','Hyrk','Arsak','Sasan','Kerm','Gilan','Tabar','Mazan'], ['a','i','o','e'], ['ia','stan','an','iana','shahr','gird']],
  arabic: [['Hij','Naj','Yam','Had','Om','Sab','Qat','Bahr','Kin','Lakh','Ghass','Tanukh'], ['a','i','u'], ['ra','man','ad','ida','id','iya','az']],
  egyptian: [['Kem','Mem','Theb','Abyd','Tan','Sai','Bub','Fay'], ['e','a','i'], ['t','phis','is','um','os']],
  berber: [['Num','Maur','Gaet','Tlem','Mas','Zan','Kab','Sanh','Tama'], ['i','a','e'], ['dia','sen','ga','ta','zgha']],
  turkic: [['Kip','Kar','Oghu','Uyg','Khaz','Bulg','Kim','Ala','Sel','Kum','Tash','Ak'], ['a','u','i','o'], ['chak','luk','r','an','kent','istan','han']],
  mongolic: [['Xian','Rour','Khit','Tat','Kere','Nai','Merk','Jal','Oir','Tum'], ['a','u','e','i'], ['bi','ran','an','t','man','ai']],
  sinitic: [['Wei','Jin','Song','Qi','Liang','Chen','Sui','Tang','Zhou','Yan','Zhao','Shu','Wu','Chu','Qin','Xia','Ming','Lu','Zheng','Min','Han','Yue'], [], []],
  tibetan: [['Tsang','Gug','Nga','Lho','Pur','Bod','Zhang'], ['a','o','e'], ['ri','ge','ling','zhung','kha']],
  korean: [['Silla','Baekje','Gaya','Balhae','Goryeo','Joseon','Buyeo','Tamna','Okjeo'], [], []],
  japanese: [['Yama','Izu','Kibi','Tsuku','Koshi','Hyu','Kuma','Owa','Mino','Sata'], ['to','mo','ka','shi','ri'], ['','no','ga']],
  seasian: [['Fun','Chen','Champ','Dvar','Sri','Lav','Pag','Ayut','Khme','Dai','Lan'], ['a','i','o'], ['n','la','vati','pura','ya','ng','r']],
  austronesian: [['Sri','Maja','Mata','Tara','Kedi','Sing','Bru','Malu','Toa','Hava','Tong'], ['ra','pa','na','la','hi'], ['ram','pahit','ya','ri','ki','nga','i']],
  indic: [['Mag','Kos','Avan','Gand','Panch','Kuru','Vats','Mal','Ang','Kal','Chedi','Vang','Gup','Har'], ['a','i','u'], ['dha','la','ti','ra','nga','pura','desh','vati']],
  dravidian: [['Chol','Cher','Pand','Pall','Kad','Chalu','Ganga','Kong','Vija'], ['a','u'], ['ya','la','m','va','nagar']],
  ethiopic: [['Aks','Dam','Zag','Shew','Gond','Har','Sidam','Adal','Ifat'], ['u','a','e'], ['m','we','r','ama','ar','at']],
  sudanic: [['Mak','Alod','Nob','Kan','Wad','Darf','Funj','Bag','Sen'], ['u','a','e','i'], ['ria','ia','em','ar','nar','ur']],
  westafrican: [['Gha','Mal','Song','Kan','Oyo','Ben','Ife','Daho','Wol','Mos','Hau','Bor'], ['a','i','o','e'], ['na','li','hai','em','in','mey','of','si','sa','nu']],
  bantu: [['Kon','Lun','Lub','Zim','Mwen','Bug','Ngo','Kaz','Mut','Ruan','Swa','Zul','Kilw'], ['a','e','o','u'], ['go','da','ba','bwe','ndo','nda','hili','lu','a']],
  maya: [['Tik','Cal','Pal','Cop','Yax','Ux','Chich','May','Dzib','Can'], ['a','e','i','o'], ['l','kmul','nque','an','chilan','mal','pan','tun']],
  mesoamerican: [['Teo','Tol','Mix','Zapo','Tla','Azca','Chol','Cuauh','Xoch','Purep'], ['ti','a','co','te','hua'], ['can','lan','pan','tec','ca','co']],
  andean: [['Wari','Tiwa','Chim','Cha','Inka','Kus','Chachap','Mochi','Paca','Cañ'], ['na','ku','a','ri'], ['naku','mu','vin','co','yas','ri']],
  amazonian: [['Mara','Tupi','Guar','Kaya','Yano','Aruak','Kari','Tapa'], ['jo','na','ra','ni'], ['ra','mi','na','pe','jo']],
  northamerican: [['Cahok','Haude','Ana','Musk','Lako','Che','Iroq','Shaw','Powha','Wend','Missi'], ['a','o','i'], ['kia','nosaunee','sazi','gee','ta','kee','tan','ssippi']],
  australian: [['Yol','Arr','Nyun','Wira','Kau','Eora','Nooga'], ['ngu','e','a'], ['rnte','juri','rna','r']],
  siberian: [['Yak','Evenk','Chuk','Kor','Nen','Khant','Buryat'], ['u','e','a'], ['tia','kia','ria','ts']],
};
export const TITLES = {
  default: ['Kingdom of {n}', '{n}', '{n} Kingdom'],
  latin: ['Kingdom of {n}', 'Republic of {n}', '{n}'], greek: ['Kingdom of {n}', 'League of {n}', '{n}'],
  persian: ['{n} Empire', 'Kingdom of {n}', 'Shahdom of {n}'], turkic: ['{n} Khaganate', '{n} Khanate', '{n} Horde'],
  mongolic: ['{n} Khaganate', '{n} Khanate', '{n} Horde'], sinitic: ['{n} Dynasty', 'Later {n}', 'Northern {n}', 'Southern {n}'],
  korean: ['{n}'], japanese: ['{n}', 'Realm of {n}'], arabic: ['Emirate of {n}', '{n} Caliphate', 'Kingdom of {n}'],
  berber: ['Kingdom of {n}', '{n} Emirate'], indic: ['{n} Empire', 'Kingdom of {n}', '{n} Sultanate'],
  dravidian: ['{n} Empire', 'Kingdom of {n}'], westafrican: ['{n} Empire', 'Kingdom of {n}'],
  bantu: ['Kingdom of {n}', '{n}'], mesoamerican: ['{n}', 'Altepetl of {n}'], maya: ['{n}', 'Kingdom of {n}'],
  andean: ['{n}', '{n} Confederation'], northamerican: ['{n} Confederacy', '{n}'],
  germanic: ['Kingdom of {n}', 'Duchy of {n}', '{n}'], norse: ['Kingdom of {n}', '{n}'], slavic: ['Principality of {n}', 'Kingdom of {n}', '{n}'],
  celtic: ['Kingdom of {n}', '{n}'],
};

// ---------------- epidemics (fixed dates) ----------------
// mort = base death share in a dense, untouched cell; reach = how far it tends to travel
export const EPIDEMICS = [
  { name: 'Antonine Plague', year: 165, at: [44.5, 33.1], mort: 0.10, reach: 0.55, ry: '165-180, 5-10 million dead' },
  { name: 'Plague of Cyprian', year: 249, at: [32.5, 26.0], mort: 0.08, reach: 0.5, ry: '249-262' },
  { name: 'Plague of Justinian', year: 541, at: [32.5, 31.0], mort: 0.22, reach: 0.6, ry: '541-549, 15-100 million dead' },
  { name: 'Japanese smallpox epidemic', year: 735, at: [130.5, 33.5], mort: 0.25, reach: 0.4, ry: '735-737, ~1/3 of Japan' },
  { name: 'Black Death', year: 1346, at: [35.4, 45.0], mort: 0.38, reach: 0.75, ry: '1346-1353, 75-200 million dead' },
  { name: 'Second plague pandemic wave', year: 1361, at: [35.0, 45.0], mort: 0.10, reach: 0.6, ry: '1361-1363' },
  { name: 'Italian plague', year: 1629, at: [9.0, 45.5], mort: 0.12, reach: 0.4, ry: '1629-1631' },
  { name: 'Cholera pandemic', year: 1817, at: [89.0, 23.5], mort: 0.02, reach: 0.8, ry: '1817-1824' },
  { name: 'Third plague pandemic', year: 1855, at: [102.0, 25.0], mort: 0.03, reach: 0.6, ry: '1855-1960, ~12 million dead' },
  { name: 'Spanish flu', year: 1918, at: [-97.0, 38.0], mort: 0.03, reach: 0.95, ry: '1918-1920, 17-50 million dead' },
  { name: 'Asian flu', year: 1957, at: [110.0, 25.0], mort: 0.0012, reach: 0.9, ry: '1957-1958, ~1-4 million dead' },
  { name: 'COVID-19', year: 2020, at: [114.3, 30.6], mort: 0.002, reach: 0.95, ry: '2020-2023, ~7-27 million dead' },
];

// ---------------- climate ----------------
// volcanic winters: year, yield hit at high latitude, years it lasts, label
export const VOLCANOES = [
  { year: 79, at: [14.4, 40.8], local: 0.004, name: 'Vesuvius erupts', ry: '79: Pompeii buried, ~2,000 dead' },
  { year: 536, hit: 0.16, years: 3, name: 'Volcanic winter of 536', ry: '536: "worst year to be alive"' },
  { year: 540, hit: 0.10, years: 2, name: 'Second eruption of the 540s' },
  { year: 939, hit: 0.05, years: 2, name: 'Eldgjá eruption (Iceland)' },
  { year: 1257, hit: 0.12, years: 2, name: 'Samalas eruption (Lombok)' },
  { year: 1453, hit: 0.07, years: 2, name: 'Kuwae eruption' },
  { year: 1600, hit: 0.10, years: 2, name: 'Huaynaputina eruption (Peru)' },
  { year: 1783, hit: 0.08, years: 2, name: 'Laki eruption (Iceland)' },
  { year: 1815, hit: 0.15, years: 2, name: 'Tambora eruption: the year without a summer', ry: '1816: year without a summer' },
  { year: 1883, hit: 0.05, years: 2, name: 'Krakatoa eruption' },
  { year: 1991, hit: 0.03, years: 2, name: 'Pinatubo eruption' },
];
export const QUAKES = [
  { year: 1556, at: [109.7, 34.5], local: 0.08, name: 'Shaanxi earthquake', ry: '1556: ~830,000 dead' },
  { year: 1755, at: [-9.1, 38.7], local: 0.02, name: 'Lisbon earthquake', ry: '1755: 30,000-50,000 dead' },
  { year: 1976, at: [118.2, 39.6], local: 0.01, name: 'Tangshan earthquake', ry: '1976: ~240,000 dead' },
];
// long climate swings: [from, to, anomaly] (northern-hemisphere temperate band feels it most)
export const CLIMATE_ERAS = [[950, 1250, 0.03], [1300, 1850, -0.045], [1645, 1715, -0.03]];

// world population in our world (millions), for the comparison line
export const REAL_POP = [[1, 220], [200, 225], [400, 205], [500, 210], [600, 200], [700, 210], [800, 220], [900, 240], [1000, 275], [1100, 320], [1200, 360], [1300, 430], [1340, 443], [1400, 350], [1500, 450], [1600, 550], [1700, 610], [1750, 760], [1800, 980], [1850, 1260], [1900, 1650], [1920, 1860], [1950, 2525], [1970, 3700], [1990, 5300], [2000, 6145], [2010, 6950], [2020, 7800], [2026, 8200]];
