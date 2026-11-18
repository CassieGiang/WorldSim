# Year-1 correction layer for the GREG modern ethnic map (Atlas Narodov Mira, 1960s).
# Modern groups are projected back to year 1; where a group is known to have arrived
# later (Slavs in the Balkans, Turks in Anatolia, Arabs in North Africa, Europeans in
# the Americas...), these rules replace it with the people living there in year 1.
# Sources: standard historical atlases (Penguin/Times atlas, Barrington, Tan Qixiang).
# Boxes are [lon0, lat0, lon1, lat1]. Rules apply in order, first match wins.
# match: '*' = any modern group; list of branches; or '=Name' for a modern group.
# A people of 'DROP' means: no good year-1 guess, take the people of the nearest kept cell.

# key: (name, language, branch, identity 0-1, state names in their own tradition)
P = {
 # --- Europe ---
 'britons': ('Britons', 'Brittonic', 'celtic', 0.5, ['Britannia', 'Dumnonia', 'Gwynedd', 'Powys', 'Strathclyde']),
 'picts': ('Picts', 'Pictish', 'celtic', 0.5, ['Pictland', 'Fortriu', 'Alba']),
 'irish': ('Gaels', 'Old Irish', 'celtic', 0.6, ['Ériu', 'Mide', 'Ulaid', 'Laigin', 'Mumu', 'Connacht']),
 'gauls': ('Gauls', 'Gaulish', 'celtic', 0.45, ['Gallia', 'Armorica', 'Aedui', 'Arverni']),
 'belgae': ('Belgae', 'Gaulish', 'celtic', 0.4, ['Belgica']),
 'aquitani': ('Aquitani', 'Aquitanian', 'isolate', 0.7, ['Aquitania', 'Vasconia']),
 'vascones': ('Vascones', 'Basque', 'isolate', 0.85, ['Vasconia', 'Navarre', 'Pamplona']),
 'iberians': ('Iberians', 'Iberian', 'isolate', 0.4, ['Iberia', 'Edetania', 'Turdetania']),
 'celtiberians': ('Celtiberians', 'Celtiberian', 'celtic', 0.45, ['Celtiberia', 'Numantia']),
 'lusitanians': ('Lusitanians', 'Lusitanian', 'celtic', 0.5, ['Lusitania']),
 'gallaeci': ('Gallaeci', 'Gallaecian', 'celtic', 0.5, ['Gallaecia', 'Asturias']),
 'latins': ('Latins', 'Latin', 'italic', 0.7, []),
 'sardinians': ('Sardinians', 'Paleo-Sardinian', 'isolate', 0.6, ['Sardinia']),
 'helvetii': ('Helvetii', 'Gaulish', 'celtic', 0.45, ['Helvetia']),
 'raeti': ('Raeti', 'Raetic', 'isolate', 0.45, ['Raetia']),
 'norici': ('Norici', 'Noric', 'celtic', 0.45, ['Noricum']),
 'pannonians': ('Pannonians', 'Pannonian', 'illyrian', 0.45, ['Pannonia']),
 'illyrians': ('Illyrians', 'Illyrian', 'illyrian', 0.55, ['Illyria', 'Dalmatia', 'Epirus']),
 'dardanians': ('Dardanians', 'Illyrian', 'illyrian', 0.5, ['Dardania']),
 'thracians': ('Thracians', 'Thracian', 'thracian', 0.55, ['Odrysian Kingdom', 'Thrace']),
 'moesians': ('Moesians', 'Thracian', 'thracian', 0.5, ['Moesia']),
 'dacians': ('Dacians', 'Dacian', 'thracian', 0.6, ['Dacia']),
 'paeonians': ('Paeonians', 'Paeonian', 'thracian', 0.45, ['Paeonia']),
 'frisii': ('Frisii', 'Ingvaeonic', 'germanic', 0.55, ['Frisia']),
 'franks': ('Istvaeones', 'Istvaeonic', 'germanic', 0.5, ['Francia', 'Austrasia', 'Neustria']),
 'saxons': ('Saxons', 'Ingvaeonic', 'germanic', 0.55, ['Saxony', 'Westphalia', 'Engern']),
 'suebi': ('Suebi', 'Irminonic', 'germanic', 0.5, ['Alamannia', 'Thuringia', 'Swabia']),
 'marcomanni': ('Marcomanni', 'Irminonic', 'germanic', 0.5, ['Marcomannia', 'Bohemia']),
 'quadi': ('Quadi', 'Irminonic', 'germanic', 0.5, ['Quadia']),
 'lugii': ('Lugii', 'East Germanic', 'germanic', 0.45, ['Vandalia', 'Silingia']),
 'goths': ('Goths', 'Gothic', 'germanic', 0.6, ['Gothia', 'Gothiscandza', 'Oium']),
 'danes': ('Danes', 'Proto-Norse', 'germanic', 0.55, ['Denmark', 'Jutland']),
 'suiones': ('Suiones', 'Proto-Norse', 'germanic', 0.55, ['Svealand', 'Uppsala']),
 'norse': ('Norse', 'Proto-Norse', 'germanic', 0.55, ['Norway', 'Hålogaland']),
 'gutes': ('Geats', 'Proto-Norse', 'germanic', 0.5, ['Götaland', 'Gotland']),
 'venedi': ('Venedi', 'Proto-Slavic', 'slavic', 0.5, ['Polania', 'Rus\'', 'Antes', 'Kiev', 'Moravia', 'Sclavinia']),
 'balts': ('Balts', 'Baltic', 'baltic', 0.55, ['Prussia', 'Lithuania', 'Galindia', 'Yotvingia']),
 'aesti': ('Aesti', 'Old Prussian', 'baltic', 0.55, ['Prussia', 'Sambia']),
 'chudes': ('Chudes', 'Finnic', 'finnic', 0.5, ['Chudia', 'Votia', 'Ingria']),
 'merya': ('Merya', 'Merya', 'volgaic', 0.45, ['Merya', 'Rostov']),
 'mordvins': ('Mordvins', 'Mordvinic', 'volgaic', 0.5, ['Purgasova', 'Erzyan Land']),
 'sarmatians': ('Sarmatians', 'Sarmatian', 'iranian', 0.55, ['Sarmatia', 'Roxolania']),
 'iazyges': ('Iazyges', 'Sarmatian', 'iranian', 0.5, ['Iazygia']),
 'alans': ('Alans', 'Alanic', 'iranian', 0.6, ['Alania']),
 'scythians': ('Scythians', 'Scythian', 'iranian', 0.55, ['Scythia', 'Scythia Minor']),
 'taurians': ('Taurians', 'Taurian', 'isolate', 0.4, ['Tauris']),
 'greeks': ('Greeks', 'Koine Greek', 'hellenic', 0.75, ['Hellas', 'Achaea', 'Macedon', 'Epirus', 'Pontus', 'Byzantion']),
 # --- Anatolia, Caucasus, Iran, Central Asia ---
 'phrygians': ('Phrygians', 'Phrygian', 'anatolian', 0.4, ['Phrygia']),
 'galatians': ('Galatians', 'Galatian', 'celtic', 0.5, ['Galatia']),
 'cappadocians': ('Cappadocians', 'Cappadocian', 'anatolian', 0.45, ['Cappadocia']),
 'cilicians': ('Cilicians', 'Luwian', 'anatolian', 0.4, ['Cilicia', 'Isauria']),
 'armenians': ('Armenians', 'Old Armenian', 'armenian', 0.8, ['Armenia', 'Sophene', 'Vaspurakan', 'Cilician Armenia']),
 'colchians': ('Colchians', 'Zan', 'kartvelian', 0.6, ['Colchis', 'Lazica', 'Egrisi']),
 'iberians_c': ('Kartvelians', 'Old Georgian', 'kartvelian', 0.75, ['Iberia', 'Kartli', 'Sakartvelo']),
 'albanians_c': ('Caucasian Albanians', 'Aghwan', 'ncaucasian', 0.55, ['Albania', 'Aghwank', 'Shirvan']),
 'medes': ('Medes', 'Median', 'iranian', 0.6, ['Media', 'Atropatene']),
 'persians': ('Persians', 'Middle Persian', 'iranian', 0.75, ['Persis', 'Eranshahr', 'Fars']),
 'parthians': ('Parthians', 'Parthian', 'iranian', 0.6, ['Parthia', 'Khorasan']),
 'elymaeans': ('Elymaeans', 'Elymaic', 'iranian', 0.45, ['Elymais', 'Khuzestan']),
 'gedrosians': ('Gedrosians', 'Gedrosian', 'iranian', 0.45, ['Gedrosia', 'Makran']),
 'bactrians': ('Bactrians', 'Bactrian', 'iranian', 0.6, ['Bactria', 'Tokharistan']),
 'sogdians': ('Sogdians', 'Sogdian', 'iranian', 0.65, ['Sogdia', 'Samarkand']),
 'chorasmians': ('Chorasmians', 'Chorasmian', 'iranian', 0.6, ['Khwarazm']),
 'massagetae': ('Massagetae', 'Saka', 'iranian', 0.5, ['Massagetia']),
 'kangju': ('Kangju', 'Saka', 'iranian', 0.5, ['Kangju']),
 'saka': ('Saka', 'Saka', 'iranian', 0.55, ['Sakastan', 'Khotan', 'Kashgar']),
 'ferghanans': ('Ferghanans', 'Sogdian', 'iranian', 0.5, ['Dayuan', 'Ferghana']),
 'wusun': ('Wusun', 'Wusun', 'iranian', 0.5, ['Wusun']),
 'tocharians': ('Tocharians', 'Tocharian', 'tocharian', 0.55, ['Kucha', 'Agni', 'Turfan']),
 'pashtuns': ('Paktyans', 'Old Pashto', 'iranian', 0.6, ['Paktya', 'Kabul']),
 # --- Semitic world, Africa ---
 'arameans': ('Arameans', 'Aramaic', 'semitic', 0.5, ['Aram', 'Osroene', 'Palmyra', 'Adiabene', 'Hatra']),
 'assyrians': ('Assyrians', 'Aramaic', 'semitic', 0.6, ['Assyria', 'Adiabene']),
 'phoenicians': ('Phoenicians', 'Phoenician', 'semitic', 0.55, ['Phoenicia', 'Tyre', 'Sidon']),
 'judeans': ('Judeans', 'Hebrew-Aramaic', 'semitic', 0.9, ['Judea', 'Israel', 'Judah']),
 'nabataeans': ('Nabataeans', 'Nabataean Arabic', 'semitic', 0.55, ['Nabataea', 'Petra']),
 'arabs': ('Arabs', 'Old Arabic', 'semitic', 0.6, ['Hejaz', 'Kinda', 'Lakhmids', 'Ghassanids', 'Najd']),
 'himyarites': ('Himyarites', 'Sabaic', 'semitic', 0.7, ['Himyar', 'Saba', 'Hadramawt', 'Qataban']),
 'egyptians': ('Egyptians', 'Egyptian (Coptic)', 'egyptian', 0.7, ['Kemet', 'Misr', 'Egypt']),
 'punics': ('Punics', 'Punic', 'semitic', 0.5, ['Carthage', 'Africa']),
 'cyrenaicans': ('Cyrenaicans', 'Koine Greek', 'hellenic', 0.5, ['Cyrenaica', 'Pentapolis']),
 'libyans': ('Libyans', 'Libyan Berber', 'berber', 0.5, ['Tripolitania', 'Libya']),
 'garamantes': ('Garamantes', 'Garamantian', 'berber', 0.6, ['Garamantia', 'Fezzan']),
 'numidians': ('Numidians', 'Numidian', 'berber', 0.6, ['Numidia', 'Massylia']),
 'mauri': ('Mauri', 'Mauretanian', 'berber', 0.6, ['Mauretania', 'Sijilmasa']),
 'gaetuli': ('Gaetuli', 'Berber', 'berber', 0.55, ['Gaetulia']),
 'nubians': ('Nobatae', 'Old Nubian', 'nilosaharan', 0.6, ['Nobatia', 'Makuria', 'Alodia']),
 'meroites': ('Meroites', 'Meroitic', 'nilosaharan', 0.65, ['Kush', 'Meroe']),
 'sao': ('Sao', 'Chadic', 'chadic', 0.5, ['Sao', 'Kanem']),
 'aksumites': ('Aksumites', 'Ge\'ez', 'semitic', 0.7, ['Aksum', 'Habesha', 'Zagwe']),
 'agaw': ('Agaw', 'Agaw', 'cushitic', 0.55, ['Lasta', 'Agawmeder']),
 'scushites': ('Southern Cushites', 'South Cushitic', 'cushitic', 0.45, ['Azania']),
 'san': ('San', 'Tuu', 'khoisan', 0.5, []),
 'khoekhoe': ('Khoekhoe', 'Khoekhoe', 'khoisan', 0.5, []),
 # --- Asia east and south ---
 'han': ('Han', 'Old Chinese', 'sinitic', 0.75, ['Han', 'Wei', 'Jin', 'Qin', 'Zhao', 'Qi', 'Chu', 'Song', 'Tang', 'Liang', 'Chen', 'Sui', 'Zhou', 'Ming', 'Yan', 'Shu']),
 'minyue': ('Minyue', 'Yue', 'tai', 0.6, ['Minyue', 'Min']),
 'yue': ('Yue', 'Yue', 'tai', 0.55, ['Dongou', 'Yue', 'Wu-Yue']),
 'nanyue': ('Nanyue', 'Yue', 'tai', 0.6, ['Nanyue', 'Nam Việt', 'Southern Han']),
 'luoyue': ('Luoyue', 'Yue', 'tai', 0.55, ['Xi\'ou', 'Luoyue']),
 'lacviet': ('Lạc Việt', 'Proto-Vietic', 'vietic', 0.7, ['Đại Việt', 'Vạn Xuân', 'Đại Cồ Việt', 'Âu Lạc', 'Văn Lang']),
 'dian': ('Dian', 'Dian', 'tibetoburman', 0.55, ['Dian', 'Nanzhao', 'Dali']),
 'yelang': ('Yelang', 'Yelang', 'tai', 0.5, ['Yelang', 'Zangke']),
 'manyi': ('Man peoples', 'Ba-Man', 'hmongmien', 0.5, ['Wuling', 'Ba']),
 'qiang': ('Qiang', 'Qiangic', 'tibetoburman', 0.55, ['Qiang', 'Tuyuhun', 'Western Xia', 'Tangut']),
 'xiongnu': ('Xiongnu', 'Xiongnu', 'turkic', 0.6, ['Xiongnu', 'Rouran', 'Göktürk Khaganate', 'Uyghur Khaganate']),
 'xianbei': ('Xianbei', 'Xianbei', 'mongolic', 0.55, ['Xianbei', 'Tuoba Wei', 'Murong Yan', 'Khitan Liao', 'Rouran']),
 'wuhuan': ('Wuhuan', 'Xianbei', 'mongolic', 0.5, ['Wuhuan', 'Kumo Xi']),
 'dingling': ('Dingling', 'Old Turkic', 'turkic', 0.5, ['Dingling', 'Tiele', 'Kyrgyz Khaganate', 'Uyghur Khaganate']),
 'buyeo': ('Buyeo', 'Buyeo', 'korean', 0.6, ['Buyeo', 'Balhae']),
 'yemaek': ('Yemaek', 'Goguryeo', 'korean', 0.7, ['Goguryeo', 'Goryeo', 'Balhae']),
 'samhan': ('Samhan', 'Old Korean', 'korean', 0.7, ['Silla', 'Baekje', 'Gaya', 'Goryeo', 'Joseon']),
 'yilou': ('Yilou', 'Tungusic', 'tungusic', 0.5, ['Mohe', 'Jurchen Jin', 'Balhae']),
 'tungus': ('Tungus', 'Evenki', 'tungusic', 0.45, []),
 'yukaghirs': ('Yukaghirs', 'Yukaghir', 'paleosiberian', 0.45, []),
 'ugrians': ('Ugrians', 'Ugric', 'ugric', 0.45, ['Yugra', 'Sibir']),
 'samoyeds': ('Samoyeds', 'Samoyedic', 'samoyedic', 0.45, []),
 'wa': ('Wa', 'Old Japanese', 'japonic', 0.65, ['Yamato', 'Wa', 'Nihon', 'Yamatai', 'Izumo', 'Kibi']),
 'emishi': ('Emishi', 'Ainu', 'isolate', 0.55, ['Emishi', 'Ezo']),
 'hayato': ('Hayato', 'Old Japanese', 'japonic', 0.5, ['Hayato', 'Satsuma']),
 'cham': ('Cham', 'Chamic', 'austronesian', 0.6, ['Champa', 'Linyi', 'Panduranga']),
 'khmer': ('Khmer', 'Old Khmer', 'monkhmer', 0.6, ['Funan', 'Chenla', 'Kambuja', 'Angkor']),
 'mon': ('Mon', 'Old Mon', 'monkhmer', 0.55, ['Dvaravati', 'Thaton', 'Hanthawaddy', 'Haripunjaya']),
 'lawa': ('Lawa', 'Palaungic', 'monkhmer', 0.45, ['Lawa', 'Lan Na']),
 'pyu': ('Pyu', 'Pyu', 'tibetoburman', 0.55, ['Sri Ksetra', 'Halin', 'Bagan', 'Tagaung']),
 'malays': ('Malays', 'Old Malay', 'austronesian', 0.55, ['Langkasuka', 'Kedah', 'Srivijaya', 'Tambralinga']),
 'kamarupans': ('Kamarupans', 'Kamarupi Prakrit', 'indoaryan', 0.5, ['Kamarupa', 'Pragjyotisha']),
 'kiratis': ('Kiratis', 'Kiranti', 'tibetoburman', 0.5, ['Kirata', 'Licchavi Nepal']),
 'vangas': ('Vangas', 'Magadhi Prakrit', 'indoaryan', 0.5, ['Vanga', 'Gauda', 'Pala', 'Samatata']),
 'magadhans': ('Magadhans', 'Magadhi Prakrit', 'indoaryan', 0.55, ['Magadha', 'Pataliputra', 'Mithila']),
 'kalingas': ('Kalingas', 'Odra Prakrit', 'indoaryan', 0.55, ['Kalinga', 'Odra', 'Utkala']),
 'kosalans': ('Kosalans', 'Ardhamagadhi Prakrit', 'indoaryan', 0.5, ['Kosala', 'Kashi', 'Kannauj', 'Prayaga']),
 'panchalas': ('Panchalas', 'Shauraseni Prakrit', 'indoaryan', 0.5, ['Panchala', 'Kuru', 'Mathura', 'Indraprastha', 'Thanesar']),
 'malavas': ('Malavas', 'Shauraseni Prakrit', 'indoaryan', 0.5, ['Malwa', 'Avanti', 'Ujjain', 'Gurjara']),
 'saurashtrans': ('Saurashtrans', 'Gujarati Prakrit', 'indoaryan', 0.5, ['Saurashtra', 'Valabhi', 'Lata']),
 'maharashtris': ('Maharashtris', 'Maharashtri Prakrit', 'indoaryan', 0.55, ['Maharashtra', 'Vidarbha', 'Rashtrakuta', 'Yadava']),
 'andhras': ('Andhras', 'Old Telugu', 'dravidian', 0.55, ['Andhra', 'Vengi', 'Kakatiya']),
 'kannadigas': ('Kannadigas', 'Old Kannada', 'dravidian', 0.55, ['Karnata', 'Kadamba', 'Chalukya', 'Hoysala']),
 'tamils': ('Tamils', 'Old Tamil', 'dravidian', 0.7, ['Chola', 'Chera', 'Pandya', 'Pallava']),
 'punjabis': ('Punjabis', 'Paishachi Prakrit', 'indoaryan', 0.5, ['Panchanada', 'Taxila', 'Sakala', 'Lahore']),
 'sindhis': ('Sindhis', 'Vrachada Prakrit', 'indoaryan', 0.55, ['Sindhu', 'Sauvira', 'Sindh']),
 # --- Americas, Oceania ---
 'northeast': ('Eastern Algonquians', 'Algonquian', 'algic', 0.45, []),
 'iroquoians': ('Iroquoians', 'Proto-Iroquoian', 'naother', 0.5, ['Haudenosaunee', 'Wendake']),
 'hopewell': ('Hopewell peoples', 'Algonquian', 'algic', 0.5, ['Hopewell', 'Cahokia']),
 'southeast': ('Muskogeans', 'Muskogean', 'naother', 0.5, ['Muskogee', 'Coosa', 'Natchez']),
 'plains': ('Plains peoples', 'Siouan-Caddoan', 'naother', 0.45, []),
 'puebloans': ('Ancestral Puebloans', 'Puebloan', 'utoaztecan', 0.5, ['Chaco', 'Mesa Verde']),
 'hohokam': ('Hohokam', 'Uto-Aztecan', 'utoaztecan', 0.5, ['Hohokam', 'Casas Grandes']),
 'numic': ('Great Basin peoples', 'Numic', 'utoaztecan', 0.4, []),
 'californians': ('Californians', 'Penutian-Hokan', 'naother', 0.4, []),
 'pnw': ('Coast Salish', 'Salishan', 'naother', 0.45, []),
 'subarctic': ('Northern Athabaskans', 'Athabaskan', 'nadene', 0.4, []),
 'cree': ('Cree', 'Algonquian', 'algic', 0.4, []),
 'dorset': ('Dorset Paleo-Eskimos', 'Paleo-Eskimo', 'eskaleut', 0.4, []),
 'chichimecs': ('Chichimecs', 'Uto-Aztecan', 'utoaztecan', 0.4, ['Chichimeca']),
 'teotihuacanos': ('Teotihuacanos', 'Otomanguean', 'otomanguean', 0.6, ['Teotihuacan', 'Tula', 'Tenochtitlan', 'Texcoco', 'Tlaxcala']),
 'westmex': ('West Mexicans', 'Purépecha', 'otomanguean', 0.5, ['Tzintzuntzan', 'Purépecha']),
 'gulfmex': ('Epi-Olmecs', 'Mixe-Zoque', 'otomanguean', 0.55, ['Tres Zapotes', 'El Tajín', 'Cerro de las Mesas']),
 'arawaks': ('Arawaks', 'Arawakan', 'amazonian', 0.45, ['Borinquen', 'Xaraguá']),
 'archaic': ('Archaic islanders', 'Ciboney', 'amazonian', 0.4, []),
 'mochica': ('Mochica', 'Mochica', 'andean', 0.6, ['Moche', 'Chimor', 'Sicán']),
 'nazcans': ('Nazcans', 'Nazca', 'andean', 0.55, ['Nazca', 'Paracas', 'Ica']),
 'quechua': ('Quechua', 'Proto-Quechua', 'andean', 0.55, ['Wari', 'Tawantinsuyu', 'Recuay', 'Cusco']),
 'aymara': ('Aymara', 'Proto-Aymara', 'andean', 0.55, ['Pukara', 'Tiwanaku', 'Lupaqa', 'Colla']),
 'canari': ('Cañari', 'Cañari', 'andean', 0.5, ['Cañar', 'Quitu']),
 'muisca': ('Muisca', 'Chibcha', 'chibchan', 0.55, ['Muisca', 'Bacatá', 'Hunza']),
 'mapuche': ('Mapuche', 'Mapudungun', 'andean', 0.6, ['Araucanía', 'Wallmapu']),
 'diaguita': ('Diaguita', 'Kakan', 'andean', 0.5, ['Diaguita']),
 'aborigines': ('Aboriginal Australians', 'Pama-Nyungan', 'australian', 0.5, []),
 'DROP': None,
}

R = []
def r(key, box, match='*'):
    R.append((key, box, match))
EUROPE_MOD = ['germanic', 'romance', 'celtic', 'slavic', 'baltic', 'hellenic', 'albanian', 'ugric', 'turkic', 'semitic', 'finnic', 'volgaic', 'permic', 'isolate', 'armenian', 'iranian', 'mongolic', 'kartvelian', 'ncaucasian', 'unknown']
# British Isles
r('irish', [-11, 51.3, -5.4, 55.5]); r('picts', [-8, 55.6, -0.5, 61]); r('britons', [-8, 49.8, 2, 55.6])
# Iberia and France
r('vascones', [-3.3, 42.4, -1.0, 43.5]); r('aquitani', [-2, 42.6, 0.8, 44.6])
r('gallaeci', [-9.5, 41.8, -6.5, 43.9]); r('lusitanians', [-9.6, 36.9, -6.3, 41.8])
r('celtiberians', [-6.5, 39.4, -1.4, 43.6]); r('iberians', [-6.3, 35.9, 3.5, 43.0])
r('belgae', [1.5, 49.2, 6.5, 51.6]); r('gauls', [-5, 42.2, 8.3, 51.2], EUROPE_MOD)
r('sardinians', [8, 38.8, 9.9, 41.3])
r('latins', [6.5, 36.5, 19, 46.6], ['romance', 'germanic', 'slavic', 'albanian', 'hellenic', 'semitic'])
# Alps
r('helvetii', [5.9, 45.8, 9.6, 47.8]); r('raeti', [9.6, 46.2, 12.5, 47.8], EUROPE_MOD)
r('pannonians', [16.0, 45.0, 19.0, 48.2], EUROPE_MOD); r('norici', [12.5, 46.3, 16.0, 48.7], EUROPE_MOD)
r('suebi', [7.5, 47.3, 12.5, 48.7], EUROPE_MOD)
# Germania
r('frisii', [3.3, 51.6, 8.7, 54.0], EUROPE_MOD); r('franks', [4, 49.5, 9, 51.6], EUROPE_MOD)
r('saxons', [7, 51.6, 11.5, 55.0], EUROPE_MOD); r('danes', [8, 54.5, 13, 57.8], EUROPE_MOD)
r('marcomanni', [12.0, 48.5, 16.0, 51.1], EUROPE_MOD); r('quadi', [16.0, 47.7, 19.0, 50.0], EUROPE_MOD)
r('suebi', [8.5, 48.7, 14.5, 52.5], EUROPE_MOD); r('lugii', [14.5, 49.8, 19.5, 52.5], EUROPE_MOD)
r('goths', [14, 52.5, 20.5, 55], EUROPE_MOD); r('aesti', [19.5, 53.5, 23, 55.5], EUROPE_MOD)
r('gutes', [11, 55.3, 19.5, 59.0], ['germanic']); r('suiones', [11, 59.0, 25, 64.5], ['germanic']); r('norse', [4, 57.8, 32, 72], ['germanic'])
# Eastern Europe
r('balts', [21, 53.0, 37.5, 57.8], EUROPE_MOD)
r('venedi', [19.5, 49.0, 36.0, 53.0], EUROPE_MOD)
r('chudes', [22, 57.8, 45, 66], ['slavic', 'germanic', 'baltic'])
r('merya', [36.5, 55.0, 48, 60], ['slavic', 'turkic', 'germanic'])
r('mordvins', [40, 52, 50, 55.5], ['slavic', 'turkic', 'germanic'])
r('taurians', [33.4, 44.3, 35.2, 44.9], EUROPE_MOD); r('greeks', [35.2, 44.8, 37.5, 45.6], EUROPE_MOD)
r('scythians', [32.4, 44.9, 36.0, 46.2], EUROPE_MOD)
r('alans', [37.5, 41.5, 49.5, 46.5], ['turkic', 'slavic', 'mongolic', 'germanic'])
r('sarmatians', [27, 45.0, 60, 53.0], EUROPE_MOD)
r('iazyges', [19.0, 45.2, 20.6, 48.2], EUROPE_MOD)
r('dacians', [20.6, 43.6, 30.5, 49.0], ['romance', 'ugric', 'slavic', 'germanic', 'turkic'])
r('dacians', [18.5, 47.5, 23.0, 49.8], ['slavic', 'ugric'])
# Balkans
r('illyrians', [13.5, 39.6, 20.6, 46.2], ['slavic', 'albanian', 'romance', 'turkic', 'ugric'])
r('pannonians', [15, 44.3, 21.5, 46.5], ['slavic', 'ugric', 'germanic', 'romance'])
r('dardanians', [20.0, 42.0, 22.7, 44.5], ['slavic', 'albanian', 'turkic'])
r('paeonians', [20.6, 40.8, 23.5, 42.3], ['slavic', 'albanian', 'turkic'])
r('moesians', [22.0, 42.7, 29.5, 44.3], ['slavic', 'romance', 'turkic'])
r('thracians', [22.5, 40.5, 29.5, 42.8], ['slavic', 'turkic', 'romance'])
r('greeks', [19.3, 34.8, 29.0, 42.0], ['slavic', 'albanian', 'turkic', 'hellenic', 'romance'])
# Anatolia
r('greeks', [25.5, 36.0, 30.5, 41.4], '*'); r('greeks', [30.5, 40.6, 42, 42.3], ['turkic', 'kartvelian', 'semitic'])
r('cilicians', [30.5, 36.0, 36.5, 37.5], '*')
r('phrygians', [29.0, 37.5, 32.5, 40.6], '*'); r('galatians', [31.5, 38.5, 35.0, 40.6], '*')
r('cappadocians', [34.0, 37.5, 39.0, 40.6], '*')
r('arameans', [36.5, 36.0, 43.0, 37.8], ['turkic', 'iranian', 'semitic', 'armenian'])
r('armenians', [37.5, 37.5, 47.5, 41.5], ['turkic', 'iranian', 'armenian', 'semitic', 'kartvelian'])
r('greeks', [26, 34, 34.8, 36.0], ['turkic', 'hellenic'])  # Crete, Cyprus, Rhodes
# Caucasus
r('colchians', [39.5, 41.4, 43.0, 43.5], ['kartvelian', 'turkic', 'ncaucasian']); r('iberians_c', [43.0, 41.0, 46.8, 43.0], ['kartvelian', 'turkic', 'armenian'])
r('albanians_c', [44.8, 38.8, 50.5, 42.0], ['turkic', 'iranian', 'ncaucasian', 'armenian'])
# Mesopotamia, Levant, Arabia
r('assyrians', [41.5, 35.3, 45.0, 37.3], ['semitic', 'iranian', 'turkic'])
r('judeans', [34.2, 31.0, 35.7, 33.3], '*'); r('phoenicians', [35.0, 33.0, 36.2, 35.0], '*')
r('nabataeans', [33.5, 26.0, 39.0, 31.0], ['semitic']); r('nabataeans', [35.5, 29.0, 38.0, 32.5], ['semitic'])
r('arameans', [35.2, 30.0, 48.5, 37.5], ['semitic', 'turkic', 'iranian'])
r('himyarites', [41.5, 12.0, 52.5, 18.5], ['semitic'])
r('arabs', [34, 12, 60, 30], ['semitic', 'iranian'])
r('arabs', [34, 30, 48.5, 32], ['semitic'])
r('DROP', [44, 25, 80, 45], ['semitic'])  # Arab settlers in Iran and Central Asia came with Islam
# Iran and Central Asia
r('elymaeans', [47.5, 29.5, 51.5, 33.5], '*')
r('medes', [44.5, 33.0, 51.0, 39.5], ['turkic', 'iranian', 'semitic', 'armenian'])
r('persians', [49.5, 25.5, 58.5, 33.0], ['turkic', 'iranian', 'semitic'])
r('gedrosians', [57.0, 24.5, 66.5, 30.5], ['iranian', 'dravidian'])
r('chorasmians', [57.5, 40.0, 62.5, 43.8], '*')
r('sogdians', [63.5, 38.0, 70.0, 41.0], '*')
r('ferghanans', [70.0, 40.0, 74.0, 41.6], '*')
r('bactrians', [64.0, 34.5, 72.0, 38.5], '*')
r('parthians', [51.0, 33.0, 64.0, 39.0], ['turkic', 'iranian', 'mongolic', 'semitic'])
r('massagetae', [50.0, 37.5, 64.0, 46.0], '*')
r('wusun', [74.0, 41.5, 84.5, 47.5], '*')
r('saka', [68.0, 36.5, 80.0, 44.0], ['turkic', 'iranian', 'slavic', 'germanic', 'semitic'])
r('kangju', [60.0, 41.0, 74.0, 47.0], '*')
r('sarmatians', [45.0, 44.0, 62.0, 53.0], '*')
r('saka', [60.0, 46.0, 85.0, 55.5], '*')
r('tocharians', [80.0, 40.3, 95.0, 44.5], ['turkic', 'sinitic', 'mongolic', 'iranian'])
r('saka', [73.0, 35.5, 92.0, 40.3], ['turkic', 'sinitic', 'iranian'])
r('wusun', [79.0, 43.5, 92.0, 49.5], ['turkic', 'sinitic', 'mongolic', 'iranian'])
# Siberia
r('ugrians', [58.0, 55.0, 90.0, 67.0], ['slavic', 'germanic', 'turkic', 'ugric', 'iranian'])
r('samoyeds', [42.0, 64.0, 110.0, 77.0], ['slavic', 'germanic', 'turkic', 'samoyedic', 'ugric'])
r('chudes', [30.0, 60.0, 60.0, 70.0], ['slavic', 'germanic'])
r('=Mari', [44.0, 52.0, 53.0, 58.5], ['turkic', 'slavic'])
r('ugrians', [53.0, 50.0, 62.0, 58.5], ['turkic', 'slavic', 'germanic'])
r('dingling', [84.0, 48.0, 110.0, 56.5], ['slavic', 'germanic', 'turkic', 'mongolic', 'iranian'])
r('yukaghirs', [110.0, 63.0, 165.0, 74.0], ['slavic', 'turkic', 'tungusic', 'germanic', 'iranian'])
r('tungus', [90.0, 50.0, 145.0, 66.0], ['slavic', 'turkic', 'germanic', 'iranian', 'mongolic'])
r('yilou', [125.0, 42.0, 145.0, 55.0], ['slavic', 'germanic', 'sinitic', 'tungusic', 'korean', 'iranian'])
r('tungus', [60.0, 50.0, 180.0, 78.0], ['slavic', 'germanic', 'turkic', 'iranian'])
# Mongolia, Manchuria, Korea, Japan
r('xianbei', [113.0, 43.5, 125.0, 52.0], ['mongolic', 'sinitic', 'tungusic', 'turkic'])
r('wuhuan', [113.0, 41.0, 122.0, 43.5], ['mongolic', 'sinitic', 'tungusic'])
r('xiongnu', [88.0, 37.0, 113.0, 50.5], ['mongolic', 'turkic', 'sinitic'])
r('xiongnu', [96.0, 50.5, 113.0, 53.0], ['mongolic', 'turkic'])
r('buyeo', [123.0, 42.5, 130.0, 47.5], ['sinitic', 'tungusic', 'korean', 'mongolic'])
r('yemaek', [124.0, 38.7, 131.0, 42.5], ['sinitic', 'tungusic', 'korean', 'mongolic'])
r('xianbei', [118.0, 42.5, 123.0, 50.0], ['sinitic', 'tungusic', 'mongolic'])
r('yilou', [128.0, 42.5, 136.0, 50.0], ['sinitic', 'tungusic', 'korean'])
r('samhan', [124.5, 33.0, 130.0, 38.7], ['korean'])
r('emishi', [138.5, 38.6, 146.0, 46.0], ['japonic', 'isolate'])
r('hayato', [129.5, 30.5, 131.5, 32.3], ['japonic'])
r('wa', [128.5, 30.0, 146.0, 46.0], ['japonic'])
# China
r('qiang', [97.0, 33.0, 104.5, 39.5], ['sinitic', 'tibetoburman', 'mongolic', 'turkic'])
r('tocharians', [91.0, 39.5, 97.0, 43.0], ['sinitic', 'turkic', 'mongolic'])
r('xiongnu', [97.0, 38.0, 107.0, 42.5], ['sinitic', 'mongolic', 'turkic'])
r('minyue', [116.0, 23.5, 120.5, 28.3], ['sinitic', 'hmongmien', 'tai'])
r('yue', [117.5, 27.0, 122.5, 30.5], ['sinitic', 'hmongmien', 'tai'])
r('nanyue', [110.0, 20.2, 117.0, 25.5], ['sinitic', 'hmongmien', 'tai'])
r('luoyue', [104.5, 21.5, 112.0, 26.5], ['sinitic', 'hmongmien', 'tai'])
r('dian', [100.5, 23.0, 104.5, 27.0], ['sinitic', 'tibetoburman', 'tai', 'hmongmien'])
r('yelang', [104.0, 24.5, 109.8, 29.0], ['sinitic', 'tibetoburman', 'tai', 'hmongmien'])
r('manyi', [108.5, 26.0, 112.0, 30.5], ['sinitic', 'tibetoburman', 'hmongmien'])
r('yue', [113.5, 24.5, 118.5, 28.0], ['sinitic', 'hmongmien'])
r('=Li', [108.0, 18.0, 111.5, 20.2], ['sinitic'])
r('=Kaoshan', [119.8, 21.8, 122.2, 25.5], ['sinitic'])
r('han', [97.0, 22.0, 127.0, 42.5], ['sinitic'])
# Vietnam, mainland SE Asia
r('lacviet', [102.0, 17.5, 109.0, 23.0], ['vietic', 'tai', 'sinitic', 'hmongmien'])
r('cham', [105.5, 11.0, 110.0, 17.5], ['vietic', 'monkhmer', 'tai', 'austronesian'])
r('khmer', [102.0, 8.0, 108.0, 11.5], ['vietic', 'monkhmer', 'tai', 'austronesian'])
r('khmer', [102.0, 11.5, 106.0, 15.5], ['tai', 'vietic'])
r('mon', [98.0, 12.5, 102.0, 17.5], ['tai'])
r('khmer', [101.0, 13.5, 106.0, 17.5], ['tai'])
r('malays', [97.5, 1.0, 104.5, 10.8], ['tai'])
r('lawa', [97.0, 17.5, 106.0, 23.0], ['tai'])
r('mon', [94.0, 13.0, 98.5, 18.2], ['tibetoburman', 'tai'])
r('pyu', [92.0, 18.2, 97.5, 24.5], ['tibetoburman', 'tai'])
r('lawa', [96.5, 19.5, 100.5, 24.5], ['tai'])
# South Asia
r('kamarupans', [89.5, 24.0, 96.5, 28.5], ['indoaryan', 'tai'])
r('kiratis', [80.0, 26.4, 88.3, 30.5], ['indoaryan'])
r('vangas', [86.0, 20.5, 92.8, 26.5], ['indoaryan'])
r('kalingas', [81.5, 17.5, 87.5, 22.6], ['indoaryan'])
r('magadhans', [83.0, 22.6, 88.5, 27.5], ['indoaryan'])
r('kosalans', [79.0, 23.5, 84.5, 30.0], ['indoaryan'])
r('panchalas', [74.0, 25.5, 79.0, 32.0], ['indoaryan'])
r('punjabis', [69.5, 29.0, 77.0, 34.5], ['indoaryan', 'iranian'])
r('sindhis', [66.5, 23.5, 71.5, 29.5], ['indoaryan', 'iranian'])
r('saurashtrans', [68.0, 20.0, 74.0, 24.8], ['indoaryan'])
r('malavas', [70.0, 22.0, 80.0, 29.0], ['indoaryan'])
r('maharashtris', [72.5, 15.5, 81.5, 22.0], ['indoaryan', 'dravidian'])
r('tamils', [74.5, 8.0, 80.5, 13.0], ['dravidian'])
r('pashtuns', [66.0, 30.0, 72.0, 35.5], ['iranian'])
r('bactrians', [61.0, 31.0, 68.0, 36.5], ['mongolic', 'turkic', 'iranian'])
# Africa
r('egyptians', [24.5, 22.0, 35.5, 31.8], ['semitic'])
r('cyrenaicans', [19.5, 30.5, 25.5, 33.0], '*')
r('libyans', [10.0, 29.5, 19.5, 33.5], ['semitic', 'berber'])
r('garamantes', [10.0, 22.0, 19.0, 29.5], ['semitic', 'berber'])
r('libyans', [19.0, 22.0, 25.5, 30.5], ['semitic'])
r('punics', [8.5, 34.6, 11.5, 37.5], ['semitic', 'berber'])
r('numidians', [3.5, 33.5, 10.0, 37.5], ['semitic', 'berber'])
r('mauri', [-10.0, 29.0, 3.5, 36.5], ['semitic', 'berber', 'romance'])
r('gaetuli', [-17.5, 18.5, 12.0, 34.0], ['semitic'])
r('nubians', [29.0, 19.0, 34.0, 22.5], ['semitic', 'nilosaharan'])
r('meroites', [30.0, 13.5, 37.0, 19.0], ['semitic', 'nilosaharan'])
r('sao', [12.5, 9.5, 16.5, 14.5], ['semitic'])
r('aksumites', [36.0, 13.0, 41.0, 17.5], ['semitic', 'cushitic'])
r('agaw', [35.0, 9.0, 40.5, 13.0], ['semitic'])
r('=Fulbe', [-17.5, 10, -10.0, 17.0], ['atlantic'])
r('DROP', [-20, 0, 52, 22], ['semitic', 'atlantic'])  # Arabs and Fulbe of the Sahel arrived later
r('scushites', [34.0, -8.5, 41.5, 1.0], ['bantu'])
r('khoekhoe', [11.0, -35.0, 22.0, -17.0], ['bantu', 'germanic'])
r('san', [17.0, -35.0, 41.0, -16.5], ['bantu', 'germanic', 'atlantic'])
r('san', [22.0, -19.0, 30.0, -13.5], ['bantu'])
# Americas
r('dorset', [-100, 60, -10, 84], ['eskaleut', 'germanic'])
r('subarctic', [-170, 55, -95, 72], ['germanic', 'romance', 'algic', 'eskaleut'])
r('cree', [-100, 49, -60, 60], ['germanic', 'romance'])
r('iroquoians', [-82, 41.5, -73, 46.5], ['germanic', 'romance'])
r('northeast', [-80, 37, -52, 52], ['germanic', 'romance'])
r('hopewell', [-92, 36, -80, 42.5], ['germanic', 'romance'])
r('southeast', [-95, 24, -75, 36.5], ['germanic', 'romance'])
r('pnw', [-128, 42, -116, 55], ['germanic', 'romance'])
r('californians', [-125, 32, -116, 42], ['germanic', 'romance'])
r('numic', [-120, 36, -106, 45], ['germanic', 'romance'])
r('puebloans', [-114, 33, -103, 38.5], ['germanic', 'romance'])
r('hohokam', [-115.5, 30, -108, 34.5], ['germanic', 'romance'])
r('plains', [-112, 29, -92, 50], ['germanic', 'romance'])
r('cree', [-125, 45, -90, 55], ['germanic', 'romance'])
r('chichimecs', [-118, 21.5, -96, 33], ['romance', 'germanic'])
r('teotihuacanos', [-100.5, 18.3, -97.0, 21.5], ['romance'])
r('westmex', [-106, 17.5, -100.5, 22.5], ['romance'])
r('gulfmex', [-97.5, 17.0, -93.5, 21.5], ['romance'])
r('=Zapotecs', [-98.5, 15.5, -94.0, 18.3], ['romance'])
r('=Mayas', [-93.5, 13.5, -86.5, 22.0], ['romance', 'germanic'])
r('arawaks', [-68.0, 10, -59, 19], ['romance', 'germanic'])
r('archaic', [-85.5, 17, -68.0, 27], ['romance', 'germanic'])
r('muisca', [-75.5, 3.5, -72.0, 7.5], ['romance'])
r('canari', [-80.0, -4.5, -77.5, 1.5], ['romance'])
r('mochica', [-81.5, -10.0, -77.0, -3.5], ['romance'])
r('nazcans', [-77.5, -17.0, -70.5, -11.0], ['romance'])
r('quechua', [-79.0, -15.0, -70.5, -5.0], ['romance'])
r('aymara', [-71.5, -22.0, -66.0, -14.0], ['romance'])
r('diaguita', [-71.8, -31.0, -64.0, -22.0], ['romance'])
r('mapuche', [-75.0, -43.0, -68.5, -31.0], ['romance', 'germanic'])
OLD_WORLD = ['germanic', 'romance', 'celtic', 'slavic', 'baltic', 'hellenic', 'albanian', 'armenian', 'iranian', 'indoaryan', 'finnic', 'ugric', 'semitic', 'sinitic', 'japonic', 'korean', 'bantu', 'niger_congo', 'turkic', 'dravidian', 'tai', 'austronesian']
r('DROP', [-170, -56, -30, 84], OLD_WORLD)
# Oceania
r('aborigines', [110, -45, 155, -9], ['germanic', 'romance', 'slavic', 'hellenic', 'sinitic'])
r('DROP', [-180, -60, 180, 85], ['germanic', 'romance', 'slavic'])  # any other settler population

# Modern groups kept, but known in year 1 under another name
RENAME = {
 'Chinese (Han)': 'han', 'Vietnamese': 'lacviet', 'Muong': 'lacviet', 'Japanese': 'wa', 'Ainu': 'emishi', 'Koreans': 'samhan',
 'Persians': 'persians', 'Armenians': 'armenians', 'Greeks': 'greeks', 'Basques': 'vascones', 'Jews of Israel': 'judeans',
 'Arabs of UAR (Egyptians)': 'egyptians', 'Tamils': 'tamils', 'Telugu': 'andhras', 'Kannarese': 'kannadigas', 'Malayalis': 'tamils',
 'Marathis': 'maharashtris', 'Gujaratis': 'saurashtrans', 'Rajasthanis': 'malavas', 'Hindi-speaking peoples of Northern India': 'kosalans',
 'Bengalis': 'vangas', 'Biharis': 'magadhans', 'Oriyas': 'kalingas', 'Panjabis': 'punjabis', 'Jhats, Awans': 'punjabis', 'Sindhs': 'sindhis',
 'Assamese': 'kamarupans', 'Nepalese': 'kiratis', 'Khmers': 'khmer', 'Mon (Talaing)': 'mon', 'Burmese': 'pyu', 'Cham': 'cham',
 'Malays of Malaya': 'malays', 'Afghans': 'pashtuns', 'Georgians': 'iberians_c', 'Lâz': 'colchians', 'Udi': 'albanians_c',
 'Ossetes': 'alans', 'Assyrians': 'assyrians', 'Amhara': 'agaw', 'Tigrai': 'aksumites', 'Tigre': 'aksumites', 'Nubians': 'nubians',
 'Quechua': 'quechua', 'Aymara': 'aymara', 'Araucanians': 'mapuche', 'Australian aborigines': 'aborigines', 'Muisca, Paese, Cofan, etc.': 'muisca',
 'Tajiks': 'sogdians', 'Pamir Tajiks': 'saka', 'Baloch': 'gedrosians', 'Brahui': 'gedrosians', 'Kurds': 'medes',
 'Lur': 'elymaeans', 'Bakhtiaris': 'elymaeans', 'Iran Arabs': 'elymaeans', 'Hazara-Berberi': 'bactrians', 'Hazara-Deh-i-Zainat': 'bactrians',
 'Tibetans': None, 'Uighurs': 'tocharians', 'Khalka-Mongols': 'xiongnu', 'Kazakhs': 'kangju', 'Hungarians or Magyars': 'pannonians',
 'Bushmen': 'san', 'Hottentots': 'khoekhoe', 'Sinhalese': None,
}
