import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

export async function auditRecordingUi(cdp, evaluate) {
    await cdp.send('Browser.setDownloadBehavior', {behavior: 'deny'});
    return await evaluate(cdp, `(async function() {
        await VideoExport.ready();
        const failures = [];
        const change = (id, value) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event('change', {bubbles:true})); };
        change('resSelect', '640x360'); change('fpsSelect', '60'); change('recLength', 'preview'); change('durationInput', '1');
        change('recAudio', 'all'); change('recMode', 'smooth');
        AudioAnalysis.setSource('studio'); Music.setGenre('minimal'); Music.setArrangement('loop'); Music.setBPM(120);
        EffectRegistry.switchTo('plasma'); Renderer.play();
        await new Promise(r => setTimeout(r, 100));
        if (document.getElementById('recAudio').value !== 'all' || document.getElementById('recAudio').disabled) failures.push('Smooth mode sound control is misleading');
        let summary;
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('UI export timed out')), 15000);
            const saved = e => { clearTimeout(timeout); summary = e.detail; resolve(); };
            window.addEventListener('psychedelia:recording-saved', saved, {once:true});
            document.getElementById('btnRecord').click();
            if (!VideoExport.isFrameExport()) failures.push('Record button did not start smooth export');
            if (!document.getElementById('effectSelect').disabled || document.getElementById('btnRecord').disabled) failures.push('Scene lock or stop button state incorrect');
        });
        if (summary.frames !== 60 || summary.seconds !== 1 || !summary.audio) failures.push('UI export length/FPS/sound mismatch');
        if (document.getElementById('effectSelect').disabled || document.getElementById('recMode').disabled) failures.push('Controls stayed locked');
        Gallery.show();
        const video = document.querySelector('#galleryGrid video');
        if (!video) failures.push('Recording was not retained in gallery');
        else {
            await video.play();
            document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
            if (!video.paused) failures.push('Gallery kept playing after Escape');
        }
        change('recMode', 'live');
        await new Promise(r => setTimeout(r, 50));
        if (document.getElementById('recAudio').value !== 'all' || document.getElementById('recAudio').disabled) failures.push('Live audio preference was not restored');
        VideoExport.setOptions({mode:'live', audio:'none'});
        Renderer.pause();
        const before = Renderer.getUnwrappedTime();
        const pausedBlob = await new Promise((resolve, reject) => {
            if (!VideoExport.timedRecording(Renderer.getCanvas(), 0.5, 60, resolve)) reject(new Error(VideoExport.getLastError()));
        });
        if (!pausedBlob.size || Renderer.getUnwrappedTime() !== before || Renderer.isRunning()) failures.push('Paused capture advanced animation or lost the recording');
        Renderer.play();
        UIShell.setTab('output');
        change('recMode', 'smooth');
        await new Promise(r => setTimeout(r, 50));
        return {ok: failures.length === 0, failures, smooth: summary, galleryCount: Gallery.getCount(), pausedCaptureBytes: pausedBlob.size};
    })()`);
}

// Exercise the real browser encoders and inspect the actual downloaded bytes.
export async function auditRecording(cdp, evaluate, { baseline = false } = {}) {
    await evaluate(cdp, `VideoExport.ready()`);
    const outDir = new URL('./audit-artifacts/', import.meta.url);
    await mkdir(outDir, { recursive: true });
    const cases = baseline ? [
        { name: 'baseline-live60', mode: 'live', fps: 60, audio: 'none' },
        { name: 'baseline-live60-slow', mode: 'live', fps: 60, audio: 'none', stall: 35 }
    ] : [
        { name: 'smooth60-slow', mode: 'smooth', fps: 60, audio: 'none', stall: 35 },
        { name: 'smooth24', mode: 'smooth', fps: 24, audio: 'none' },
        { name: 'smooth60-1080-overlay', mode: 'smooth', fps: 60, audio: 'none', width: 1920, height: 1080, overlay: true },
        { name: 'smooth60-studio-audio-slow', mode: 'smooth', fps: 60, audio: 'all', offlineSource: 'studio', stall: 35 },
        { name: 'smooth60-file-audio-slow', mode: 'smooth', fps: 60, audio: 'all', offlineSource: 'file', stall: 35 },
        { name: 'live60', mode: 'live', fps: 60, audio: 'none' },
        { name: 'live60-audio', mode: 'live', fps: 60, audio: 'all' },
        { name: 'live60-audio-slow', mode: 'live', fps: 60, audio: 'all', stall: 35 },
        { name: 'live60-reader-slow', mode: 'live', fps: 60, audio: 'all', stall: 35, reader: true },
        { name: 'webm30', mode: 'live', fps: 30, audio: 'all', format: 'webm' }
    ];
    const results = [];
    const caseArg = process.argv.find(arg => arg.startsWith('--recording-cases='));
    const selectedCases = caseArg ? cases.filter(c => caseArg.split('=')[1].split(',').includes(c.name)) : cases;
    if (!selectedCases.length) throw new Error('No matching recording test cases.');
    for (const config of selectedCases) {
        console.error('Recording audit: ' + config.name);
        const result = await evaluate(cdp, `(async function() {
            const config = ${JSON.stringify(config)};
            EffectRegistry.switchTo('plasma');
            Renderer.setResolution(config.width || 640, config.height || 360);
            Renderer.setQualityMode('full');
            Renderer.setLoopEnabled(false);
            Renderer.setAnimSpeed(1);
            Renderer.setMaxPreviewFps(0);
            Object.keys(Overlays.getEnabled()).forEach(k => Overlays.setEnabled(k, false));
            Overlays.resize(config.width || 640, config.height || 360);
            if (config.overlay) { Overlays.setEnabled('scanlines', true); Overlays.setEnabled('strobe', true); }
            PostProcess.getEffects().forEach(fx => PostProcess.setEnabled(fx.name, false));
            VideoExport.setOptions({format: config.format || 'mp4', quality: 'standard', audio: config.audio, mode: config.mode});
            const originalReactor = AudioReactor.getSettings(), originalMusic = Music.getSettings();
            if (config.offlineSource) {
                Music.stop(); AudioAnalysis.clearFile(); AudioAnalysis.setSource(config.offlineSource);
                AudioReactor.applyPreset('club'); AudioReactor.set('enabled', true); AudioReactor.set('speed', 0);
                if (config.offlineSource === 'studio') { Music.setGenre('minimal'); Music.setBPM(120); Music.setArrangement('loop'); }
                else {
                    const n = 48000 * 3, bytes = new ArrayBuffer(44 + n * 2), v = new DataView(bytes);
                    const str = (at, text) => { for (let i = 0; i < text.length; i++) v.setUint8(at + i, text.charCodeAt(i)); };
                    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 48000, true); v.setUint32(28, 96000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
                    for (let i = 0; i < n; i++) { const t = i / 48000, age = t % 0.5; const sample = 0.12 * Math.sin(t * Math.PI * 880) + (age < 0.2 ? Math.sin(age * Math.PI * 120) * Math.exp(-age * 25) * 0.6 : 0); v.setInt16(44 + i * 2, Math.round(sample * 32767), true); }
                    await AudioAnalysis.loadFile(new File([bytes], 'offline-test.wav', {type:'audio/wav'})); AudioAnalysis.setFileGain(1); AudioAnalysis.setFileLoop(false);
                }
            }
            Renderer.play();
            await new Promise(r => setTimeout(r, 400));
            const renderedTimes = [];
            let reactionPeak = 0, kickPeak = 0, audioSource = '';
            const effect = EffectRegistry.getCurrent();
            const originalUniforms = effect.setUniforms;
            effect.setUniforms = function() {
                if (VideoExport.isRecording()) {
                    renderedTimes.push(Renderer.getUnwrappedTime());
                    reactionPeak = Math.max(reactionPeak, AudioReactor.getOutputs().flash);
                    kickPeak = Math.max(kickPeak, AudioReactor.getState().kick); audioSource = AudioReactor.getState().source;
                    const end = performance.now() + (config.stall || 0);
                    while (performance.now() < end) {}
                }
                if (originalUniforms) return originalUniforms.apply(this, arguments);
            };
            const started = performance.now();
            const originalStreams = AudioAnalysis.getRecordStreams;
            const originalWorklet = window.AudioWorkletNode;
            let audioCtx, tone;
            if (config.audio === 'all' && !config.offlineSource) {
                audioCtx = new AudioContext({sampleRate: 48000});
                const dest = audioCtx.createMediaStreamDestination();
                const gain = audioCtx.createGain(); gain.gain.value = 0.2;
                tone = audioCtx.createOscillator(); tone.frequency.value = 440;
                tone.connect(gain); gain.connect(dest); tone.start();
                await audioCtx.resume();
                AudioAnalysis.getRecordStreams = () => [dest.stream];
            }
            if (config.reader) window.AudioWorkletNode = undefined;
            let summary;
            const onSaved = e => { summary = e.detail; };
            window.addEventListener('psychedelia:recording-saved', onSaved);
            try {
                const blob = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Recording timed out: ' + VideoExport.getLastError())), 45000);
                    if (!VideoExport.timedRecording(Renderer.getCanvas(), 2, config.fps, b => { clearTimeout(timeout); resolve(b); })) {
                        clearTimeout(timeout); reject(new Error(VideoExport.getLastError()));
                    }
                });
                const bytes = new Uint8Array(await blob.arrayBuffer());
                let binary = '';
                for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
                return { b64: btoa(binary), type: blob.type, summary, wallSeconds: (performance.now() - started) / 1000, renderedTimes, reactionPeak, kickPeak, audioSource };
            } finally {
                effect.setUniforms = originalUniforms;
                AudioAnalysis.getRecordStreams = originalStreams;
                window.AudioWorkletNode = originalWorklet;
                if (tone) tone.stop();
                if (audioCtx) await audioCtx.close();
                if (config.offlineSource) { Music.setSettings(originalMusic); Object.entries(originalReactor).forEach(([k,v]) => AudioReactor.set(k,v)); AudioAnalysis.clearFile(); AudioAnalysis.setSource('studio'); }
                window.removeEventListener('psychedelia:recording-saved', onSaved);
            }
        })()`);
        const file = new URL(config.name + (config.format === 'webm' ? '.webm' : '.mp4'), outDir);
        await writeFile(file, Buffer.from(result.b64, 'base64'));
        delete result.b64;
        const { fileURLToPath } = await import('node:url');
        const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-show_packets', '-of', 'json', fileURLToPath(file)], { maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' }));
        const video = probe.streams.find(s => s.codec_type === 'video');
        const audio = probe.streams.find(s => s.codec_type === 'audio');
        const packets = probe.packets.filter(p => p.codec_type === 'video');
        const gaps = packets.slice(1).map((p, i) => Number(p.pts_time) - Number(packets[i].pts_time));
        const failures = [];
        if (config.mode === 'smooth') {
            if (Number(video.nb_read_frames) !== 2 * config.fps) failures.push('Wrong frame count');
            if (Math.abs(Number(video.duration) - 2) > 0.001) failures.push('Wrong duration');
            if (gaps.some(g => Math.abs(g - 1 / config.fps) > 0.00003)) failures.push('Uneven frame timestamps');
            const times = result.renderedTimes;
            if (times.length !== 2 * config.fps || times.slice(1).some((t, i) => Math.abs(t - times[i] - 1 / config.fps) > 0.00001)) failures.push('Animation did not advance one fixed step per frame');
        }
        if (config.audio === 'all' && !audio) failures.push('Missing audio');
        if (config.offlineSource && (result.audioSource !== config.offlineSource || result.reactionPeak < 0.01 || result.kickPeak < 0.1)) failures.push('Offline soundtrack did not drive beat reactions');
        if (audio && video.duration && audio.duration && Math.abs(Number(audio.duration) - Number(video.duration)) > 0.03) failures.push('Audio/video duration mismatch');
        let audioRms;
        if (audio) {
            const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', fileURLToPath(file), '-map', '0:a:0', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], {maxBuffer: 4 * 1024 * 1024});
            let energy = 0;
            for (let i = 0; i + 4 <= pcm.length; i += 4) energy += pcm.readFloatLE(i) ** 2;
            audioRms = Math.sqrt(energy / (pcm.length / 4));
            if (audioRms < 0.02) failures.push('Recorded audio signal is missing or silent');
        }
        const hashes = execFileSync('ffmpeg', ['-v', 'error', '-i', fileURLToPath(file), '-map', '0:v:0', '-f', 'framemd5', '-'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split(',').at(-1).trim());
        const uniqueFrames = new Set(hashes).size;
        if (config.mode === 'smooth' && uniqueFrames !== 2 * config.fps) failures.push('Duplicated images in smooth video');
        results.push({ name: config.name, ...result, renderedTimes: result.renderedTimes.length, uniqueFrames, video: { frames: video.nb_read_frames, fps: video.avg_frame_rate, duration: video.duration }, audio: audio && { codec: audio.codec_name, duration: audio.duration, rms: audioRms }, maxGap: Math.max(...gaps), failures });
    }
    const report = { ok: results.every(r => !r.failures.length), results };
    if (!baseline) {
        await evaluate(cdp, `(() => {
            const res = document.getElementById('resSelect'); res.value = '640x360'; res.dispatchEvent(new Event('change', {bubbles:true}));
            document.getElementById('fpsSelect').value = '60';
            VideoExport.setOptions({mode:'smooth'}); document.getElementById('recMode').value='smooth';
            document.getElementById('recMode').dispatchEvent(new Event('change', {bubbles:true})); UIShell.setTab('output');
        })()`);
        const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        await writeFile(new URL('output-panel.png', outDir), Buffer.from(screenshot.data, 'base64'));
    }
    await writeFile(new URL(baseline ? 'recording-baseline.json' : caseArg ? 'recording-focused-results.json' : 'recording-results.json', outDir), JSON.stringify(report, null, 2));
    return report;
}
