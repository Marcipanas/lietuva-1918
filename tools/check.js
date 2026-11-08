#!/usr/bin/env node
/* Fast static checks, run by `npm test` before the smoke test.
   - every js/ file is loaded by index.html, and every loaded file exists
   - every script parses (node --check)
   - sw.js SHELL lists every shipped file, so the game works offline
   - warns about duplicate top-level names (all scripts share one global scope in the browser) */
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.join(__dirname,'..');let fail=0;
const bad=m=>{console.error('✗ '+m);fail++},ok=m=>console.log('✓ '+m);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

const html=read('index.html');
const order=[...html.matchAll(/<script src="((?:js|vendor)\/[^"]+)"><\/script>/g)].map(m=>m[1]);
const files=fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')).map(f=>'js/'+f);
files.forEach(f=>{if(!order.includes(f))bad(`${f} is not loaded by index.html`)});
order.forEach(f=>{if(!fs.existsSync(path.join(root,f)))bad(`index.html loads ${f}, which does not exist`)});
if(!fail)ok(`index.html loads all ${order.length} scripts`);

[...order.filter(f=>!f.startsWith('vendor/')),'sw.js',...fs.readdirSync(__dirname).filter(f=>f.endsWith('.js')).map(f=>'tools/'+f)].forEach(f=>{
  const r=spawnSync(process.execPath,['--check',path.join(root,f)],{encoding:'utf8'});if(r.status)bad(`syntax error in ${f}\n${r.stderr}`)});
if(!fail)ok('all scripts parse');

const sw=read('sw.js');const shipped=[...order,'index.html','css/style.css','manifest.webmanifest',
  ...fs.readdirSync(path.join(root,'icons')).filter(f=>f.endsWith('.png')).map(f=>'icons/'+f)];
const miss=shipped.filter(f=>!sw.includes(`'${f}'`));miss.forEach(f=>bad(`sw.js SHELL is missing ${f} (the game would break offline)`));
if(!miss.length)ok('sw.js caches every shipped file');

const seen={};order.filter(f=>!f.startsWith('vendor/')).forEach(f=>{const src=read(f);for(const m of src.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)){
  const n=m[1];if(seen[n]&&seen[n]!==f)bad(`top-level name "${n}" is declared in both ${seen[n]} and ${f}`);else seen[n]=f}});
/* All scripts share one global scope, so parse them as one: a name declared twice is a SyntaxError here too. */
{const os=require('os'),tmp=path.join(os.tmpdir(),'l1918-all-'+process.pid+'.js');
  fs.writeFileSync(tmp,order.filter(f=>!f.startsWith('vendor/')).map(read).join('\n;\n'));
  const r=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});fs.unlinkSync(tmp);
  if(r.status){const m=(r.stderr.match(/SyntaxError: .*/)||[r.stderr])[0];bad(`the scripts clash when loaded together: ${m}`)}}
if(!fail)ok('no duplicate top-level names across scripts');

/* the start map must be rebuilt after the map data or its generator change */
{const hash=require('./world-hash'),m=read('js/world1918.js').match(/"h":"([0-9a-f]+)"/);
  if(!m||m[1]!==hash(root))bad(`js/world1918.js is out of date (made from ${hash.WORLD_SRC.join(', ')}): run npm run world`);else ok('the start map is up to date')}
if(fail){console.error(`\n${fail} problem${fail>1?'s':''} found`);process.exit(1)}
