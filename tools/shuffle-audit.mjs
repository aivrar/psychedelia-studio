import { mkdir, writeFile } from 'node:fs/promises';
const artifacts = new URL('./shuffle-artifacts/', import.meta.url);
export async function auditShuffle(cdp, evaluate) {
    await mkdir(artifacts, {recursive:true});
    await cdp.send('Browser.setDownloadBehavior', {behavior:'deny'});
    const report = await evaluate(cdp, `(${browserAudit.toString()})()`);
    if (report.sheet) { await writeFile(new URL('shuffle-samples.png',artifacts),Buffer.from(report.sheet.split(',')[1],'base64')); delete report.sheet; }
    if (report.ok) {
        // Page.reload acknowledges navigation before the new document loads.
        // Waiting on the old document's ready flag can falsely pass, then run
        // the next check before Looks exists in the replacement document.
        let reloadTimer;
        const loaded=new Promise((resolve,reject)=>{
            reloadTimer=setTimeout(()=>reject(new Error('Shuffle reload timed out')),30000);
            cdp.on('Page.loadEventFired',()=>resolve());
        });
        try {await cdp.send('Page.reload', {ignoreCache:true});await loaded;}
        finally {clearTimeout(reloadTimer);}
        const reload = await evaluate(cdp, `(async()=>{for(let i=0;i<150;i++){if(window.EditHistory&&EditHistory.getState().ready)break;await new Promise(r=>setTimeout(r,100));}
            return {style:Looks.getStyle('fx'),keep:Looks.getConfiguration().keep.fx,fx:Looks.getAuto('fx'),overlays:Looks.getAuto('overlays'),ui:document.querySelector('.looks-bar[data-scope="fx"] .looks-style').value};})()`);
        report.checks.push({name:'Style, Keep, intervals and controls survive reload',ok:reload.style==='wild'&&reload.keep&&reload.fx==='8'&&reload.overlays==='16'&&reload.ui==='wild',details:reload});
    }
    await evaluate(cdp, `Looks.setAuto('fx','off'); Looks.setAuto('overlays','off'); Looks.setKeep('fx',false); Looks.setStyle('fx','gentle'); UIShell.setTab('fx'); new Promise(r=>setTimeout(r,300))`);
    const shot=await cdp.send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL('shuffle-controls.png',artifacts),Buffer.from(shot.data,'base64'));
    report.ok=report.ok&&report.checks.every(c=>c.ok);
    await writeFile(new URL('browser-results'+(process.argv.includes('--file')?'-file':'')+'.json',artifacts),JSON.stringify(report,null,2));
    return report;
}
async function browserAudit() {
    const checks=[],samples=[],sleep=ms=>new Promise(r=>setTimeout(r,ms)),check=(name,ok,details)=>checks.push({name,ok:!!ok,...(details===undefined?{}:{details})});
    const change=async(el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();};
    const click=async el=>{el.click();await Promise.resolve();};
    let sheet=null;
    try {
        for(let i=0;i<100&&!EditHistory.getState().ready;i++)await sleep(100);
        Renderer.pause();Looks.setAuto('fx','off');Looks.setAuto('overlays','off');Looks.setAuto('reactor','off');
        const fxbar=document.querySelector('.looks-bar[data-scope="fx"]'),ovbar=document.querySelector('.looks-bar[data-scope="overlays"]');
        check('Both panels default to Preserve scene',fxbar.querySelector('.looks-style').value==='gentle'&&ovbar.querySelector('.looks-style').value==='gentle');
        EditHistory.clear();await change(fxbar.querySelector('.looks-style'),'wild');
        check('Style selection changes its scope only',Looks.getStyle('fx')==='wild'&&Looks.getStyle('overlays')==='gentle');
        await click(document.getElementById('btnUndo'));check('Style is undoable with matching UI',Looks.getStyle('fx')==='gentle'&&fxbar.querySelector('.looks-style').value==='gentle');
        await click(document.getElementById('btnRedo'));check('Style redo works',Looks.getStyle('fx')==='wild');
        await change(fxbar.querySelector('.looks-auto'),'4');await change(fxbar.querySelector('.looks-auto'),'8');await click(document.getElementById('btnUndo'));
        check('Auto interval is undoable',Looks.getAuto('fx')==='4'&&fxbar.querySelector('.looks-auto').value==='4');
        Looks.setAuto('fx','off');Looks.setStyle('fx','gentle');
        await click(fxbar.querySelector('.looks-shuffle'));
        check('Preserve scene button only selects non-distorting passes',PostProcess.getEffects().filter(f=>f.enabled).every(f=>ShuffleProfiles.fx[f.name]));
        const before=EditHistory.getState().undo;
        const originalClock=AudioReactor.getBeatClock;let beat=0;AudioReactor.getBeatClock=()=>beat;
        try {Looks.setAuto('fx','4');Looks.update();beat=16;Looks.update();check('Automatic rolls do not fill Undo history',EditHistory.getState().undo===before);}
        finally {AudioReactor.getBeatClock=originalClock;Looks.setAuto('fx','off');}
        Renderer.setResolution(320,180);Renderer.setAnimSpeed(0);Renderer.setTime(2.4);Renderer.setRotationSpeed(0);Renderer.setRotation(0);
        Renderer.setViewZoom(1);Renderer.setViewZoomDepth(0);AudioReactor.set('enabled',false);EffectRegistry.switchTo('plasma');
        Controls.setValues({brightness:0.65,saturation:0.8});Renderer.setTime(2.4);PostProcess.resetAll();Overlays.resetAll();
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d',{willReadFrequently:true});
        const grid=document.createElement('canvas');grid.width=1280;grid.height=1040;const gc=grid.getContext('2d');gc.fillStyle='#16141e';gc.fillRect(0,0,grid.width,grid.height);
        const draw=()=>{ctx.drawImage(Renderer.getCanvas(),0,0,320,180);ctx.drawImage(document.getElementById('overlayCanvas'),0,0,320,180);return new Uint8ClampedArray(ctx.getImageData(0,0,320,180).data);};
        async function frame(count=3){
            const original=Overlays.render;
            try {return await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('No rendered frame')),7000);
                Overlays.render=function(){original.apply(this,arguments);if(--count===0){clearTimeout(timeout);resolve(draw());}};Renderer.clearInputPriority();Renderer.play();});}
            finally {Overlays.render=original;Renderer.pause();}
        }
        const baseline=await frame();
        const originalMod=AudioReactor.applyMod,random=Math.random;let seed=15382;
        Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        AudioReactor.applyMod=(base,def,mod)=>{if(!mod||!mod.amt)return base;const value=Math.max(def.min,Math.min(def.max,base+mod.amt*(def.max-def.min)));return def.type==='int'?Math.round(value):value;};
        try {
            for(const scene of ['plasma','endless_terrain']){
            let comparison=baseline;
            if(scene!=='plasma'){PostProcess.resetAll();Overlays.resetAll();EffectRegistry.switchTo(scene);Renderer.setTime(2.4);comparison=await frame();}
            for(const style of ['gentle','wild']){
                Looks.setStyle('fx',style);Looks.setStyle('overlays',style);
                for(let roll=0;roll<(scene==='plasma'?32:12);roll++){
                    Looks.shuffle('all');const pixels=await frame(4);let white=0,black=0,sum=0,sq=0,diff=0;
                    for(let i=0;i<pixels.length;i+=4){const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255,l=.299*r+.587*g+.114*b;
                        if(Math.min(r,g,b)>.97)white++;if(Math.max(r,g,b)<.02)black++;sum+=l;sq+=l*l;
                        diff+=(Math.abs(pixels[i]-comparison[i])+Math.abs(pixels[i+1]-comparison[i+1])+Math.abs(pixels[i+2]-comparison[i+2]))/765;}
                    const n=pixels.length/4,stat={scene,style,roll,white:white/n,black:black/n,mean:sum/n,sd:Math.sqrt(Math.max(0,sq/n-(sum/n)**2)),difference:diff/n,
                        fx:PostProcess.getEffects().filter(f=>f.enabled).map(f=>f.name),overlays:Overlays.getDefs().filter(d=>Overlays.isEnabled(d.id)).map(d=>d.id)};
                    samples.push(stat);
                    check(`${scene} ${style} roll ${roll+1}: visible image at full beat strength`,stat.white<.65&&stat.black<.97&&stat.sd>.008,stat);
                    if(style==='gentle')check(`${scene} Preserve scene roll ${roll+1}: picture remains recognizable`,stat.difference<.2&&stat.white<.15,stat.difference);
                    if(roll<4){const index=(scene==='plasma'?0:8)+(style==='gentle'?0:4)+roll,x=(index%4)*320,y=Math.floor(index/4)*260;
                        gc.drawImage(canvas,x,y,320,180);gc.fillStyle='#ffffff';gc.font='15px sans-serif';gc.fillText((style==='gentle'?'Preserve scene':'Wild')+' / '+scene,x+10,y+205);
                        gc.font='12px sans-serif';gc.fillText(stat.fx.join(', '),x+10,y+228);gc.fillText(stat.overlays.join(', '),x+10,y+249);}
                }
            }
            }
        } finally {AudioReactor.applyMod=originalMod;Math.random=random;}
        sheet=grid.toDataURL();
        // Verify scheduling in an actual accelerated MP4 export, not a timer mock.
        EffectRegistry.switchTo('plasma');PostProcess.resetAll();Overlays.resetAll();Looks.setStyle('fx','gentle');Looks.setAuto('fx','4');Music.setBPM(120);AudioAnalysis.setSource('studio');Music.stop();
        const rolls=[];let tracking=true;Looks.onChange(scope=>{if(tracking&&scope==='fx')rolls.push({beat:AudioReactor.getBeatClock(),offline:VideoExport.isFrameExport()});});
        let done=false,failed=null;
        const saved=()=>{done=true;},error=e=>{failed=e.detail?.message||'Render error';};
        window.addEventListener('psychedelia:recording-saved',saved);window.addEventListener('psychedelia:recording-error',error);
        const started=performance.now();
        try {
            check('MP4 with automatic shuffle starts',VideoExport.renderMP4(Renderer.getCanvas(),{lengthMode:'custom',duration:8.2,fps:30,audio:'none'}));
            for(let i=0;i<600&&!done&&!failed;i++)await sleep(50);
            check('MP4 with shuffle completes',done&&!failed,failed);
            check('MP4 rolls once at 4 bars of output time',rolls.length===1&&rolls[0].offline&&Math.abs(rolls[0].beat-16)<.08,{rolls,wallSeconds:(performance.now()-started)/1000});
        } finally {tracking=false;window.removeEventListener('psychedelia:recording-saved',saved);window.removeEventListener('psychedelia:recording-error',error);Looks.setAuto('fx','off');}
        Looks.setStyle('fx','wild');Looks.setStyle('overlays','gentle');Looks.setKeep('fx',true);Looks.setAuto('fx','8');Looks.setAuto('overlays','16');
        const id=await Setups.save('Shuffle audit');Looks.setConfiguration();Looks.setAuto('fx','off');await Setups.load(id);
        check('Named setups restore styles, Keep and independent bar intervals',Looks.getStyle('fx')==='wild'&&Looks.getStyle('overlays')==='gentle'&&Looks.getConfiguration().keep.fx&&Looks.getAuto('fx')==='8'&&Looks.getAuto('overlays')==='16');
        await Setups.autosave();
        return {ok:checks.every(c=>c.ok),checks,samples,sheet};
    } catch(error){return {ok:false,error:error.stack,checks,samples,sheet};}
}
