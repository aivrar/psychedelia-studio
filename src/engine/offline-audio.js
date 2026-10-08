/* Soundtrack and frame-addressed audio analysis for fixed-step MP4 export. */
var OfflineAudio = (function() {
    'use strict';
    var N = 1024, window = new Float32Array(N);
    for (var w = 0; w < N; w++) window[w] = 0.42 - 0.5 * Math.cos(2 * Math.PI * w / N) + 0.08 * Math.cos(4 * Math.PI * w / N);
    function analyser(buffer, source, events, bpm) {
        var l = buffer.getChannelData(0), r = buffer.getChannelData(Math.min(1, buffer.numberOfChannels - 1));
        var re = new Float64Array(N), im = new Float64Array(N), wave = new Float32Array(512), fft = new Float32Array(512);
        var index = 0, time = 0, section = '', lastFrame = -1;
        function sample(i) { var value = i >= 0 && i < l.length ? (l[i] + r[i]) * 0.5 : 0; return isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0; }
        function update(frame, fps) {
            if (lastFrame === frame) return;
            lastFrame = frame; time = (frame + 1) / fps;
            var end = Math.round(time * buffer.sampleRate);
            for (var i = 0; i < N; i++) { re[i] = sample(end - N + i) * window[i]; im[i] = 0; if (i >= N - 512) wave[i - N + 512] = sample(end - N + i) * 0.5 + 0.5; }
            // Iterative radix-2 FFT, normalized like the Web Audio analyser.
            for (var a = 1, b = 0; a < N; a++) {
                var bit = N >> 1; for (; b & bit; bit >>= 1) b ^= bit; b ^= bit;
                if (a < b) { var t = re[a]; re[a] = re[b]; re[b] = t; }
            }
            for (var size = 2; size <= N; size *= 2) {
                var angle = -2 * Math.PI / size, wr = Math.cos(angle), wi = Math.sin(angle);
                for (var start = 0; start < N; start += size) {
                    var cr = 1, ci = 0;
                    for (var k = 0; k < size / 2; k++) {
                        var j = start + k, h = j + size / 2;
                        var tr = re[h] * cr - im[h] * ci, ti = re[h] * ci + im[h] * cr;
                        re[h] = re[j] - tr; im[h] = im[j] - ti; re[j] += tr; im[j] += ti;
                        var next = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = next;
                    }
                }
            }
            for (var bin = 0; bin < 512; bin++) {
                var amplitude = Math.hypot(re[bin], im[bin]) / N * Math.pow(10, 30 / 20);
                fft[bin] = amplitude > 0 ? Math.max(0, Math.min(1, 1 + 20 / 70 * Math.log10(amplitude))) : 0;
            }
        }
        return {
            analysis: function(frame, fps) {
                update(frame, fps);
                return { available: true, active: true, source: source, byteData: false, fftScale: 'normalized-db', fftMinDecibels: -100, fftMaxDecibels: -30,
                    waveform: wave, fft: fft, spectrum: fft, sampleRate: buffer.sampleRate, fftSize: N, signalVersion: 'offline', time: time };
            },
            music: source === 'studio' ? {
                isPlaying: function() { return true; },
                getBeatInfo: function() { return { bpm: bpm, beats: Math.max(0, time - 0.02) * bpm / 60, sectionLabel: section }; },
                pollEvents: function(fn) {
                    var count = 0;
                    while (index < events.length && events[index].time <= time) {
                        var e = events[index++]; if (e.type === 'section' || e.type === 'drop') section = e.type === 'drop' ? 'Drop' : 'Section';
                        fn({ type: e.type, value: e.value, age: Math.max(0, time - e.time), time: e.time }); count++;
                    }
                    return count;
                }
            } : null
        };
    }
    async function prepare(duration, config) {
        config = config || {};
        if (!(duration > 0) || duration > 600) throw new Error('Smooth MP4 with sound supports clips up to 10 minutes.');
        var selectedSource = AudioAnalysis.getSource(), source = config.source || selectedSource;
        if (source !== 'studio' && source !== 'file') throw new Error('Choose Studio Music or an Audio File for Smooth MP4 with sound. Capture Playback uses live recording.');
        if (source === 'file' && !AudioAnalysis.getFile()) throw new Error('Choose an audio file before exporting with sound.');
        var raw = typeof Tone !== 'undefined' ? Tone.getContext().rawContext : null;
        var fileState = AudioAnalysis.getFileStatus(), resumeContext = false, restored = false;
        function restore() {
            if (restored) return; restored = true;
            if (resumeContext && raw && raw.resume) raw.resume().catch(function() {});
            if (fileState.playing) AudioAnalysis.playFile().then(function() { AudioAnalysis.setSource(selectedSource); });
            if (typeof AudioReactor !== 'undefined') AudioReactor.resetSignal();
        }
        try {
            if (raw && raw.state === 'running' && raw.suspend) { await raw.suspend(); resumeContext = true; }
            AudioAnalysis.pauseFile();
            var buffer, events = [], bpm = 0;
            if (source === 'studio') {
                var result = await Music.renderOffline(duration, 48000); buffer = result.buffer; events = result.events; bpm = result.bpm;
            } else {
                var context = new OfflineAudioContext(2, Math.ceil(duration * 48000), 48000);
                var decoded = await context.decodeAudioData(await AudioAnalysis.getFile().arrayBuffer());
                var player = context.createBufferSource(), gain = context.createGain(); player.buffer = decoded;
                player.loop = typeof config.loop === 'boolean' ? config.loop : fileState.loop;
                gain.gain.value = fileState.gain; player.connect(gain); gain.connect(context.destination);
                var start = typeof config.offset === 'number' && isFinite(config.offset) ? Math.max(0, config.offset) : fileState.currentTime;
                var offset = player.loop ? start % decoded.duration : Math.min(decoded.duration, start);
                if (offset < decoded.duration) player.start(0, offset);
                buffer = await context.startRendering();
            }
            var detector = analyser(buffer, source, events, bpm);
            return { buffer: buffer, analysis: detector.analysis, music: detector.music, restore: restore, source: source };
        } catch (error) { restore(); throw error; }
    }
    return { prepare: prepare, analyser: analyser };
})();
