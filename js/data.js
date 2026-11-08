'use strict';
/* Lietuva 1918 — game rules. Loaded after common.js. */
const SAVE_KEY='lietuva1918-v5', TPS=[0,2,5,12], START=Date.UTC(1918,1,16);
/* The world is continuous: x = km east, z = km south of the map corner at 20.75°E, 56.55°N. North is -z.
   Distances between places are true. Towns and buildings are drawn about five times larger than life
   (a house lot is LOT_W km across) so they read well on a country-sized map. */
const LON0=20.75, LAT1=56.55, KMX=111.32*Math.cos(55.2*Math.PI/180), KMY=111.32, MAPU=400, MAPV=310;
/* Hidden terrain raster used for rules and path planning only; the player never sees it. */
const CELL=0.5, GW=Math.round(MAPU/CELL), GH=Math.round(MAPV/CELL);
const T_FOREIGN=0,T_LAND=1,T_SEA=2,T_LAGOON=3,T_LAKE=4,T_RIVER=5,T_SAND=6;
const F_FOREST=1,F_FERTILE=2,F_BOG=4,F_CLAY=8,F_FLAX=16,F_KR=32,F_LT=64;
/* Distances in km. TERRITORY: road distance from a town hall within which buildings join that town.
   VIL_OFF: workplaces join a village only when it is this much nearer than any town (villages have few workers).
   ACCESS: how far a building may stand from the road that serves it. HALL_GAP: least distance between settlements. */
const TERRITORY=15, WALK_KM=30, ACCESS=0.3, POL_R=2, HALL_GAP=6, TRIP_OVERHEAD=22, VIL_OFF=6;
const LOT_W=0.42, LOT_D=0.42, LOT_GAP=0.46;

const RES=['grain','potatoes','dairy','meat','fish','timber','peat','flax','bricks','textiles','furniture','metal','electronics'];
const FOOD=['grain','potatoes','dairy','meat','fish'], FUEL=['peat','timber'];
const RI={
  grain:{n:'Grain',era:1,p:2,ic:'grain',food:1}, potatoes:{n:'Potatoes',era:1,p:1.6,ic:'potato',food:1}, dairy:{n:'Dairy',era:1,p:6,ic:'butter',food:1},
  meat:{n:'Meat',era:1,p:8,ic:'meat',food:1}, fish:{n:'Fish',era:1,p:5,ic:'fish',food:1},
  timber:{n:'Timber',era:1,p:3,ic:'timber'}, peat:{n:'Peat',era:1,p:2.5,ic:'peat'}, flax:{n:'Flax',era:1,p:4,ic:'flax'}, bricks:{n:'Bricks',era:1,p:6,ic:'bricks'},
  textiles:{n:'Linen cloth',era:2,p:20,ic:'textiles'}, furniture:{n:'Furniture',era:2,p:26,ic:'furniture'},
  metal:{n:'Metal',era:3,p:30,ic:'metal',port:1}, electronics:{n:'Electronics',era:3,p:80,ic:'chip'}
};
/* Building types. fp = footprint [width, depth] in km; the front (depth side) faces the road. w = workers in thousands; figures per day; pol = pollution. */
const BT={
  hall:{n:'Town hall',cat:'civic',era:1,fp:[0.5,0.5],noUp:1,ic:'hall',cost:{lt:800,timber:40},d:'Founds a new town. Buildings on roads within 15 km of it join it.'},
  house:{n:'Houses',era:1,fp:[LOT_W,LOT_D],noUp:1,ic:'house'},
  farm:{n:'Grain farm',cat:'food',era:1,fp:[1.1,1],w:10,out:{grain:8},need:'open',bonus:'fertile',cost:{lt:250,timber:20},d:'35% more on fertile soil.'},
  potato:{n:'Potato fields',cat:'food',era:1,fp:[1,1],w:8,out:{potatoes:9},need:'open',bonus:'fertile',cost:{lt:200,timber:15},d:'The staple of every kitchen. 35% more on fertile soil.'},
  dairy:{n:'Dairy farm',cat:'food',era:1,fp:[1,0.9],w:10,in:{grain:2},out:{dairy:4},need:'open',cost:{lt:450,timber:30},d:'Milk, cheese and butter. Butter was the great interwar export.'},
  pigs:{n:'Pig farm',cat:'food',era:1,fp:[0.5,0.45],w:8,in:{potatoes:3},out:{meat:3},pol:1,cost:{lt:400,timber:30},d:'Bacon for the towns and for export. Smells: keep it away from homes.'},
  fishery:{n:'Fishery',cat:'food',era:1,fp:[0.45,0.4],w:8,out:{fish:5},need:'water',cost:{lt:350,timber:25},d:'Build on a shore: sea, lagoon, lake or river.'},
  forestry:{n:'Forestry camp',cat:'raw',era:1,fp:[0.45,0.45],w:10,out:{timber:8},need:'forest',cost:{lt:200},d:'Place in a forest. More trees around it, more timber.'},
  peat:{n:'Peat works',cat:'raw',era:1,fp:[1,1],w:12,out:{peat:8},need:'bog',pol:1,cost:{lt:300,timber:20},d:'Must sit on a peat bog. Peat heats homes and fires brick kilns.'},
  flax:{n:'Flax fields',cat:'raw',era:1,fp:[1,1],w:8,out:{flax:6},need:'open',bonus:'flaxland',cost:{lt:250,timber:15},d:'40% more in the Aukštaitija flax belt.'},
  brick:{n:'Brickworks',cat:'industry',era:1,fp:[0.55,0.5],w:14,in:{peat:3},out:{bricks:5},need:'clay',pol:2,cost:{lt:600,timber:40},d:'Must sit on clay ground.'},
  warehouse:{n:'Warehouse',cat:'transport',era:1,fp:[0.8,0.6],store:1,cost:{lt:500,timber:50},d:'Raises the town’s storage by 400 of every good. Upgrades hold more.'},
  station:{n:'Railway station',cat:'transport',era:1,fp:[0.65,0.3],need:'rail',noUp:1,ic:'rail',cost:{lt:300,timber:20},d:'Joins a town to the railway. Place it next to a track, with a road to town.'},
  port:{n:'Sea port',cat:'transport',era:1,fp:[1,0.8],need:'coast',noUp:1,ic:'anchor',cost:{lt:3000,timber:100},d:'Exports sell for 40% more. The only place to import metal.'},
  school:{n:'School',cat:'civic',era:1,fp:[0.5,0.4],w:3,svc:'school',ic:'school',cost:{lt:600,timber:40},d:'One school per 50k residents raises output in the whole town by up to 10%.'},
  clinic:{n:'Clinic',cat:'civic',era:1,fp:[0.45,0.4],w:3,svc:'clinic',ic:'clinic',cost:{lt:700,timber:40},d:'One clinic per 70k residents lifts morale and growth.'},
  power:{n:'Peat power station',cat:'power',era:2,fp:[0.9,0.9],w:14,in:{peat:4},pow:30,pol:4,ic:'bolt',cost:{lt:1800,bricks:60},d:'Burns peat. Linked towns share one grid.'},
  linen:{n:'Linen mill',cat:'industry',era:2,fp:[1,0.8],w:24,in:{flax:4},powNeed:5,out:{textiles:4},pol:2,cost:{lt:2200,bricks:80},d:'Flax to cloth, like Linas in Panevėžys.'},
  furniture:{n:'Furniture factory',cat:'industry',era:2,fp:[0.9,0.75],w:20,in:{timber:5},powNeed:4,out:{furniture:3},pol:1,cost:{lt:2000,bricks:60}},
  hydro:{n:'Hydro dam',cat:'power',era:3,fp:[0.5,0.8],w:10,pow:140,noUp:1,need:'river',ic:'wave',cost:{lt:9000,bricks:300},d:'Built across a river. No fuel, no smoke.'},
  nuclear:{n:'Nuclear power plant',cat:'power',era:3,fp:[1.4,1.4],w:40,pow:450,noUp:1,need:'lake',ic:'atom',cost:{lt:30000,bricks:600,metal:150},d:'Needs a lake for cooling, like Ignalina (1983).'},
  elec:{n:'Electronics plant',cat:'industry',era:3,fp:[0.9,0.8],w:30,in:{metal:2},powNeed:10,out:{electronics:3},pol:1,cost:{lt:7000,bricks:150}}
};
const CATS=[['food','Food'],['raw','Raw materials'],['industry','Industry'],['power','Power'],['transport','Transport & storage'],['civic','Town services']];
/* Homes on one lot: residents (thousands) by level, and the cost to build them */
const FARMSTEAD_CAP=0.5;
const HOUSE={cap:[0,2,6,15],n:[null,'Wooden houses','Brick apartments','Panel blocks'],cost:[null,{lt:10,timber:2},{lt:30,bricks:5},{lt:75,bricks:12}]};
const LV=[0,1,1.7,2.6], INM=[0,1,1.5,2.1];
/* Roads and railways: cost per km (BRIDGE times more over water), w = drawn width in km, up = upkeep per km a day */
const ROADT=[null,{n:'Dirt road',era:1,lt:5,mat:{timber:0.3},spd:0.7,w:0.055,up:0.003},{n:'Paved road',era:2,lt:14,mat:{bricks:0.6},spd:1,w:0.065,up:0.006},
  {n:'Highway',era:3,lt:30,mat:{bricks:1.2},spd:1.25,w:0.095,up:0.009}];
const RAILT=[null,{n:'Railway',era:1,lt:20,mat:{timber:1},w:0.055,up:0.009},{n:'Electric railway',era:3,lt:45,mat:{bricks:1.2},w:0.055,up:0.018}];
/* Vehicles: cap = loads per trip, spd = km per day, cost to buy, up = upkeep per day. Trips a day = spd / (2 × route km + TRIP_OVERHEAD). */
const VT={
  cart:{n:'Horse carts',one:'horse cart',mode:'road',era:1,cap:4,spd:65,cost:60,up:0.2,ic:'cart'},
  truck:{n:'Trucks',one:'truck',mode:'road',era:2,cap:10,spd:200,cost:400,up:0.8,ic:'bus'},
  lorry:{n:'Lorries',one:'lorry',mode:'road',era:3,cap:20,spd:290,cost:900,up:1.4,ic:'bus'},
  steam:{n:'Steam trains',one:'steam train',mode:'rail',era:1,cap:40,spd:215,cost:1500,up:2,ic:'train'},
  etrain:{n:'Electric trains',one:'electric train',mode:'rail',era:3,cap:90,spd:400,cost:4500,up:5,ic:'train',elec:1}
};
const ZONE_COST=5, BRIDGE=4, STORE_BASE=150, WH_CAP=[0,400,800,1300];
const ERAS=[null,
  {n:'Independence',c:'#fdb913'},
  {n:'Industrialization',c:'#0f7b4f',req:{pop:800,linked:12,lt:6000,bricks:150},
    unl:'Peat power stations, linen mills, furniture factories, trucks, paved roads, brick apartments and Lv 2 upgrades. Towns start wanting linen cloth and electric light.'},
  {n:'Modern Lithuania',c:'#c1272d',req:{pop:1400,linked:25,lt:25000,bricks:500,textiles:200},
    unl:'Hydro and nuclear power, electronics plants, lorries, electric trains, highways, panel blocks and Lv 3 upgrades. Towns start wanting electronics.'}];
const GOAL_POP=2200;

const TOWNS0=[
  {id:'vil',n:'Vilnius',lon:25.28,lat:54.69,reg:'Vilnija',cap:1,pop:120,ind:['forestry','forestry','brick','peat','fishery'],st:{grain:100,potatoes:60,timber:80,peat:30},
    d:'The capital on the Neris, named in the Act of Independence. Its soils are sandy, so its bread arrives by rail from Kaunas.'},
  {id:'kau',n:'Kaunas',lon:23.90,lat:54.90,reg:'Aukštaitija',pop:90,ind:['farm','farm','potato','brick'],st:{grain:80,potatoes:40,timber:50,peat:15},
    d:'Where the Neris meets the Nemunas. Good farmland, a railway junction, and one day the best site for a river dam.'},
  {id:'kla',n:'Klaipėda',lon:21.15,lat:55.71,reg:'Mažoji Lietuva',pop:35,lock:1,ind:['port','farm','fishery','forestry'],st:{grain:100,fish:40,timber:40},
    d:'The only sea port, where the Curonian Lagoon meets the Baltic. Exports sell for more here, and metal can only be imported here.'},
  {id:'sia',n:'Šiauliai',lon:23.32,lat:55.93,reg:'Aukštaitija',pop:28,ind:['farm'],st:{grain:40,potatoes:20,timber:20,peat:10},
    d:'Northern crossroads town with fertile fields, clay pits and the Rėkyva peat bog next door.'},
  {id:'pan',n:'Panevėžys',lon:24.36,lat:55.73,reg:'Aukštaitija',pop:24,ind:['potato'],st:{grain:30,potatoes:30,timber:20},
    d:'Heart of Aukštaitija, ringed by flax fields and dairy farms.'},
  {id:'ukm',n:'Ukmergė',lon:24.75,lat:55.25,reg:'Aukštaitija',pop:12,ind:['flax'],st:{grain:30,potatoes:20,timber:20},
    d:'Old market town on the Šventoji river, with forests and flax land around it.'},
  {id:'mar',n:'Marijampolė',lon:23.35,lat:54.56,reg:'Suvalkija',pop:14,ind:['farm'],st:{grain:30,potatoes:10,timber:20},
    d:'Capital of Suvalkija, the richest farmland in the country.'},
  {id:'aly',n:'Alytus',lon:24.05,lat:54.40,reg:'Dzūkija',pop:8,ind:['forestry'],st:{grain:30,potatoes:20,timber:20},
    d:'Gateway to the pine forests of Dzūkija, on a bend of the Nemunas. Not linked to anywhere yet.'},
  {id:'tau',n:'Tauragė',lon:22.29,lat:55.25,reg:'Žemaitija',pop:8,ind:['forestry'],st:{grain:30,potatoes:20,timber:20},
    d:'Samogitian border town above the Nemunas delta bogs. Not linked to anywhere yet.'},
  {id:'tel',n:'Telšiai',lon:22.25,lat:55.98,reg:'Žemaitija',pop:7,ind:['forestry'],st:{grain:50,potatoes:20,timber:20},
    d:'Capital of Žemaitija, on Lake Mastis in the Samogitian uplands.'},
  {id:'ute',n:'Utena',lon:25.60,lat:55.50,reg:'Aukštaitija',pop:6,ind:['flax'],st:{grain:30,potatoes:20,timber:30},
    d:'Gateway to the Aukštaitija lake district. Those lakes could cool a power plant one day. Not linked yet.'}
];
/* More towns of 1918, and a few villages with real names: [id, name, lon, lat, residents (thousands), region, description, flags].
   Flags: v = village, k = in the Klaipėda Region (joins Lithuania in 1923). */
const TOWNS1=[
  ['ked','Kėdainiai',23.97,55.29,7,'Aukštaitija','Old town on the Nevėžis, once a seat of the Radvila family.'],
  ['jon','Jonava',24.28,55.08,4,'Aukštaitija','Market town on the Neris between Vilnius and Kaunas.'],
  ['rok','Rokiškis',25.59,55.96,5,'Aukštaitija','North-eastern town that grew around a manor estate, near the Latvian border.'],
  ['bir','Biržai',24.75,56.20,5,'Aukštaitija','Northern town by Lake Širvėna, with an old Radvila castle.'],
  ['ras','Raseiniai',23.12,55.37,5,'Žemaitija','Old Samogitian town and district seat.'],
  ['kre','Kretinga',21.24,55.89,4,'Žemaitija','Town near the coast with an old Franciscan monastery.'],
  ['maz','Mažeikiai',22.34,56.31,3,'Žemaitija','Railway town in the north-west that grew up around its station.'],
  ['plu','Plungė',21.85,55.91,4,'Žemaitija','Samogitian town with the Oginskis manor and park.'],
  ['joni','Joniškis',23.62,56.24,4,'Aukštaitija','Northern market town on the road to Riga.'],
  ['kup','Kupiškis',24.98,55.84,3,'Aukštaitija','Aukštaitija town on the Kupa.'],
  ['any','Anykščiai',25.10,55.53,3,'Aukštaitija','Town on the Šventoji among pine woods, home of the poet Antanas Baranauskas.'],
  ['zar','Zarasai',26.25,55.73,4,'Aukštaitija','Lake town in the far north-east, on the road to Daugavpils.'],
  ['tra','Trakai',24.93,54.64,3,'Vilnija','Early seat of the Grand Dukes. Its island castle in Lake Galvė stands in ruins.'],
  ['pri','Prienai',23.95,54.63,4,'Suvalkija','Town on the Nemunas, south of Kaunas.'],
  ['jur','Jurbarkas',22.77,55.08,5,'Žemaitija','River port on the Nemunas, close to the German border.'],
  ['vlk','Vilkaviškis',23.03,54.65,6,'Suvalkija','Suvalkija town in rich farmland near the German border.'],
  ['kyb','Kybartai',22.76,54.64,4,'Suvalkija','Border station on the railway to Germany, across from Eydtkuhnen.'],
  ['kal','Kalvarija',23.22,54.41,3,'Suvalkija','Suvalkija town on the Šešupė.'],
  ['laz','Lazdijai',23.52,54.23,2,'Dzūkija','Small Dzūkija town among lakes in the south.'],
  ['sve','Švenčionys',26.16,55.13,4,'Vilnija','Eastern town among forests and lakes.'],
  ['sku','Skuodas',21.53,56.27,3,'Žemaitija','Samogitian town on the Bartuva, by the Latvian border.'],
  ['kel','Kelmė',22.93,55.63,3,'Žemaitija','Samogitian town on the Kražantė.'],
  ['rad','Radviliškis',23.53,55.81,3,'Aukštaitija','Railway junction south-east of Šiauliai.'],
  ['pas','Pasvalys',24.40,56.06,2,'Aukštaitija','Northern town where the Svalia meets the Lėvuo.'],
  ['sak','Šakiai',23.05,54.95,2,'Suvalkija','Suvalkija town on the fertile plain south of the Nemunas.'],
  ['sil','Šilutė',21.48,55.35,4,'Mažoji Lietuva','Market town of the Klaipėda Region, near the Nemunas delta.','k'],
  ['pal','Palanga',21.07,55.92,2,'Žemaitija','Seaside resort with the Tiškevičius palace and park.'],
  ['dru','Druskininkai',23.97,54.02,2,'Dzūkija','Spa town on the Nemunas, known for its mineral springs.'],
  ['var','Varėna',24.57,54.22,2,'Dzūkija','Town in the Dzūkija pine forests, on the railway to Grodno.'],
  ['mol','Molėtai',25.42,55.23,2,'Aukštaitija','Aukštaitija town among many lakes.'],
  ['sir','Širvintos',24.95,55.04,2,'Aukštaitija','Small town north of Vilnius.'],
  ['kai','Kaišiadorys',24.47,54.86,2,'Aukštaitija','Railway junction between Kaunas and Vilnius.'],
  ['zag','Žagarė',23.25,56.36,4,'Aukštaitija','Northern town by the Latvian border, known for its cherry orchards.'],
  ['kur','Kuršėnai',22.92,56.00,3,'Žemaitija','Town on the Venta, west of Šiauliai.'],
  ['vij','Vilkija',23.58,55.05,2,'Aukštaitija','Town on the high right bank of the Nemunas, below Kaunas.'],
  ['gar','Gargždai',21.40,55.71,2,'Žemaitija','Small town on the Minija, just outside the Klaipėda Region.'],
  ['eis','Eišiškės',24.99,54.17,3,'Vilnija','Town on the plain south of Vilnius.'],
  ['ign','Ignalina',26.16,55.34,1,'Aukštaitija','Village by the railway in the eastern lake district.','v'],
  ['akm','Akmenė',22.88,56.25,1,'Žemaitija','Old village in the north, on limestone ground.','v'],
  ['sal','Šalčininkai',25.38,54.31,1,'Vilnija','Village on the Šalčia, south of Vilnius.','v'],
  ['kaz','Kazlų Rūda',23.49,54.75,1,'Suvalkija','Village among the forests of Suvalkija.','v'],
  ['pag','Pagėgiai',21.91,55.14,1.2,'Mažoji Lietuva','Railway village of the Klaipėda Region, near Tilsit.','vk'],
  ['prk','Priekulė',21.32,55.55,1,'Mažoji Lietuva','Village of the Klaipėda Region on the Minija.','vk'],
  ['nem','Nemenčinė',25.48,54.85,1,'Vilnija','Village in the forests north-east of Vilnius.','v']
];
/* Names for the villages scattered across the map. Typical Lithuanian village names, placed at random. */
const VIL_NAMES=['Beržėnai','Ąžuolynė','Liepalotai','Pušynė','Eglynė','Šilėnai','Girėnai','Kalveliai','Laukėnai','Kalniškiai','Paupiai','Užupiai','Pažeriai','Brastos',
  'Miškiniai','Akmeniai','Juodupiai','Baldžiai','Ragaliai','Daugėliai','Varnėnai','Žaliakalnis','Vilkiškiai','Lapiškiai','Gervėnai','Gandriai','Kiemeliai','Pievėnai',
  'Vėjeliai','Dvarčiai','Kukliai','Žvirbliai','Gegužinė','Linkaičiai','Kanapėnai','Avižėnai','Rugeliai','Kvietkiai','Šaltiniai','Uosiai','Klevėnai','Alksnėnai',
  'Gluosniai','Kryžkalnis','Malūniškiai','Tiltiškiai','Pelkiai','Raistai','Salos','Koplyčiai','Pilkaliai','Baltrušiai','Raudėnai','Mėlynė','Gerkiškiai','Jurgaičiai',
  'Petrašiai','Antanavas','Jonėnai','Kazliškiai','Mikėnai','Stasiūnai','Vytėnai','Dauginčiai','Budriai','Šimkaičiai','Jankūnai','Paliepiai','Pagiriai','Paežeriai',
  'Pakalniai','Papiliai','Užkalniai','Užliepiai','Viršupiai','Vidugiriai','Naujasodis','Senkai','Didžiuliai','Aukštakalniai','Žemkiemis','Lankupiai','Rėkučiai',
  'Dirvonai','Arimaičiai','Sodeliai','Darželiai','Kalnelis','Liepkalnis','Beržkalnis','Šventupiai','Vilkupiai','Juodkiemis','Baltkiemis','Dūkštėnai','Ėriškiai',
  'Gaidžiai','Ožkiniai','Karvelėnai','Paukštėnai','Bitėnai','Kurmaičiai','Šarkiai','Varliai','Kiškiai','Ežiai','Lydekiai','Karšiai','Ešeriai','Upėnai','Upynai',
  'Šilgaliai','Laukgaliai','Kaimeliai','Būdėnai','Panoteriai','Kirkilai','Liaudiškiai','Kalnėnai','Senkuškiai','Ąžuolėnai','Liepynė','Beržynė','Eglaičiai',
  'Kalnaberžiai','Pakalnė','Užgiriai','Gudeliai','Gudžiūnai','Aukštelkai','Bajorai','Ūdriai','Bebrai','Briedžiai','Stirniai','Šernai','Vanagai','Sakalai',
  'Gegužiai','Strazdai','Vyturiai','Pempiai','Žąsiai','Pušyčiai','Kadagiai','Viržiai','Smilgiai','Varpiai','Grūdžiai','Šieniai','Pievėliai','Upeliai','Klonai',
  'Slėniai','Kalvynai','Lomiai','Balandiškiai','Kuosėnai','Varniškiai','Pelėdiškiai','Šarūnai','Medžiokliai','Avinėliai','Kumeliai','Jaučiai','Ožnugariai'];
/* Real town names offered when the player founds a town nearby: [name, lon, lat] */
const PLACE_NAMES=[['Elektrėnai',24.66,54.79],['Visaginas',26.43,55.60],['Birštonas',24.03,54.61],['Kazlų Rūda',23.49,54.75],['Pakruojis',23.86,55.98],
  ['Ariogala',23.47,55.26],['Rietavas',21.93,55.72],['Šeduva',23.76,55.75],['Dusetos',25.84,55.75],['Obeliai',25.82,55.94],['Linkuva',23.97,56.08],['Simnas',23.65,54.39],
  ['Merkinė',24.19,54.16],['Veisiejai',23.70,54.10],['Garliava',23.87,54.82],['Žiežmariai',24.45,54.81],['Grigiškės',25.08,54.68],['Naujoji Vilnia',25.40,54.69],
  ['Juodkrantė',21.12,55.55],['Nida',21.00,55.30],['Rusnė',21.37,55.30],['Smalininkai',22.58,55.07],['Viekšniai',22.52,56.24],['Seda',22.09,56.17],['Varniai',22.37,55.74],
  ['Švėkšna',21.62,55.52],['Kuliai',21.65,55.80],['Pandėlys',25.22,56.03],['Salakas',26.12,55.59],['Dūkštas',26.33,55.52],['Kaltanėnai',25.43,55.36],['Ignalina',26.16,55.34],
  ['Akmenė',22.88,56.25],['Šalčininkai',25.38,54.31],['Nemenčinė',25.48,54.85],['Pagėgiai',21.91,55.14],['Priekulė',21.32,55.55]];
const HIST_RAIL=[['vil','kau'],['kau','sia'],['sia','pan']];
const HIST_ROAD=[['kau','ukm'],['kau','mar'],['sia','tel']];
const HIST_ROUTES=[['kau','vil','rail','steam',1],['kau','sia','rail','steam',1],['sia','pan','rail','steam',1],['kau','ukm','road','cart',3],['kau','mar','road','cart',3],['sia','tel','road','cart',2]];

Object.assign(ICON,{
  potato:'<ellipse cx="12" cy="13" rx="7.5" ry="6" transform="rotate(-20 12 13)"/><circle cx="9.5" cy="11" r=".6"/><circle cx="13.5" cy="14.5" r=".6"/><circle cx="14" cy="10.5" r=".6"/>',
  meat:'<path d="M14.5 4.5c3.5 0 5.5 2.5 5 5.5-.6 3.4-4.5 5.6-8 6.5l-3.5 3.5-2-2 3.5-3.5c.9-3.5 1.5-10 5-10z"/><circle cx="6" cy="18" r="1.6"/>',
  fish:'<path d="M3 12c3-4 8-5.5 12-3.5l4-3v13l-4-3c-4 2-9 .5-12-3.5z"/><circle cx="8.5" cy="11.2" r=".8"/>',
  box:'<path d="M3 8.5 12 4l9 4.5v10L12 23l-9-4.5z"/><path d="M3 8.5l9 4.5 9-4.5M12 13v10"/>',
  school:'<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c0 1.8 2.5 3.2 5.5 3.2s5.5-1.4 5.5-3.2v-5M21.5 9v6"/>',
  clinic:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
  route:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  snow:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
  smog:'<path d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z"/>',
  star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  bus:'<rect x="4" y="4" width="16" height="13" rx="2.5"/><path d="M4 11h16M7.5 20v-3M16.5 20v-3"/><circle cx="8" cy="14" r=".8"/><circle cx="16" cy="14" r=".8"/>',
  train:'<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M8 21l2-4M16 21l-2-4"/><circle cx="9" cy="13.5" r=".8"/><circle cx="15" cy="13.5" r=".8"/>',
  cart:'<path d="M3 13h13V8H3zM16 10h3l2 3h-5"/><circle cx="7" cy="16.5" r="2"/><circle cx="16" cy="16.5" r="2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
  fire:'<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.5 3-5.5 3.5-9 2 1.5 3 3 3 5 1-1 1.5-2.5 1.5-4 3 2 5 5.2 5 8 0 3.4-2.5 6-6.5 6z"/>',
  turn:'<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>'
});
function bIcon(t){const T0=BT[t];if(t==='house')return 'house';if(T0.ic)return T0.ic;if(T0.store)return 'box';if(T0.pow)return 'bolt';return T0.out?RI[Object.keys(T0.out)[0]].ic:'factory'}
function bCol(t){const T0=BT[t];if(T0.pow)return '#ffd84d';if(T0.out)return `var(--r-${Object.keys(T0.out)[0]})`;if(T0.svc)return '#9fd3e8';return 'var(--ink)'}
