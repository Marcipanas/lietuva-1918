'use strict';
/* Lietuva 1918 — game rules. Loaded after common.js. */
const SAVE_KEY='lietuva1918-v3', TPS=[0,2,5,12], START=Date.UTC(1918,1,16), COMMUTE=16, WALK_COMMUTE=12;
/* Map: N×N isometric grid laid over Lithuania, north up. 1 tile ≈ 3.5 km across. */
const N=144, LON0=20.75, LAT1=56.55, KMX=111.32*Math.cos(55.2*Math.PI/180), KMY=111.32, MAPU=400, MAPV=310, DK=(MAPU+MAPV)/(2*N);
const TW=64, TH=32;
const T_FOREIGN=0,T_LAND=1,T_SEA=2,T_LAGOON=3,T_LAKE=4,T_RIVER=5,T_SAND=6;
const F_FOREST=1,F_FERTILE=2,F_BOG=4,F_CLAY=8,F_FLAX=16,F_KR=32;

const RES=['grain','potatoes','dairy','meat','fish','timber','peat','flax','bricks','textiles','furniture','metal','electronics'];
const FOOD=['grain','potatoes','dairy','meat','fish'], FUEL=['peat','timber'];
const RI={
  grain:{n:'Grain',era:1,p:2,ic:'grain',food:1}, potatoes:{n:'Potatoes',era:1,p:1.6,ic:'potato',food:1}, dairy:{n:'Dairy',era:1,p:6,ic:'butter',food:1},
  meat:{n:'Meat',era:1,p:8,ic:'meat',food:1}, fish:{n:'Fish',era:1,p:5,ic:'fish',food:1},
  timber:{n:'Timber',era:1,p:3,ic:'timber'}, peat:{n:'Peat',era:1,p:2.5,ic:'peat'}, flax:{n:'Flax',era:1,p:4,ic:'flax'}, bricks:{n:'Bricks',era:1,p:6,ic:'bricks'},
  textiles:{n:'Linen cloth',era:2,p:20,ic:'textiles'}, furniture:{n:'Furniture',era:2,p:26,ic:'furniture'},
  metal:{n:'Metal',era:3,p:30,ic:'metal',port:1}, electronics:{n:'Electronics',era:3,p:80,ic:'chip'}
};
/* Building types. sz = footprint (sz×sz tiles); w = workers in thousands; figures per day; pol = pollution. */
const BT={
  hall:{n:'Town hall',cat:'civic',era:1,sz:1,noUp:1,ic:'hall',cost:{lt:800,timber:40},d:'Founds a new town. Buildings on roads within 16 tiles join it.'},
  house:{n:'Houses',era:1,sz:1,noUp:1,ic:'house'},
  farm:{n:'Grain farm',cat:'food',era:1,sz:2,w:10,out:{grain:8},need:'open',bonus:'fertile',cost:{lt:250,timber:20},d:'35% more on fertile soil.'},
  potato:{n:'Potato fields',cat:'food',era:1,sz:2,w:8,out:{potatoes:9},need:'open',bonus:'fertile',cost:{lt:200,timber:15},d:'The staple of every kitchen. 35% more on fertile soil.'},
  dairy:{n:'Dairy farm',cat:'food',era:1,sz:2,w:10,in:{grain:2},out:{dairy:4},need:'open',cost:{lt:450,timber:30},d:'Milk, cheese and butter. Butter was the great interwar export.'},
  pigs:{n:'Pig farm',cat:'food',era:1,sz:1,w:8,in:{potatoes:3},out:{meat:3},pol:1,cost:{lt:400,timber:30},d:'Bacon for the towns and for export. Smells: keep it away from homes.'},
  fishery:{n:'Fishery',cat:'food',era:1,sz:1,w:8,out:{fish:5},need:'water',cost:{lt:350,timber:25},d:'Build on a shore: sea, lagoon, lake or river.'},
  forestry:{n:'Forestry camp',cat:'raw',era:1,sz:1,w:10,out:{timber:8},need:'forest',cost:{lt:200},d:'Place in a forest. More trees around it, more timber.'},
  peat:{n:'Peat works',cat:'raw',era:1,sz:2,w:12,out:{peat:8},need:'bog',pol:1,cost:{lt:300,timber:20},d:'Must sit on a peat bog. Peat heats homes and fires brick kilns.'},
  flax:{n:'Flax fields',cat:'raw',era:1,sz:2,w:8,out:{flax:6},need:'open',bonus:'flaxland',cost:{lt:250,timber:15},d:'40% more in the Aukštaitija flax belt.'},
  brick:{n:'Brickworks',cat:'industry',era:1,sz:1,w:14,in:{peat:3},out:{bricks:5},need:'clay',pol:2,cost:{lt:600,timber:40},d:'Must sit on clay ground.'},
  warehouse:{n:'Warehouse',cat:'transport',era:1,sz:2,store:1,cost:{lt:500,timber:50},d:'Raises the town’s storage by 400 of every good. Upgrades hold more.'},
  station:{n:'Railway station',cat:'transport',era:1,sz:1,need:'rail',noUp:1,ic:'rail',cost:{lt:300,timber:20},d:'Joins a town to the railway. Place it next to a track, with a road to town.'},
  port:{n:'Sea port',cat:'transport',era:1,sz:2,need:'coast',noUp:1,ic:'anchor',cost:{lt:3000,timber:100},d:'Exports sell for 40% more. The only place to import metal.'},
  school:{n:'School',cat:'civic',era:1,sz:1,w:3,svc:'school',ic:'school',cost:{lt:600,timber:40},d:'One school per 50k residents raises output in the whole town by up to 10%.'},
  clinic:{n:'Clinic',cat:'civic',era:1,sz:1,w:3,svc:'clinic',ic:'clinic',cost:{lt:700,timber:40},d:'One clinic per 70k residents lifts morale and growth.'},
  power:{n:'Peat power station',cat:'power',era:2,sz:2,w:14,in:{peat:4},pow:30,pol:4,ic:'bolt',cost:{lt:1800,bricks:60},d:'Burns peat. Linked towns share one grid.'},
  linen:{n:'Linen mill',cat:'industry',era:2,sz:2,w:24,in:{flax:4},powNeed:5,out:{textiles:4},pol:2,cost:{lt:2200,bricks:80},d:'Flax to cloth, like Linas in Panevėžys.'},
  furniture:{n:'Furniture factory',cat:'industry',era:2,sz:2,w:20,in:{timber:5},powNeed:4,out:{furniture:3},pol:1,cost:{lt:2000,bricks:60}},
  hydro:{n:'Hydro dam',cat:'power',era:3,sz:1,w:10,pow:140,noUp:1,need:'river',ic:'wave',cost:{lt:9000,bricks:300},d:'Built across a river. No fuel, no smoke.'},
  nuclear:{n:'Nuclear power plant',cat:'power',era:3,sz:3,w:40,pow:450,noUp:1,need:'lake',ic:'atom',cost:{lt:30000,bricks:600,metal:150},d:'Needs a lake for cooling, like Ignalina (1983).'},
  elec:{n:'Electronics plant',cat:'industry',era:3,sz:2,w:30,in:{metal:2},powNeed:10,out:{electronics:3},pol:1,cost:{lt:7000,bricks:150}}
};
const CATS=[['food','Food'],['raw','Raw materials'],['industry','Industry'],['power','Power'],['transport','Transport & storage'],['civic','Town services']];
const HOUSE={cap:[0,4,12,30],n:[null,'Wooden houses','Brick apartments','Panel blocks'],cost:[null,{lt:20,timber:4},{lt:60,bricks:10},{lt:150,bricks:25}]};
const LV=[0,1,1.7,2.6], INM=[0,1,1.5,2.1];
const ROADT=[null,{n:'Dirt road',era:1,lt:15,mat:{timber:1},spd:0.7},{n:'Paved road',era:2,lt:40,mat:{bricks:2},spd:1},{n:'Highway',era:3,lt:90,mat:{bricks:4},spd:1.25}];
const RAILT=[null,{n:'Railway',era:1,lt:60,mat:{timber:3}},{n:'Electric railway',era:3,lt:130,mat:{bricks:4}}];
/* Vehicles: cap = loads per trip, spd = tiles per day, cost to buy, up = upkeep per day */
const VT={
  cart:{n:'Horse carts',one:'horse cart',mode:'road',era:1,cap:4,spd:18,cost:60,up:0.2,ic:'cart'},
  truck:{n:'Trucks',one:'truck',mode:'road',era:2,cap:10,spd:55,cost:400,up:0.8,ic:'bus'},
  lorry:{n:'Lorries',one:'lorry',mode:'road',era:3,cap:20,spd:80,cost:900,up:1.4,ic:'bus'},
  steam:{n:'Steam trains',one:'steam train',mode:'rail',era:1,cap:40,spd:60,cost:1500,up:2,ic:'train'},
  etrain:{n:'Electric trains',one:'electric train',mode:'rail',era:3,cap:90,spd:110,cost:4500,up:5,ic:'train',elec:1}
};
const ZONE_COST=5, BRIDGE=4, STORE_BASE=150, WH_CAP=[0,400,800,1300];
const ERAS=[null,
  {n:'Independence',c:'#fdb913'},
  {n:'Industrialization',c:'#0f7b4f',req:{pop:450,linked:8,lt:6000,bricks:150},
    unl:'Peat power stations, linen mills, furniture factories, trucks, paved roads, brick apartments and Lv 2 upgrades. Towns start wanting linen cloth and electric light.'},
  {n:'Modern Lithuania',c:'#c1272d',req:{pop:1000,linked:11,lt:25000,bricks:500,textiles:200},
    unl:'Hydro and nuclear power, electronics plants, lorries, electric trains, highways, panel blocks and Lv 3 upgrades. Towns start wanting electronics.'}];
const GOAL_POP=1500;

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
  {id:'aly',n:'Alytus',lon:24.05,lat:54.40,reg:'Dzūkija',pop:8,ind:['forestry'],st:{grain:140,potatoes:100,timber:20},
    d:'Gateway to the pine forests of Dzūkija, on a bend of the Nemunas. Not linked to anywhere yet.'},
  {id:'tau',n:'Tauragė',lon:22.29,lat:55.25,reg:'Žemaitija',pop:8,ind:['forestry'],st:{grain:140,potatoes:100,timber:20},
    d:'Samogitian border town above the Nemunas delta bogs. Not linked to anywhere yet.'},
  {id:'tel',n:'Telšiai',lon:22.25,lat:55.98,reg:'Žemaitija',pop:7,ind:['forestry'],st:{grain:50,potatoes:20,timber:20},
    d:'Capital of Žemaitija, on Lake Mastis in the Samogitian uplands.'},
  {id:'ute',n:'Utena',lon:25.60,lat:55.50,reg:'Aukštaitija',pop:6,ind:['flax'],st:{grain:140,potatoes:100,timber:30},
    d:'Gateway to the Aukštaitija lake district. Those lakes could cool a power plant one day. Not linked yet.'}
];
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
  fire:'<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.5 3-5.5 3.5-9 2 1.5 3 3 3 5 1-1 1.5-2.5 1.5-4 3 2 5 5.2 5 8 0 3.4-2.5 6-6.5 6z"/>'
});
function bIcon(t){const T0=BT[t];if(t==='house')return 'house';if(T0.ic)return T0.ic;if(T0.store)return 'box';if(T0.pow)return 'bolt';return T0.out?RI[Object.keys(T0.out)[0]].ic:'factory'}
function bCol(t){const T0=BT[t];if(T0.pow)return '#ffd84d';if(T0.out)return `var(--r-${Object.keys(T0.out)[0]})`;if(T0.svc)return '#9fd3e8';return 'var(--ink)'}
