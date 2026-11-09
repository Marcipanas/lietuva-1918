'use strict';
/* Lietuva 1918 — game rules. Loaded after common.js. */
/* SAVE_KEY carries the version: a new version starts a new game, and older saves are dropped (dropOldSaves in sim.js). */
const SAVE_KEY='lietuva1918-0.10.0', TPS=[0,2,5,12], START=Date.UTC(1918,1,16);
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
const TERRITORY=15, WALK_KM=30, ACCESS=0.3, POL_R=2, HALL_GAP=4, TRIP_OVERHEAD=22, VIL_OFF=6;
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
  landmark:{n:'Landmark',era:1,fp:[0.2,0.2],noUp:1,ic:'star'},
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
  customs:{n:'Border post',cat:'transport',era:1,fp:[0.4,0.3],need:'border',noUp:1,ic:'gate',cost:{lt:400,timber:20},d:'Lets its town trade with the country across the nearest border. Build it within 3 km of the border, by a road.'},
  port:{n:'Sea port',cat:'transport',era:1,fp:[1,0.8],need:'coast',noUp:1,ic:'anchor',cost:{lt:3000,timber:100},d:'Trades by sea with Britain and Germany. Sells to local merchants for 40% more.'},
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
/* Roads and railways: cost per km (BRIDGE times more over water), w = drawn width in km, up = upkeep per km a day (villages keep up dirt roads) */
const ROADT=[null,{n:'Dirt road',era:1,lt:5,mat:{timber:0.3},spd:0.7,w:0.055,up:0},{n:'Paved road',era:1,lt:14,mat:{bricks:0.6},spd:1,w:0.065,up:0.006},
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
  {n:'Industrialization',c:'#0f7b4f',req:{pop:850,linked:50,lt:6000,bricks:150},
    unl:'Peat power stations, linen mills, furniture factories, trucks, brick apartments and Lv 2 upgrades. Towns start wanting linen cloth and electric light.'},
  {n:'Modern Lithuania',c:'#c1272d',req:{pop:1450,linked:70,lt:25000,bricks:500,textiles:200},
    unl:'Hydro and nuclear power, electronics plants, lorries, electric trains, highways, panel blocks and Lv 3 upgrades. Towns start wanting electronics.'}];
const GOAL_POP=2400;
/* Parts of today's Lithuania that others held for a while (RGN_KEY in terrain.js, outlines in geo.js), and the holders of land.
   S.own maps each part, and each neighbour's land (lv, by, pl the Suwałki region, ep Masuria, ru), to its holder.
   lt: map label in Lithuanian. */
const REGIONS={kr:{n:'The Klaipėda Region',lt:'KLAIPĖDOS KRAŠTAS',at:[21.5,55.42]},pal:{n:'The Palanga coast',lt:'',at:[21.1,55.97]},
  vr:{n:'The Vilnius region',lt:'VILNIAUS KRAŠTAS',at:[25.8,54.96]},vr2:{n:'The Vilnius region',lt:'VILNIAUS KRAŠTAS',at:[26.3,55.19]}};
const OWNERS={lt:'Lithuania',lv:'Latvia',pl:'Poland',de:'Germany',al:'the Allies',ra:'the Red Army',by:'Soviet Belarus',ru:'Soviet Russia'};
/* the market a border post on that holder's land trades with (none across a Soviet line) */
const OWN_GATE={lv:'lv',pl:'pl',de:'de',al:'de',ra:'',by:'',ru:''};
/* 16 February 1918: the Vilnius region is ours. The Klaipėda Region and Masuria are German (East Prussia), and German troops
   hold the rest around us (Ober Ost): Courland with the Palanga coast, the Suwałki region and Belarus. */
function startOwners(){return {kr:'de',pal:'de',vr:'lt',vr2:'lt',lv:'de',by:'de',pl:'de',ep:'de',ru:'de'}}

const TOWNS0=[
  {id:'vil',n:'Vilnius',reg:'Vilnija',cap:1,pop:120,ind:['forestry','forestry','brick','peat','fishery'],st:{grain:100,potatoes:60,timber:80,peat:30},
    d:'The capital on the Neris, named in the Act of Independence. Its soils are sandy, so its bread arrives by rail from Kaunas.'},
  {id:'kau',n:'Kaunas',reg:'Aukštaitija',pop:90,ind:['farm','farm','potato','brick'],st:{grain:80,potatoes:40,timber:50,peat:15},
    d:'Where the Neris meets the Nemunas. Good farmland, a railway junction, and one day the best site for a river dam.'},
  {id:'kla',n:'Klaipėda',reg:'Mažoji Lietuva',pop:35,lock:1,ind:['port','farm','fishery','forestry'],st:{grain:100,fish:40,timber:40},
    d:'The only sea port, where the Curonian Lagoon meets the Baltic. Exports sell for more here, and metal can only be imported here.'},
  {id:'sia',n:'Šiauliai',reg:'Aukštaitija',pop:28,ind:['farm'],st:{grain:40,potatoes:20,timber:20,peat:10},
    d:'Northern crossroads town with fertile fields, clay pits and the Rėkyva peat bog next door.'},
  {id:'pan',n:'Panevėžys',reg:'Aukštaitija',pop:24,ind:['potato'],st:{grain:30,potatoes:30,timber:20},
    d:'Heart of Aukštaitija, ringed by flax fields and dairy farms.'},
  {id:'ukm',n:'Ukmergė',reg:'Aukštaitija',pop:12,ind:['flax'],st:{grain:30,potatoes:20,timber:20},
    d:'Old market town on the Šventoji river, with forests and flax land around it.'},
  {id:'mar',n:'Marijampolė',reg:'Suvalkija',pop:14,ind:['farm'],st:{grain:30,potatoes:10,timber:20},
    d:'Capital of Suvalkija, the richest farmland in the country.'},
  {id:'aly',n:'Alytus',reg:'Dzūkija',pop:8,ind:['forestry'],st:{grain:30,potatoes:20,timber:20},
    d:'Gateway to the pine forests of Dzūkija, on a bend of the Nemunas. The railway from Varėna reached it in 1899.'},
  {id:'tau',n:'Tauragė',reg:'Žemaitija',pop:8,ind:['forestry'],st:{grain:30,potatoes:20,timber:20},
    d:'Samogitian border town on the Jūra, on the old highway from Riga to Tilsit. No railway reaches it yet.'},
  {id:'tel',n:'Telšiai',reg:'Žemaitija',pop:7,ind:['forestry'],st:{grain:50,potatoes:20,timber:20},
    d:'Capital of Žemaitija, on Lake Mastis in the Samogitian uplands.'},
  {id:'ute',n:'Utena',reg:'Aukštaitija',pop:6,ind:['flax'],st:{grain:30,potatoes:20,timber:30},
    d:'Gateway to the Aukštaitija lake district, on the St Petersburg–Warsaw highway and a narrow-gauge railway. Its lakes could cool a power plant one day.'}
];
/* More towns of 1918 and a few villages: [id, name, residents (thousands), region, description, flags]. Their places come from PLACES (geo.js).
   Flags: v = a village in 1918. */
const TOWNS1=[
  ['ked','Kėdainiai',7,'Aukštaitija','Old town on the Nevėžis, once a seat of the Radvila family.'],
  ['jon','Jonava',4,'Aukštaitija','Market town on the Neris between Vilnius and Kaunas.'],
  ['rok','Rokiškis',5,'Aukštaitija','North-eastern town that grew around a manor estate, near the Latvian border.'],
  ['bir','Biržai',5,'Aukštaitija','Northern town by Lake Širvėna, with an old Radvila castle.'],
  ['ras','Raseiniai',5,'Žemaitija','Old Samogitian town and district seat.'],
  ['kre','Kretinga',4,'Žemaitija','Town near the coast with an old Franciscan monastery.'],
  ['maz','Mažeikiai',3,'Žemaitija','Railway town in the north-west that grew up around its station.'],
  ['plu','Plungė',4,'Žemaitija','Samogitian town with the Oginskis manor and park.'],
  ['joni','Joniškis',4,'Aukštaitija','Northern market town on the road to Riga.'],
  ['kup','Kupiškis',3,'Aukštaitija','Aukštaitija town on the Kupa.'],
  ['any','Anykščiai',3,'Aukštaitija','Town on the Šventoji among pine woods, home of the poet Antanas Baranauskas.'],
  ['zar','Zarasai',4,'Aukštaitija','Lake town in the far north-east, on the road to Daugavpils.'],
  ['tra','Trakai',3,'Vilnija','Early seat of the Grand Dukes. Its island castle in Lake Galvė stands in ruins.'],
  ['pri','Prienai',4,'Suvalkija','Town on the Nemunas, south of Kaunas.'],
  ['jur','Jurbarkas',5,'Žemaitija','River port on the Nemunas, close to the German border.'],
  ['vlk','Vilkaviškis',6,'Suvalkija','Suvalkija town in rich farmland near the German border.'],
  ['kyb','Kybartai',4,'Suvalkija','Border station on the railway to Germany, across from Eydtkuhnen.'],
  ['kal','Kalvarija',3,'Suvalkija','Suvalkija town on the Šešupė.'],
  ['laz','Lazdijai',2,'Dzūkija','Small Dzūkija town among lakes in the south.'],
  ['sve','Švenčionys',4,'Vilnija','Eastern town among forests and lakes.'],
  ['sku','Skuodas',3,'Žemaitija','Samogitian town on the Bartuva, by the Latvian border.'],
  ['kel','Kelmė',3,'Žemaitija','Samogitian town on the Kražantė.'],
  ['rad','Radviliškis',3,'Aukštaitija','Railway junction south-east of Šiauliai.'],
  ['pas','Pasvalys',2,'Aukštaitija','Northern town where the Svalia meets the Lėvuo.'],
  ['sak','Šakiai',2,'Suvalkija','Suvalkija town on the fertile plain south of the Nemunas.'],
  ['sil','Šilutė',4,'Mažoji Lietuva','Market town of the Klaipėda Region, near the Nemunas delta.','k'],
  ['pal','Palanga',2,'Žemaitija','Seaside resort with the Tiškevičius palace and park.'],
  ['dru','Druskininkai',2,'Dzūkija','Spa town on the Nemunas, known for its mineral springs.'],
  ['var','Varėna',2,'Dzūkija','Town in the Dzūkija pine forests, on the railway to Grodno.'],
  ['mol','Molėtai',2,'Aukštaitija','Aukštaitija town among many lakes.'],
  ['sir','Širvintos',2,'Aukštaitija','Small town north of Vilnius.'],
  ['kai','Kaišiadorys',2,'Aukštaitija','Railway junction between Kaunas and Vilnius.'],
  ['zag','Žagarė',4,'Aukštaitija','Northern town by the Latvian border, known for its cherry orchards.'],
  ['kur','Kuršėnai',3,'Žemaitija','Town on the Venta, west of Šiauliai.'],
  ['vij','Vilkija',2,'Aukštaitija','Town on the high right bank of the Nemunas, below Kaunas.'],
  ['gar','Gargždai',2,'Žemaitija','Small town on the Minija, just outside the Klaipėda Region.'],
  ['eis','Eišiškės',3,'Vilnija','Town on the plain south of Vilnius.'],
  ['ign','Ignalina',1,'Aukštaitija','Village by the railway in the eastern lake district.','v'],
  ['akm','Akmenė',1,'Žemaitija','Old village in the north, on limestone ground.','v'],
  ['sal','Šalčininkai',1,'Vilnija','Village on the Šalčia, south of Vilnius.','v'],
  ['kaz','Kazlų Rūda',1,'Suvalkija','Village among the forests of Suvalkija.','v'],
  ['pag','Pagėgiai',1.2,'Mažoji Lietuva','Railway village of the Klaipėda Region, near Tilsit.','vk'],
  ['prk','Priekulė',1,'Mažoji Lietuva','Village of the Klaipėda Region on the Minija.','vk'],
  ['nem','Nemenčinė',1,'Vilnija','Village in the forests north-east of Vilnius.','v']
];
/* Towns founded after 1918, offered as names when the player founds a town near one of them: [name, lon, lat] */
const PLACE_NAMES=[['Elektrėnai',24.646,54.776],['Visaginas',26.439,55.6],['Naujoji Akmenė',22.89,56.316],['Grigiškės',25.095,54.669],['Baltoji Vokė',25.122,54.454],
  ['Ežerėlis',23.605,54.882]];
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
  turn:'<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
  gate:'<path d="M4 20V7M4 10h17v4H4"/><path d="M9 10l-3 4M14 10l-3 4M19 10l-3 4"/>',
  globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5s1.1-5.9 3.6-8.5z"/>',
  shield:'<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/>',
  plan:'<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5v3h6v-3M8.5 11h7M8.5 14.5h7M8.5 18h4"/>'
});
function bIcon(t){const T0=BT[t];if(t==='house')return 'house';if(T0.ic)return T0.ic;if(T0.store)return 'box';if(T0.pow)return 'bolt';return T0.out?RI[Object.keys(T0.out)[0]].ic:'factory'}
function bCol(t){const T0=BT[t];if(T0.pow)return '#ffd84d';if(T0.out)return `var(--r-${Object.keys(T0.out)[0]})`;if(T0.svc)return '#9fd3e8';return 'var(--ink)'}
