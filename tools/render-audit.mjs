import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const artifacts=new URL('./render-artifacts/',import.meta.url);

export async function auditDirectRender(cdp,evaluate) {
    await mkdir(artifacts,{recursive:true});
    await cdp.send('Browser.setDownloadBehavior',{behavior:'deny'});
    const result=await evaluate(cdp,`(${browserAudit.toString()})()`);
    for(const clip of result.clips||[]) {
        const path=new URL(clip.name+'.mp4',artifacts);
        await writeFile(path,Buffer.from(clip.b64,'base64'));delete clip.b64;
        const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_packets','-of','json',fileURLToPath(path)],{encoding:'utf8',maxBuffer:8*1024*1024}));
        const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
        const packets=probe.packets.filter(p=>p.codec_type==='video');
        const hashes=execFileSync('ffmpeg',['-v','error','-i',fileURLToPath(path),'-map','0:v:0','-f','framemd5','-'],{encoding:'utf8',maxBuffer:2*1024*1024}).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split(',').at(-1).trim());
        clip.video={frames:Number(video.nb_read_frames),fps:video.avg_frame_rate,duration:Number(video.duration),uniqueFrames:new Set(hashes).size};
        clip.speed=clip.video.duration/clip.wallSeconds;
        const check=(name,ok,details)=>result.checks.push({name:clip.name+': '+name,ok:!!ok,...(details===undefined?{}:{details})});
        check('Exact duration and frame count',clip.video.frames===Math.round(clip.expectedSeconds*60)&&Math.abs(clip.video.duration-clip.expectedSeconds)<0.001);
        check('Every output frame has a distinct image',clip.video.uniqueFrames===clip.video.frames);
        check('Even 60 FPS presentation timestamps',video.avg_frame_rate==='60/1'&&packets.slice(1).every((p,i)=>Math.abs(Number(p.pts_time)-Number(packets[i].pts_time)-1/60)<0.00003));
        if(clip.name==='custom') check('No sound setting is honored',!audio);
        else {
            clip.audio=audio?{codec:audio.codec_name,duration:Number(audio.duration)}:null;
            check('Soundtrack matches video duration',audio&&audio.codec_name==='aac'&&Math.abs(Number(audio.duration)-clip.video.duration)<0.03);
            if(audio) {
                const pcm=execFileSync('ffmpeg',['-v','error','-i',fileURLToPath(path),'-map','0:a:0','-ss','0.15','-t','0.45','-af','pan=mono|c0=c0','-ac','1','-ar','48000','-f','f32le','-'],{maxBuffer:1024*1024});
                let power=0;for(let i=0;i<pcm.length;i+=4)power+=pcm.readFloatLE(i)**2;
                clip.audio.openingRms=Math.sqrt(power/(pcm.length/4));
                check('Sound begins at the requested file position',clip.name==='full-track'?clip.audio.openingRms>0.1&&clip.audio.openingRms<0.2:clip.audio.openingRms>0.3&&clip.audio.openingRms<0.5,clip.audio.openingRms);
            }
        }
    }
    // Verify the new length controls actually survive a page reload.
    await evaluate(cdp,`document.getElementById('renderLengthMode').value='custom';document.getElementById('renderLengthMode').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('renderSeconds').value='12.5';document.getElementById('renderSeconds').dispatchEvent(new Event('change',{bubbles:true}));Setups.autosave()`);
    let timer;const loaded=new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Render UI reload timed out')),30000);cdp.on('Page.loadEventFired',resolve);});
    try{await cdp.send('Page.reload',{ignoreCache:true});await loaded;}finally{clearTimeout(timer);}
    const restored=await evaluate(cdp,`(async()=>{for(let i=0;i<100;i++){if(window.RenderControls&&window.Setups&&!Setups.isBusy()&&AudioAnalysis.getFile())break;await new Promise(r=>setTimeout(r,100));}return {mode:document.getElementById('renderLengthMode').value,seconds:document.getElementById('renderSeconds').value};})()`);
    result.checks.push({name:'Render duration controls survive reload',ok:restored.mode==='custom'&&restored.seconds==='12.5',details:restored});
    await evaluate(cdp,`UIShell.setTab('output');document.getElementById('renderLengthMode').value='audio';document.getElementById('renderLengthMode').dispatchEvent(new Event('change',{bubbles:true}));RenderControls.refresh();new Promise(r=>setTimeout(r,300))`);
    const shot=await cdp.send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL('render-panel.png',artifacts),Buffer.from(shot.data,'base64'));
    const progress=await evaluate(cdp,`(async()=>{
        document.getElementById('renderLengthMode').value='custom';document.getElementById('renderSeconds').value='30';
        AudioAnalysis.setSource('file');AudioAnalysis.setFileLoop(true);RenderControls.refresh();document.getElementById('btnRenderMP4').click();
        for(let i=0;i<200;i++){const s=VideoExport.getStatus();if(s.frames>0&&s.wallElapsed>1.1)break;await new Promise(r=>setTimeout(r,25));}
        RenderControls.refresh();return {state:VideoExport.getStatus(),text:document.getElementById('renderStatus').textContent,canCancel:!document.getElementById('btnRenderCancel').disabled};
    })()`);
    result.checks.push({name:'Render progress shows percentage, speed, remaining time and Cancel',ok:progress.state.recording&&progress.state.progress>0&&progress.state.progress<1&&progress.canCancel&&/frames\/s/.test(progress.text)&&/left/.test(progress.text),details:progress});
    const progressShot=await cdp.send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL('render-progress.png',artifacts),Buffer.from(progressShot.data,'base64'));
    await evaluate(cdp,`(async()=>{document.getElementById('btnRenderCancel').click();for(let i=0;i<200&&VideoExport.isSaving();i++)await new Promise(r=>setTimeout(r,25));})()`);
    result.ok=result.checks.every(c=>c.ok);
    await writeFile(new URL(process.argv.includes('--file')?'results-file.json':'results-http.json',artifacts),JSON.stringify(result,null,2));
    return result;
}

async function browserAudit() {
    const sleep=ms=>new Promise(r=>setTimeout(r,ms)),checks=[],clips=[];
    const check=(name,ok,details)=>checks.push({name,ok:!!ok,...(details===undefined?{}:{details})});
    const change=(id,value)=>{const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));};
    await VideoExport.ready();EffectRegistry.switchTo('plasma');Music.stop();AudioAnalysis.clearFile();
    change('resSelect','640x360');change('fpsSelect','60');change('recMode','live');change('recFormat','webm');change('recAudio','none');change('recQuality','standard');
    Renderer.setLoopEnabled(false);Renderer.setAnimSpeed(1);Renderer.setMaxPreviewFps(1);Renderer.pause();
    AudioReactor.set('enabled',false);PostProcess.disableAll();Overlays.resetAll();UIShell.setTab('output');
    await sleep(100);
    change('renderLengthMode','audio');RenderControls.refresh();
    check('Match audio cannot start without a loaded file',document.getElementById('btnRenderMP4').disabled&&/Choose an audio file/.test(document.getElementById('renderStatus').textContent));
    const input=document.getElementById('audioFileInput'),oldClick=input.click;let opened=0;
    try{input.click=()=>opened++;document.getElementById('btnRenderAudio').click();}finally{input.click=oldClick;}
    check('Choose audio opens the existing upload input',opened===1);
    const originalGallery=Gallery.addVideo,saved=[];
    Gallery.addVideo=function(blob){saved.push(blob);return originalGallery.apply(this,arguments);};
    const oldCapture=VideoExport.captureFrame;let lastNow=null,minFrameGap=Infinity,maxFramesPerPaint=0,paintFrames=0,trackFrames=false;
    VideoExport.captureFrame=function(){if(trackFrames&&VideoExport.isFrameExport()){const now=performance.now();if(lastNow!==null)minFrameGap=Math.min(minFrameGap,now-lastNow);lastNow=now;paintFrames++;}return oldCapture.apply(this,arguments);};
    let stopMonitor=false;function paint(){maxFramesPerPaint=Math.max(maxFramesPerPaint,paintFrames);paintFrames=0;if(!stopMonitor)requestAnimationFrame(paint);}requestAnimationFrame(paint);
    try {
        async function render(name,mode,seconds,audio) {
            change('renderLengthMode',mode);change('renderSeconds',String(seconds));change('recAudio',audio);await sleep(50);RenderControls.refresh();
            const previousOptions=JSON.stringify(VideoExport.getOptions()),previousPosition=AudioAnalysis.getFileStatus().currentTime,previousSource=AudioAnalysis.getSource();
            let summary,error;const onSaved=e=>summary=e.detail,onError=e=>error=e.detail.message;
            window.addEventListener('psychedelia:recording-saved',onSaved);window.addEventListener('psychedelia:recording-error',onError);
            const started=performance.now();trackFrames=true;document.getElementById('btnRenderMP4').click();
            check(name+': Dedicated button starts an offline job',VideoExport.getStatus().directRender&&VideoExport.isFrameExport());
            check(name+': Controls lock while Cancel stays available',document.getElementById('effectSelect').disabled&&!document.getElementById('btnRenderCancel').disabled);
            for(let i=0;i<1000&&!summary&&!error;i++)await sleep(20);
            trackFrames=false;
            window.removeEventListener('psychedelia:recording-saved',onSaved);window.removeEventListener('psychedelia:recording-error',onError);
            if(error||!summary)throw new Error(error||'Direct render timed out');
            const wallSeconds=(performance.now()-started)/1000;
            check(name+': Live preferences and paused preview are preserved',JSON.stringify(VideoExport.getOptions())===previousOptions&&!Renderer.isRunning()&&document.getElementById('recMode').value==='live'&&!document.getElementById('btnRecord').disabled);
            check(name+': Preview audio source and playhead are preserved',AudioAnalysis.getSource()===previousSource&&Math.abs(AudioAnalysis.getFileStatus().currentTime-previousPosition)<0.02&&!AudioAnalysis.getFileStatus().playing);
            const blob=saved.at(-1);const b64=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob);});
            clips.push({name,wallSeconds,summary,expectedSeconds:seconds,b64});
        }
        await render('custom','custom',2,'none');
        check('Offline rendering is independent of preview frame pacing',maxFramesPerPaint>1||minFrameGap<8,{maxFramesPerPaint,minFrameGap});
        const rate=48000,frames=rate*3.25,bytes=new ArrayBuffer(44+frames*2),v=new DataView(bytes);
        const str=(at,text)=>{for(let i=0;i<text.length;i++)v.setUint8(at+i,text.charCodeAt(i));};
        str(0,'RIFF');v.setUint32(4,36+frames*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,frames*2,true);
        for(let i=0;i<frames;i++){const first=i<rate;v.setInt16(44+i*2,Math.round(Math.sin(i*2*Math.PI*(first?220:880)/rate)*(first?0.2:0.55)*32767),true);}
        const transfer=new DataTransfer();transfer.items.add(new File([bytes],'render-test-track.wav',{type:'audio/wav'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
        for(let i=0;i<100&&!AudioAnalysis.getFileStatus().duration;i++)await sleep(50);
        AudioAnalysis.setFileGain(1);AudioAnalysis.setFileLoop(true);AudioAnalysis.seekFile(1);AudioAnalysis.setSource('studio');
        check('Uploaded file metadata becomes available to the render panel',Math.abs(AudioAnalysis.getFileStatus().duration-3.25)<0.001);
        await render('full-track','audio',3.25,'all');
        await render('remaining-track','remaining',2.25,'all');
        change('renderLengthMode','custom');change('renderSeconds','-1');RenderControls.refresh();check('Invalid custom length disables rendering',document.getElementById('btnRenderMP4').disabled);
        change('renderSeconds','601');RenderControls.refresh();check('Sound memory limit is explained before starting',document.getElementById('btnRenderMP4').disabled&&/10 minutes/.test(document.getElementById('renderStatus').textContent));
        change('renderSeconds','30');change('recAudio','none');await sleep(50);RenderControls.refresh();
        const countBefore=saved.length;document.getElementById('btnRenderMP4').click();await sleep(60);document.getElementById('btnRenderCancel').click();await sleep(60);
        check('Cancel discards the video and restores the interface',saved.length===countBefore&&!VideoExport.isRecording()&&!VideoExport.isSaving()&&!document.getElementById('effectSelect').disabled&&/No video was saved/.test(document.getElementById('renderStatus').textContent));
        document.getElementById('btnRenderMP4').click();await sleep(150);RenderControls.refresh();document.getElementById('btnRenderStop').click();
        for(let i=0;i<200&&VideoExport.isSaving();i++)await sleep(20);
        check('Stop and save creates a partial MP4',saved.length===countBefore+1&&!VideoExport.isRecording()&&!VideoExport.isSaving());
        change('recAudio','all');Renderer.setMaxPreviewFps(0);Renderer.play();
        return {ok:checks.every(c=>c.ok),checks,clips};
    } finally {Gallery.addVideo=originalGallery;VideoExport.captureFrame=oldCapture;stopMonitor=true;}
}
