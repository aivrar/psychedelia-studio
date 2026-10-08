import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/engine/audio-reactor.js', import.meta.url), 'utf8');
const signalSource = readFileSync(new URL('../src/engine/audio-signal.js', import.meta.url), 'utf8');
function harness({ byteData = false, sampleRate = 48000, fftSize = 1024, sourceId = 'file' } = {}) {
    const analysis = {
        available: true, active: true, source: sourceId, byteData, sampleRate, fftSize, signalVersion: 0,
        waveform: byteData ? new Uint8Array(512).fill(128) : new Float32Array(512).fill(0.5),
        fft: byteData ? new Uint8Array(fftSize / 2) : new Float32Array(fftSize / 2)
    };
    let now = 0;
    const events = [];
    const music = {
        isPlaying: () => sourceId === 'studio', getBPM: () => 120,
        getBeatInfo: () => ({ bpm: 120, phase: (now * 2) % 1, beats: now * 2 }),
        pollEvents: fn => { const n = events.length; events.splice(0).forEach(fn); return n; }
    };
    const effect = { name: 'plasma', shader: 'float t = u_time * u_speed;' };
    const ctx = vm.createContext({
        AudioAnalysis: { getAnalysis: () => analysis }, Music: music,
        EffectRegistry: { getCurrent: () => effect },
        Controls: { getParamDefs: () => [{ name: 'speed', min: 0, max: 10, type: 'float' }, { name: 'scale', min: 0, max: 10, type: 'float' }] },
        Math: Object.assign(Object.create(Math), { random: () => 0.9 })
    });
    vm.runInContext(signalSource, ctx);
    vm.runInContext(source, ctx);
    const r = ctx.AudioReactor;
    function tick(dt = 1 / 60) { now += dt; r.update(now, dt); return r.getState(); }
    function warm(seconds = 0.6, fps = 60) { for (let i = 0; i < seconds * fps; i++) tick(1 / fps); }
    function signal(amplitude = 0.25) {
        for (let i = 0; i < analysis.waveform.length; i++) {
            const value = 0.5 + (i % 2 ? 1 : -1) * amplitude;
            analysis.waveform[i] = byteData ? Math.round(value * 256) : value;
        }
    }
    function tone(hz, level = 0.8, width = 1) {
        analysis.fft.fill(0);
        const bin = Math.round(hz * fftSize / sampleRate);
        for (let i = Math.max(1, bin - width); i <= Math.min(analysis.fft.length - 1, bin + width); i++) {
            analysis.fft[i] = byteData ? Math.round(level * 255) : level;
        }
        signal();
    }
    return { r, analysis, events, music, effect, tick, warm, signal, tone };
}

test('suggested beat links use safe parameters, stay silent without audio and preserve base values', () => {
    const h = harness({ sourceId: 'studio' });
    h.effect.params = [
        { name: 'brightness', min: 0, max: 3, default: 1 },
        { name: 'saturation', min: 0, max: 2, default: 1 },
        { name: 'speed', min: 0, max: 10, default: 1 },
        { name: 'power', min: 1, max: 10, default: 8 }
    ];
    h.r.suggestLinks();
    const base = { brightness: 1, saturation: 1, speed: 1, power: 8 };
    assert.deepEqual(JSON.parse(JSON.stringify(h.r.modulate(base, h.effect.params))), base);
    h.signal(); h.warm(); h.events.push({ type: 'kick', value: 1 }); h.tick();
    const output = h.r.modulate(base, h.effect.params);
    assert.ok(output.brightness > 1 && output.brightness <= 1.25);
    assert.equal(output.speed, 1); assert.equal(output.power, 8); assert.equal(base.brightness, 1);
    assert.ok(h.r.getLinks().filter(l => l.param).every(l => Math.abs(l.amount) <= 0.08));
});

test('suggestions exclude compile-time constants and progressive accumulation effects', () => {
    const h = harness();
    h.effect.params = [{ name: 'glow', min: 0, max: 2, default: 1 }, { name: 'brightness', min: 0, max: 2, default: 1, audioLink: false }];
    h.effect.specialize = ['glow']; h.r.suggestLinks();
    assert.ok(h.r.getLinks().every(l => !l.param));
    h.effect.specialize = []; h.effect.name = 'attractor_density_lab'; h.r.suggestLinks();
    assert.ok(h.r.getLinks().every(l => !l.param));
});

test('byte-domain digital silence gives zero loudness and no hits', () => {
    const h = harness({ byteData: true }); h.warm(12);
    assert.ok(h.r.getState().level < 0.00001, JSON.stringify(h.r.getState()));
    for (const name of ['kick', 'snare', 'hat']) assert.equal(h.r.getTrigger(name).count, 0);
});

test('highs include frequencies above 12 kHz and use sample-rate/FFT metadata', () => {
    for (const sampleRate of [44100, 48000, 96000]) {
        for (const fftSize of [1024, 2048]) {
            const h = harness({ sampleRate, fftSize }); h.tone(14000, 1, 6); h.warm();
            assert.ok(h.r.getState().high > 0.03, `${sampleRate}/${fftSize}: ${h.r.getState().high}`);
            assert.ok(h.r.getState().bass < 0.001);
        }
    }
});

test('Studio beat pulse works with no kick and quiet events stay quiet', () => {
    const h = harness({ sourceId: 'studio' }); h.signal(); h.warm();
    h.events.push({ type: 'beat', value: 0.7 }); h.tick();
    assert.ok(h.r.getSource('beat') > 0.45);
    assert.equal(h.r.getSource('kick'), 0);
    assert.equal(h.r.getTrigger('beat').count, 1);
    h.events.push({ type: 'kick', value: 0 }); h.tick();
    assert.equal(h.r.getTrigger('kick').count, 0);
    h.events.push({ type: 'kick', value: 0.04 }); h.tick();
    const quiet = h.r.getSource('kick'); h.warm(0.8);
    h.events.push({ type: 'kick', value: 1 }); h.tick();
    assert.ok(quiet > 0 && quiet < h.r.getSource('kick') * 0.4, `quiet=${quiet}`);
});

test('Studio clock stays synced when the sequencer has no recent events', () => {
    const h = harness({ sourceId: 'studio' }); h.signal(); h.warm(3);
    assert.equal(h.r.getState().studioSync, true);
    assert.ok(Math.abs(h.r.getBeatClock() - h.r.getState().beats) < 0.000001);
});

test('reset clears signal, tempo, trigger ages and cached modulation without erasing settings', () => {
    const h = harness({ sourceId: 'studio' }); h.tone(70); h.events.push({ type: 'kick', value: 1 }); h.warm();
    h.r.set('zoom', 0.62); h.r.setLink(0, { param: 'scale', source: 'bass', amount: 0.2 });
    h.r.modulate({ scale: 1 }, [{ name: 'scale', min: 0, max: 10 }]);
    const count = h.r.getTrigger('kick').count;
    h.r.resetSignal();
    assert.equal(h.r.getState().bpm, 0);
    assert.equal(h.r.getState().bass, 0);
    assert.equal(h.r.getState().active, false);
    assert.ok(h.r.getTrigger('kick').age >= 99);
    assert.equal(h.r.getTrigger('kick').count, count, 'consumer trigger counters must stay monotonic');
    assert.equal(h.r.getSettings().zoom, 0.62);
    assert.equal(h.r.getLinks()[0].param, 'scale');
});

test('source and file revision changes cannot inherit previous tempo or fake onsets', () => {
    const h = harness({ sourceId: 'studio' }); h.signal(); h.events.push({ type: 'kick', value: 1 }); h.warm();
    h.analysis.source = 'file'; h.tone(70); h.tick();
    assert.equal(h.r.getState().bpm, 0);
    assert.ok(h.r.getTrigger('kick').age >= 99);
    h.warm(); h.analysis.signalVersion++; h.tick();
    assert.ok(h.r.getTrigger('kick').age >= 99);
});

function pulseTrain(fps, sensitivity = 1, strength = 0.65, bpm = 120) {
    const h = harness(); h.r.set('sensitivity', sensitivity);
    const beats = [], clocks = [];
    let lastCount = 0;
    for (let f = 0; f < fps * 12; f++) {
        const t = (f + 1) / fps;
        const phase = (t - 0.5 + 0.000001) % (60 / bpm);
        const amp = t >= 0.5 && phase >= 0 && phase < 0.16 ? strength * Math.min(1, phase / 0.04) * Math.exp(-Math.max(0, phase - 0.04) / 0.07) : 0;
        h.analysis.fft.fill(0); h.analysis.fft[1] = amp; h.analysis.fft[2] = amp; h.analysis.fft[3] = amp;
        h.signal(amp * 0.2); h.tick(1 / fps);
        if (h.r.getTrigger('kick').count > lastCount) beats.push(t);
        lastCount = h.r.getTrigger('kick').count;
        if (h.r.getState().bpm > 0) clocks.push(h.r.getState().beats);
    }
    return { h, beats, clocks };
}

test('kick detection and 120 BPM tempo agree at 30, 60 and 120 FPS', () => {
    const runs = [30, 60, 120].map(fps => pulseTrain(fps));
    for (const { h, beats } of runs) {
        assert.ok(beats.length >= 22 && beats.length <= 24, `hits=${beats.length}`);
        assert.ok(Math.abs(h.r.getState().bpm - 120) < 2, `bpm=${h.r.getState().bpm}`);
    }
    assert.ok(Math.max(...runs.map(r => r.beats.length)) - Math.min(...runs.map(r => r.beats.length)) <= 1);
});

test('estimated beat clock is monotonic and produces beat and bar triggers', () => {
    const { h, clocks } = pulseTrain(60);
    assert.ok(clocks.every((n, i) => !i || n >= clocks[i - 1]), 'beat clock must not jump backwards on kicks');
    assert.ok(h.r.getTrigger('beat').count >= 15, `beat count=${h.r.getTrigger('beat').count}`);
    assert.ok(h.r.getTrigger('bar').count >= 3);
    assert.ok(Math.abs(h.r.getBeatClock() - h.r.getState().beats) < 0.000001);
});

test('sensitivity helps weak onsets and preserves continuous band variation', () => {
    const low = pulseTrain(60, 0.25, 0.016), high = pulseTrain(60, 3, 0.016);
    assert.ok(high.beats.length > low.beats.length, `${high.beats.length} vs ${low.beats.length}`);
    const h = harness(); h.r.set('sensitivity', 3); h.tone(70, 0.8); h.warm();
    const loud = h.r.getState().bass; h.tone(70, 0.3); h.warm();
    assert.ok(h.r.getState().bass < loud * 0.9, `soft=${h.r.getState().bass}, loud=${loud}`);
});

test('silent or malformed input cannot poison levels, outputs, or hit detection', () => {
    const h = harness(); h.analysis.waveform.fill(NaN); h.analysis.fft.fill(Infinity); h.warm();
    assert.ok(h.r.getState().level < 0.00001);
    h.analysis.waveform.fill(0.5); h.analysis.fft.fill(0); h.warm();
    h.tone(70); h.warm();
    for (const value of Object.values(h.r.getOutputs())) assert.ok(Number.isFinite(value));
    assert.ok(h.r.getState().bass > 0.1, 'valid signal recovers');
});

test('logarithmic FFT values are converted to amplitude before driving bands and onsets', () => {
    const h = harness(); h.analysis.fftScale = 'normalized-db'; h.signal(); h.warm();
    h.tone(70, 0.2); h.warm(0.4);
    assert.ok(h.r.getState().bass < 0.02, `faint partial=${h.r.getState().bass}`);
    assert.equal(h.r.getTrigger('kick').count, 0);
    h.tone(70, 0.8); h.tick();
    assert.equal(h.r.getTrigger('kick').count, 1);
    h.warm(0.3); assert.ok(h.r.getState().bass > 0.5);
});

test('changing a parameter link invalidates the cached result immediately', () => {
    const h = harness(); h.tone(70); h.warm();
    const values = { scale: 5 }, defs = [{ name: 'scale', min: 0, max: 10 }];
    h.r.setLink(0, { param: 'scale', source: 'bass', amount: 0.25 });
    assert.ok(h.r.modulate(values, defs).scale > 5);
    h.r.setLink(0, { amount: -0.25 });
    assert.ok(h.r.modulate(values, defs).scale < 5);
    h.r.setLink(0, { amount: 0 });
    assert.equal(h.r.modulate(values, defs).scale, 5);
});

test('shader clock multipliers cannot introduce scene jumps through parameter links', () => {
    const h = harness(); h.tone(70); h.warm();
    assert.ok(!h.r.getLinkableParams().some(p => p.name === 'speed'));
    assert.ok(h.r.getLinkableParams().some(p => p.name === 'scale'));
    h.r.setLink(0, { param: 'speed', source: 'bass', amount: 1 });
    assert.equal(h.r.modulate({ speed: 1 }, [{ name: 'speed', min: 0, max: 10 }]).speed, 1);
});

test('global on/off leaves personal links working and every zero reaction is neutral', () => {
    const h = harness({ sourceId: 'studio' }); h.tone(70); h.warm();
    h.r.set('enabled', false); h.warm(4);
    assert.ok(h.r.getSource('bass') > 0.2);
    assert.equal(h.r.getOutputs().zoom, 1);
    assert.ok(Math.abs(h.r.getSpeed() - 1) < 0.0001);
    h.r.set('enabled', true); h.r.applyPreset('off'); h.warm();
    h.events.push({ type: 'kick', value: 1 }, { type: 'snare', value: 1 }, { type: 'drop', value: 1 }); h.tick();
    const out = h.r.getOutputs();
    for (const [key, value] of Object.entries(out)) assert.ok(value === (key === 'zoom' || key === 'speed' ? 1 : 0), key);
});

test('settings and modulation reject non-finite input and keep values in their ranges', () => {
    const h = harness(); h.tone(70); h.warm();
    const before = h.r.getSettings().zoom; h.r.set('zoom', NaN); h.r.set('zoom', Infinity);
    assert.equal(h.r.getSettings().zoom, before);
    h.r.set('sensitivity', 0); assert.equal(h.r.getSettings().sensitivity, 0.25);
    assert.equal(h.r.applyMod(0.5, { min: 0, max: 1 }, { src: 'bass', amt: Infinity }), 0.5);
    assert.equal(h.r.applyMod(0.5, { min: 0, max: 1 }, { src: 'unknown', amt: 1 }), 0.5);
    assert.equal(h.r.applyMod(0.5, { min: 0, max: 1 }, { src: '__proto__', amt: 1 }), 0.5);
    assert.equal(h.r.getSource('toString'), 0);
    assert.equal(h.r.applyPreset('__proto__'), false);
    assert.equal(h.r.applyMod(0.5, { min: 0, max: 1 }, { src: 'bass', amt: -1 }), 0);
});

test('kick, snare and hats remain distinct at 30, 60 and 120 FPS', () => {
    for (const kind of ['kick', 'snare', 'hat']) {
        for (const fps of [30, 60, 120]) {
            const h = harness(), bounds = kind === 'kick' ? [1, 3] : kind === 'snare' ? [12, 55] : [150, 400];
            const period = kind === 'hat' ? 0.25 : 0.5;
            for (let f = 0; f < fps * 5; f++) {
                const t = (f + 1) / fps, phase = (t - 0.5 + 0.000001) % period;
                const amp = t >= 0.5 && phase >= 0 ? 0.75 * Math.min(1, phase / 0.025) * Math.exp(-Math.max(0, phase - 0.025) / 0.04) : 0;
                h.analysis.fft.fill(0); h.analysis.fft.fill(amp, bounds[0], bounds[1] + 1); h.signal(amp * 0.2); h.tick(1 / fps);
            }
            const expected = kind === 'hat' ? 18 : 9;
            assert.ok(Math.abs(h.r.getTrigger(kind).count - expected) <= 1, `${kind}/${fps}: ${h.r.getTrigger(kind).count}`);
            for (const other of ['kick', 'snare', 'hat'].filter(k => k !== kind)) assert.equal(h.r.getTrigger(other).count, 0, `${kind} must not trigger ${other}`);
        }
    }
});

test('beat clock and envelopes stay synchronized across a clamped rendering stall', () => {
    const { h } = pulseTrain(60);
    const before = h.r.getBeatClock(); h.analysis.fft.fill(0); h.signal(0); h.tick(0.75);
    assert.ok(h.r.getBeatClock() - before > 1.2, 'clock follows elapsed time, not clamped animation dt');
    assert.ok(h.r.getSource('kick') < 0.01);
    assert.ok(h.r.getSource('bass') < 0.05, 'band release follows elapsed time');
});

test('slow and fast music is not forced to double or half tempo', () => {
    for (const bpm of [60, 90, 128, 160, 180, 200]) {
        const { h } = pulseTrain(60, 1, 0.65, bpm);
        assert.ok(Math.abs(h.r.getState().bpm - bpm) < 3, `${bpm} BPM became ${h.r.getState().bpm}`);
    }
});

test('delayed Studio hits have correct envelope strength and trigger age', () => {
    const h = harness({ sourceId: 'studio' }); h.signal(); h.warm();
    h.events.push({ type: 'kick', value: 1, age: 0.14 }); h.tick();
    assert.ok(Math.abs(h.r.getState().kick - Math.exp(-1)) < 0.00001);
    assert.ok(Math.abs(h.r.getTrigger('kick').age - 0.14) < 0.00001);
});

test('unsupported triggers fall back to timers while sources and tempo waves stay live', () => {
    const h = harness(); h.tone(70); h.warm();
    assert.equal(h.r.isLive(), true);
    assert.equal(h.r.getTrigger('bar').live, false, 'no estimated tempo yet');
    assert.equal(h.r.getTrigger('drop').live, false, 'no section events for external audio');
    assert.ok(h.r.getSource('lfo_bar') > 0);
    const { h: locked } = pulseTrain(60); assert.equal(locked.r.getTrigger('bar').live, true);
});

test('effect links are isolated and survive effect switches and configuration restore', () => {
    const h = harness();
    h.r.setLink(0, { param: 'scale', source: 'kick', amount: -0.35 });
    h.effect.name = 'other';
    assert.equal(h.r.getLinks()[0].param, '');
    h.r.setLink(0, { param: 'scale', source: 'bass', amount: 0.6 });
    h.effect.name = 'plasma';
    assert.equal(h.r.getLinks()[0].amount, -0.35);
    const config = JSON.parse(JSON.stringify(h.r.getConfiguration()));
    h.r.resetAll(); h.r.setConfiguration(config);
    assert.equal(h.r.getLinks()[0].source, 'kick');
    h.effect.name = 'other';
    assert.equal(h.r.getLinks()[0].amount, 0.6);
    h.r.resetAll(); h.effect.name = 'plasma';
    assert.equal(h.r.getLinks()[0].amount, -0.35, 'reset affects only the current effect links');
});

test('BPM lock works through quiet external audio and never overrides Studio tempo', () => {
    const h = harness(); h.r.set('manualBpm', 93); h.r.set('tempoMode', 'manual'); h.warm(8);
    assert.equal(h.r.getState().bpm, 93);
    assert.equal(h.r.getState().tempoConfidence, 1);
    assert.ok(h.r.getTrigger('bar').count >= 3);
    h.r.set('tempoMode', 'auto'); h.tick();
    assert.equal(h.r.getState().bpm, 0);
    assert.equal(h.r.getTrigger('bar').live, false);
    const studio = harness({ sourceId: 'studio' }); studio.r.set('manualBpm', 93); studio.r.set('tempoMode', 'manual'); studio.warm();
    assert.equal(studio.r.getState().bpm, 120);
});

test('band attack and release controls change response without changing detection time', () => {
    function response(attack, release) {
        const h = harness(); h.r.set('attack', attack); h.r.set('release', release); h.warm(); h.tone(70, 0.8); h.warm(0.1);
        const rise = h.r.getState().level; h.analysis.fft.fill(0); h.signal(0); h.warm(0.2);
        return { rise, fall: h.r.getState().level };
    }
    const fast = response(0.005, 0.04), slow = response(0.25, 1.5);
    assert.ok(fast.rise > slow.rise + 0.4);
    assert.ok(slow.fall > fast.fall + 0.15);
});

test('hit decay and motion smoothing provide meaningful short and long responses', () => {
    function response(decay, smoothing) {
        const h = harness({sourceId:'studio'}); h.r.set('hitDecay', decay); h.r.set('smoothing', smoothing); h.tone(70); h.warm();
        h.events.push({type:'kick',value:1}); h.tick(); const speed = h.r.getSpeed(); h.warm(0.2);
        return {speed, kick:h.r.getState().kick};
    }
    const short=response(0.25,0.01),long=response(4,0.5);
    assert.ok(long.kick > short.kick + 0.5);
    assert.ok(short.speed > long.speed + 0.3);
});

test('timing ranges and tempo mode reject malformed values', () => {
    const h=harness();
    for (const [key,min,max] of [['attack',0.005,0.25],['release',0.04,1.5],['smoothing',0.01,0.5],['hitDecay',0.25,4],['manualBpm',40,240]]) {
        h.r.set(key,-100); assert.equal(h.r.getSettings()[key],min); h.r.set(key,10000); assert.equal(h.r.getSettings()[key],max);
        h.r.set(key,NaN); assert.equal(h.r.getSettings()[key],max);
    }
    h.r.set('tempoMode','invalid'); assert.equal(h.r.getSettings().tempoMode,'auto');
});

test('offline analysis measures the soundtrack at the selected frame and drains events once', () => {
    const ctx=vm.createContext({Float32Array,Float64Array,Math});
    vm.runInContext(readFileSync(new URL('../src/engine/offline-audio.js',import.meta.url),'utf8'),ctx);
    const data=Float32Array.from({length:48000},(_,i)=>Math.sin(i*Math.PI*2*14000/48000)*0.02);
    const a=ctx.OfflineAudio.analyser({getChannelData:()=>data,numberOfChannels:1,sampleRate:48000,length:data.length},'studio',[{time:0.02,type:'kick',value:0.5}],120);
    const first=a.analysis(0,60); assert.equal(first.time,1/60); assert.equal(a.music.pollEvents(()=>{}),0);
    const second=a.analysis(1,60); let ev; assert.equal(a.music.pollEvents(e=>{ev=e;}),1); assert.equal(a.music.pollEvents(()=>{}),0);
    assert.ok(Math.abs(ev.age-(2/60-0.02))<1e-9);
    const peak=second.fft.indexOf(Math.max(...second.fft)); assert.ok(Math.abs(peak-14000*1024/48000)<2);
    assert.ok(second.fft[peak]>0.1&&second.fft[peak]<=1);
    assert.ok(Math.abs(a.music.getBeatInfo().beats-(2/60-0.02)*2)<1e-9);
});
