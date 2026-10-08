import { mkdir, writeFile } from 'node:fs/promises';

const artifacts = new URL('./beat-reactor-artifacts/', import.meta.url);

export async function auditBeatReactor(cdp, evaluate) {
    await mkdir(artifacts, { recursive: true });
    const report = await evaluate(cdp, `(${browserAudit.toString()})()`);
    for (const shot of report.images || []) {
        await writeFile(new URL(shot.name + '.png', artifacts), Buffer.from(shot.png, 'base64'));
        delete shot.png;
    }
    await evaluate(cdp, `new Promise(resolve => setTimeout(resolve, 550))`);
    await evaluate(cdp, `document.querySelector('[data-section="reactor-fine-tune"]').scrollIntoView({ block: 'center' })`);
    await evaluate(cdp, `new Promise(requestAnimationFrame)`);
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(new URL('fine-tune-ui.png', artifacts), Buffer.from(screenshot.data, 'base64'));
    await writeFile(new URL('browser-results' + (process.argv.includes('--file') ? '-file' : '') + '.json', artifacts), JSON.stringify(report, null, 2));
    return report;
}

async function browserAudit() {
    const checks = [], images = [], inputs = [], tuning = [];
    const check = (name, ok, details) => checks.push({ name, ok: !!ok, ...(details === undefined ? {} : { details }) });
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const el = id => document.getElementById(id);
    const change = (id, value, type = 'input') => { el(id).value = String(value); el(id).dispatchEvent(new Event(type, { bubbles: true })); };
    const original = {
        update: AudioReactor.update, analysis: AudioAnalysis.getAnalysis,
        events: Music.pollEvents, info: Music.getBeatInfo, playing: Music.isPlaying,
        capture: navigator.mediaDevices.getDisplayMedia, settings: AudioReactor.getSettings(), random: Math.random,
        animSpeed: Renderer.getAnimSpeed(), bpm: Music.getBPM(), genre: Music.getGenre(), arrangement: Music.getArrangement()
    };
    const restoreProvider = () => AudioAnalysis.setStudioProvider({ getAnalysis: Music.getAnalysis, isReady: Music.isReady, isPlaying: Music.isPlaying });
    Renderer.pause(); PostProcess.disableAll(); Overlays.resetAll();
    const reacts = ['zoom', 'rotate', 'speed', 'flash', 'hue', 'chroma', 'pump', 'shake'];
    let captureContext, captureNode, panel;
    try {
        // Provider edge cases must keep the texture contract without inventing
        // live audio or discarding the spectrum used by the beat detector.
        AudioAnalysis.setSource('studio');
        AudioAnalysis.setStudioProvider(() => ({ available: true, active: true, waveform: new Float32Array([0.5]), fft: new Float32Array([0]) }));
        let a = AudioAnalysis.getAnalysis({ time: 0 });
        check('Short normalized providers are padded with silence', a.waveform.length === 512 && a.fft.length === 512 && a.waveform.every(v => v === 0.5) && a.fft.every(v => v === 0));
        AudioAnalysis.setStudioProvider(() => ({ available: true, active: true, byteData: true }));
        a = AudioAnalysis.getAnalysis({ time: 0 });
        check('Missing byte provider samples are silence', a.waveform.every(v => v === 128) && a.fft.every(v => v === 0) && a.level === 0);
        AudioAnalysis.setStudioProvider(() => ({ available: true, active: true, waveform: new Float32Array(512).fill(0.5), fft: new Float32Array(1024), fftSize: 2048 }));
        a = AudioAnalysis.getAnalysis();
        check('Large spectra survive the 512-sample texture adapter', a.fft.length === 512 && a.spectrum.length === 1024 && a.fftSize === 2048);
        restoreProvider();
        const toneContext = Tone.getContext(), resume = toneContext.resume; let finishStart;
        try {
            Music.stop(); toneContext.resume = () => new Promise(resolve => { finishStart = resolve; });
            Music.start(); Music.stop(); finishStart(); await sleep(20);
            check('Stop cancels a pending Studio Music start', !Music.isPlaying());
        } finally { toneContext.resume = resume; Music.stop(); }

        UIShell.setTab('audio');
        document.querySelectorAll('#musicPanel .collapsible').forEach(s => { s.classList.remove('is-collapsed'); s.querySelector(':scope > .section-head').setAttribute('aria-expanded', 'true'); });
        check('Fine Tune is visible and all nine controls have valid ranges', document.querySelector('[data-section="reactor-fine-tune"]').offsetHeight > 0 &&
            [el('reactorSensitivity'), ...reacts.map(k => el('react_' + k))].every(s => s && Number(s.max) > Number(s.min) && Number(s.step) > 0));
        for (const key of reacts) {
            for (const pct of [0, 1, 25, 50, 100]) {
                change('react_' + key, pct);
                check('Fine Tune ' + key + ' ' + pct + '% wiring', AudioReactor.getSettings()[key] === pct / 100 && el('react_' + key + 'Val').textContent === pct + '%');
            }
            el('react_' + key).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
            check('Fine Tune ' + key + ' default reset', AudioReactor.getSettings()[key] === AudioReactor.getDefaults()[key]);
        }
        for (const pct of [25, 100, 300]) {
            change('reactorSensitivity', pct);
            check('Sensitivity ' + pct + '% wiring', AudioReactor.getSettings().sensitivity === pct / 100);
        }
        el('reactorSensitivity').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        check('Sensitivity default reset', AudioReactor.getSettings().sensitivity === 1);
        for (const style of AudioReactor.getPresets()) {
            change('reactorPreset', style, 'change');
            check('Global Style ' + style + ' synchronizes every control', AudioReactor.presetName() === style && reacts.every(k => Number(el('react_' + k).value) / 100 === AudioReactor.getSettings()[k]));
        }
        el('reactorEnabled').checked = false; el('reactorEnabled').dispatchEvent(new Event('change'));
        check('Global reactions switch off', AudioReactor.getSettings().enabled === false);
        el('reactorEnabled').checked = true; el('reactorEnabled').dispatchEvent(new Event('change'));
        for (let i = 0; i < 3; i++) {
            const param = Array.from(el('reactLinkParam' + i).options).find(o => o.value).value;
            change('reactLinkParam' + i, param, 'change');
            change('reactLinkSource' + i, 'lfo_bar', 'change');
            for (const amount of [-100, 0, 100]) {
                change('reactLinkAmount' + i, amount);
                const link = AudioReactor.getLinks()[i];
                check('Parameter link ' + (i + 1) + ' at ' + amount + '%', link.param === param && link.source === 'lfo_bar' && link.amount === amount / 100 && parseInt(el('reactLinkAmount' + i + 'Val').textContent, 10) === amount);
            }
        }
        AudioReactor.resetAll(); MusicControls.refreshReactor();

        const sources = new Set(AudioReactor.getSources().map(s => s.id));
        const fxDefs = PostFxLibrary.list(), overlayDefs = Overlays.getDefs();
        const problems = [];
        for (const fx of fxDefs) {
            PostProcess.applyReactDefaults(fx.name);
            for (const [key, mod] of Object.entries(PostProcess.getMods(fx.name))) {
                const p = fx.params[key], value = PostProcess.getEffectiveParam(fx.name, key);
                if (!p || !sources.has(mod.src) || !Number.isFinite(mod.amt) || Math.abs(mod.amt) > 1 || !Number.isFinite(value) || value < p.min || value > p.max) problems.push(fx.name + ':' + key);
            }
            PostProcess.clearMods(fx.name);
        }
        for (const overlay of overlayDefs) {
            Overlays.applyReactDefaults(overlay.id);
            for (const p of overlay.params) {
                const mod = Overlays.getMod(p.name); if (!mod) continue;
                const value = Overlays.getEffectiveParam(p.name);
                if (!sources.has(mod.src) || !Number.isFinite(mod.amt) || Math.abs(mod.amt) > 1 || !Number.isFinite(value) || value < p.min || value > p.max) problems.push(overlay.id + ':' + p.name);
            }
            Overlays.resetOverlay(overlay.id);
        }
        check('All FX and overlay Auto links use valid sources and ranges', problems.length === 0, { fx: fxDefs.length, overlays: overlayDefs.length, problems });

        const fx = fxDefs.find(f => Object.values(f.params).some(p => !p.type));
        const key = Object.keys(fx.params).find(k => !fx.params[k].type);
        panel = document.createElement('div'); const row = document.createElement('div'), wrap = document.createElement('div');
        panel.appendChild(row); row.appendChild(wrap); el('musicPanel').appendChild(panel);
        const ui = ReactUI.attach({ row, wrap, def: fx.params[key], get: () => PostProcess.getMod(fx.name, key), set: (src, amt) => PostProcess.setMod(fx.name, key, src, amt), live: () => PostProcess.getEffectiveParam(fx.name, key) });
        PostProcess.setMod(fx.name, key, 'kick', 0.3); ui.refresh();
        const linkRow = row.nextElementSibling, amount = linkRow.querySelector('input'), source = linkRow.querySelector('select');
        amount.value = '0'; amount.dispatchEvent(new Event('input'));
        source.value = 'bass'; source.dispatchEvent(new Event('change'));
        check('FX link stays at zero when changing source', PostProcess.getMod(fx.name, key)?.amt === 0 && source.value === 'bass' && amount.value === '0');
        amount.value = '-100'; amount.dispatchEvent(new Event('input'));
        check('FX link accepts negative amount', PostProcess.getMod(fx.name, key)?.amt === -1);
        source.value = ''; source.dispatchEvent(new Event('change'));
        check('FX link Off removes the route', PostProcess.getMod(fx.name, key) === null);
        check('FX links reject unknown sources and non-finite amounts', !PostProcess.setMod(fx.name, key, 'toString', 0.5) && !PostProcess.setMod(fx.name, key, 'kick', NaN));
        const op = overlayDefs.flatMap(d => d.params).find(p => !p.type || p.type === 'float');
        Overlays.setMod(op.name, 'kick', 0);
        check('Overlay links retain a selected source at zero', Overlays.getMod(op.name)?.amt === 0);
        Overlays.setMod(op.name, '', 0); panel.remove(); panel = null;
        check('Overlay links reject invalid sources and amounts', !Overlays.setMod(op.name, '__proto__', 0.5) && !Overlays.setMod(op.name, 'kick', Infinity));

        // A deterministic rhythmic file and the same PCM over a real Web Audio
        // MediaStream exercise native analysers, not mocked FFT readings.
        const sampleRate = 48000, duration = 9, count = sampleRate * duration;
        const pcm = new Float32Array(count); let seed = 1234567, lowSnare = 0, highSnare = 0, lowHat = 0, secondHat = 0;
        const lowCoeff = 1 - Math.exp(-2 * Math.PI * 400 / sampleRate);
        const highCoeff = 1 - Math.exp(-2 * Math.PI * 2800 / sampleRate);
        const hatCoeff = 1 - Math.exp(-2 * Math.PI * 7000 / sampleRate);
        for (let i = 0; i < count; i++) {
            const t = i / sampleRate;
            seed = Math.imul(seed, 1664525) + 1013904223 | 0;
            const noise = (seed >>> 0) / 2147483648 - 1;
            lowSnare += (noise - lowSnare) * lowCoeff; highSnare += (noise - highSnare) * highCoeff;
            lowHat += (noise - lowHat) * hatCoeff; const highNoise = noise - lowHat;
            secondHat += (highNoise - secondHat) * hatCoeff;
            const kickPhase = t >= 0.4 ? (t - 0.4) % 0.5 : 1;
            const snarePhase = t >= 0.65 ? (t - 0.65) % 1 : 1;
            const hatPhase = t >= 0.4 ? (t - 0.4) % 0.25 : 1;
            // Natural tails avoid artificial cutoff clicks that are themselves
            // new transients, especially at the end of the kick envelope.
            const kick = Math.sin(2 * Math.PI * 75 * kickPhase) * Math.exp(-kickPhase / 0.055) * 0.7;
            const snare = (highSnare - lowSnare) * Math.exp(-snarePhase / 0.025) * 0.65;
            const hat = (highNoise - secondHat) * Math.exp(-hatPhase / 0.016) * 0.5;
            pcm[i] = Math.max(-1, Math.min(1, kick + snare + hat));
        }
        const bytes = new ArrayBuffer(44 + count * 2), wav = new DataView(bytes);
        const text = (at, s) => { for (let i = 0; i < s.length; i++) wav.setUint8(at + i, s.charCodeAt(i)); };
        text(0, 'RIFF'); wav.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
        wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true);
        wav.setUint32(24, sampleRate, true); wav.setUint32(28, sampleRate * 2, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true);
        text(36, 'data'); wav.setUint32(40, count * 2, true);
        for (let i = 0; i < count; i++) wav.setInt16(44 + i * 2, Math.round(pcm[i] * 32767), true);
        const audioFile = new File([bytes], 'beat-reactor-120bpm.wav', { type: 'audio/wav' });
        async function sampleInput(name, milliseconds) {
            AudioReactor.resetSignal(); const begin = performance.now(); let previous = begin;
            const counts = Object.fromEntries(['kick', 'snare', 'hat', 'beat', 'bar'].map(k => [k, AudioReactor.getTrigger(k).count]));
            const peak = { level: 0, bass: 0, mid: 0, high: 0, kick: 0, snare: 0, hat: 0, beat: 0 };
            const onsets = { kick: [], snare: [], hat: [] }, lastCounts = { ...counts };
            while (performance.now() - begin < milliseconds) {
                const now = performance.now(); original.update(now / 1000, (now - previous) / 1000); previous = now;
                const state = AudioReactor.getState(); for (const k in peak) peak[k] = Math.max(peak[k], state[k]);
                for (const k in onsets) { const n = AudioReactor.getTrigger(k).count; if (n > lastCounts[k]) onsets[k].push(Math.round(now - begin)); lastCounts[k] = n; }
                await sleep(12);
            }
            const state = AudioReactor.getState(), hits = Object.fromEntries(Object.keys(counts).map(k => [k, AudioReactor.getTrigger(k).count - counts[k]]));
            const result = { name, peak, hits, onsets, bpm: state.bpm, source: state.source, studioSync: state.studioSync, sampleRate: AudioReactor.getAnalysis()?.sampleRate };
            inputs.push(result); return result;
        }
        Music.stop(); AudioReactor.applyPreset('club'); AudioReactor.set('sensitivity', 1);
        check('Rhythmic WAV loads and plays', await AudioAnalysis.loadFile(audioFile) && await AudioAnalysis.playFile());
        const file = await sampleInput('Audio File', 8000);
        const accurateHits = r => r.hits.kick >= 15 && r.hits.kick <= 17 && r.hits.snare >= 7 && r.hits.snare <= 9 && r.hits.hat >= 29 && r.hits.hat <= 32;
        check('Real file analyser follows the 16 kicks, 8 snares and 31 hats without duplicate hits', file.source === 'file' && file.peak.level > 0.3 && file.peak.bass > 0.3 && file.peak.high > 0.01 && accurateHits(file) && file.hits.bar >= 1 && Math.abs(file.bpm - 120) < 5, file);
        change('audioFileGain', 0); await sleep(650);
        const mutedFile = await sampleInput('Audio File / gain zero', 650);
        await sleep(550);
        check('File Gain zero is shown as zero and produces silence', el('audioFileGainVal').textContent === '0.00' && mutedFile.peak.level < 0.001 && mutedFile.peak.bass < 0.001 && mutedFile.hits.kick === 0, mutedFile);
        change('audioFileGain', 1); change('audioFileSeek', 0, 'input');
        original.update(performance.now() / 1000, 1 / 60);
        check('Seek invalidates previous tempo', AudioReactor.getState().bpm === 0);
        AudioAnalysis.pauseFile();

        captureContext = new AudioContext({ sampleRate }); await captureContext.resume();
        const staleDest = captureContext.createMediaStreamDestination(); let finishCapture;
        navigator.mediaDevices.getDisplayMedia = () => new Promise(resolve => { finishCapture = resolve; });
        const pendingCapture = AudioAnalysis.startCapture(); AudioAnalysis.setSource('file'); finishCapture(staleDest.stream);
        check('Switching inputs cancels a pending capture and stops late tracks', await pendingCapture === false && AudioAnalysis.getSource() === 'file' && staleDest.stream.getTracks().every(t => t.readyState === 'ended'));
        const buffer = captureContext.createBuffer(1, pcm.length, sampleRate); buffer.copyToChannel(pcm, 0);
        const dest = captureContext.createMediaStreamDestination(); captureNode = captureContext.createBufferSource(); captureNode.buffer = buffer; captureNode.connect(dest);
        navigator.mediaDevices.getDisplayMedia = async () => dest.stream;
        check('Capture accepts a real audio MediaStream', await AudioAnalysis.startCapture()); captureNode.start();
        const capture = await sampleInput('Capture Playback / generated MediaStream', 8000);
        check('Real capture follows known drum counts without duplicate hits', capture.source === 'capture' && capture.peak.level > 0.3 && capture.peak.bass > 0.3 && accurateHits(capture) && capture.hits.bar >= 1 && Math.abs(capture.bpm - 120) < 5, capture);
        await AudioAnalysis.playFile();
        check('Playing a file releases an active capture', dest.stream.getTracks().every(t => t.readyState === 'ended') && !AudioAnalysis.getCaptureStatus().hasCapture && AudioAnalysis.getSource() === 'file');
        AudioAnalysis.pauseFile(); AudioAnalysis.clearFile();
        captureNode.stop(); await captureContext.close(); captureContext = null; captureNode = null;
        navigator.mediaDevices.getDisplayMedia = original.capture;

        AudioAnalysis.setSource('studio'); restoreProvider(); Music.setGenre('minimal'); Music.setArrangement('loop'); Music.setBPM(120);
        Music.getInstrumentList().forEach(i => { Music.setInstrumentOn(i.key, true); Music.setInstrumentVolume(i.key, 0); });
        Music.start(); await sleep(300);
        const studio = await sampleInput('Studio Music', 3200);
        check('Studio analyser and sequencer drive real hits and exact tempo', studio.source === 'studio' && studio.studioSync && studio.hits.kick >= 3 && studio.hits.beat >= 5 && studio.peak.level > 0.1 && studio.bpm === 120, studio);
        Music.getInstrumentList().forEach(i => { el('inst_' + i.key).checked = false; el('inst_' + i.key).dispatchEvent(new Event('change')); });
        await sleep(400);
        const muted = await sampleInput('Studio Music / all instruments muted', 1600);
        check('Mixer mutes suppress queued and newly scheduled drum hits', muted.hits.kick === 0 && muted.hits.snare === 0 && muted.hits.hat === 0 && muted.studioSync && muted.hits.beat >= 2, muted);
        el('inst_kick').checked = true; el('inst_kick').dispatchEvent(new Event('change'));
        const kickOnly = await sampleInput('Studio Music / kick only', 1600);
        check('Unmuting one input restores only its hits', kickOnly.hits.kick >= 2 && kickOnly.hits.snare === 0 && kickOnly.hits.hat === 0, kickOnly);
        Music.stop();

        // Freeze a known signal so slider strengths can be compared at exactly
        // the same animation time, including the actual post-processing pass.
        const synthetic = { available: true, active: true, source: 'studio', byteData: false, sampleRate: 48000, fftSize: 1024,
            waveform: Float32Array.from({ length: 512 }, (_, i) => i % 2 ? 0.75 : 0.25), fft: new Float32Array(512).fill(0.6) };
        let events = [];
        AudioAnalysis.getAnalysis = () => synthetic; Music.isPlaying = () => true;
        Music.getBeatInfo = () => ({ bpm: 120, beats: 7.37 }); Music.pollEvents = fn => { events.splice(0).forEach(fn); };
        AudioReactor.update = () => {};
        Math.random = () => 0.9;
        const prime = (style = 'off') => {
            AudioReactor.resetSignal(); AudioReactor.applyPreset(style); AudioReactor.set('enabled', true);
            for (let i = 0; i < 60; i++) original.update(i / 60, 1 / 60);
            events.push(...['kick', 'snare', 'hat', 'beat', 'drop'].map(type => ({ type, value: 1 })));
            original.update(1, 1 / 60);
        };
        prime();
        for (const { id } of AudioReactor.getSources()) {
            const source = AudioReactor.getSource(id);
            const positive = AudioReactor.applyMod(0.5, { min: 0, max: 1 }, { src: id, amt: 0.25 });
            const negative = AudioReactor.applyMod(0.5, { min: 0, max: 1 }, { src: id, amt: -0.25 });
            check('Source ' + id + ' drives positive and negative links', source > 0 && source <= 1 && positive > 0.5 && negative < 0.5, { source, positive, negative });
        }
        for (const key of reacts) {
            const levels = [];
            for (const amount of [0, 0.25, 0.5, 1]) {
                prime(); AudioReactor.set(key, amount); original.update(1 + 1 / 60, 1 / 60);
                const o = { ...AudioReactor.getOutputs() };
                const value = key === 'zoom' ? o.zoom - 1 : key === 'speed' ? o.speed - 1 : key === 'shake' ? Math.hypot(o.shakeX, o.shakeY) : Math.abs(o[key]);
                levels.push(value);
                check(key + ' at ' + amount * 100 + '% has finite bounded outputs', Object.values(o).every(Number.isFinite) && o.zoom >= 1 && o.zoom <= 1.125 && o.speed >= 1 && o.speed <= 3.6 && o.flash <= 1 && Math.abs(o.rotate) <= 0.06 && Math.abs(o.shakeX) <= 0.02 && Math.abs(o.shakeY) <= 0.02);
            }
            check(key + ' strength increases smoothly from neutral to maximum', levels[0] === 0 && levels[1] > 0 && levels[2] > levels[1] && levels[3] > levels[2], levels);
            tuning.push({ key, amounts: [0, 25, 50, 100], levels });
        }

        synthetic.source = 'file'; Music.isPlaying = () => false; AudioReactor.resetSignal();
        const timings = [];
        for (let i = 0; i < 300; i++) { const begin = performance.now(); original.update(2 + i / 60, 1 / 60); timings.push(performance.now() - begin); }
        const averageMs = timings.reduce((s, n) => s + n, 0) / timings.length;
        check('Beat analysis leaves ample time in a 60 FPS frame', averageMs < 2.5, { averageMs, maxMs: Math.max(...timings), frames: timings.length });
        synthetic.source = 'studio'; Music.isPlaying = () => true;

        Overlays.setEnabled('spectrum', true); Overlays.setParam('spectrum_style', 0); Overlays.setParam('spectrum_smoothing', 0);
        const spectrumCanvas = el('overlayCanvas');
        function spectrumPixels() {
            Overlays.render(2); const pixels = spectrumCanvas.getContext('2d').getImageData(0, 0, spectrumCanvas.width, spectrumCanvas.height).data;
            let alpha = 0; for (let i = 3; i < pixels.length; i += 4) alpha += pixels[i]; return alpha;
        }
        synthetic.fft.fill(0); prime(); const silentSpectrum = spectrumPixels();
        synthetic.fft.fill(1, 270, 330); prime(); const highSpectrum = spectrumPixels();
        check('Spectrum overlay displays audio above 12 kHz', highSpectrum > silentSpectrum * 1.2, { silentSpectrum, highSpectrum });
        Overlays.setEnabled('spectrum', false); synthetic.fft.fill(0.6);

        Renderer.setResolution(640, 360); Renderer.setAnimSpeed(0); Renderer.setRotation(0); Renderer.setRotationSpeed(0); Renderer.setViewZoom(1);
        EffectRegistry.switchTo('plasma'); Controls.buildParams();
        for (const style of ['off', 'subtle', 'club', 'psychedelic', 'wild']) {
            prime(style);
            const def = EffectRegistry.getCurrent(), previous = def.setUniforms; let presented = false;
            def.setUniforms = function() { if (previous) previous.apply(this, arguments); presented = true; };
            Renderer.setTime(2); Renderer.clearInputPriority(); Renderer.play();
            for (let i = 0; i < 90 && !presented; i++) await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame); Renderer.pause(); def.setUniforms = previous;
            const canvas = Renderer.getCanvas(), copy = document.createElement('canvas'); copy.width = 96; copy.height = 54;
            const ctx = copy.getContext('2d'); ctx.drawImage(canvas, 0, 0, 96, 54);
            const rgb = Array.from(ctx.getImageData(0, 0, 96, 54).data).filter((_, i) => i % 4 !== 3);
            const mean = rgb.reduce((s, v) => s + v, 0) / rgb.length / 255;
            const clipped = rgb.filter(v => v >= 253).length / rgb.length;
            const variance = rgb.reduce((s, v) => s + (v / 255 - mean) ** 2, 0) / rgb.length;
            let error; const errors = []; while ((error = Renderer.getGL().getError()) !== 0) errors.push(error);
            check('Rendered ' + style + ' stays nonblank and varied', presented && mean > 0.02 && variance > 0.005 && clipped < 0.8 && !errors.length, { mean, variance, clipped, errors });
            images.push({ name: 'style-' + style, png: canvas.toDataURL('image/png').split(',')[1], mean, variance, clipped });
        }
    } catch (err) { check('Audit completed without exception', false, err.stack || String(err)); }
    finally {
        if (panel) panel.remove();
        try { captureNode?.stop(); } catch (_) {}
        try { if (captureContext) await captureContext.close(); } catch (_) {}
        AudioReactor.update = original.update; AudioAnalysis.getAnalysis = original.analysis;
        Music.pollEvents = original.events; Music.getBeatInfo = original.info; Music.isPlaying = original.playing;
        navigator.mediaDevices.getDisplayMedia = original.capture;
        Math.random = original.random;
        Music.stop(); AudioAnalysis.stopCapture(); AudioAnalysis.clearFile(); restoreProvider(); AudioAnalysis.setSource('studio');
        Music.getInstrumentList().forEach(i => { Music.setInstrumentOn(i.key, true); Music.setInstrumentVolume(i.key, 0); });
        Music.setGenre(original.genre); Music.setArrangement(original.arrangement); Music.setBPM(original.bpm);
        Object.entries(original.settings).forEach(([key, value]) => AudioReactor.set(key, value));
        AudioReactor.resetAll(); AudioReactor.resetSignal(); MusicControls.refreshReactor();
        Renderer.setAnimSpeed(original.animSpeed); UIShell.setTab('audio');
    }
    return { ok: checks.every(c => c.ok), checks, inputs, tuning, images, failures: checks.filter(c => !c.ok).map(c => c.name) };
}
