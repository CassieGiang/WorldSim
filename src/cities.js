// Historic city sites: [name, lon, lat, later names by year]. A city appears in the simulation only if
// enough people live in towns in that province; otherwise a generated name is used for new cities.
export const CITY_SITES = [
  ['Rome', 12.5, 41.9], ['Alexandria', 29.9, 31.2], ['Antioch', 36.2, 36.2], ['Byzantium', 28.98, 41.01, [[330, 'Constantinople'], [1453, 'Istanbul']]],
  ['Carthage', 10.3, 36.85, [[700, 'Tunis']]], ['Athens', 23.7, 37.98], ['Ephesus', 27.3, 37.9, [[1000, 'Smyrna']]], ['Lugdunum', 4.83, 45.76, [[800, 'Lyon']]],
  ['Lutetia', 2.35, 48.86, [[500, 'Paris']]], ['Londinium', -0.1, 51.5, [[600, 'London']]], ['Corduba', -4.78, 37.88, [[750, 'Córdoba']]], ['Mediolanum', 9.19, 45.46, [[600, 'Milan']]],
  ['Ravenna', 12.2, 44.4, [[1100, 'Venice']]], ['Neapolis', 14.25, 40.85, [[700, 'Naples']]], ['Syracuse', 15.29, 37.07], ['Thessalonica', 22.94, 40.64],
  ['Colonia', 6.96, 50.94, [[800, 'Cologne']]], ['Augusta Treverorum', 6.64, 49.75, [[800, 'Trier']]], ['Vindobona', 16.37, 48.21, [[900, 'Vienna']]], ['Aquincum', 19.04, 47.5, [[1000, 'Buda']]],
  ['Tarraco', 1.25, 41.12, [[900, 'Barcelona']]], ['Gades', -6.29, 36.53, [[1200, 'Seville']]], ['Olisipo', -9.14, 38.72, [[700, 'Lisbon']]], ['Toletum', -4.02, 39.86, [[700, 'Toledo']]],
  ['Jerusalem', 35.2, 31.78], ['Damascus', 36.3, 33.51], ['Tyre', 35.2, 33.27, [[1200, 'Acre']]], ['Petra', 35.44, 30.33],
  ['Seleucia', 44.5, 33.1, [[226, 'Ctesiphon'], [762, 'Baghdad']]], ['Babylon', 44.42, 32.54, [[700, 'Kufa']]], ['Susa', 48.25, 32.19, [[650, 'Basra']]], ['Ecbatana', 48.5, 34.8, [[900, 'Hamadan']]],
  ['Persepolis', 52.89, 29.93, [[700, 'Shiraz']]], ['Rhagae', 51.4, 35.6, [[1100, 'Tehran']]], ['Merv', 61.83, 37.66], ['Nishapur', 58.8, 36.2, [[1000, 'Mashhad']]],
  ['Bactra', 66.9, 36.76, [[1200, 'Balkh']]], ['Maracanda', 66.96, 39.65, [[700, 'Samarkand']]], ['Bukhara', 64.42, 39.77], ['Kashgar', 75.99, 39.47],
  ['Taxila', 72.83, 33.75, [[1000, 'Lahore']]], ['Peshawar', 71.58, 34.0], ['Kabul', 69.17, 34.53], ['Mathura', 77.67, 27.49, [[1200, 'Delhi']]],
  ['Pataliputra', 85.14, 25.6, [[1500, 'Patna']]], ['Varanasi', 82.97, 25.32], ['Ujjain', 75.78, 23.18], ['Barygaza', 72.98, 21.7, [[1300, 'Surat']]],
  ['Pratishthana', 75.38, 19.47, [[1300, 'Daulatabad']]], ['Amaravati', 80.36, 16.57], ['Madurai', 78.12, 9.92], ['Kanchipuram', 79.7, 12.83, [[1640, 'Madras']]],
  ['Muziris', 76.2, 10.15, [[1300, 'Calicut']]], ['Anuradhapura', 80.4, 8.31, [[1100, 'Polonnaruwa']]], ['Tamralipti', 87.92, 22.3, [[1700, 'Calcutta']]], ['Gaur', 88.14, 24.87, [[1600, 'Dhaka']]],
  ["Chang'an", 108.94, 34.26, [[1300, "Xi'an"]]], ['Luoyang', 112.45, 34.62], ['Linzi', 118.3, 36.8, [[1300, 'Jinan']]], ['Ye', 114.4, 36.3, [[1100, 'Kaifeng']]],
  ['Jianye', 118.78, 32.06, [[1368, 'Nanjing']]], ['Kuaiji', 120.6, 30.0, [[1100, 'Hangzhou']]], ['Wu', 120.62, 31.3, [[1300, 'Suzhou']]], ['Panyu', 113.26, 23.13, [[900, 'Guangzhou']]],
  ['Chengdu', 104.07, 30.67], ['Jiangling', 112.2, 30.35, [[1300, 'Wuhan']]], ['Ji', 116.4, 39.9, [[1153, 'Zhongdu'], [1272, 'Dadu'], [1421, 'Beijing']]], ['Changsha', 112.94, 28.23],
  ['Dunhuang', 94.66, 40.14], ['Wuwei', 102.64, 37.93, [[1100, 'Lanzhou']]], ['Pyongyang', 125.75, 39.02], ['Gyeongju', 129.21, 35.86, [[1400, 'Hanseong']]],
  ['Naniwa', 135.5, 34.69, [[794, 'Heian-kyō'], [1600, 'Edo']]], ['Nara', 135.8, 34.68], ['Dazaifu', 130.52, 33.52], ['Giao Chỉ', 105.85, 21.03, [[1010, 'Thăng Long']]],
  ['Óc Eo', 105.15, 10.25, [[900, 'Angkor']]], ['Pagan', 94.86, 21.17], ['Palembang', 104.76, -2.99], ['Malacca', 102.25, 2.2],
  ['Meroë', 33.75, 16.94, [[600, 'Dongola']]], ['Aksum', 38.72, 14.13, [[1600, 'Gondar']]], ['Thebes', 32.64, 25.7], ['Memphis', 31.25, 29.85, [[641, 'Fustat'], [969, 'Cairo']]],
  ['Leptis Magna', 14.29, 32.64, [[700, 'Tripoli']]], ['Volubilis', -5.55, 34.07, [[800, 'Fez']]], ['Kumbi Saleh', -7.98, 15.66, [[1300, 'Timbuktu']]], ['Jenne', -4.55, 13.9, [[1400, 'Gao']]],
  ['Ife', 4.56, 7.47, [[1400, 'Benin']]], ['Kano', 8.52, 12.0], ['Kilwa', 39.52, -8.96, [[1500, 'Mombasa']]], ['Mapungubwe', 29.4, -22.2, [[1250, 'Great Zimbabwe']]],
  ['Mbanza Kongo', 14.25, -6.27], ['Zeila', 43.47, 11.35, [[1500, 'Harar']]], ['Saba', 44.2, 15.35, [[700, "Sana'a"]]], ['Gerrha', 50.0, 26.0, [[700, 'Mecca']]],
  ['Teotihuacan', -98.84, 19.69, [[1325, 'Tenochtitlan']]], ['El Mirador', -89.92, 17.75, [[600, 'Tikal'], [900, 'Chichen Itza']]], ['Monte Albán', -96.77, 17.04], ['Kaminaljuyu', -90.55, 14.63],
  ['Moche', -79.0, -8.1, [[900, 'Chan Chan']]], ['Nazca', -74.94, -14.83, [[600, 'Wari']]], ['Tiwanaku', -68.67, -16.55], ['Cusco', -71.97, -13.53],
  ['Cahokia', -90.06, 38.66], ['Chaco', -107.96, 36.06], ['Quito', -78.5, -0.22], ['Marajó', -49.5, -0.9],
  ['Kiev', 30.52, 50.45], ['Novgorod', 31.27, 58.52, [[1700, 'Saint Petersburg']]], ['Moscow', 37.62, 55.75], ['Itil', 47.9, 46.4, [[1250, 'Sarai']]],
  ['Chersonesus', 33.49, 44.6, [[1300, 'Caffa']]], ['Uppsala', 17.64, 59.86, [[1300, 'Stockholm']]], ['Hedeby', 9.57, 54.49, [[1200, 'Lübeck']]], ['Kraków', 19.94, 50.06],
  ['Prague', 14.42, 50.09], ['Karakorum', 102.84, 47.2], ['Ordos', 109.0, 39.6, [[1600, 'Hohhot']]], ['Lhasa', 91.11, 29.65],
];

export function cityName(site, year) {
  let n = site[0];
  for (const [y, nm] of site[3] || []) if (year >= y) n = nm;
  return n;
}
