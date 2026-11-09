'use strict';
/* Lietuva 1918 — hand-drawn land data in [lon, lat], edited directly (js/geo.js is generated). Soils, forests and deposits
   follow the real pattern of the country only roughly: fertile Suvalkija and central plain, sandy pine forests in Dzūkija,
   the Aukštaitija flax belt, bogs and clay pits where the real ones are. */
/* lakes too small for the outlines in geo.js: lon, lat, radius east–west km, radius north–south km, turn in degrees */
const LAKES = [[25.83, 55.79, 1.1, 4.0, 10], [25.80, 55.45, 4.0, 0.8, -15], [25.46, 55.06, 0.6, 6.5, 20], [24.928, 54.658, 1.6, 1.2, 20],
  [24.945, 54.645, 0.8, 1.0, 0], [21.84, 56.04, 2.0, 1.6, 0], [22.36, 55.79, 1.6, 1.1, 0], [22.248, 55.993, 1.3, 0.7, 30], [23.29, 55.86, 2.0, 1.6, 0],
  [23.326, 55.940, 0.5, 0.35, 30], [24.77, 56.225, 0.6, 2.0, 20], [22.73, 54.43, 2.4, 2.0, 0], [23.60, 54.46, 1.4, 1.0, 0], [26.26, 55.72, 1.2, 0.8, 0],
  [25.55, 55.20, 1.5, 0.8, 30], [25.24, 55.58, 1.5, 1.1, 0], [25.70, 55.61, 1.4, 1.0, 20], [24.32, 54.37, 1.6, 1.2, 0]];
/* forest clusters: lon, lat, radius in degrees */
const FOR = [[24.45, 54.15, .33], [23.95, 54.05, .16], [25.75, 55.25, .2], [23.55, 54.75, .18], [25.10, 54.40, .2], [21.95, 56.00, .15], [23.15, 55.62, .14],
  [25.80, 54.95, .18], [22.90, 55.15, .15], [24.80, 56.08, .12], [22.45, 55.35, .16], [21.45, 55.50, .12], [25.45, 55.70, .15], [26.35, 55.35, .18],
  [25.45, 54.80, .1], [24.20, 54.35, .12], [25.75, 55.45, .1], [21.05, 55.40, .06]];
/* fertile plains: lon, lat, radius in degrees */
const FIELDS = [[23.30, 54.65, .33], [23.80, 55.60, .45], [24.30, 55.35, .3], [23.40, 56.10, .3], [22.75, 54.95, .18], [24.70, 55.95, .25], [23.95, 54.98, .12],
  [21.35, 55.75, .1]];
/* deposits: lon, lat, radius km */
const BOGS = [[23.30, 55.82, 9], [25.18, 54.48, 9], [23.55, 54.48, 7], [21.45, 55.38, 8], [25.05, 55.90, 7], [24.40, 54.00, 8], [22.70, 56.25, 7], [24.10, 54.30, 5],
  [22.45, 55.30, 6]];
const CLAYS = [[23.95, 54.97, 7], [23.30, 56.00, 7], [25.35, 54.72, 7], [22.85, 56.25, 7], [22.30, 55.92, 6]];
const FLAXR = [[24.40, 55.80, 28], [25.55, 55.50, 24], [24.85, 55.30, 18], [25.60, 55.85, 20]];
/* Names on the map beyond Lithuania, in Lithuanian: [name, lon, lat, kind] with kind c country, s water, t town.
   The Kaliningrad region was German East Prussia until 1945; the game names it so. */
const MAP_LBL = [['LATVIJA', 24.3, 56.49, 'c'], ['RYTŲ PRŪSIJA', 21.75, 54.75, 'c'], ['LENKIJA', 22.85, 53.93, 'c'], ['BALTARUSIJA', 26.3, 54.2, 'c'], ['MOZŪRIJA', 21.9, 54.03, 'c'],
  ['BALTIJOS JŪRA', 20.85, 56.15, 's'], ['KURŠIŲ MARIOS', 20.98, 55.02, 's'],
  ['Ryga', 24.127, 56.959, 't'], ['Jelgava', 23.713, 56.651, 't'], ['Bauskė', 24.192, 56.405, 't'], ['Liepoja', 21.007, 56.51, 't'], ['Daugpilis', 26.518, 55.871, 't'],
  ['Ilūkstė', 26.295, 55.977, 't'], ['Kraslava', 27.17, 55.894, 't'], ['Aknīstė', 25.747, 56.162, 't'], ['Saldus', 22.494, 56.665, 't'], ['Dobelė', 23.28, 56.628, 't'],
  ['Tilžė', 21.874, 55.081, 't'], ['Ragainė', 22.031, 55.037, 't'], ['Įsrutis', 21.807, 54.633, 't'], ['Gumbinė', 22.2, 54.59, 't'], ['Karaliaučius', 20.507, 54.71, 't'],
  ['Stalupėnai', 22.57, 54.632, 't'], ['Eitkūnai', 22.735, 54.637, 't'], ['Labguva', 21.1, 54.863, 't'], ['Lazdynai', 22.495, 54.946, 't'],
  ['Suvalkai', 22.927, 54.106, 't'], ['Seinai', 23.345, 54.106, 't'], ['Punskas', 23.177, 54.251, 't'], ['Augustavas', 22.978, 53.843, 't'], ['Geldapė', 22.307, 54.303, 't'],
  ['Gardinas', 23.83, 53.68, 't'], ['Lyda', 25.3, 53.89, 't'], ['Varanavas', 25.32, 54.15, 't'], ['Ašmena', 25.94, 54.42, 't'], ['Astravas', 25.95, 54.61, 't'],
  ['Smurgainys', 26.4, 54.48, 't'], ['Molodečnas', 26.85, 54.31, 't'], ['Pastovys', 26.83, 55.12, 't'], ['Breslauja', 27.03, 55.64, 't'], ['Glubokas', 27.69, 55.14, 't']];

/* ---------- the 1918 map: cities, landmarks, railways and highways ---------- */
/* The big cities: their main streets ([lon, lat], approximate), filled in with a street grid turned by a degrees.
   station: where the main station stands [lon, lat, direction of its tracks in degrees from east]. */
const CITY_PLAN = {
  'Vilnius': { a: -6, station: [25.2844, 54.6703, 20], streets: [
    [[25.2843, 54.6862], [25.2760, 54.6872], [25.2680, 54.6882], [25.2610, 54.6893]],                                              // Gedimino prospektas
    [[25.2905, 54.6843], [25.2902, 54.6825], [25.2898, 54.6800], [25.2898, 54.6778], [25.2895, 54.6757], [25.2887, 54.6738]],        // Pilies, Didžioji and Aušros Vartų
    [[25.2800, 54.6870], [25.2800, 54.6900], [25.2815, 54.6940], [25.2850, 54.6990], [25.2900, 54.7060]],                          // Vilniaus street, the Green Bridge, Kalvarijų
    [[25.2905, 54.6843], [25.2945, 54.6850], [25.2968, 54.6876], [25.3050, 54.6930], [25.3150, 54.6990]],                          // along the Vilnia to Antakalnis
    [[25.2898, 54.6800], [25.2950, 54.6803], [25.3010, 54.6792], [25.3090, 54.6772]],                                              // Užupis
    [[25.2898, 54.6797], [25.2850, 54.6800], [25.2780, 54.6802], [25.2690, 54.6800], [25.2600, 54.6792]]] },                        // Trakų street, west
  'Kaunas': { a: 0, station: [23.9314, 54.8864, 0], streets: [
    [[23.8885, 54.8962], [23.8940, 54.8962], [23.9000, 54.8967], [23.9100, 54.8969], [23.9185, 54.8970]],                          // Vilniaus street and Laisvės alėja
    [[23.8925, 54.8962], [23.8932, 54.8930], [23.8945, 54.8895], [23.8960, 54.8850], [23.8930, 54.8780]],                          // over the Nemunas to Aleksotas
    [[23.8960, 54.8964], [23.8965, 54.9000], [23.8985, 54.9040], [23.8960, 54.9100], [23.8900, 54.9180]],                          // over the Neris to Vilijampolė
    [[23.9150, 54.8969], [23.9200, 54.8930], [23.9260, 54.8895], [23.9285, 54.8888]],                                              // Vytauto prospektas to the station
    [[23.9185, 54.8975], [23.9230, 54.8995], [23.9300, 54.9010], [23.9450, 54.9045], [23.9600, 54.9080]]] },                        // Savanorių prospektas, east
  'Klaipėda': { a: 0, station: [21.1347, 55.7208, 90], streets: [
    [[21.1340, 55.7050], [21.1342, 55.7100], [21.1338, 55.7130], [21.1320, 55.7170], [21.1310, 55.7250], [21.1320, 55.7350], [21.1340, 55.7450]], // over the Danė, north along Manto street
    [[21.1340, 55.7050], [21.1400, 55.7000], [21.1500, 55.6930], [21.1650, 55.6820]]] },                                           // Taikos prospektas, south-east
  'Šiauliai': { a: 0, streets: [] },
  'Panevėžys': { a: 0, streets: [] }
};
/* Landmarks at their real places. fp: footprint [width, depth] km, drawn about twice life size; face: the way the front looks
   (E, W, N, S); hall: it is the town's town hall; water: it stands in a lake. */
const LANDMARKS = {
  gedim: { n: 'Gediminas Tower', town: 'Vilnius', lon: 25.2908, lat: 54.6867, fp: [0.26, 0.26], face: 'S',
    d: 'The last tower of the Upper Castle, finished in brick around 1409, on the hill where the Vilnia meets the Neris.' },
  cath: { n: 'Vilnius Cathedral', town: 'Vilnius', lon: 25.2878, lat: 54.6858, fp: [0.14, 0.24], face: 'W',
    d: 'Rebuilt in the classical style to the design of Laurynas Gucevičius between 1783 and 1801. Its bell tower stands in front.' },
  onos: { n: 'St Anne’s Church', town: 'Vilnius', lon: 25.2931, lat: 54.6831, fp: [0.08, 0.12], face: 'W',
    d: 'A Gothic church of moulded red brick from about 1500. Napoleon is said to have wanted to carry it back to Paris in the palm of his hand.' },
  vrot: { n: 'Vilnius Town Hall', town: 'Vilnius', lon: 25.2872, lat: 54.6774, fp: [0.2, 0.24], face: 'N', hall: 1,
    d: 'Rebuilt in the classical style by Laurynas Gucevičius in 1799, on the square where the city’s markets were held.' },
  krot: { n: 'Kaunas Town Hall', town: 'Kaunas', lon: 23.8857, lat: 54.8968, fp: [0.18, 0.22], face: 'N', hall: 1,
    d: 'The White Swan: begun in 1542 in the middle of the old market square. Its tower is 53 m tall.' },
  kpil: { n: 'Kaunas Castle', town: 'Kaunas', lon: 23.8850, lat: 54.8989, fp: [0.13, 0.13], face: 'S',
    d: 'A castle from the 1300s where the Neris meets the Nemunas. The Teutonic Knights took it in 1362. About a third of it stands.' },
  mykl: { n: 'St Michael the Archangel', town: 'Kaunas', lon: 23.9211, lat: 54.8969, fp: [0.14, 0.2], face: 'W',
    d: 'A neo-Byzantine church with five domes at the end of Laisvės alėja, built from 1891 to 1895 for the Russian garrison of Kaunas Fortress.' },
  ktea: { n: 'Klaipėda Theatre', town: 'Klaipėda', lon: 21.1320, lat: 55.7108, fp: [0.14, 0.12], face: 'S',
    d: 'The city theatre on Theatre Square. In front of it stands the fountain of Ännchen von Tharau, from the song by Simon Dach of Memel, put up in 1912.' },
  scat: { n: 'Šiauliai Cathedral', town: 'Šiauliai', lon: 23.3200, lat: 55.9328, fp: [0.12, 0.2], face: 'W',
    d: 'A white Renaissance church of Sts Peter and Paul, finished in 1626, with a spire 70 m tall.' },
  kryz: { n: 'Hill of Crosses', town: 'Šiauliai', lon: 23.4167, lat: 56.0153, fp: [0.28, 0.28], face: 'S',
    d: 'An old hill fort 12 km north of Šiauliai. Families began to raise crosses here for the rebels of 1831 and 1863.' },
  trak: { n: 'Trakai Island Castle', town: 'Trakai', lon: 24.9331, lat: 54.6525, fp: [0.2, 0.2], face: 'S', water: 1,
    d: 'The castle of Kęstutis and Vytautas on an island in Lake Galvė, finished around 1409. It has stood in ruins since the wars of the 1600s.' },
  palg: { n: 'Tiškevičius Palace', town: 'Palanga', lon: 21.0558, lat: 55.9069, fp: [0.2, 0.14], face: 'S',
    d: 'Built in 1897 for Count Feliksas Tiškevičius to the design of Franz Schwechten, in a park by the sea.' },
  anyk: { n: 'Anykščiai Church', town: 'Anykščiai', lon: 25.0994, lat: 55.5244, fp: [0.1, 0.16], face: 'W',
    d: 'A neo-Gothic church of red brick, rebuilt from 1899 to 1909. Its twin spires are the tallest in Lithuania.' }
};
/* Railways of 1918 as stations in order. '@lon,lat' is the next station abroad: the line runs on to the border. */
const RAIL1918 = [
  ['@26.518,55.871', 'Turmantas', 'Dūkštas', 'Ignalina', 'Švenčionėliai', 'Pabradė', 'Naujoji Vilnia', 'Vilnius', 'Lentvaris', 'Varėna', 'Marcinkonys', '@23.83,53.68'], // St Petersburg–Warsaw, 1862
  ['Lentvaris', 'Vievis', 'Kaišiadorys', 'Kaunas', 'Kazlų Rūda', 'Pilviškiai', 'Vilkaviškis', 'Kybartai', '@22.735,54.637'],   // to Prussia, 1861–1862
  ['@21.007,56.51', 'Mažeikiai', 'Kuršėnai', 'Kužiai', 'Šiauliai', 'Radviliškis', 'Baisogala', 'Kėdainiai', 'Jonava', 'Kaišiadorys'], // Libau–Romny, 1871
  ['Naujoji Vilnia', '@26.85,54.31'],                                                                     // on to Minsk
  ['Mažeikiai', '@23.713,56.651'],                                                                        // to Jelgava, 1873
  ['Radviliškis', 'Šeduva', 'Panevėžys', 'Subačius', 'Kupiškis', 'Rokiškis', 'Obeliai', '@26.518,55.871'], // to Daugavpils, 1873
  ['@21.874,55.081', 'Pagėgiai', 'Šilutė', 'Priekulė', 'Klaipėda'],                                     // Tilsit–Memel, 1875
  ['Vilnius', 'Jašiūnai', '@25.3,53.89'],                                                                 // to Lida, 1884
  ['@26.83,55.12', 'Švenčionys', 'Švenčionėliai', 'Utena', 'Anykščiai', 'Troškūnai', 'Panevėžys'],      // narrow gauge, 1895–1899
  ['Varėna', 'Alytus', 'Simnas', 'Šeštokai', '@22.927,54.106'],                                           // to Suvalkai, 1899
  ['Šiauliai', 'Joniškis', '@23.713,56.651']                                                              // to Jelgava, 1916
];
/* Paved highways (plentai) of 1918, town to town. The rest of the country is joined by dirt roads. */
const ROAD1918 = [
  ['@26.518,55.871', 'Zarasai', 'Utena', 'Ukmergė', 'Jonava', 'Kaunas', 'Garliava', 'Marijampolė', 'Kalvarija', '@22.927,54.106'], // St Petersburg–Warsaw, 1830–1836
  ['Marijampolė', 'Vilkaviškis', 'Virbalis', 'Kybartai', '@22.735,54.637'],
  ['@23.713,56.651', 'Joniškis', 'Šiauliai', 'Šaukėnai', 'Skaudvilė', 'Tauragė', 'Pagėgiai', '@21.874,55.081'], // St Petersburg–Riga–Königsberg, 1836–1858
  ['Alytus', 'Varėna'], ['Merkinė', 'Leipalingis', 'Kapčiamiestis']                                           // strategic roads of the late 1800s
];
/* Dirt roads that run on to the border */
const BORDER_ROADS = [['Vilnius', '@25.94,54.42'], ['Vilnius', '@25.3,53.89'], ['Druskininkai', '@23.83,53.68'], ['Lazdijai', '@23.345,54.106'],
  ['Biržai', '@24.192,56.405'], ['Rokiškis', '@26.295,55.977'], ['Mažeikiai', '@21.007,56.51'], ['Skuodas', '@21.007,56.51'], ['Švenčionys', '@26.83,55.12'],
  ['Kudirkos Naumiestis', '@22.57,54.632'], ['Žagarė', '@23.713,56.651'], ['Pasvalys', '@24.192,56.405']];
