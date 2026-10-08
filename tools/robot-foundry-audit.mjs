import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const artifacts = new URL('./robot-artifacts/', import.meta.url);

export async function auditRobotFoundry(cdp, evaluate) {
    await mkdir(artifacts, {recursive: true});
    await cdp.send('Browser.setDownloadBehavior',{behavior:'deny'});
    const report = await evaluate(cdp, `(${browserAudit.toString()})(${process.argv.includes('--robot-preview')})`);
    for (const shot of report.images || []) await writeFile(new URL(shot.name + '.png', artifacts), Buffer.from(shot.png.split(',')[1], 'base64'));
    delete report.images;
    if (!process.argv.includes('--robot-preview') && report.ok) {
        const compat=await evaluate(cdp,`(${webgl1Check.toString()})()`);
        report.checks.push({name:'All four worlds compile in WebGL 1',ok:compat.ok,details:compat});
        const clearance=await evaluate(cdp,`(${cameraCheck.toString()})()`);
        report.checks.push({name:'Camera stays clear across world/pose extremes and long flights',ok:clearance.ok,details:clearance});
        const recording=await evaluate(cdp,`(${recordingCheck.toString()})()`);
        if(recording.b64) {
            const path=new URL('robot-foundry-studio-60fps.mp4',artifacts);
            await writeFile(path,Buffer.from(recording.b64,'base64'));delete recording.b64;
            const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_packets','-of','json',fileURLToPath(path)],{encoding:'utf8',maxBuffer:8*1024*1024}));
            const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
            const pts=probe.packets.filter(p=>p.codec_type==='video').map(p=>Number(p.pts_time));
            const hashes=execFileSync('ffmpeg',['-v','error','-i',fileURLToPath(path),'-map','0:v:0','-f','framemd5','-'],{encoding:'utf8',maxBuffer:2*1024*1024}).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split(',').at(-1).trim());
            recording.frames=Number(video.nb_read_frames);recording.fps=video.avg_frame_rate;recording.seconds=Number(video.duration);recording.uniqueFrames=new Set(hashes).size;recording.audio=audio&&{codec:audio.codec_name,seconds:Number(audio.duration)};
            recording.evenTiming=pts.every((v,i)=>!i||Math.abs(v-pts[i-1]-1/60)<.000002);
            // Idle Groove is zero: a silent opening must hold the robots still.
            // Repeated pictures there are correct, not a missed video frame.
            // Keep strict motion checks for the portion driven by audible music.
            const audible=hashes.filter((_,i)=>recording.frameEnergy[i]>.02);
            recording.audibleFrames=audible.length;recording.distinctAudibleFrames=new Set(audible).size;
            recording.ok=recording.frames===120&&recording.frameEnergy.length===120&&audible.length>60&&recording.distinctAudibleFrames===audible.length&&recording.fps==='60/1'&&recording.seconds===2&&recording.evenTiming&&!!audio&&recording.maxEnergy>.05&&recording.beatRange[1]>recording.beatRange[0]+2;
            delete recording.frameEnergy;
        }
        report.checks.push({name:'Studio music: 120 evenly spaced frames, distinct dance frames when audible, AAC audio',ok:recording.ok,details:recording});
        await evaluate(cdp,`EffectRegistry.switchTo('robot_foundry'); Controls.applyPreset(1); Renderer.setResolution(960,540); UIShell.setTab('effect'); Renderer.play(); new Promise(r=>setTimeout(r,300))`);
        const ui=await cdp.send('Page.captureScreenshot',{format:'png'});
        await writeFile(new URL('effect-controls.png',artifacts),Buffer.from(ui.data,'base64'));
    }
    report.ok=report.ok&&report.checks.every(c=>c.ok);
    await writeFile(new URL('results'+(process.argv.includes('--file')?'-file':'')+'.json', artifacts), JSON.stringify(report,null,2));
    return report;
}

async function browserAudit(preview) {
    const checks=[],images=[],samples=[];
    const check=(name,ok,details)=>checks.push({name,ok:!!ok,...(details===undefined?{}:{details})});
    try {
        for(let i=0;i<150&&!EditHistory.getState().ready;i++) await new Promise(r=>setTimeout(r,100));
        Renderer.pause(); Looks.setAuto('fx','off'); Looks.setAuto('overlays','off'); Looks.setAuto('reactor','off');
        PostProcess.resetAll(); Overlays.resetAll(); AudioReactor.set('enabled',false);
        Renderer.setResolution(640,360); Renderer.setQualityMode('full'); Renderer.setLoopEnabled(false);
        Renderer.setAnimSpeed(0); Renderer.setRotationSpeed(0); Renderer.setRotation(0); Renderer.setViewZoom(1); Renderer.setViewZoomDepth(0);
        Renderer.setMaxPreviewFps(0); Renderer.setSeed(0.137,[0.31,0.61,0.83,0.21]);
        check('Robot Foundry switches successfully',EffectRegistry.switchTo('robot_foundry') && EffectRegistry.getCurrent().name==='robot_foundry');
        // Switching starts a new seed. Set the fixture afterwards so a warm
        // browser cache cannot give this audit a different camera position.
        Renderer.setSeed(0,[0.31,0.61,0.83,0.21]);
        const def=EffectRegistry.getCurrent(), defaults=Object.fromEntries(def.params.map(p=>[p.name,p.default]));
        Renderer.getGL().disable(Renderer.getGL().DITHER);
        check('Endless scene contract',FractalFlight.validateEffect(def).ok);
        check('Six starter presets in the actual controls',document.querySelector('#fractalPresetSelect').options.length===7);
        const pal=def.params.find(p=>p.name==='palette');
        check('Seven native palettes plus shared library',pal.paletteNative===7&&pal.options.length>7,{native:pal.paletteNative,total:pal.options.length});
        check('Geometry and choreography excluded from beat parameter links',def.params.filter(p=>['Structure','Dance'].includes(p.group)).every(p=>p.audioLink===false));
        let beat=0.35,energy=0.85;
        const originalUniforms=def.setUniforms;
        const audioUniforms=function(gl,program,params,loc){
            gl.uniform4f(loc(program,'u_audio'),energy,energy*0.65,energy*0.4,energy);
            gl.uniform4f(loc(program,'u_beat'),energy,energy*0.5,energy*0.25,beat);
        };
        def.setUniforms=audioUniforms;
        const copy=document.createElement('canvas'); copy.width=640; copy.height=360;
        const ctx=copy.getContext('2d',{willReadFrequently:true});
        async function frame(values={},time=1.2) {
            if (EffectRegistry.getCurrent().name!=='robot_foundry') throw new Error('Unexpected active effect: '+EffectRegistry.getCurrent().name);
            Controls.setValues(values); Renderer.setTime(time);
            const original=Overlays.render, started=performance.now(); let count=2;
            try {return await new Promise((resolve,reject)=>{
                const timer=setTimeout(()=>reject(new Error('Render timed out')),30000);
                Overlays.render=function(){original.apply(this,arguments);if(--count===0){
                    clearTimeout(timer);const source=Renderer.getCanvas();ctx.clearRect(0,0,640,360);ctx.drawImage(source,0,0,640,360);
                    const bytes=ctx.getImageData(0,0,640,360).data,rgb=[];let sum=0,sq=0,white=0,black=0;
                    for(let i=0;i<bytes.length;i+=4){const l=(bytes[i]+bytes[i+1]+bytes[i+2])/765;sum+=l;sq+=l*l;if(l>.98)white++;if(l<.01)black++;if(i%64===0)rgb.push(bytes[i],bytes[i+1],bytes[i+2]);}
                    const n=bytes.length/4,gl=Renderer.getGL(),error=gl.getError();
                    resolve({mean:sum/n,sd:Math.sqrt(Math.max(0,sq/n-(sum/n)**2)),white:white/n,black:black/n,error,rgb,ms:performance.now()-started});
                }};
                Renderer.clearInputPriority();Renderer.play();
            });}finally{Overlays.render=original;Renderer.pause();}
        }
        const different=(a,b)=>a.rgb.reduce((s,v,i)=>s+Math.abs(v-b.rgb[i]),0)/a.rgb.length/255;
        const visible=(name,s)=>{check(name,s.sd>.035&&s.white<.2&&s.black<.5&&!s.error,{...s,rgb:undefined});samples.push({name,...s,rgb:undefined});};
        const sheet=document.createElement('canvas');sheet.width=1280;sheet.height=4*400;
        const gc=sheet.getContext('2d');gc.fillStyle='#10141c';gc.fillRect(0,0,sheet.width,sheet.height);
        function tile(i,label){const x=i%2*640,y=Math.floor(i/2)*400;gc.fillStyle='#10141c';gc.fillRect(x,y,640,400);gc.drawImage(copy,x,y);gc.fillStyle='#e8ebf3';gc.font='20px sans-serif';gc.fillText(label,x+16,y+386);}
        const initial=await frame(defaults);visible('Default world renders',initial);images.push({name:'default',png:copy.toDataURL()});
        for(let i=0;i<4;i++) {const s=await frame({...defaults,world_style:i,palette:[0,2,5,6][i],choreography:i});visible('World style '+i,s);tile(i,['Iron Foundry','Neon Assembly','Retro Machine City','Cosmic Refinery'][i]);}
        for(let i=0;i<4;i++){beat=0.1+i*0.4;const s=await frame({...defaults,dance_amount:1.5,dance_audio:2,choreography:i});visible('Full-strength dance '+i,s);tile(i+4,['Factory Groove','Robot Pop','Disco Signal','Circuit Wave'][i]);}
        images.push({name:'worlds-and-dances',png:sheet.toDataURL()});
        if(preview) {def.setUniforms=originalUniforms;return {ok:checks.every(c=>c.ok),checks,samples,images};}
        beat=0.35;
        const silent=await frame({...defaults,idle_dance:0,dance_audio:0,audio_react:0});
        const moving=await frame({dance_audio:2});
        check('Music drives robot poses at fixed scene time',different(silent,moving)>.001,{difference:different(silent,moving)});
        beat=1.0;const nextBeat=await frame();
        check('Choreography follows musical beat clock',different(moving,nextBeat)>.001,{difference:different(moving,nextBeat)});
        const repeat=await frame();check('Same time/audio reproduces same frame',different(nextBeat,repeat)<.00001,{difference:different(nextBeat,repeat)});
        const fixedA=await frame({dance_amount:0}),fixedB=await (async()=>{beat=3.7;return frame();})();
        check('Dance Amount zero stops all robot movement',different(fixedA,fixedB)<.00001);
        energy=0;beat=.3;const idleA=await frame({...defaults,idle_dance:0.7,audio_react:0});beat=1.1;const idleB=await frame();
        check('Idle Groove animates with silent beat clock',different(idleA,idleB)>.0001);
        energy=1;
        const casts=[];
        gc.fillStyle='#10141c';gc.fillRect(0,0,sheet.width,sheet.height);
        for(let i=1;i<=6;i++){const s=await frame({...defaults,robot_cast:i,dance_amount:1.5,dance_audio:2});visible('Robot family '+i,s);casts.push(s);tile(i-1,['Boxbot','Cyclops','Strider','Heavy Loader','Astrobot','Four-Arm Conductor'][i-1]);}
        const castDifferences=casts.slice(1).map(s=>different(casts[0],s));
        check('All six robot families differ',castDifferences.every(d=>d>.002),castDifferences);
        images.push({name:'robot-families',png:sheet.toDataURL()});
        const colors=[];
        for(let i=0;i<8;i++){const s=await frame({...defaults,palette:i});visible('Palette '+i,s);colors.push(s);}
        check('All native palettes change the picture',colors.slice(1,7).every(s=>different(colors[0],s)>.015));
        const baseline=await frame(defaults);
        for(const [param,value] of [['world_style',3],['robot_variety',0],['robot_size',1.3],['crowd_spacing',18],['factory_height',28],['choreography',2],['dance_amount',0],['dance_audio',0],['idle_dance',0.8],['ensemble_sync',0],['hue_shift',.4],['color_phase',.25],['saturation',0],['color_spread',1.8]]) {
            const sample=await frame({...defaults,[param]:value});const delta=different(baseline,sample);
            check('Control affects rendered image: '+param,delta>.00005&&!sample.error,{difference:delta});
        }
        gc.fillStyle='#10141c';gc.fillRect(0,0,sheet.width,sheet.height);
        for(const [i,preset] of def.fractalFlight.smokePresets.entries()){const s=await frame({...defaults,...preset.values});visible('Preset '+preset.name,s);tile(i,preset.name);}
        images.push({name:'presets',png:sheet.toDataURL()});
        for(const time of [0,12,60,600,3600]) visible('Endless flight '+time+'s',await frame(defaults,time));
        for(const extreme of [0,1]) {
            const values={...defaults};def.params.filter(p=>['Structure','Dance','Flight'].includes(p.group)&&p.min!==undefined).forEach(p=>values[p.name]=extreme?p.max:p.min);
            values.speed=1;for(let style=0;style<4;style++) visible('Structure/pose limits '+extreme+'/'+style,await frame({...values,world_style:style},32));
        }
        def.setUniforms=originalUniforms;
        return {ok:checks.every(c=>c.ok),checks,samples,images};
    } catch(error) {return {ok:false,error:error.stack,checks,samples,images};}
}

function webgl1Check() {
    const gl=document.createElement('canvas').getContext('webgl');
    if(!gl) return {ok:false,errors:['WebGL 1 unavailable']};
    gl.getExtension('OES_standard_derivatives');
    const def=EffectRegistry.getDefinition('robot_foundry'),errors=[],variants=[];
    const vertex='attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.0,1.0);}';
    const prefix='#extension GL_OES_standard_derivatives : enable\nprecision highp float;\n#define PSY_TEX2D texture2D\nvarying vec2 v_uv;\n';
    for(let mode=0;mode<4;mode++) {
        const source=def.shader.replace(/FRAG_OUT/g,'gl_FragColor').replace('uniform float u_world_style;','const float u_world_style = '+mode+'.0;');
        const shaders=[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,prefix+ShaderManager.COMMON_GLSL+source]].map(([type,src])=>{
            const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);
            if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))errors.push(gl.getShaderInfoLog(shader));return shader;
        });
        const p=gl.createProgram();shaders.forEach(s=>gl.attachShader(p,s));gl.linkProgram(p);
        const linked=gl.getProgramParameter(p,gl.LINK_STATUS);if(!linked)errors.push(gl.getProgramInfoLog(p));variants.push({mode,linked});
        gl.deleteProgram(p);shaders.forEach(s=>gl.deleteShader(s));
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();return {ok:!errors.length,variants,errors};
}

async function cameraCheck() {
    const def=EffectRegistry.getDefinition('robot_foundry'),probes=[];
    const shader=def.shader.slice(0,def.shader.lastIndexOf('void main()'))+`void main(){
        float z=(floor(gl_FragCoord.x)*21.731+floor(gl_FragCoord.y)*3100.0)*ES_SPEED+seedPhase()*4.0;
        float d=esMap(esPath(z)).x;
        FRAG_OUT=vec4(d>0.12?vec3(0,1,0):vec3(1,0,0),1);
    }`;
    EffectRegistry.register({name:'robot_foundry_probe',label:'Robot camera probe',params:def.params.map(p=>({...p,palette:false})),specialize:def.specialize,shader});
    Renderer.setResolution(256,16);EffectRegistry.switchTo('robot_foundry_probe');
    const probe=EffectRegistry.getCurrent();probe.setUniforms=(gl,p,v,loc)=>{gl.uniform4f(loc(p,'u_audio'),1,1,1,1);gl.uniform4f(loc(p,'u_beat'),1,1,1,1.3);};
    for(let style=0;style<4;style++) for(const seed of [.137,.729,17.25]) for(const extreme of [0,1]) {
        const values={};def.params.forEach(p=>{if(p.min!==undefined)values[p.name]=extreme?p.max:p.min;});
        Object.assign(values,{world_style:style,robot_cast:0,sway:1});Controls.setValues(values);Renderer.setSeed(seed,[.31,.61,.83,.21]);
        const original=Overlays.render;let count=2;
        const collisions=await new Promise(resolve=>{Overlays.render=function(){original.apply(this,arguments);if(--count===0){
            const gl=Renderer.getGL(),bytes=new Uint8Array(256*16*4);gl.readPixels(0,0,256,16,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
            let bad=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i]>128||bytes[i+1]<128)bad++;resolve(bad);
        }};Renderer.clearInputPriority();Renderer.play();});
        Overlays.render=original;Renderer.pause();probes.push({style,seed,extreme,collisions});
    }
    EffectRegistry.switchTo('robot_foundry');Renderer.setResolution(640,360);Renderer.setSeed(.137,[.31,.61,.83,.21]);
    return {ok:probes.every(p=>p.collisions===0),positions:probes.length*256*16,probes};
}

async function recordingCheck() {
    await VideoExport.ready();EffectRegistry.switchTo('robot_foundry');Controls.applyPreset(1);
    Renderer.setSeed(0,[.31,.61,.83,.21]);
    Controls.setValues({speed:0,color_drift:0,audio_react:0,idle_dance:0});
    Renderer.setResolution(640,360);Renderer.setAnimSpeed(1);Renderer.setTime(0);Renderer.pause();
    AudioReactor.set('enabled',true);AudioReactor.applyPreset('off');[0,1,2].forEach(i=>AudioReactor.setLink(i,{param:'',source:'bass',amount:0}));
    Music.stop();Music.setBPM(120);AudioAnalysis.setSource('studio');
    const def=EffectRegistry.getCurrent(),prev=def.setUniforms,originalGallery=Gallery.addVideo;
    let blob,summary,error,maxEnergy=0,minBeat=Infinity,maxBeat=-Infinity;const frameEnergy=[];
    def.setUniforms=function(){if(!VideoExport.isFrameExport())return;const energy=Math.max(AudioReactor.getSource('level'),AudioReactor.getSource('kick'));frameEnergy.push(energy);maxEnergy=Math.max(maxEnergy,energy);minBeat=Math.min(minBeat,AudioReactor.getBeatClock());maxBeat=Math.max(maxBeat,AudioReactor.getBeatClock());};
    Gallery.addVideo=function(b){blob=b;return originalGallery.apply(this,arguments);};
    const saved=e=>summary=e.detail,failed=e=>error=e.detail?.message;
    window.addEventListener('psychedelia:recording-saved',saved);window.addEventListener('psychedelia:recording-error',failed);
    const started=performance.now();
    try {
        if(!VideoExport.renderMP4(Renderer.getCanvas(),{lengthMode:'custom',duration:2,fps:60,audio:'studio'}))throw new Error(VideoExport.getLastError());
        for(let i=0;i<1500&&!summary&&!error;i++)await new Promise(r=>setTimeout(r,50));
        if(error||!blob||!summary)throw new Error(error||'Robot music export timed out');
        const b64=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob);});
        return {ok:true,b64,wallSeconds:(performance.now()-started)/1000,maxEnergy,beatRange:[minBeat,maxBeat],frameEnergy,summary};
    } finally {
        def.setUniforms=prev;Gallery.addVideo=originalGallery;window.removeEventListener('psychedelia:recording-saved',saved);window.removeEventListener('psychedelia:recording-error',failed);
    }
}
