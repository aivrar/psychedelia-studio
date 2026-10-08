#!/usr/bin/env node
// Produces files only. Never initializes, commits, or pushes a Git repository.
import {readdir,readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const source=join(root,'docs','wiki');
const output=resolve(process.argv[2] || join(root,'.wiki-export'));
const repository=process.argv[3] || 'aivrar/psychedelia-studio';
if(!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) throw new Error('Expected owner/repository');
if(output===source || source.startsWith(output+'/') || source.startsWith(output+'\\')) throw new Error('Choose a separate export directory');
const wiki='https://github.com/'+repository+'/wiki/';
const raw='https://raw.githubusercontent.com/wiki/'+repository+'/';
const entries=await readdir(source);
await mkdir(output,{recursive:true});
let count=0;
for(const name of entries.filter(n=>n.endsWith('.md'))){
 const markdown=await readFile(join(source,name),'utf8');
 // GitHub supplies the page H1; keep the source title only for repository browsing.
 const body=markdown.replace(/^\uFEFF?# [^\r\n]+\r?\n(?:[ \t]*\r?\n)*/, '');
 const result=body.replace(/\]\(([^)\s]+)\)/g,(full,target)=>{
  if(/^(?:https?:|mailto:|#)/.test(target))return full;
  const [path,fragment]=target.split('#');
  if(path.endsWith('.md'))return ']('+wiki+path.slice(0,-3)+(fragment?'#'+fragment:'')+')';
  if(path.startsWith('images/') || path.endsWith('.json'))return ']('+raw+path+(fragment?'#'+fragment:'')+')';
  throw new Error('Unmapped wiki target in '+name+': '+target);
 });
 await writeFile(join(output,name),result);
 count++;
}
await cp(join(source,'images'),join(output,'images'),{recursive:true});
for(const name of entries.filter(n=>/^(catalog|capture-(hero|scenes|panels))\.json$/.test(n))){
 await cp(join(source,name),join(output,name));
}
console.log(`Prepared ${count} pages and images in ${output} for ${repository}. No remote changes made.`);
