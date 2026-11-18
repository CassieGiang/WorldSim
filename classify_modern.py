# Modern GREG group -> language branch. Used only to steer the year-1 correction layer.
B = {}
def put(branch, names):
    for n in names.split(';'):
        n = n.strip()
        if n: B[n] = branch
put('germanic', 'US Americans;Australians;English Canadians;Germans;Swedes;Norwegians;Danes;Dutch;Frisians;Flemings;Afrikaners;Englishmen;English Irish and Scotch Irish;Scotsmen;New Zealanders;Austrians;German Swiss;Alsatians and Lotharingians;Luxemburgers;Icelanders;Faroer Islanders;Falkland Islanders;Pitcairners;Bahama Islanders;Jamaicans;Trinidad Islanders;English-speaking population of the Lesser Antilles;English-speaking population of British Honduras;English-speaking population of Guiana;Dutch-speaking population of Guiana;Curaçao Islanders;Jews')
put('romance', 'Brazilians;Argentinians;Mexicans;French Canadians;French;Spaniards;Italians;Columbians;Venezuelans;Chileans;Peruvians;Bolivians;Ecuadorians;Uruguayans;Paraguayans-Guarani;Cubans;Dominicans;Haitians;Puerto Ricans;Costa Ricans;Guatemalians;Hondurans;Salvadorians;Nicaraguans;Panamans;Portuguese;Catalans;Galicians;Rumanians;Moldavians;Walloons;French Swiss;Italian Swiss;Rhaetoromanians;Corsicans;Aromani;French-speaking population of Guiana;French-speaking population of the Lesser Antilles')
put('celtic', 'Irishmen;Welsh;Gaels;Bretons')
put('slavic', 'Russians;Ukrainians;Byelorussians;Poles;Czechs;Slovaks;Lusatians;Slovenes;Croats;Serbs;Bosnians;Montenegrins;Macedonians;Bulgarians')
put('baltic', 'Letts;Lithuanians')
put('hellenic', 'Greeks')
put('albanian', 'Albanians')
put('armenian', 'Armenians')
put('iranian', 'Persians;Kurds;Baloch;Afghans;Tajiks;Pamir Tajiks;Ossetes;Lur;Bakhtiaris;Gilaki;Mazanderani;Galesh;Talyshes;Tats;Firoz-Kohis;Jamshidis;Taimanis;Teymurs;Hazara-Berberi;Hazara-Deh-i-Zainat;Ormuri;Parachi;Bartangs;Roshanls;Shugnanis;Ishkashimis;Yazghulems;Yaghnobis;Tirahi')
put('indoaryan', 'Hindi-speaking peoples of Northern India;Bengalis;Biharis;Marathis;Rajasthanis;Gujaratis;Panjabis;Sindhs;Jhats, Awans;Oriyas;Assamese;Kashmiris;Nepalese;Sinhalese;Kumaonis, Garhwalis;Bhils;Gujars;Shina;Kohistanis;Kho;Pashai;Nuristanis;Veddas;Tharu;Indians of India and Pakistan;Maler')
put('dravidian', 'Tamils;Telugu;Kannarese;Malayalis;Gonds;Kandh;Oraons;Brahui;Tulu;Kodagus;Gadabas')
put('munda', 'Santals;Mundas;Ho;Bhumij;Kharias;Juangs;Savaras;Korkus;Khasis;Nicobarese')
put('isolate', 'Burushaskis;Basques;Ainu;Andamanese')
put('tibetoburman', 'Tibetans;Burmese;Yi;Hani;Lisu;Lahu;Nahsi;Tulung;Achang;Kachins;Karen;Kayah;Chini;Nagas;Lushei;Garos;Kacharis;Tippera;Mikirs;Manipuris;Lepchas;Limbus;Kiratis;Gurungs;Magars;Newars;Sherpas;Sunwars;Tamangs (Murmis);Ladakhs;Baltis;Bhotias;Loba;Kanauri, Lahuli;Tibetan-speaking peoples of Bhutan;Thado, Mhar, Hallam, Marings,;Chiang;Tuchia;Pai')
put('sinitic', 'Chinese (Han);Hui')
put('tai', 'Siamese;Lao;Shan;Khun;Lu;Thai (incl. Thai Nea, Thai Pho);Chuang;Puyi;Tung;Shuichia;Maonan;Mulao;Li;Kehlao;Nung and Giai;Tay;Nua;Khamtis;Phuteng;Yuang;Chaonam;Sui')
put('hmongmien', 'Miao;Yao;She')
put('vietic', 'Vietnamese;Muong')
put('monkhmer', 'Khmers;Mon (Talaing);Wa;Palaung;Pulang;Khmu;Lamet;Kui;Boloven;Jarai;Mnong and Brao;Stieng;Banar;Sedang;Ede;Ma;Sre;Raglai;Cham;Cham Re;Khatu;Ve;Caolan;Puok and Ksakau;Lati and Lakwa;Vankieu;Bo and So;Semangs;Senoi;Selung')
put('turkic', 'Kazakhs;Uzbeks;Turkmens;Kirghis;Uighurs;Sari-Uighurs;Salars;Turks;Azerbaijanians;Tatars;Bashkirs;Chuvashes;Yakuts;Dolgans;Altayans;Khakass;Shors;Tuvinians;Tofalar;Karakalpaks;Noghays;Kumuk;Karachays;Balkars;Gagauz;Afshars;Kajars;Kashkais;Shahseven;Turkic tribes of southern and eastern Iran;Karapapakh;Uriankhai-Monchak;Altayan Urlankhai;Uriankhai of former Shabinsky area;Khoton;Dagh Chufuti')
put('mongolic', 'Khalka-Mongols;Mongols of Chinese Peoples\' Republic;Mongols;Buryats;Kalmyks;Dahurs;Tujen;Tunghsiang;Paoan;Bayat;Darkhat;Därbäts;Olöts;Torgut;Zakhchins')
put('tungusic', 'Evenks (incl. Hamnigans);Evens;Manchus;Sibo;Nanaians;Olcha;Oroches;Oroks;Udeghe;Orochons')
put('korean', 'Koreans')
put('japonic', 'Japanese')
put('paleosiberian', 'Chukchi;Koryaks;Itelmens;Kets;Yukaghirs;Nivkhs')
put('samoyedic', 'Nenets;Nganasans;Ens;Selkups')
put('ugric', 'Khants;Mansi;Hungarians or Magyars')
put('finnic', 'Finns;Estonians;Karelians;Vepses;Livonians;Saami')
put('permic', 'Komi;Komi-Permyaks;Udmurts')
put('volgaic', 'Mari;Mordva')
put('kartvelian', 'Georgians;Lâz')
put('ncaucasian', 'Abazinians;Abkhaz;Adyghe;Kabardians;Circassians;Chechens;Ingushes;Kists;Bats;Avars;Dargwa or Dargins;Laks;Lezghians;Tabasarans;Aguls;Rutuls;Tsakhurs;Budukhs;Kryz;Khinalugs;Udi')
put('semitic', 'Arabs of Saudi Arabia;Sudan Arabs;Algeria Arabs;West Sahara Arabs;Libya Arabs;Arabs of UAR (Egyptians);Iraq Arabs;Morocco Arabs;Syria Arabs;Arabs of Yemen;Tunisia Arabs;Lebanon Arabs;Jordan and Palestine Arabs;Iran Arabs;Afghanistan Arabs;Arabs of Middle Asia;Arabs of Turkey;Shoa-Arabs;Jews of Israel;Assyrians;Maltese;Amhara;Tigrai;Tigre')
put('berber', 'Tuaregs;Kabiles;Oases Berbers;Shawiya;Rif;Shleuh;Tamazight')
put('cushitic', 'Somalis;Galla;Beja;Danakil;Saho;Agau;Sidamo;Iraku;Waboni')
put('chadic', 'Hausa;Kotoko;Masa;Mubi;Mandara;Bura, Bata and Tera;Angas;Bade')
put('nilosaharan', 'Tubu;Kanuri;Nubians;Dinka;Nuer;Northern Lwo;Southern Lwo;Joluo;Acholi;Anuak;Masai;Nandi;Suk;Karamojo;Teso;Lotuko;Bari;Songai;Bagirmi;For;Zagawa;Maba (incl. Masalit);Dago;Tama;Temaini;Berta;Koma;Kunama;Barea;Murle;Moru-Mangbetu;Moru-Mangbetu and Sere-Mundu-speaking Pygmy tribes;Tatog;Kadugli-Krongo')
put('khoisan', 'Bushmen;Hottentots;Hadzapi;Sandawe')
put('austronesian', 'Malagasy;Malays of Malaya;Fijians;Samoans;Tongans;Hawaiians;Maoris;Tahitians;Marquesans;Cook Islanders or Cook;Pukapukans;Niueans;Chamorros;Kaoshan;Kusaieans;Ponapeans;Marshallese;Nauruans;Outliers (Polynesians of Melanesia);Melanesians of New Caledonia;Melanesians of Banks Isls.;Melanesians of southern New Hebrides;Melanesians of Santa Cruz Isls.;Melanesians of Solomon Isls.;Melanesians of Bismarck Archipelago;Melanesians of New Guinea;Dusuns;Ibans;Jakun;Melanaus;Muruts and Kelabits;Kadayans;Torres Strait Islanders')
put('papuan', 'Papuans of New Guinea;Papuans of New Britain and New Ireland;Papuans of Solomon Isls.;Marind-anim, Sentani;Sobei, Yamna, Bonggo, Tobati a;Salawati, Mairassi, Madiki;Waropens;Noemfoor;Wandama;Alors;Tobelo;Galelos, Lolod, Ibu (Ibo);Ternate;Atonis;Bunak')
put('australian', 'Australian aborigines')
put('eskaleut', 'Eskimos;Aleuts')
put('nadene', 'Athapaskans;Apaches;Navahos;Tlinkit;Haida')
put('algic', 'Algonquins;Cree;Ojibway;Montagnais;Arapahos;Kikapoo')
put('naother', 'Iroquois;Sioux;Muscogee;Salish;Kwakiutl;Nootka;Wakash;Tsimshian')
put('utoaztecan', 'Shoshones;Hopi;Papago;Pima;Yaqui;Mayo;Tarahumara;Cora;Huichol;Tepehuanos;Opata;Aztecs;Pipil')
put('mayan', 'Mayas;Quiche;Kakchiquels;Mame;Kekchi;Tseltal;Tojolabali;Chuj;Chorti;Ixil;Aguatecs;Jalaltecs;Pocoman;Pocomchi;Tsutujil;Uspantecs;Lacandons;Choli;Huaztec')
put('otomanguean', 'Otomi;Mazatecs;Mixtec;Zapotecs;Chinantecs;Cuicatecs;Amusgo;Popolocs of Puebla State;Tlapanecs;Matlatzincans;Chorotegi-Mange;Chontal of Oaxaca State;Totonacos;Tepehua;Mixe;Zoque;Popolocs of Veracruz State;Huave;Tarascans;Kilihui')
put('chibchan', 'Lenca;Paya;Sumu;Miskitos;Matagalpa;Ulva;Bribri;Cabecar;Boruca;Terraba;Guatuso;Guaymi;Cunas;Chocos;Torrupan;Muisca, Paese, Cofan, etc.;Motilones;Garifs (Black Caribs)')
put('andean', 'Quechua;Aymara;Araucanians;Tehuelche and Óna;Alacaluf;Yamana')

MANDE = 'Mandingo;Soninke;Susu;Kpelle;Loma;Mende;Mano;Dan;Bobo;Busa;Sanu;Wai;Kisi'
ATL = 'Wolof;Serer;Fulbe;Diola;Balante;Mandjak;Pepel;Biafada;Nalu;Tenda;Gola'
put('mande', MANDE); put('atlantic', ATL)

BANTU_CTY = set('AO CG CF GB EK TP BY ZA ZI MZ MI SF WA BC KE TZ UG SO'.split())
def branch(name, cty):
    if name in B: return B[name]
    c = cty[0]
    if c in ('ID', 'RP', 'MY', 'BX', 'TW', 'MA', 'FJ', 'TN', 'AQ'): return 'austronesian'
    if c in ('PP', 'BP'): return 'papuan'
    if c in BANTU_CTY: return 'bantu'
    if c in ('NI', 'CM', 'GH', 'IV', 'TO', 'BN', 'UV', 'LI', 'GV', 'ML', 'SL', 'SG', 'GA', 'PU', 'CT', 'CD'): return 'niger_congo'
    if c in ('SU', 'ET'): return 'nilosaharan'
    if c in ('BR', 'BL', 'PE', 'EC', 'CO', 'VE', 'GY', 'FG', 'NS', 'PA', 'AR', 'CI'): return 'amazonian'
    if c in ('MX', 'GT', 'HO', 'NU', 'CR', 'PM', 'ES', 'BH'): return 'mesoam_other'
    if c in ('US', 'CA'): return 'naother'
    if c in ('UR',): return 'paleosiberian'
    if c in ('IN', 'NP', 'BM'): return 'tibetoburman'
    if c in ('CH',): return 'tibetoburman'
    if c in ('LA', 'VM', 'CB', 'TH'): return 'monkhmer'
    return 'unknown'

FAMILY = {
 'germanic': 'Indo-European', 'romance': 'Indo-European', 'celtic': 'Indo-European', 'slavic': 'Indo-European', 'baltic': 'Indo-European', 'hellenic': 'Indo-European', 'albanian': 'Indo-European', 'armenian': 'Indo-European', 'iranian': 'Indo-European', 'indoaryan': 'Indo-European', 'italic': 'Indo-European', 'thracian': 'Indo-European', 'illyrian': 'Indo-European', 'tocharian': 'Indo-European', 'anatolian': 'Indo-European',
 'finnic': 'Uralic', 'ugric': 'Uralic', 'samoyedic': 'Uralic', 'permic': 'Uralic', 'volgaic': 'Uralic',
 'turkic': 'Turkic', 'mongolic': 'Mongolic', 'tungusic': 'Tungusic', 'korean': 'Koreanic', 'japonic': 'Japonic',
 'sinitic': 'Sino-Tibetan', 'tibetoburman': 'Sino-Tibetan', 'tai': 'Kra-Dai', 'hmongmien': 'Hmong-Mien',
 'vietic': 'Austroasiatic', 'monkhmer': 'Austroasiatic', 'munda': 'Austroasiatic', 'austronesian': 'Austronesian',
 'dravidian': 'Dravidian', 'semitic': 'Afro-Asiatic', 'berber': 'Afro-Asiatic', 'egyptian': 'Afro-Asiatic', 'cushitic': 'Afro-Asiatic', 'chadic': 'Afro-Asiatic',
 'nilosaharan': 'Nilo-Saharan', 'bantu': 'Niger-Congo', 'niger_congo': 'Niger-Congo', 'mande': 'Mande', 'atlantic': 'Niger-Congo', 'khoisan': 'Khoisan',
 'kartvelian': 'Kartvelian', 'ncaucasian': 'North Caucasian', 'paleosiberian': 'Paleo-Siberian', 'eskaleut': 'Eskimo-Aleut', 'nadene': 'Na-Dene', 'algic': 'Algic',
 'naother': 'North American (other)', 'utoaztecan': 'Uto-Aztecan', 'mayan': 'Mayan', 'otomanguean': 'Mesoamerican (other)', 'mesoam_other': 'Mesoamerican (other)', 'chibchan': 'Chibchan',
 'andean': 'Andean', 'amazonian': 'Amazonian', 'papuan': 'Papuan', 'australian': 'Australian', 'isolate': 'Isolates', 'unknown': 'Isolates',
}
KEY = {
 'germanic': 'germanic', 'romance': 'latin', 'italic': 'latin', 'celtic': 'celtic', 'slavic': 'slavic', 'baltic': 'finnic', 'hellenic': 'greek', 'albanian': 'dacian', 'illyrian': 'dacian', 'thracian': 'dacian', 'armenian': 'persian', 'iranian': 'persian', 'indoaryan': 'indic', 'tocharian': 'turkic', 'anatolian': 'greek',
 'finnic': 'finnic', 'ugric': 'finnic', 'samoyedic': 'siberian', 'permic': 'finnic', 'volgaic': 'finnic',
 'turkic': 'turkic', 'mongolic': 'mongolic', 'tungusic': 'siberian', 'korean': 'korean', 'japonic': 'japanese',
 'sinitic': 'sinitic', 'tibetoburman': 'tibetan', 'tai': 'seasian', 'hmongmien': 'seasian', 'vietic': 'seasian', 'monkhmer': 'seasian', 'munda': 'indic', 'austronesian': 'austronesian',
 'dravidian': 'dravidian', 'semitic': 'arabic', 'berber': 'berber', 'egyptian': 'egyptian', 'cushitic': 'ethiopic', 'chadic': 'westafrican', 'nilosaharan': 'sudanic', 'bantu': 'bantu', 'niger_congo': 'westafrican', 'mande': 'westafrican', 'atlantic': 'westafrican', 'khoisan': 'bantu',
 'kartvelian': 'persian', 'ncaucasian': 'persian', 'paleosiberian': 'siberian', 'eskaleut': 'northamerican', 'nadene': 'northamerican', 'algic': 'northamerican', 'naother': 'northamerican', 'utoaztecan': 'mesoamerican', 'mayan': 'maya', 'otomanguean': 'mesoamerican', 'mesoam_other': 'mesoamerican', 'chibchan': 'amazonian', 'andean': 'andean', 'amazonian': 'amazonian', 'papuan': 'australian', 'australian': 'australian', 'isolate': 'celtic', 'unknown': 'latin',
}
