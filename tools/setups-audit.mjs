import { mkdir, writeFile } from 'node:fs/promises';
const artifacts = new URL('./setups-artifacts/', import.meta.url);

export async function auditSetups(cdp, evaluate) {
    await mkdir(artifacts, {recursive:true});
    const first = await evaluate(cdp, `(${beforeReload.toString()})()`);
    if (!first.ok) return first;
    let reloadTimer;
    const loaded = new Promise((resolve,reject)=>{
        reloadTimer=setTimeout(()=>reject(new Error('Setup reload timed out')),30000);
        cdp.on('Page.loadEventFired',()=>resolve());
    });
    try {await cdp.send('Page.reload', {ignoreCache:true});await loaded;}
    finally {clearTimeout(reloadTimer);}
    const second = await evaluate(cdp, `(${afterReload.toString()})(${JSON.stringify(first.saved)})`);
    await evaluate(cdp, `UIShell.setTab('audio'); document.getElementById('sidebar').scrollTop=0; new Promise(r=>setTimeout(r,350))`);
    const shot = await cdp.send('Page.captureScreenshot', {format:'png'});
    await writeFile(new URL('saved-setups.png', artifacts), Buffer.from(shot.data, 'base64'));
    for (const [id,name] of [['reactorTempoMode','tempo-controls'],['reactorAttack','timing-controls']]) {
        await evaluate(cdp, `document.querySelector('[data-section="reactor"]').classList.remove('is-collapsed');document.querySelector('[data-section="reactor-fine-tune"]').classList.remove('is-collapsed');document.getElementById(${JSON.stringify(id)}).scrollIntoView({block:'center'});new Promise(r=>setTimeout(r,250))`);
        const controlsShot=await cdp.send('Page.captureScreenshot',{format:'png'});
        await writeFile(new URL(name+'.png',artifacts),Buffer.from(controlsShot.data,'base64'));
    }
    const report = {ok:first.ok && second.ok, checks:[...first.checks,...second.checks], saved:first.saved};
    await writeFile(new URL('browser-results'+(process.argv.includes('--file')?'-file':'')+'.json',artifacts), JSON.stringify(report,null,2));
    return report;
}
async function beforeReload() {
    const sleep = ms => new Promise(r=>setTimeout(r,ms)), checks=[];
    const check=(name,ok,details)=>checks.push({name,ok:!!ok,...(details===undefined?{}:{details})});
    try {
        for (let i=0;i<50;i++) { if (window.Setups && await Setups.autosave()) break; await sleep(100); }
        EffectRegistry.switchTo('plasma'); MusicControls.refreshReactor();
        const p=AudioReactor.getLinkableParams()[0].name;
        AudioReactor.setLink(0,{param:p,source:'kick',amount:-0.37});
        EffectRegistry.switchTo('mandelbrot'); MusicControls.refreshReactor();
        check('A new effect does not inherit links', AudioReactor.getLinks()[0].param==='');
        EffectRegistry.switchTo('plasma'); MusicControls.refreshReactor();
        check('Returning to an effect restores its link and direction', AudioReactor.getLinks()[0].param===p && AudioReactor.getLinks()[0].amount===-0.37 && document.getElementById('reactLinkParam0').value===p);
        for (const [id,key,value,factor] of [['Attack','attack',60,1000],['Release','release',600,1000],['HitDecay','hitDecay',200,100],['Smoothing','smoothing',150,1000]]) {
            const el=document.getElementById('reactor'+id); el.value=value; el.dispatchEvent(new Event('input',{bubbles:true}));
            check(id+' control changes the timing',AudioReactor.getSettings()[key]===value/factor);
            el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
            check(id+' double-click restores its default',AudioReactor.getSettings()[key]===AudioReactor.getDefaults()[key]);
        }
        const mode=document.getElementById('reactorTempoMode');mode.value='manual';mode.dispatchEvent(new Event('change',{bubbles:true}));
        const bpm=document.getElementById('reactorManualBpm');bpm.value='93';bpm.dispatchEvent(new Event('change',{bubbles:true}));
        check('BPM lock has correct UI state and value',AudioReactor.getSettings().tempoMode==='manual'&&AudioReactor.getSettings().manualBpm===93&&!bpm.disabled);
        mode.value='auto';mode.dispatchEvent(new Event('change')); const tap=document.getElementById('reactorTapTempo');
        const actualNow=performance.now.bind(performance);let tapTime=actualNow();
        try { performance.now=()=>tapTime; for (let i=0;i<4;i++) {tap.click();tapTime+=500;} }
        finally {performance.now=actualNow;}
        check('Tap tempo locks an external tempo close to 120',AudioReactor.getSettings().tempoMode==='manual'&&Math.abs(AudioReactor.getSettings().manualBpm-120)<3);
        const n=4800, bytes=new ArrayBuffer(44+n*2),v=new DataView(bytes),str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
        str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,48000,true);v.setUint32(28,96000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.round(Math.sin(i*Math.PI*880/48000)*10000),true);
        await AudioAnalysis.loadFile(new File([bytes],'saved-test.wav',{type:'audio/wav'}));AudioAnalysis.setFileGain(0.4);AudioAnalysis.setFileLoop(true);
        const png=await (await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXOYAAAAASUVORK5CYII=')).blob();
        Overlays.setImage('img_file',new File([png],'saved-logo.png',{type:'image/png'}));Overlays.setEnabled('image_layer',true);
        Overlays.setEnabled('spectrum',true);Overlays.setParam('spectrum_glow',0.72);Overlays.setMod('spectrum_glow','kick',0);
        PostProcess.setEnabled('bloom',true);const bloom=PostProcess.getEffect('bloom');const fxParam=Object.keys(bloom.paramDefs).find(k=>bloom.paramDefs[k].type!=='select'&&bloom.paramDefs[k].max>bloom.paramDefs[k].min);
        PostProcess.setMod('bloom',fxParam,'bass',-0.18);
        Music.setBPM(147);Music.setEnergy(0.33);Music.setMasterVolume(-17);Music.setInstrumentOn('snare',false);Music.setInstrumentVolume('bass',-9);
        AudioReactor.set('attack',0.07);AudioReactor.set('enabled',false);AudioReactor.set('manualBpm',93);
        Renderer.setAnimSpeed(1.65);Renderer.setViewZoom(1.33);Renderer.setSeed(432,[0.1,0.2,0.3,0.4]);
        const id=await Setups.save('Audit setup');check('A named setup is saved and selected',Setups.getList().some(s=>s.id===id)&&document.getElementById('setupSelect').value===id);
        const snapshot=await Setups.capture();check('Audio file and image are stored as assets',!!snapshot.audio.file&&!!snapshot.images.img_file);
        Music.setBPM(80);PostProcess.disableAll();AudioReactor.resetAll();AudioAnalysis.clearFile();Overlays.setImage('img_file',null);Renderer.setAnimSpeed(0.5);
        await Setups.load(id);
        check('Loading restores mixer and music settings',Music.getBPM()===147&&Music.getSettings().volume===-17&&!Music.getSettings().mixer.snare.on&&Music.getSettings().mixer.bass.volume===-9);
        check('Loading restores FX, overlay routes including zero amounts',PostProcess.isEnabled('bloom')&&PostProcess.getMod('bloom',fxParam).amt===-0.18&&Overlays.getMod('spectrum_glow').amt===0&&Overlays.getMod('spectrum_glow').src==='kick');
        check('Loading restores attached assets without starting playback',AudioAnalysis.getFile()?.name==='saved-test.wav'&&Overlays.getImageFiles().img_file?.name==='saved-logo.png'&&!Music.isPlaying()&&!AudioAnalysis.getFileStatus().playing);
        check('Loading restores motion and seed, with matching controls',Renderer.getAnimSpeed()===1.65&&Renderer.getSeed()===432&&document.getElementById('animSpeed').value==='1.65');
        check('Loading restores all per-effect beat links',AudioReactor.getLinks()[0].param===p&&AudioReactor.getLinks()[0].amount===-0.37);
        const bad=JSON.parse(JSON.stringify(snapshot));bad.values[p]=null;let rejected=false;try{await Setups.apply(bad);}catch(_){rejected=true;}
        check('Malformed setup is rejected before changing active state',rejected&&Music.getBPM()===147&&AudioReactor.getLinks()[0].amount===-0.37);
        await Setups.autosave();return {ok:checks.every(c=>c.ok),checks,saved:{id,param:p,fxParam}};
    } catch(e) {check('Setup audit completed',false,e.stack||String(e));return {ok:false,checks};}
}
async function afterReload(saved) {
    const checks=[],sleep=ms=>new Promise(r=>setTimeout(r,ms)),check=(name,ok)=>checks.push({name,ok:!!ok});
    try {
        for(let i=0;i<100;i++){if(window.Setups&&Setups.getList().some(s=>s.id===saved.id)&&Music.getBPM()===147&&!Setups.isBusy())break;await sleep(100);}
        check('Named setups survive reload',Setups.getList().some(s=>s.id===saved.id));
        check('Latest audio settings are restored automatically',Music.getBPM()===147&&Music.getSettings().volume===-17&&AudioReactor.getSettings().attack===0.07&&!AudioReactor.getSettings().enabled);
        check('Effect links survive reload',EffectRegistry.getCurrent().name==='plasma'&&AudioReactor.getLinks()[0].param===saved.param&&AudioReactor.getLinks()[0].amount===-0.37);
        check('Audio and image assets survive reload',AudioAnalysis.getFile()?.name==='saved-test.wav'&&Overlays.getImageFiles().img_file?.name==='saved-logo.png');
        check('Reload does not automatically play music or capture',!Music.isPlaying()&&!AudioAnalysis.getFileStatus().playing&&!AudioAnalysis.getCaptureStatus().hasCapture);
        check('Restored mixer UI matches its state',!document.getElementById('inst_snare').checked&&document.getElementById('instvol_bass').value==='-9'&&document.getElementById('musicVolume').value==='-17');
        await Music.start();await sleep(300);
        check('First play does not randomize restored music settings',Music.getBPM()===147&&Music.getSettings().volume===-17&&!Music.getSettings().mixer.snare.on);
        Music.stop();
        const actualTone=Tone;
        try {
            // Tone's namespace exports are read-only. Shadow the namespace for
            // this failure fixture instead of silently assigning its getter.
            window.Tone=Object.create(actualTone);
            Object.defineProperty(Tone,'start',{value:()=>Promise.reject(new Error('Audit resume rejection'))});
            Music.start();await sleep(50);
            check('A rejected audio resume clears the Starting state',!Music.isStarting()&&!Music.isPlaying());
        } finally {window.Tone=actualTone;Music.stop();}
        await Setups.remove(saved.id);check('Deleting a saved setup preserves the active setup',!Setups.getList().some(s=>s.id===saved.id)&&Music.getBPM()===147&&AudioReactor.getLinks()[0].amount===-0.37);
        return {ok:checks.every(c=>c.ok),checks};
    }catch(e){checks.push({name:'Reload audit completed',ok:false,details:e.stack||String(e)});return {ok:false,checks};}
}
