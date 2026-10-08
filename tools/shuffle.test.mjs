import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function harness() {
    let seed = 8123;
    const signal = { beat: 0, count: 0, source: 'studio', studioSync: true, version: 0, offline: false };
    const changes = [];
    const c = vm.createContext({
        console, window: { setInterval() {} }, document: { getElementById: () => null },
        Math: Object.assign(Object.create(Math), { random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; } }),
        VideoExport: { isFrameExport: () => signal.offline },
        AudioReactor: { getBeatClock: () => signal.beat, getState: () => signal, getAnalysis: () => ({ signalVersion: signal.version }),
            getTrigger: () => ({ count: signal.count, live: true }), isSource: () => true,
            getSettings: () => ({enabled:true}), presetName: () => 'club' }
    });
    const load = path => vm.runInContext(readFileSync(new URL('../src/' + path, import.meta.url), 'utf8'), c);
    load('engine/post-fx-library.js'); load('engine/overlays.js'); load('gui/shuffle-profiles.js');
    const fx = c.PostFxLibrary.list().map(d => ({name:d.name, paramDefs:d.params, react:d.react, params:{}, mods:{}, enabled:false}));
    const get = name => fx.find(f => f.name === name);
    c.PostProcess = { getEffects: () => fx, getEffect: get, getMods: name => get(name).mods,
        resetAll: () => fx.forEach(f => {f.enabled=false;f.mods={};f.params=Object.fromEntries(Object.entries(f.paramDefs).map(([k,p])=>[k,p.default]));}),
        setParam: (name,k,v) => {get(name).params[k]=v;}, setEnabled: (name,on) => {get(name).enabled=on;},
        clearMods: name => {get(name).mods={};}, setMod: (name,k,src,amt) => {get(name).mods[k]={src,amt};} };
    c.PostProcess.resetAll(); c.Overlays.resetAll(); load('gui/look-shuffle.js');
    c.Looks.onChange(scope => changes.push({scope,beat:signal.beat}));
    const at = beat => {signal.beat=beat;c.Looks.update();};
    return {c, signal, changes, at, fx};
}

for (const bars of [4,8,16]) test(`${bars} bars triggers on the exact beat boundary, without early repeats or phase drift`, () => {
    const h=harness();h.c.Looks.setAuto('fx',String(bars));h.at(5.75);
    const next=4+bars*4;h.at(next-0.001);assert.equal(h.changes.length,0);
    h.at(next);assert.equal(h.changes.length,1);h.at(next+0.5);assert.equal(h.changes.length,1);
    h.at(next+bars*4);assert.equal(h.changes.length,2);
});
test('late frames roll once and retain the bar grid, instead of catching up in a burst',()=>{
    const h=harness();h.c.Looks.setAuto('fx','4');h.at(0);h.at(51);assert.equal(h.changes.length,1);
    h.at(63.99);assert.equal(h.changes.length,1);h.at(64);assert.equal(h.changes.length,2);
});
test('floating-point error at a missed boundary cannot cause duplicate rolls',()=>{
    const h=harness();h.c.Looks.setAuto('fx','4');h.at(0);h.at(64-1e-9);h.at(64+1e-9);
    assert.equal(h.changes.length,1);h.at(80);assert.equal(h.changes.length,2);
});
test('clock rewind, seek, source replacement and export transitions establish fresh schedules',()=>{
    const h=harness();h.c.Looks.setAuto('fx','4');h.at(0);h.at(12);h.at(0);h.at(16);assert.equal(h.changes.length,1);
    h.signal.version++;h.at(400);assert.equal(h.changes.length,1);h.at(416);assert.equal(h.changes.length,2);
    h.signal.source='file';h.at(480);assert.equal(h.changes.length,2);h.at(496);assert.equal(h.changes.length,3);
    h.signal.offline=true;h.at(600);assert.equal(h.changes.length,3);h.at(616);assert.equal(h.changes.length,4);
});
test('silent fallback and tempo changes use beats rather than a timer period fixed at the old BPM',()=>{
    const h=harness();h.signal.source='fallback';h.signal.studioSync=false;h.c.Looks.setAuto('fx','4');h.at(0);
    for(let second=1;second<=4;second++)h.at(second*2); // four seconds at 120 BPM
    for(let second=1;second<=7;second++)h.at(8+second); // seven seconds at 60 BPM
    assert.equal(h.changes.length,0);h.at(16);assert.equal(h.changes.length,1);
});
test('sections follow Studio section counters; other audio uses the documented 16-bar fallback',()=>{
    const h=harness();h.c.Looks.setAuto('fx','section');h.at(0);h.at(80);assert.equal(h.changes.length,0);
    h.signal.count++;h.at(81);assert.equal(h.changes.length,1);h.at(82);assert.equal(h.changes.length,1);
    h.signal.studioSync=false;h.signal.source='file';h.at(84);h.at(147.99);assert.equal(h.changes.length,1);
    h.at(148);assert.equal(h.changes.length,2);
});
test('invalid scopes/intervals are rejected, Off stops rolls, and FX/overlays have independent schedules',()=>{
    const h=harness();assert.equal(h.c.Looks.setAuto('fx','5'),false);assert.equal(h.c.Looks.setAuto('bogus','4'),false);
    h.c.Looks.setAuto('fx','4');h.c.Looks.setAuto('overlays','8');h.at(0);h.at(16);
    assert.deepEqual(h.changes.map(c=>c.scope),['fx']);h.c.Looks.setAuto('fx','off');h.at(32);
    assert.deepEqual(h.changes.map(c=>c.scope),['fx','overlays']);
});
test('live and accelerated offline frames roll at the same beat positions',()=>{
    function run(offline){const h=harness();h.signal.offline=offline;h.c.Looks.setAuto('fx','4');
        for(let frame=0;frame<=2400;frame++)h.at(frame/30);return h.changes.map(c=>c.beat);}
    assert.deepEqual(run(false),[16,32,48,64,80]);assert.deepEqual(run(true),run(false));
});
test('every Preserve scene profile names existing parameters and respects native limits',()=>{
    const h=harness();
    for(const [scope,table]of [['fx',h.c.ShuffleProfiles.fx],['overlays',h.c.ShuffleProfiles.overlays]])for(const [id,ranges]of Object.entries(table)){
        const params=scope==='fx'?h.c.PostProcess.getEffect(id).paramDefs:Object.fromEntries(h.c.Overlays.getDefs().find(d=>d.id===id).params.map(p=>[p.name,p]));
        for(const [k,range]of Object.entries(ranges)){assert.ok(params[k],`${id}.${k}`);assert.ok(range[0]>=params[k].min&&range[1]<=params[k].max,`${id}.${k}`);}
    }
});
for(const style of ['gentle','wild'])test(`${style}: 500 combined shuffles keep all base and full-beat values bounded, finite and clocks unlinked`,()=>{
    const h=harness();h.c.Looks.setStyle('fx',style);h.c.Looks.setStyle('overlays',style);
    const seen=new Set();
    for(let roll=0;roll<500;roll++){
        h.c.Looks.shuffle('all');
        const fx=h.fx.filter(f=>f.enabled), overlays=h.c.Overlays.getDefs().filter(d=>h.c.Overlays.isEnabled(d.id));
        assert.ok(fx.length>=1&&fx.length<=(style==='gentle'?2:3));assert.ok(overlays.length>=1&&overlays.length<=(style==='gentle'?2:3));
        for(const f of fx){seen.add(f.name);if(style==='gentle')assert.ok(h.c.ShuffleProfiles.fx[f.name],f.name);}
        for(const d of overlays)if(style==='gentle')assert.ok(h.c.ShuffleProfiles.overlays[d.id],d.id);
        const rows=fx.flatMap(f=>Object.entries(f.paramDefs).map(([k,p])=>({scope:'fx',id:f.name,k,p,base:f.params[k],mod:f.mods[k]})))
            .concat(overlays.flatMap(d=>d.params.filter(p=>p.max>=p.min).map(p=>({scope:'overlays',id:d.id,k:p.name,p,base:h.c.Overlays.getParam(p.name),mod:h.c.Overlays.getMod(p.name)}))));
        for(const {scope,id,k,p,base,mod}of rows){
            const [lo,hi]=h.c.ShuffleProfiles.bounds(scope,id,k,p,style), peak=base+(mod?mod.amt*(p.max-p.min):0);
            assert.ok(Number.isFinite(base)&&base>=lo-1e-8&&base<=hi+1e-8,`${id}.${k} base ${base} [${lo},${hi}]`);
            assert.ok(Number.isFinite(peak)&&peak>=lo-1e-8&&peak<=hi+1e-8,`${id}.${k} peak ${peak} [${lo},${hi}]`);
            if(mod)assert.ok(!/speed|spin|rotation|rate|cycle|shimmer/.test(k),`${id}.${k}`);
        }
    }
    if(style==='wild')assert.ok(['swirl','mirror','droste'].some(id=>seen.has(id)),'Wild still includes distortion');
});
test('Keep only changes links, including zero active effects and deliberately strong manual settings',()=>{
    const h=harness();h.c.Looks.setKeep('fx',true);h.c.Looks.setKeep('overlays',true);h.c.Looks.shuffle('all');
    assert.equal(h.fx.some(f=>f.enabled),false);assert.equal(h.c.Overlays.getDefs().some(d=>h.c.Overlays.isEnabled(d.id)),false);
    h.c.PostProcess.setEnabled('swirl',true);h.c.Overlays.setEnabled('rings',true);h.c.Overlays.setParam('ring_rotation',2);h.c.Overlays.setParam('ring_sync',0);
    const before=JSON.stringify([h.fx.map(f=>f.params),h.c.Overlays.getParams()]);h.c.Looks.shuffle('all');
    assert.equal(JSON.stringify([h.fx.map(f=>f.params),h.c.Overlays.getParams()]),before);
    assert.equal(Object.keys(h.c.PostProcess.getEffect('swirl').mods).length,0);
});
test('styles and Keep choices round-trip and legacy configurations default to Preserve scene',()=>{
    const h=harness();h.c.Looks.setStyle('fx','wild');h.c.Looks.setKeep('fx',true);const saved=h.c.Looks.getConfiguration();
    h.c.Looks.setConfiguration();assert.equal(h.c.Looks.getStyle('fx'),'gentle');
    h.c.Looks.setConfiguration(saved);assert.equal(h.c.Looks.getStyle('fx'),'wild');assert.equal(h.c.Looks.getConfiguration().keep.fx,true);
});
