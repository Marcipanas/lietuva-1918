#!/usr/bin/env node
/* Builds dist/artifact.html for publishing the game as a claude.ai artifact.
   Artifacts wrap the page in their own <html>/<head>/<body> skeleton and cannot run service workers,
   so this strips the document shell and the service-worker registration from index.html.
   Publish dist/artifact.html with css/style.css and every js/*.js file as supporting files at the same relative paths. */
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const title=html.match(/<title>[\s\S]*?<\/title>/)[0];
const fonts=html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/)[0];
const body=html.slice(html.indexOf('<body>')+6,html.indexOf('</body>')).replace(/<script>\s*\/\* Offline support[\s\S]*?<\/script>/,'').trim();
const out=[title,'<meta name="claude:viewport-fit-sides" content="cover">','<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',fonts,'<link rel="stylesheet" href="css/style.css">',body,''].join('\n');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist','artifact.html'),out);
console.log('Wrote dist/artifact.html. Supporting files: css/style.css, '+fs.readdirSync(path.join(root,'js')).map(f=>'js/'+f).join(', '));
