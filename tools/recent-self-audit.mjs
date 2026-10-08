import {mkdir,writeFile} from 'node:fs/promises';
const artifacts=new URL('./self-audit-artifacts/',import.meta.url);
export async function auditRecentChanges(cdp,evaluate) {
    await mkdir(artifacts,{recursive:true});
    await cdp.send('Browser.setDownloadBehavior',{behavior:'deny'});
    const report=await evaluate(cdp,`(${browserAudit.toString()})()`);
    await writeFile(new URL('edge-cases'+(process.argv.includes('--file')?'-file':'')+'.json',artifacts),JSON.stringify(report,null,2));
    return report;
}
async function browserAudit() {
    const checks=[],check=(name,ok,details)=>checks.push({name,ok:!!ok,...(details===undefined?{}:{details})});
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const click=async id=>{document.getElementById(id).click();await Promise.resolve();};
    try {
        for(let i=0;i<150&&!EditHistory.getState().ready;i++)await sleep(100);
        await VideoExport.ready();Renderer.pause();Renderer.setResolution(320,180);Renderer.setRotationSpeed(0);Renderer.setViewZoom(1);Renderer.setViewZoomSpeed(0.7);Renderer.setViewZoomDepth(0);Renderer.setAnimSpeed(1);
        EffectRegistry.switchTo('plasma');PostProcess.resetAll();Overlays.resetAll();AudioReactor.set('enabled',false);
        ['fx','overlays','reactor'].forEach(s=>Looks.setAuto(s,'off'));
        Renderer.setRotation(1.25);EditHistory.clear();await click('motionReset');
        check('Motion reset is recorded when only the viewing angle changed',EditHistory.getState().undo===1);
        await click('btnUndo');check('Undo motion reset restores the original viewing angle',Renderer.getRotation()===1.25,{angle:Renderer.getRotation()});
        await click('btnRedo');check('Redo motion reset restores the upright view',Renderer.getRotation()===0);
        Renderer.setRotation(0);EditHistory.clear();
        // UI refreshes and automatic rolls rebuild controls during an export.
        AudioReactor.set('tempoMode','manual');MusicControls.refresh();
        const canCapture=VideoExport.canCaptureFrame;
        try {
            VideoExport.canCaptureFrame=()=>false;
            check('Held export starts',VideoExport.renderMP4(Renderer.getCanvas(),{lengthMode:'custom',duration:30,fps:60,audio:'none'}));
            MusicControls.refresh();Looks.shuffle('all');await sleep(50);
            const active=Array.from(document.querySelectorAll('input,select,button,textarea')).filter(el=>!['btnRecord','btnRenderCancel','btnRenderStop'].includes(el.id)&&!el.disabled).map(el=>el.id||el.className||el.tagName);
            check('Export controls stay locked after audio refresh and shuffle rebuild',active.length===0,active.slice(0,16));
        } finally {VideoExport.canCaptureFrame=canCapture;VideoExport.cancelRender();await sleep(100);}
        check('Rebuilt controls unlock after cancel',!!document.querySelector('#postfxContainer input:not(:disabled)')&&!document.getElementById('reactorManualBpm').disabled);
        // Hold encoder finalization: editing must stay blocked until saved.
        let releaseFlush;const gate=new Promise(r=>releaseFlush=r),oldFlush=VideoEncoder.prototype.flush;
        try {
            VideoEncoder.prototype.flush=function(){return oldFlush.apply(this,arguments).then(()=>gate);};
            VideoExport.renderMP4(Renderer.getCanvas(),{lengthMode:'custom',duration:30,fps:60,audio:'none'});
            for(let i=0;i<100&&VideoExport.getStatus().frames<1;i++)await sleep(10);
            VideoExport.stopRecording();check('Encoder finalization is held',VideoExport.isSaving()&&!VideoExport.isRecording());
            const before=JSON.stringify(Controls.getBaseValues()),seed=Renderer.getSeed();
            document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'n',bubbles:true,cancelable:true}));await Promise.resolve();
            check('Randomize shortcut cannot change scene while MP4 is saving',JSON.stringify(Controls.getBaseValues())===before&&Renderer.getSeed()===seed);
        } finally {VideoEncoder.prototype.flush=oldFlush;releaseFlush();for(let i=0;i<150&&VideoExport.isSaving();i++)await sleep(20);}
        check('Finalization releases the editor',!VideoExport.isSaving()&&!document.getElementById('effectSelect').disabled);
        // A failed asset transaction must be retryable for the same File object.
        const bytes=new ArrayBuffer(44+9600),v=new DataView(bytes),str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
        str(0,'RIFF');v.setUint32(4,36+9600,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,48000,true);v.setUint32(28,96000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,9600,true);
        await AudioAnalysis.loadFile(new File([bytes],'self-audit.wav',{type:'audio/wav'}));
        const put=IDBObjectStore.prototype.put;let failOnce=true,firstError=null,retryError=null;
        try {
            IDBObjectStore.prototype.put=function(value){if(this.name==='assets'&&value?.name==='self-audit.wav'&&failOnce){failOnce=false;throw new DOMException('Temporary test storage failure','QuotaExceededError');}return put.apply(this,arguments);};
            try {await Setups.capture();}catch(e){firstError=e.message;}
            try {await Setups.capture();}catch(e){retryError=e.message;}
        } finally {IDBObjectStore.prototype.put=put;}
        check('Failed asset storage is reported',!!firstError,firstError);
        check('The same uploaded file can be saved after a transient storage failure',!retryError,retryError);
        AudioAnalysis.clearFile();
        EffectRegistry.switchTo('robot_foundry');Controls.applyPreset(3);Controls.setValues({robot_size:1.25,dance_audio:1.6,palette:6});
        const robotState=JSON.stringify(Controls.getBaseValues()),robotLinks=JSON.stringify(AudioReactor.getLinks());
        const id=await Setups.save('Robot self audit');EffectRegistry.switchTo('plasma');await Setups.load(id);
        check('Robot Foundry setup restores its world, cast, dance settings and palette',EffectRegistry.getCurrent().name==='robot_foundry'&&JSON.stringify(Controls.getBaseValues())===robotState);
        check('Robot beat links survive a setup round trip',JSON.stringify(AudioReactor.getLinks())===robotLinks);
        const world=document.querySelector('[data-param="world_style"] select');EditHistory.clear();world.value='1';world.dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();
        await click('btnUndo');check('Robot world selection undoes with matching control',Controls.getBaseValues().world_style===3&&world.value==='3');
        await click('btnRedo');check('Robot world selection redoes with matching control',Controls.getBaseValues().world_style===1&&world.value==='1');
        const protectedNames=EffectRegistry.getCurrent().params.filter(p=>['Structure','Dance'].includes(p.group)).map(p=>p.name);
        check('Robot rig stays excluded from general beat links after setup and history operations',AudioReactor.getLinkableParams().every(p=>!protectedNames.includes(p.name)));
        return {ok:checks.every(c=>c.ok),checks};
    } catch(error){return {ok:false,error:error.stack,checks};}
}
