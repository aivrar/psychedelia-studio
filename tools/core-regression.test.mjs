import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function source(path) { return readFileSync(new URL('../src/' + path, import.meta.url), 'utf8'); }
function writerContext() {
    return vm.createContext({ Blob, Uint8Array, ArrayBuffer, DataView });
}
function chunk(timestamp, duration) {
    return { timestamp, duration, type: 'key', byteLength: 5, copyTo: dest => dest.set([0, 0, 0, 1, 0x65]) };
}
const config = { decoderConfig: { description: new Uint8Array([1, 100, 0, 42]) } };
async function videoDuration(samples, fps, endTimeUs) {
    const ctx = writerContext();
    vm.runInContext(source('engine/mp4-writer.js'), ctx);
    const writer = ctx.Mp4Writer.create({ width: 640, height: 360, fps });
    samples.forEach(s => writer.addVideo(chunk(...s), config));
    const bytes = Buffer.from(await writer.finish(endTimeUs).arrayBuffer());
    const mdhd = bytes.indexOf('mdhd');
    return bytes.readUInt32BE(mdhd + 20) / bytes.readUInt32BE(mdhd + 16);
}

test('MP4 single frame uses selected rate, including rates other than 30', async () => {
    assert.equal(await videoDuration([[0, 0]], 60), 1 / 60);
    assert.equal(await videoDuration([[0, 0]], 24), 1 / 24);
});
test('MP4 ending after a long gap does not repeat that gap at the end', async () => {
    assert.ok(Math.abs(await videoDuration([[0, 16667], [500000, 16667]], 60) - 31 / 60) < 1 / 90000);
});
test('MP4 reordered output preserves duration of final presented frame', async () => {
    assert.equal(await videoDuration([[0, 16667], [33333, 16667], [16667, 16667]], 60), 0.05);
});
test('live MP4 can hold its last frame until the requested stop time', async () => {
    assert.equal(await videoDuration([[0, 16667], [1950000, 16667]], 60, 2000000), 2);
});
test('MP4 refuses an empty or undecodable file', () => {
    const ctx = writerContext();
    vm.runInContext(source('engine/mp4-writer.js'), ctx);
    const w = ctx.Mp4Writer.create({ width: 640, height: 360, fps: 60 });
    assert.throws(() => w.finish(), /missing H.264/);
    w.addVideo(chunk(0, 16667));
    assert.throws(() => w.finish(), /decoder configuration/);
});

function timelineContext() {
    let id = 0, switches = [];
    const raf = new Map();
    const ctx = vm.createContext({
        performance: { now: () => 0 },
        console: { error() {} },
        requestAnimationFrame: cb => { raf.set(++id, cb); return id; },
        cancelAnimationFrame: key => raf.delete(key),
        EffectRegistry: { switchTo: name => { switches.push(name); return true; }, getCurrent: () => ({ name: 'plasma', params: [] }) },
        document: { getElementById: () => null },
        Controls: { setValues() {}, buildParams() {} },
        Renderer: { setSeed() {} }
    });
    vm.runInContext(source('engine/timeline.js'), ctx);
    return { timeline: ctx.Timeline, raf, switches };
}
test('repeated Play and pause/resume maintain exactly one timeline RAF', () => {
    const { timeline: t, raf } = timelineContext();
    t.createClip('plasma', 0, 5);
    t.play(); t.play(); t.play();
    assert.equal(raf.size, 1);
    t.pause(); assert.equal(raf.size, 0);
    t.play(); assert.equal(raf.size, 1);
    t.stop(); assert.equal(raf.size, 0);
});
test('invalid timeline import is transactional, including null clips and huge durations', () => {
    const { timeline: t } = timelineContext();
    t.createClip('plasma', 0, 5);
    const before = t.toJSON();
    for (const input of ['null', '{"clips":{}}', '{"clips":[null]}', '{"clips":[],"totalDuration":1e300}']) {
        assert.equal(t.fromJSON(input), false);
        assert.equal(t.toJSON(), before);
    }
});
test('import resets active identity and normalizes IDs and numeric times', () => {
    const { timeline: t, switches, raf } = timelineContext();
    t.createClip('plasma', 0, 5); t.play();
    assert.equal(t.fromJSON(JSON.stringify({clips: [
        { id: 1, effectName: 'tunnel', start: '0', duration: '5' },
        { id: 1, effectName: 'plasma', start: '5', duration: 5 }
    ], totalDuration: 30})), true);
    assert.equal(raf.size, 0);
    assert.notEqual(t.getClips()[0].id, t.getClips()[1].id);
    assert.equal(typeof t.getClips()[0].duration, 'number');
    t.seek(0); assert.equal(switches.at(-1), 'tunnel');
});

function exportContext({ offlineAudio, analysis } = {}) {
    let now = 0;
    const events = [], encoders = [], timers = new Map();
    let timerId = 0, restored = 0;
    class Encoder {
        static async isConfigSupported() { return { supported: true }; }
        constructor(callbacks) { this.callbacks = callbacks; this.state = 'unconfigured'; this.encodeQueueSize = 0; this.frames = []; encoders.push(this); }
        configure() { this.state = 'configured'; }
        encode(frame) { this.frames.push({ ...frame }); this.callbacks.output(chunk(frame.timestamp, frame.duration), config); }
        flush() { return Promise.resolve(); }
        close() { this.state = 'closed'; }
    }
    class SoundEncoder extends Encoder {
        encode(data) {
            this.frames.push({timestamp:data.timestamp,numberOfFrames:data.numberOfFrames});
            this.callbacks.output(chunk(data.timestamp, Math.round(data.numberOfFrames / 48000 * 1e6)), {decoderConfig:{codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,description:new Uint8Array([0x11,0x90])}});
        }
    }
    const canvas = { width: 640, height: 360, captureStream() {}, getContext: () => ({ drawImage() {}, save() {}, restore() {} }) };
    const ctx = vm.createContext({
        ...{ Blob, Uint8Array, ArrayBuffer, DataView, URL },
        performance: { now: () => now },
        window: { addEventListener() {}, dispatchEvent: e => events.push(e) },
        document: { getElementById: () => null, createElement: () => canvas, querySelectorAll: () => [] },
        HTMLCanvasElement: function() {},
        VideoEncoder: Encoder,
        VideoFrame: class { constructor(src, opts) { Object.assign(this, opts); } close() {} },
        CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts.detail; } },
        setTimeout: cb => { timers.set(++timerId, cb); return timerId; }, clearTimeout: id => timers.delete(id),
        setInterval: () => ++timerId, clearInterval() {},
        console,
        ...(offlineAudio ? {
            AudioEncoder: SoundEncoder, AudioData: class { constructor(opts) { Object.assign(this,opts); } close() {} },
            AudioWorkletNode: function() {}, OfflineAudio: {prepare:offlineAudio}, AudioAnalysis:{getSource:()=> 'file',getFile:()=>({})}
        } : {}),
        ...(analysis ? {AudioAnalysis:analysis} : {}),
        Renderer: { beginFrameExport() {}, endFrameExport() { restored++; } },
        Overlays: { getEnabled: () => ({}) }
    });
    vm.runInContext(source('engine/mp4-writer.js'), ctx);
    vm.runInContext(source('engine/export.js'), ctx);
    return { api: ctx.VideoExport, canvas, events, encoders, timers, setNow: n => { now = n; }, restored: () => restored };
}
test('smooth export uses consecutive timestamps through stalls and encoder backpressure', async () => {
    const c = exportContext(); const v = c.api;
    await v.ready(); v.setOptions({ mode: 'smooth', audio: 'none' });
    let saved;
    assert.equal(v.timedRecording(c.canvas, 1, 60, b => { saved = b; }), true);
    assert.equal(c.timers.size, 0, 'smooth export must have no wall-clock stop deadline');
    const enc = c.encoders[0];
    enc.encodeQueueSize = 100; c.setNow(5000);
    assert.equal(v.canCaptureFrame(), false); v.captureFrame(); assert.equal(enc.frames.length, 0);
    enc.encodeQueueSize = 0;
    for (let i = 0; i < 60; i++) { c.setNow(i * 100 + 6000); v.captureFrame(); }
    await new Promise(r => setImmediate(r));
    assert.equal(enc.frames.length, 60);
    assert.equal(enc.frames.at(-1).timestamp, Math.round(59e6 / 60));
    assert.ok(saved && saved.size > 0);
    assert.equal(v.isSaving(), false); assert.equal(c.restored(), 1);
});
test('encoder failure cleans up, reports an error and permits another recording', async () => {
    const c = exportContext(); const v = c.api;
    await v.ready(); v.setOptions({mode: 'smooth', audio: 'none'});
    v.timedRecording(c.canvas, 1, 60, () => assert.fail('Failed recording must not be saved'));
    c.encoders[0].callbacks.error(new Error('test encoder failure'));
    assert.equal(v.isRecording(), false); assert.equal(v.isSaving(), false);
    assert.equal(c.encoders[0].state, 'closed'); assert.equal(c.restored(), 1);
    assert.equal(c.events.at(-1).type, 'psychedelia:recording-error');
    assert.equal(v.timedRecording(c.canvas, 1, 60, () => {}), true);
    v.failRecording('test cleanup');
});
test('manual stop retains timed callback and a second start cannot alter the session', async () => {
    const c = exportContext(); const v = c.api;
    await v.ready(); v.setOptions({mode: 'smooth', audio: 'none'});
    let saves = 0;
    v.timedRecording(c.canvas, 1, 60, () => saves++);
    assert.equal(v.timedRecording(c.canvas, 10, 24), false);
    v.setOptions({mode: 'live', quality: 'draft'});
    assert.equal(v.getOptions().mode, 'smooth');
    v.captureFrame(); v.stopRecording();
    await new Promise(r => setImmediate(r));
    assert.equal(saves, 1);
    assert.equal(v.isSaving(), false);
});

test('sub-frame duration completes with a single frame instead of exporting forever', async () => {
    const c = exportContext(); const v = c.api;
    await v.ready(); v.setOptions({mode: 'smooth', audio: 'none'});
    let saved = 0;
    assert.equal(v.timedRecording(c.canvas, 0.001, 60, () => saved++), true);
    v.captureFrame();
    await new Promise(r => setImmediate(r));
    assert.equal(saved, 1);
    assert.equal(v.isRecording(), false);
});
test('encoder flush failure never reports a successful save or leaves controls locked', async () => {
    const c = exportContext(); const v = c.api;
    await v.ready(); v.setOptions({mode: 'smooth', audio: 'none'});
    v.timedRecording(c.canvas, 1, 60, () => assert.fail('flush failure must not save'));
    c.encoders[0].flush = () => Promise.reject(new Error('test flush failure'));
    v.captureFrame(); v.stopRecording();
    await new Promise(r => setImmediate(r));
    assert.equal(v.isSaving(), false); assert.equal(v.isRecording(), false);
    assert.equal(c.encoders[0].state, 'closed');
    assert.equal(c.events.at(-1).type, 'psychedelia:recording-error');
    assert.equal(c.events.some(e => e.type === 'psychedelia:recording-saved'), false);
});

function offlineData(onRestore = () => {}) {
    const pcm = new Float32Array(48000).fill(0.1);
    return {buffer:{sampleRate:48000,numberOfChannels:2,length:pcm.length,getChannelData:()=>pcm},restore:onRestore};
}
test('smooth sound follows frame count and applies audio encoder backpressure', async () => {
    let restored = 0, saved;
    const c=exportContext({offlineAudio:()=>Promise.resolve(offlineData(()=>restored++))}),v=c.api;
    await v.ready();v.setOptions({mode:'smooth',audio:'all'});
    assert.equal(v.timedRecording(c.canvas,1,60,b=>{saved=b;}),true);
    assert.equal(v.canCaptureFrame(),false,'preparation must block frames');
    await new Promise(r=>setImmediate(r));
    v.captureFrame(); const sound=c.encoders[1];
    sound.encodeQueueSize=100;assert.equal(v.canCaptureFrame(),false);
    sound.encodeQueueSize=0;
    for(let i=1;i<60;i++){c.setNow(i*100);v.captureFrame();}
    await new Promise(r=>setImmediate(r));
    assert.ok(saved?.size>0);assert.equal(restored,1);
    assert.equal(sound.frames.reduce((n,f)=>n+f.numberOfFrames,0),48000);
    assert.equal(c.events.at(-1).detail.audio,true);
});
test('canceling soundtrack preparation cleans up its late result before another export', async () => {
    let resolvePreparation, restored=0;
    const c=exportContext({offlineAudio:()=>new Promise(r=>{resolvePreparation=r;})}),v=c.api;
    await v.ready();v.setOptions({mode:'smooth',audio:'all'});v.timedRecording(c.canvas,1,60,()=>assert.fail('canceled export must not save'));
    await new Promise(r=>setImmediate(r));v.stopRecording();
    assert.equal(v.isRecording(),false);assert.equal(v.isSaving(),true);
    assert.equal(v.timedRecording(c.canvas,1,60,()=>{}),false);
    resolvePreparation(offlineData(()=>restored++));await new Promise(r=>setImmediate(r));
    assert.equal(restored,1);assert.equal(v.isSaving(),false);assert.equal(c.restored(),1);
});
test('failed soundtrack preparation restores controls and permits a video-only retry', async () => {
    const c=exportContext({offlineAudio:()=>Promise.reject(new Error('decode fixture failed'))}),v=c.api;
    await v.ready();v.setOptions({mode:'smooth',audio:'all'});v.timedRecording(c.canvas,1,60,()=>assert.fail('failed preparation must not save'));
    await new Promise(r=>setImmediate(r));
    assert.equal(v.isRecording(),false);assert.equal(v.isSaving(),false);assert.match(v.getLastError(),/decode fixture failed/);
    v.setOptions({mode:'smooth',audio:'none'});assert.equal(v.timedRecording(c.canvas,1/60,60,()=>{}),true);v.captureFrame();
    await new Promise(r=>setImmediate(r));assert.equal(v.isSaving(),false);
});
test('early stopping trims the offline soundtrack to the rendered video length', async () => {
    const c=exportContext({offlineAudio:()=>Promise.resolve(offlineData())}),v=c.api;
    await v.ready();v.setOptions({mode:'smooth',audio:'all'});v.timedRecording(c.canvas,1,60,()=>{});
    await new Promise(r=>setImmediate(r));for(let i=0;i<5;i++)v.captureFrame();v.stopRecording();
    await new Promise(r=>setImmediate(r));
    assert.equal(c.encoders[1].frames.reduce((n,f)=>n+f.numberOfFrames,0),4000);
    assert.equal(c.events.at(-1).detail.frames,5);assert.equal(c.events.at(-1).detail.audio,true);
});

test('direct render length matching uses the full track or only the remaining audio', () => {
    const file={hasFile:true,duration:13.25,currentTime:4.5,state:'ready',loop:true};
    const c=exportContext({analysis:{getSource:()=> 'capture',getFileStatus:()=>file,getFile:()=>({})}}),v=c.api;
    const full=v.getRenderPlan({lengthMode:'audio',fps:60});
    assert.equal(full.valid,true);assert.equal(full.duration,13.25);
    assert.equal(full.audioSettings.source,'file');assert.equal(full.audioSettings.offset,0);assert.equal(full.audioSettings.loop,false);
    const rest=v.getRenderPlan({lengthMode:'remaining',fps:60});assert.equal(rest.duration,8.75);assert.equal(rest.audioSettings.offset,4.5);
    file.currentTime=13.25;assert.match(v.getRenderPlan({lengthMode:'remaining'}).error,/at its end/);
    file.hasFile=false;assert.match(v.getRenderPlan({lengthMode:'audio'}).error,/Choose an audio file/);
});

test('direct render validates duration and sound limits before changing live preferences', async () => {
    const c=exportContext(),v=c.api;await v.ready();v.setOptions({format:'webm',mode:'live',audio:'none',detail:'adaptive'});
    const before=JSON.stringify(v.getOptions());
    for(const duration of [NaN,Infinity,-1,0,3601]) assert.equal(v.renderMP4(c.canvas,{duration,audio:'none'}),false);
    assert.match(v.getRenderPlan({duration:601,audio:'all'}).error,/10 minutes/);
    assert.equal(v.getRenderPlan({duration:601,audio:'none'}).valid,true);
    assert.equal(JSON.stringify(v.getOptions()),before);assert.equal(v.getStatus().directRender,false);
});

test('direct MP4 renders fixed frames and restores the previous recording configuration', async () => {
    const c=exportContext(),v=c.api;await v.ready();v.setOptions({format:'webm',mode:'live',audio:'none',detail:'adaptive',quality:'standard'});
    const before=JSON.stringify(v.getOptions());let saved;
    assert.equal(v.renderMP4(c.canvas,{duration:0.5,fps:60,audio:'none',quality:'high'},b=>saved=b),true);
    assert.equal(v.getStatus().directRender,true);assert.equal(v.getOptions().mode,'smooth');assert.equal(v.getOptions().format,'mp4');assert.equal(v.getOptions().detail,'full');
    for(let i=0;i<15;i++){c.setNow(i*3);v.captureFrame();}
    assert.equal(v.getStatus().progress,0.5);assert.equal(v.getStatus().totalFrames,30);
    for(let i=15;i<30;i++){c.setNow(i*3);v.captureFrame();}
    await new Promise(r=>setImmediate(r));
    assert.ok(saved?.size);assert.equal(JSON.stringify(v.getOptions()),before);assert.equal(v.getStatus().directRender,false);
    assert.equal(c.events.at(-1).detail.frames,30);
});

test('direct full-track render passes a file override without changing the selected source', async () => {
    let received;
    const analysis={getSource:()=> 'capture',getFile:()=>({}),getFileStatus:()=>({hasFile:true,duration:1,currentTime:0.4,state:'ready'})};
    const c=exportContext({analysis,offlineAudio:(duration,settings)=>{received={duration,settings};return Promise.resolve(offlineData());}}),v=c.api;
    await v.ready();v.setOptions({mode:'live',audio:'all'});
    assert.equal(v.renderMP4(c.canvas,{lengthMode:'audio',fps:60,audio:'all'},()=>{}),true);
    await new Promise(r=>setImmediate(r));
    assert.equal(received.duration,1);assert.equal(received.settings.source,'file');assert.equal(received.settings.offset,0);assert.equal(received.settings.loop,false);
    assert.equal(analysis.getSource(),'capture');v.cancelRender();
    assert.equal(v.getOptions().mode,'live');assert.equal(c.events.at(-1).type,'psychedelia:render-canceled');
});

test('canceling a direct render discards video and restores controls and preferences', async () => {
    const c=exportContext(),v=c.api;await v.ready();v.setOptions({mode:'live',format:'webm'});
    const before=JSON.stringify(v.getOptions());
    v.renderMP4(c.canvas,{duration:3,fps:60,audio:'none'},()=>assert.fail('Canceled rendering must not save'));
    v.captureFrame();assert.equal(v.cancelRender(),true);await new Promise(r=>setImmediate(r));
    assert.equal(c.events.at(-1).type,'psychedelia:render-canceled');assert.equal(v.isRecording(),false);assert.equal(v.isSaving(),false);
    assert.equal(JSON.stringify(v.getOptions()),before);assert.equal(v.getStatus().directRender,false);
});

test('direct render cancellation waits for preparation cleanup before accepting another job', async () => {
    let ready,restored=0;
    const c=exportContext({offlineAudio:()=>new Promise(r=>ready=r)}),v=c.api;await v.ready();v.setOptions({mode:'live',format:'webm'});
    const before=JSON.stringify(v.getOptions());
    v.renderMP4(c.canvas,{duration:1,audio:'all'},()=>assert.fail('Canceled preparation must not save'));
    await new Promise(r=>setImmediate(r));v.cancelRender();
    assert.equal(v.getStatus().canceling,true);assert.equal(v.isSaving(),true);
    assert.equal(v.renderMP4(c.canvas,{duration:1,audio:'none'}),false);
    ready(offlineData(()=>restored++));await new Promise(r=>setImmediate(r));
    assert.equal(restored,1);assert.equal(v.getStatus().directRender,false);assert.equal(JSON.stringify(v.getOptions()),before);
});
