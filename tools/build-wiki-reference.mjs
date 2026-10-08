#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../docs/wiki/',import.meta.url));
const data=JSON.parse(await readFile(join(root,'catalog.json'),'utf8'));
const esc=v=>String(v??'').replaceAll('|','\\|').replaceAll('\n',' ');
const slug=v=>v.replaceAll('&','and').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'');
const anchor=v=>v.toLowerCase().replace(/[^a-z0-9_ -]/g,'').replaceAll(' ','-');
const write=(name,body)=>writeFile(join(root,name+'.md'),body.trimEnd()+'\n');
const header='Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.\n\n';
function parameters(params){
 let text='| Control / ID | Default | Range or choices | Step |\n| --- | --- | --- | --- |\n';
 for(const p of params || []){
  let options=p.options;
  if(p.palette) options=options.slice(0,p.paletteNative);
  let range=options ? options.map(esc).join('; ') : p.min!==undefined ? `${esc(p.min)} to ${esc(p.max)}` : esc(p.type || 'value');
  if(p.palette) range+='; + [71 shared palettes](Palette-Reference.md)';
  const def=p.type==='select' ? `${esc(p.options?.[p.default]??p.default)} (${p.default})` : esc(p.default);
  text+=`| ${esc(p.label||p.name)} · \`${p.name}\`${p.audioLink===false?' †':''} | ${def} | ${range} | ${esc(p.step??'—')} |\n`;
 }
 return text+'\n';
}
const categories=[...new Set(data.effects.map(e=>e.category))];
let catalog='# Effect Catalog\n\n'+header+`The app registers **${data.effects.length} effects** across **${categories.length} categories**. Every category page includes each effect’s description, parameter defaults/ranges, native palette choices, and available starter presets.\n\n`;
catalog+='| Category | Effects | Full controls |\n| --- | --- | --- |\n';
for(const category of categories){
 const effects=data.effects.filter(e=>e.category===category);
 const file='Effects-'+slug(category);
 catalog+=`| ${category} | ${effects.length} | [Reference](${file}.md) |\n`;
 let page=`# ${category}: Effect Reference\n\n[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)\n\n`+header;
 page+=effects.map(e=>`- [${e.label}](#${anchor(e.label)})`).join('\n')+'\n\n';
 for(const e of effects){
  page+=`## ${e.label}\n\n${e.description||''}\n\nEffect ID: \`${e.name}\`. CPU fallback declared: **${e.cpuFallback?'yes':'no'}**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.\n\n`;
  if(e.fractalFlight?.smokePresets?.length) page+='**Starter presets:** '+e.fractalFlight.smokePresets.map(p=>p.name).join(' · ')+'.\n\n';
  const groups=[...new Set(e.params.map(p=>p.group||'Controls'))];
  for(const group of groups){if(groups.length>1)page+=`### ${group}\n\n`;page+=parameters(e.params.filter(p=>(p.group||'Controls')===group));}
  if(e.params.some(p=>p.audioLink===false))page+='† Excluded from automatic effect parameter linking by the definition. Built-in audio controls may still affect this scene.\n\n';
  if(e.fractalFlight?.smokePresets?.length){
   page+='<details>\n<summary>Starter preset values</summary>\n\nPreset values below are overrides on the effect defaults.\n\n```json\n'+JSON.stringify(e.fractalFlight.smokePresets,null,2)+'\n```\n\n</details>\n\n';
  }
 }
 await write(file,page);
 catalog+=``;
}
catalog+='\n## All effects at a glance\n\n| Effect | Category | Description |\n| --- | --- | --- |\n';
for(const e of data.effects)catalog+=`| [${e.label}](Effects-${slug(e.category)}.md#${anchor(e.label)}) | ${e.category} | ${esc(e.description)} |\n`;
await write('Effect-Catalog',catalog);
for(const [title,list] of [['Post FX',data.fx],['Overlay',data.overlays]]){
 let page=`# ${title} Reference\n\n[How to use FX and overlays](FX-and-Overlays.md) · [Smart Shuffle](Smart-Shuffle.md)\n\n`+header;
 page+=list.map(e=>`- [${e.label}](#${anchor(e.label)}) — ${e.category}`).join('\n')+'\n\n';
 for(const e of list){page+=`## ${e.label}\n\n${e.description||e.hint||''}\n\nCategory: **${e.category}**. ID: \`${e.name||e.id}\`.\n\n`+parameters(e.params);}
 await write(title.replaceAll(' ','-')+'-Reference',page);
}
let palettes='# Palette Reference\n\nThe **71 shared palettes** below are appended to effect controls that declare shared-palette support. Effect Originals remain first and vary by effect. Not every legacy effect exposes the shared library.\n\n[Choosing and tuning color](Colors-and-Motion.md) · [Effect-native palette lists](Effect-Catalog.md)\n\n![Shared palette swatches](images/palette-library.svg)\n\n';
for(const group of [...new Set(data.palettes.map(p=>p.group))])palettes+=`## ${group}\n\n`+data.palettes.filter(p=>p.group===group).map(p=>`- ${p.name}${p.cyclic?' (cyclic)':''}`).join('\n')+'\n\n';
palettes+='Cyclic palettes wrap their end back to the beginning. Noncyclic palettes are useful for one-way ramps such as dark-to-light or cold-to-hot. Final color also depends on lighting, tone mapping, hue, saturation, and FX.\n';
await write('Palette-Reference',palettes);
const xml=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const cols=3,cw=350,rh=70,h=Math.ceil(data.palettes.length/cols)*rh+64;
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="${h}" viewBox="0 0 1050 ${h}" role="img" aria-label="71 shared color palettes"><rect width="1050" height="${h}" fill="#101019"/><text x="20" y="32" fill="#eee" font-family="sans-serif" font-size="20">Psychedelia Studio · Shared palettes</text><defs>`;
for(let i=0;i<data.palettes.length;i++){
 const p=data.palettes[i];svg+=`<linearGradient id="p${i}">`;
 p.stops.forEach((s,j)=>{const rgb=Array.isArray(s)?s:s.color;const c=typeof s==='string'?s:`rgb(${rgb.map(v=>Math.round(v*255)).join(',')})`;svg+=`<stop offset="${j/(p.stops.length-1)*100}%" stop-color="${c}"/>`;});
 svg+='</linearGradient>';
}
svg+='</defs>';
data.palettes.forEach((p,i)=>{const x=i%cols*cw+20,y=Math.floor(i/cols)*rh+60;svg+=`<text x="${x}" y="${y}" fill="#d6d6e4" font-family="sans-serif" font-size="13">${xml(p.name)}</text><rect x="${x}" y="${y+9}" width="310" height="28" rx="5" fill="url(#p${i})"/>`;});
await writeFile(join(root,'images','palette-library.svg'),svg+'</svg>\n');
let music='# Music Reference\n\n[Studio workflow and audio sources](Audio-and-Studio-Music.md)\n\n## Genres\n\n'+data.genres.map(g=>`- ${g.label} (\`${g.name}\`)`).join('\n')+'\n\n## Scales\n\n'+data.scales.map(s=>'- '+s).join('\n')+'\n\n## Mixer instruments\n\nVoice names below are an example from the captured startup configuration; the genre can choose different sounds.\n\n| Channel | ID | Example voice |\n| --- | --- | --- |\n';
music+=data.instruments.map(i=>`| ${i.label} | \`${i.key}\` | ${i.soundLabel} |`).join('\n')+'\n\n## Beat signal sources\n\n| Source | ID |\n| --- | --- |\n'+data.reactorSources.map(s=>`| ${s.label} | \`${s.id}\` |`).join('\n')+'\n';
await write('Music-Reference',music);
console.log(`Generated catalog, ${categories.length} category references, FX/overlay references, palettes and music reference.`);
