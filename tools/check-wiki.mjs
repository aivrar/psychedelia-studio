#!/usr/bin/env node
import {readFile,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname,resolve,relative} from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const wiki=join(root,'docs','wiki');
const pages=(await readdir(wiki)).filter(n=>n.endsWith('.md')).map(n=>join(wiki,n));
pages.push(...['README.md','CONTRIBUTING.md','THIRD_PARTY_NOTICES.md'].map(n=>join(root,n)));
const errors=[];
let links=0,images=0;
const anchor=s=>s.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu,'').replaceAll(' ','-');
for(const file of pages){
 const source=await readFile(file,'utf8');
 if(source.includes('\uFFFD')) errors.push(relative(root,file)+': replacement character');
 if((source.match(/^```/gm)||[]).length%2)errors.push(relative(root,file)+': unbalanced code fences');
 const markdown=source.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm,'');
 for(const match of markdown.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)\)/g)){
  const [,img,target]=match;
  if(/^(?:https?:|mailto:)/.test(target))continue;
  const [path,fragment]=target.split('#');
  const absolute=path?resolve(dirname(file),decodeURIComponent(path)):file;
  links++;
  try{
   const info=await stat(absolute);
   if(!info.isFile())throw new Error('not a file');
   if(img){images++;if(!info.size)throw new Error('empty image');}
   if(fragment && absolute.endsWith('.md')){
    const headings=await readFile(absolute,'utf8');
    if(![...headings.matchAll(/^#{1,6}\s+(.+)$/gm)].some(h=>anchor(h[1])===decodeURIComponent(fragment)))throw new Error('missing anchor '+fragment);
   }
  }catch(error){errors.push(`${relative(root,file)} → ${target}: ${error.message}`);}
 }
}
const catalog=JSON.parse(await readFile(join(wiki,'catalog.json'),'utf8'));
for(const [key,count] of [['effects',104],['fx',39],['overlays',22],['palettes',71]]){
 if(catalog[key].length!==count)errors.push(`Catalog ${key} count changed: update summary counts and this release check`);
}
for(const manifest of ['scenes','panels','hero']){
 const report=JSON.parse(await readFile(join(wiki,'capture-'+manifest+'.json'),'utf8'));
 if(report.errors.length)errors.push('Capture console errors: '+manifest);
 for(const shot of report.shots){
  const bytes=await readFile(join(wiki,'images',shot.file));
  if(bytes.subarray(1,4).toString()!=='PNG')errors.push('Invalid PNG '+shot.file);
  else if(bytes.readUInt32BE(16)!==shot.width || bytes.readUInt32BE(20)!==shot.height)errors.push('Unexpected image dimensions '+shot.file);
 }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Validated ${pages.length} Markdown files, ${links} local links (${images} image references), registry counts and capture manifests.`);
