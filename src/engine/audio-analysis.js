/* Psychedelia Studio - Audio analysis source router */
var AudioAnalysis = (function() {
    'use strict';

    var SIZE = 512;
    var DEFAULT_FFT_SIZE = 1024;
    var source = 'studio';
    var context = null;
    var listeners = [];
    var studioProvider = null;
    var fileEntry = null;
    var captureEntry = null;
    var fallbackWaveform = new Uint8Array(SIZE);
    var fallbackFft = new Uint8Array(SIZE);
    var fallbackTime = null;
    var metricSpectrum = new Float32Array(SIZE);
    var signalVersion = 0;
    var captureGeneration = 0;
    var fileRecordDest = null;
    var status = {
        state: 'fallback',
        source: 'fallback',
        label: 'Fallback',
        message: 'Audio fallback is active until a source is available.'
    };

    var sources = [
        { id: 'studio', label: 'Studio Music' },
        { id: 'file', label: 'Audio File' },
        { id: 'capture', label: 'Capture Playback' },
        { id: 'fallback', label: 'Fallback' }
    ];

    function init() {
        updateStatus(selectedSourceStatus(source), false);
        return true;
    }

    function getSource() {
        return source;
    }

    function getSourceList() {
        return sources.map(function(item) {
            return { id: item.id, label: item.label };
        });
    }

    function hasSource(id) {
        return sources.some(function(item) { return item.id === id; });
    }

    function preferredIdleSource() {
        return studioProvider ? 'studio' : 'fallback';
    }

    function providerReady(provider) {
        if (!provider) return false;
        if (typeof provider.isReady === 'function') {
            try { return !!provider.isReady(); } catch (err) { return false; }
        }
        return true;
    }

    function providerPlaying(provider) {
        if (!provider || typeof provider.isPlaying !== 'function') return false;
        try { return !!provider.isPlaying(); } catch (err) { return false; }
    }

    function studioStatusSnapshot() {
        var ready = providerReady(studioProvider);
        var playing = providerPlaying(studioProvider);
        return {
            state: ready ? (playing ? 'ready' : 'idle') : 'fallback',
            source: ready ? 'studio' : 'fallback',
            label: ready ? labelForSource('studio') : 'Fallback',
            message: ready ? (playing ? 'Studio Music active.' : 'Studio Music selected but not playing.') : 'Studio Music analyser is not ready; audio fallback is active.',
            active: playing,
            available: ready
        };
    }

    function selectedSourceStatus(id) {
        if (id === 'file') return getFileStatus();
        if (id === 'capture') return getCaptureStatus();
        if (id === 'fallback') {
            return {
                state: 'fallback',
                source: 'fallback',
                label: 'Fallback',
                message: 'Audio fallback is active.',
                active: false,
                available: false
            };
        }
        return studioStatusSnapshot();
    }

    function setSource(id) {
        if (!hasSource(id)) return false;
        if (id !== 'capture' && captureEntry && captureEntry.state === 'permission') stopCapture(false);
        if (source === id) return true;
        if (source === 'capture' && id !== 'capture') stopCapture(false);
        source = id;
        signalVersion++;
        updateStatus(selectedSourceStatus(id), true);
        return true;
    }

    function setStudioProvider(provider) {
        if (!provider || (typeof provider !== 'function' && typeof provider.getAnalysis !== 'function')) return false;
        studioProvider = provider;
        signalVersion++;
        if (source === 'studio') {
            updateStatus(selectedSourceStatus('studio'), true);
        }
        return true;
    }

    function labelForSource(id) {
        for (var i = 0; i < sources.length; i++) {
            if (sources[i].id === id) return sources[i].label;
        }
        return 'Audio';
    }

    function updateStatus(next, shouldNotify) {
        status = {
            state: next.state || status.state || 'idle',
            source: next.source || source,
            label: next.label || labelForSource(next.source || source),
            message: next.message || '',
            active: !!next.active,
            available: !!next.available
        };
        copyOptionalStatus(status, next, [
            'fileName',
            'duration',
            'currentTime',
            'playing',
            'loop',
            'gain',
            'hasFile',
            'audioTrackCount',
            'hasCapture'
        ]);
        if (shouldNotify) notify();
    }

    function copyOptionalStatus(target, sourceStatus, keys) {
        keys.forEach(function(key) {
            if (sourceStatus[key] !== undefined) target[key] = sourceStatus[key];
        });
    }

    function getStatus() {
        var copy = {};
        for (var key in status) copy[key] = status[key];
        return copy;
    }

    function onStatusChange(fn) {
        if (typeof fn !== 'function') return function() {};
        listeners.push(fn);
        return function() {
            listeners = listeners.filter(function(item) { return item !== fn; });
        };
    }

    function notify() {
        listeners.slice().forEach(function(fn) {
            try { fn(getStatus()); } catch (err) { /* noop */ }
        });
    }

    function ensureContext() {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return Promise.resolve(null);
        if (!context || context.state === 'closed') context = new AudioCtx();
        if (context.state === 'suspended' && context.resume) {
            return context.resume().then(function() { return context; }).catch(function() { return context; });
        }
        return Promise.resolve(context);
    }

    function makeFileEntry() {
        if (fileEntry) return fileEntry;
        var audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.controls = false;
        audio.loop = false;
        audio.playsInline = true;
        fileEntry = {
            audio: audio,
            objectUrl: '',
            fileName: '',
            state: 'empty',
            message: 'No audio file selected.',
            ready: false,
            loading: false,
            duration: 0,
            currentTime: 0,
            loop: false,
            gain: 1,
            sourceNode: null,
            gainNode: null,
            analyser: null,
            timeData: new Uint8Array(SIZE),
            freqData: new Uint8Array(SIZE)
        };
        audio.addEventListener('loadedmetadata', function() {
            fileEntry.ready = true;
            fileEntry.loading = false;
            fileEntry.duration = isFinite(audio.duration) ? audio.duration : 0;
            updateFileStatus(audio.paused ? 'idle' : 'ready', audio.paused ? 'Audio file loaded.' : '', true);
        });
        audio.addEventListener('timeupdate', function() {
            if (fileEntry.state === 'blocked' || fileEntry.state === 'error' || fileEntry.state === 'unsupported') return;
            fileEntry.currentTime = audio.currentTime || 0;
            updateFileStatus(audio.paused ? 'idle' : 'ready', '', true);
        });
        audio.addEventListener('play', function() {
            updateFileStatus('ready', '', true);
        });
        audio.addEventListener('pause', function() {
            if (fileEntry.state === 'blocked' || fileEntry.state === 'error' || fileEntry.state === 'unsupported') return;
            updateFileStatus(fileEntry.ready ? 'idle' : 'loading', fileEntry.ready ? 'Audio file paused.' : 'Loading audio file...', true);
        });
        audio.addEventListener('ended', function() {
            updateFileStatus('idle', 'Audio file ended.', true);
        });
        audio.addEventListener('error', function() {
            fileEntry.loading = false;
            fileEntry.ready = false;
            updateFileStatus('error', 'Audio file failed to load.', true);
        });
        return fileEntry;
    }

    function fileStatusFields() {
        var entry = makeFileEntry();
        return {
            fileName: entry.fileName,
            duration: entry.duration || (entry.audio && isFinite(entry.audio.duration) ? entry.audio.duration : 0),
            currentTime: entry.audio ? entry.audio.currentTime || 0 : 0,
            playing: !!(entry.audio && !entry.audio.paused && !entry.audio.ended),
            loop: !!entry.loop,
            gain: entry.gain,
            hasFile: !!entry.objectUrl
        };
    }

    function fileMessageFor(state, fields, message) {
        if (message) return message;
        if (!fields.hasFile) return 'No audio file selected.';
        if (state === 'loading') return 'Loading audio file...';
        if (state === 'blocked') return 'Audio file playback was blocked. Press play again.';
        if (state === 'error') return 'Audio file failed to load.';
        if (state === 'unsupported') return 'Audio file playback is not supported in this browser.';
        if (state === 'ended') return 'Audio file ended.';
        return fields.playing ? 'Audio file playing.' : 'Audio file paused.';
    }

    function updateFileStatus(state, message, shouldNotify) {
        var fields = fileStatusFields();
        var entry = makeFileEntry();
        var nextMessage = fileMessageFor(state, fields, message);
        entry.state = state;
        entry.message = nextMessage;
        updateStatus({
            state: state,
            source: 'file',
            label: labelForSource('file'),
            message: nextMessage,
            active: fields.playing,
            available: fields.hasFile && (state === 'ready' || state === 'idle' || state === 'loading'),
            fileName: fields.fileName,
            duration: fields.duration,
            currentTime: fields.currentTime,
            playing: fields.playing,
            loop: fields.loop,
            gain: fields.gain,
            hasFile: fields.hasFile
        }, shouldNotify);
    }

    function getFileStatus() {
        var fields = fileStatusFields();
        var entry = makeFileEntry();
        var state = entry.state || (entry.ready ? (fields.playing ? 'ready' : 'idle') : (entry.loading ? 'loading' : 'empty'));
        if (!fields.hasFile && state !== 'unsupported' && state !== 'error') state = 'empty';
        var storedMessage = state === 'empty' ? '' : entry.message;
        return {
            state: state,
            source: 'file',
            label: labelForSource('file'),
            message: fileMessageFor(state, fields, storedMessage),
            active: fields.playing,
            available: fields.hasFile && !!(fileEntry && (fileEntry.ready || fileEntry.loading)),
            fileName: fields.fileName,
            duration: fields.duration,
            currentTime: fields.currentTime,
            playing: fields.playing,
            loop: fields.loop,
            gain: fields.gain,
            hasFile: fields.hasFile
        };
    }

    function setupFileGraph() {
        var entry = makeFileEntry();
        return ensureContext().then(function(ctx) {
            if (!ctx) {
                updateFileStatus('unsupported', 'Web Audio is not available in this browser.', true);
                return false;
            }
            if (!entry.sourceNode) entry.sourceNode = ctx.createMediaElementSource(entry.audio);
            if (!entry.gainNode) {
                entry.gainNode = ctx.createGain();
                entry.gainNode.gain.value = entry.gain;
            }
            if (!entry.analyser) {
                entry.analyser = ctx.createAnalyser();
                entry.analyser.fftSize = DEFAULT_FFT_SIZE;
                entry.analyser.smoothingTimeConstant = 0;
                entry.analyser.minDecibels = -100; entry.analyser.maxDecibels = -30;
            }
            try { entry.sourceNode.disconnect(); } catch (err) { /* noop */ }
            try { entry.gainNode.disconnect(); } catch (err2) { /* noop */ }
            try { entry.analyser.disconnect(); } catch (err3) { /* noop */ }
            entry.sourceNode.connect(entry.gainNode);
            entry.gainNode.connect(entry.analyser);
            entry.analyser.connect(ctx.destination);
            if (fileRecordDest) entry.gainNode.connect(fileRecordDest);
            return true;
        });
    }

    function revokeFileUrl(entry) {
        if (entry && entry.objectUrl && window.URL && URL.revokeObjectURL) {
            try { URL.revokeObjectURL(entry.objectUrl); } catch (err) { /* noop */ }
        }
    }

    function loadFile(file) {
        var entry = makeFileEntry();
        if (!file) {
            updateFileStatus('empty', 'No audio file selected.', true);
            return Promise.resolve(false);
        }
        if (!window.URL || !URL.createObjectURL) {
            updateFileStatus('unsupported', 'Audio file URLs are not available in this browser.', true);
            return Promise.resolve(false);
        }
        revokeFileUrl(entry);
        try { entry.audio.pause(); } catch (err) { /* noop */ }
        entry.ready = false;
        entry.loading = true;
        entry.fileName = file.name || 'Selected audio';
        entry.file = file;
        entry.duration = 0;
        entry.currentTime = 0;
        entry.objectUrl = URL.createObjectURL(file);
        entry.audio.loop = entry.loop;
        entry.audio.src = entry.objectUrl;
        entry.audio.load();
        setSource('file');
        signalVersion++;
        updateFileStatus('loading', 'Loading audio file...', true);
        return setupFileGraph().then(function(ok) {
            if (!ok) return false;
            updateFileStatus('loading', 'Loading audio file...', true);
            return true;
        }).catch(function() {
            updateFileStatus('error', 'Audio file analyser failed to initialize.', true);
            return false;
        });
    }

    function playFile() {
        var entry = makeFileEntry();
        if (!entry.objectUrl) {
            updateFileStatus('empty', 'No audio file selected.', true);
            return Promise.resolve(false);
        }
        setSource('file');
        return setupFileGraph().then(function(ok) {
            if (!ok) return false;
            return entry.audio.play().then(function() {
                updateFileStatus('ready', '', true);
                return true;
            }).catch(function() {
                updateFileStatus('blocked', 'Audio file playback was blocked. Press play again.', true);
                return false;
            });
        });
    }

    function pauseFile() {
        var entry = makeFileEntry();
        try { entry.audio.pause(); } catch (err) { /* noop */ }
        updateFileStatus(entry.objectUrl ? 'idle' : 'empty', entry.objectUrl ? 'Audio file paused.' : 'No audio file selected.', true);
        return true;
    }

    function seekFile(seconds) {
        var entry = makeFileEntry();
        if (!entry.objectUrl) return false;
        var duration = isFinite(entry.audio.duration) ? entry.audio.duration : 0;
        var next = Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, Number(seconds) || 0));
        try { entry.audio.currentTime = next; } catch (err) { return false; }
        signalVersion++;
        entry.currentTime = next;
        updateFileStatus(entry.audio.paused ? 'idle' : 'ready', '', true);
        return true;
    }

    function setFileLoop(enabled) {
        var entry = makeFileEntry();
        entry.loop = !!enabled;
        entry.audio.loop = entry.loop;
        updateFileStatus(entry.objectUrl ? (entry.audio.paused ? 'idle' : 'ready') : 'empty', '', true);
        return entry.loop;
    }

    function setFileGain(value) {
        var entry = makeFileEntry();
        var gain = Math.max(0, Math.min(2, Number(value)));
        if (!isFinite(gain)) gain = 1;
        entry.gain = gain;
        if (entry.gainNode) entry.gainNode.gain.value = gain;
        updateFileStatus(entry.objectUrl ? (entry.audio.paused ? 'idle' : 'ready') : 'empty', '', true);
        return gain;
    }

    function clearFile() {
        var entry = makeFileEntry();
        try { entry.audio.pause(); } catch (err) { /* noop */ }
        revokeFileUrl(entry);
        entry.objectUrl = '';
        entry.fileName = '';
        entry.file = null;
        entry.state = 'empty';
        entry.message = 'No audio file selected.';
        entry.ready = false;
        entry.loading = false;
        entry.duration = 0;
        entry.currentTime = 0;
        entry.audio.removeAttribute('src');
        try { entry.audio.load(); } catch (err2) { /* noop */ }
        if (source === 'file') source = preferredIdleSource();
        updateStatus(selectedSourceStatus(source), true);
        return true;
    }

    function makeCaptureEntry() {
        if (captureEntry) return captureEntry;
        captureEntry = {
            stream: null,
            sourceNode: null,
            gainNode: null,
            analyser: null,
            timeData: new Uint8Array(SIZE),
            freqData: new Uint8Array(SIZE),
            audioTrackCount: 0,
            active: false,
            state: 'idle',
            message: 'Capture Playback idle.'
        };
        return captureEntry;
    }

    function captureStatusFields() {
        var entry = makeCaptureEntry();
        return {
            audioTrackCount: entry.audioTrackCount || 0,
            hasCapture: !!entry.stream,
            active: !!entry.active
        };
    }

    function updateCaptureStatus(state, message, shouldNotify) {
        var fields = captureStatusFields();
        var entry = makeCaptureEntry();
        entry.state = state;
        entry.message = message || captureMessageFor(state, fields);
        updateStatus({
            state: state,
            source: 'capture',
            label: labelForSource('capture'),
            message: entry.message,
            active: fields.active,
            available: fields.hasCapture && fields.audioTrackCount > 0,
            audioTrackCount: fields.audioTrackCount,
            hasCapture: fields.hasCapture
        }, shouldNotify);
    }

    function captureMessageFor(state, fields) {
        if (state === 'permission') return 'Waiting for capture selection.';
        if (state === 'unsupported') return 'Capture Playback is not available in this browser.';
        if (state === 'blocked') return 'Capture permission denied or unavailable.';
        if (state === 'no-audio-track') return 'No audio track was returned for that capture source.';
        if (state === 'error') return 'Capture Playback analyser failed to initialize.';
        if (state === 'ready' && fields.active) return 'Capture Playback active.';
        if (state === 'idle' && fields.hasCapture) return 'Capture Playback idle.';
        return 'Capture Playback idle.';
    }

    function getCaptureStatus() {
        var fields = captureStatusFields();
        var entry = makeCaptureEntry();
        var state = entry.state || (fields.hasCapture ? (fields.active ? 'ready' : 'idle') : 'idle');
        if (!fields.hasCapture && state === 'ready') state = 'idle';
        return {
            state: state,
            source: 'capture',
            label: labelForSource('capture'),
            message: entry.message || captureMessageFor(state, fields),
            active: fields.active,
            available: fields.hasCapture && fields.audioTrackCount > 0,
            audioTrackCount: fields.audioTrackCount,
            hasCapture: fields.hasCapture
        };
    }

    function displayCaptureConstraints(advanced) {
        if (!advanced) return { video: true, audio: true };
        return {
            video: true,
            audio: true,
            systemAudio: 'include',
            windowAudio: 'system',
            selfBrowserSurface: 'exclude',
            surfaceSwitching: 'include'
        };
    }

    function stopStream(stream) {
        if (!stream || !stream.getTracks) return;
        stream.getTracks().forEach(function(track) {
            try { track.stop(); } catch (err) { /* noop */ }
        });
    }

    function disconnectCapture(entry) {
        if (!entry) return;
        try { entry.sourceNode && entry.sourceNode.disconnect(); } catch (err) { /* noop */ }
        try { entry.gainNode && entry.gainNode.disconnect(); } catch (err2) { /* noop */ }
        try { entry.analyser && entry.analyser.disconnect(); } catch (err3) { /* noop */ }
        entry.sourceNode = null;
        entry.gainNode = null;
        entry.analyser = null;
    }

    function startCapture() {
        var entry = makeCaptureEntry();
        var previousSource = source === 'capture' ? 'studio' : source;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            entry.message = 'Capture Playback is not available in this browser.';
            updateCaptureStatus('unsupported', entry.message, true);
            return Promise.resolve(false);
        }
        stopCapture(false);
        var generation = captureGeneration;
        entry = makeCaptureEntry();
        entry.message = 'Waiting for capture selection.';
        updateCaptureStatus('permission', entry.message, true);
        return navigator.mediaDevices.getDisplayMedia(displayCaptureConstraints(true)).catch(function(err) {
            if (generation !== captureGeneration) throw err;
            if (err && err.name === 'TypeError') return navigator.mediaDevices.getDisplayMedia(displayCaptureConstraints(false));
            throw err;
        }).then(function(stream) {
            if (generation !== captureGeneration) { stopStream(stream); return false; }
            var audioTracks = stream && stream.getAudioTracks ? stream.getAudioTracks() : [];
            if (!audioTracks.length) {
                stopStream(stream);
                source = previousSource || 'studio';
                entry.message = 'No audio track was returned for that capture source.';
                updateCaptureStatus('no-audio-track', entry.message, true);
                return false;
            }
            return ensureContext().then(function(ctx) {
                if (generation !== captureGeneration) { stopStream(stream); return false; }
                if (!ctx) {
                    stopStream(stream);
                    source = previousSource || 'studio';
                    entry.message = 'Web Audio is not available in this browser.';
                    updateCaptureStatus('unsupported', entry.message, true);
                    return false;
                }
                try {
                    entry.stream = stream;
                    entry.audioTrackCount = audioTracks.length;
                    entry.sourceNode = ctx.createMediaStreamSource(stream);
                    entry.gainNode = ctx.createGain();
                    entry.gainNode.gain.value = 1;
                    entry.analyser = ctx.createAnalyser();
                    entry.analyser.fftSize = DEFAULT_FFT_SIZE;
                    entry.analyser.smoothingTimeConstant = 0;
                    entry.analyser.minDecibels = -100; entry.analyser.maxDecibels = -30;
                    entry.sourceNode.connect(entry.gainNode);
                    entry.gainNode.connect(entry.analyser);
                    entry.active = true;
                    entry.message = '';
                    source = 'capture';
                    signalVersion++;
                    stream.getTracks().forEach(function(track) {
                        track.addEventListener('ended', function() {
                            if (captureEntry === entry && entry.stream) stopCapture('Capture ended.');
                        }, { once: true });
                    });
                    updateCaptureStatus('ready', '', true);
                    return true;
                } catch (err) {
                    stopStream(stream);
                    disconnectCapture(entry);
                    entry.stream = null;
                    entry.audioTrackCount = 0;
                    entry.active = false;
                    source = previousSource || 'studio';
                    entry.message = 'Capture Playback analyser failed to initialize.';
                    updateCaptureStatus('error', entry.message, true);
                    return false;
                }
            });
        }).catch(function() {
            if (generation !== captureGeneration) return false;
            source = previousSource || 'studio';
            entry.message = 'Capture permission denied or unavailable.';
            updateCaptureStatus('blocked', entry.message, true);
            return false;
        });
    }

    function stopCapture(message) {
        captureGeneration++;
        var entry = makeCaptureEntry();
        var stream = entry.stream;
        entry.stream = null;
        entry.active = false;
        stopStream(stream);
        disconnectCapture(entry);
        entry.audioTrackCount = 0;
        entry.state = 'idle';
        entry.message = typeof message === 'string' ? message : 'Capture Playback stopped.';
        if (source === 'capture') source = 'studio';
        updateStatus({
            state: 'idle',
            source: source,
            label: labelForSource(source),
            message: entry.message,
            active: false,
            available: false,
            audioTrackCount: 0,
            hasCapture: false
        }, message !== false);
        return true;
    }

    function currentTime(options) {
        if (options && typeof options.time === 'number') return options.time;
        if (options && options.uniformState && typeof options.uniformState.time === 'number') return options.uniformState.time;
        return typeof performance !== 'undefined' && performance.now ? performance.now() / 1000 : Date.now() / 1000;
    }

    function fillFallback(t) {
        if (fallbackTime !== null && Math.abs(fallbackTime - t) < 0.0001) return;
        fallbackTime = t;
        var pulse = 0.5 + 0.5 * Math.sin(t * 2.0);
        for (var i = 0; i < SIZE; i++) {
            var x = i / SIZE;
            var wave = 0.5 + 0.32 * Math.sin(t * 4.0 + i * 0.07) + 0.13 * Math.sin(t * 1.7 + i * 0.021);
            var falloff = Math.max(0, 1.0 - x);
            var fft = Math.pow(falloff, 1.65) * (0.35 + 0.45 * pulse);
            fft += 0.18 * Math.max(0, Math.sin(t * 5.0 + i * 0.035)) * falloff;
            fallbackWaveform[i] = clampByte(wave * 255);
            fallbackFft[i] = clampByte(fft * 255);
        }
    }

    function clampByte(value) {
        if (!isFinite(value)) return 0;
        return Math.max(0, Math.min(255, Math.round(value)));
    }

    function sampleValue(array, index, byteData) {
        if (!array || array[index] === undefined) return 0;
        var value = Number(array[index]);
        if (!isFinite(value)) return 0;
        return byteData ? value / 255 : value;
    }

    function computeMetrics(waveform, fft, byteData, metadata) {
        var analysis = Object.assign({ waveform: waveform, fft: fft, byteData: byteData,
            sampleRate: context && context.sampleRate || 44100, fftSize: DEFAULT_FFT_SIZE,
            fftScale: byteData ? 'normalized-db' : 'linear', fftMinDecibels: -100, fftMaxDecibels: -30 }, metadata || {});
        metricSpectrum = AudioSignal.linear(analysis, metricSpectrum);
        analysis.linearSpectrum = metricSpectrum;
        var metrics = AudioSignal.measure(analysis);
        // Compatibility field: beat detection belongs to the reactor. Reading
        // its previous result does not advance any detector or duplicate hits.
        var reactor = typeof AudioReactor !== 'undefined' ? AudioReactor.getState() : null;
        metrics.beat = reactor && reactor.source === source ? reactor.beat : 0;
        return metrics;
    }

    function clamp01(value) {
        if (!isFinite(value)) return 0;
        return Math.max(0, Math.min(1, value));
    }

    function fallbackAnalysis(options, message) {
        var t = currentTime(options);
        fillFallback(t);
        var metrics = computeMetrics(fallbackWaveform, fallbackFft, true);
        updateStatus({
            state: 'fallback',
            source: 'fallback',
            label: 'Fallback',
            message: message || 'Audio fallback is active until a source is available.',
            active: false,
            available: false
        }, false);
        return {
            available: false,
            active: false,
            source: 'fallback',
            label: 'Fallback',
            message: status.message,
            waveform: fallbackWaveform,
            fft: fallbackFft,
            byteData: true,
            sampleRate: context && context.sampleRate || 44100,
            fftSize: DEFAULT_FFT_SIZE,
            time: t,
            level: metrics.level,
            bass: metrics.bass,
            mid: metrics.mid,
            treble: metrics.treble,
            beat: metrics.beat
        };
    }

    function callProvider(provider) {
        if (!provider) return null;
        if (typeof provider === 'function') return provider();
        if (typeof provider.getAnalysis === 'function') return provider.getAnalysis();
        return null;
    }

    function normalizeArray(input, byteData, silence) {
        if (!input) return (byteData ? new Uint8Array(SIZE) : new Float32Array(SIZE)).fill(silence);
        if (input.length === SIZE) return input;
        if (input.length > SIZE && input.subarray) return input.subarray(0, SIZE);
        var normalized = byteData ? new Uint8Array(SIZE) : new Float32Array(SIZE);
        for (var i = 0; i < SIZE; i++) {
            normalized[i] = input[i] !== undefined && isFinite(Number(input[i])) ? input[i] : silence;
        }
        return normalized;
    }

    function analysisFromProvider(provider, providerAnalysis, options) {
        var available = !!(providerAnalysis && providerAnalysis.available);
        if (!available) return fallbackAnalysis(options, 'Studio Music analyser is not ready; audio fallback is active.');

        var playing = providerAnalysis.playing !== undefined ? !!providerAnalysis.playing : !!providerAnalysis.active;
        var active = providerAnalysis.active !== undefined ? !!providerAnalysis.active : playing;
        if (!active) return fallbackAnalysis(options, 'Studio Music selected but not playing; audio fallback is active.');

        var t = currentTime(options);
        var byteData = !!providerAnalysis.byteData;
        // Missing live samples must be silence, never synthetic fallback or
        // byte values accidentally interpreted as normalized floats.
        var waveform = normalizeArray(providerAnalysis.waveform, byteData, byteData ? 128 : 0.5);
        var fft = normalizeArray(providerAnalysis.fft, byteData, 0);
        var metrics = computeMetrics(waveform, providerAnalysis.fft || fft, byteData, providerAnalysis);
        var state = active ? 'ready' : 'idle';
        var message = active ? '' : 'Studio Music selected but not playing.';
        updateStatus({
            state: state,
            source: 'studio',
            label: labelForSource('studio'),
            message: message,
            active: active,
            available: true
        }, false);
        return {
            available: true,
            active: active,
            source: 'studio',
            label: labelForSource('studio'),
            message: message,
            waveform: waveform,
            fft: fft,
            spectrum: providerAnalysis.fft || fft,
            signalVersion: signalVersion + ':' + (providerAnalysis.signalVersion || 0),
            byteData: byteData,
            sampleRate: providerAnalysis.sampleRate || (context && context.sampleRate) || 44100,
            fftSize: providerAnalysis.fftSize || DEFAULT_FFT_SIZE,
            fftScale: providerAnalysis.fftScale || (byteData ? 'normalized-db' : 'linear'),
            fftMinDecibels: providerAnalysis.fftMinDecibels === undefined ? -100 : providerAnalysis.fftMinDecibels,
            fftMaxDecibels: providerAnalysis.fftMaxDecibels === undefined ? -30 : providerAnalysis.fftMaxDecibels,
            time: providerAnalysis.time !== undefined ? providerAnalysis.time : t,
            level: providerAnalysis.level !== undefined ? clamp01(providerAnalysis.level) : metrics.level,
            bass: providerAnalysis.bass !== undefined ? clamp01(providerAnalysis.bass) : metrics.bass,
            mid: providerAnalysis.mid !== undefined ? clamp01(providerAnalysis.mid) : metrics.mid,
            treble: providerAnalysis.treble !== undefined ? clamp01(providerAnalysis.treble) : metrics.treble,
            beat: providerAnalysis.beat !== undefined ? clamp01(providerAnalysis.beat) : metrics.beat
        };
    }

    function studioAnalysis(options) {
        if (!studioProvider) return fallbackAnalysis(options, 'Studio Music analyser is not ready; audio fallback is active.');
        try {
            var providerAnalysis = callProvider(studioProvider);
            return analysisFromProvider(studioProvider, providerAnalysis, options);
        } catch (err) {
            return fallbackAnalysis(options, 'Studio Music analyser failed; audio fallback is active.');
        }
    }

    function fileAnalysis(options) {
        var entry = makeFileEntry();
        if (!entry.objectUrl || !entry.analyser) return fallbackAnalysis(options, 'Audio file is not ready; audio fallback is active.');
        try {
            entry.analyser.getByteTimeDomainData(entry.timeData);
            entry.analyser.getByteFrequencyData(entry.freqData);
        } catch (err) {
            return fallbackAnalysis(options, 'Audio file analyser failed; audio fallback is active.');
        }
        var fields = fileStatusFields();
        var metrics = computeMetrics(entry.timeData, entry.freqData, true);
        if (entry.state !== 'blocked' && entry.state !== 'error' && entry.state !== 'unsupported') {
            updateFileStatus(fields.playing ? 'ready' : 'idle', fields.playing ? '' : 'Audio file paused.', false);
        }
        return {
            available: true,
            active: fields.playing,
            source: 'file',
            label: labelForSource('file'),
            message: fields.playing ? '' : 'Audio file paused.',
            waveform: entry.timeData,
            fft: entry.freqData,
            signalVersion: signalVersion,
            byteData: true,
            sampleRate: context && context.sampleRate || 44100,
            fftSize: entry.analyser.fftSize || DEFAULT_FFT_SIZE,
            fftScale: 'normalized-db', fftMinDecibels: entry.analyser.minDecibels, fftMaxDecibels: entry.analyser.maxDecibels,
            time: fields.currentTime,
            level: metrics.level,
            bass: metrics.bass,
            mid: metrics.mid,
            treble: metrics.treble,
            beat: metrics.beat
        };
    }

    function captureAnalysis(options) {
        var entry = makeCaptureEntry();
        if (!entry.stream || !entry.analyser) return fallbackAnalysis(options, 'Capture Playback is not ready; audio fallback is active.');
        try {
            entry.analyser.getByteTimeDomainData(entry.timeData);
            entry.analyser.getByteFrequencyData(entry.freqData);
        } catch (err) {
            return fallbackAnalysis(options, 'Capture Playback analyser failed; audio fallback is active.');
        }
        var metrics = computeMetrics(entry.timeData, entry.freqData, true);
        updateCaptureStatus('ready', '', false);
        return {
            available: true,
            active: true,
            source: 'capture',
            label: labelForSource('capture'),
            message: '',
            waveform: entry.timeData,
            fft: entry.freqData,
            signalVersion: signalVersion,
            byteData: true,
            sampleRate: context && context.sampleRate || 44100,
            fftSize: entry.analyser.fftSize || DEFAULT_FFT_SIZE,
            fftScale: 'normalized-db', fftMinDecibels: entry.analyser.minDecibels, fftMaxDecibels: entry.analyser.maxDecibels,
            time: currentTime(options),
            level: metrics.level,
            bass: metrics.bass,
            mid: metrics.mid,
            treble: metrics.treble,
            beat: metrics.beat
        };
    }

    // Audio for video recording: the audio file (as heard) and any captured
    // playback. Returns MediaStreams with audio tracks.
    function getRecordStreams() {
        var out = [];
        if (fileEntry && fileEntry.gainNode && context) {
            if (!fileRecordDest) {
                fileRecordDest = context.createMediaStreamDestination();
                fileEntry.gainNode.connect(fileRecordDest);
            }
            out.push(fileRecordDest.stream);
        }
        if (captureEntry && captureEntry.stream) {
            var tracks = captureEntry.stream.getAudioTracks();
            if (tracks.length) out.push(new MediaStream(tracks));
        }
        return out;
    }

    function getAnalysis(options) {
        if (typeof VideoExport !== 'undefined' && VideoExport.isFrameExport && VideoExport.isFrameExport()) {
            var offline = VideoExport.getOfflineAnalysis && VideoExport.getOfflineAnalysis();
            if (offline) return offline;
            return fallbackAnalysis(options, 'Video-only export.');
        }
        if (source === 'studio') return studioAnalysis(options);
        if (source === 'file') return fileAnalysis(options);
        if (source === 'capture') return captureAnalysis(options);
        if (source === 'fallback') return fallbackAnalysis(options, 'Audio fallback is active.');
        return fallbackAnalysis(options, labelForSource(source) + ' is not ready; audio fallback is active.');
    }

    function dispose() {
        listeners = [];
        if (context && context.close) {
            try { context.close(); } catch (err) { /* noop */ }
        }
        context = null;
        if (fileEntry) {
            clearFile();
            try { fileEntry.sourceNode && fileEntry.sourceNode.disconnect(); } catch (err2) { /* noop */ }
            try { fileEntry.gainNode && fileEntry.gainNode.disconnect(); } catch (err3) { /* noop */ }
            try { fileEntry.analyser && fileEntry.analyser.disconnect(); } catch (err4) { /* noop */ }
            fileEntry = null;
        }
        if (captureEntry) {
            stopCapture(false);
            captureEntry = null;
        }
        fallbackTime = null;
        fileRecordDest = null;
    }

    return {
        init: init,
        setSource: setSource,
        getSource: getSource,
        getSourceList: getSourceList,
        setStudioProvider: setStudioProvider,
        loadFile: loadFile,
        playFile: playFile,
        pauseFile: pauseFile,
        seekFile: seekFile,
        setFileLoop: setFileLoop,
        setFileGain: setFileGain,
        clearFile: clearFile,
        getFileStatus: getFileStatus,
        getFile: function() { return fileEntry && fileEntry.file || null; },
        startCapture: startCapture,
        stopCapture: stopCapture,
        getCaptureStatus: getCaptureStatus,
        getStatus: getStatus,
        onStatusChange: onStatusChange,
        getAnalysis: getAnalysis,
        getRecordStreams: getRecordStreams,
        dispose: dispose,
        ensureContext: ensureContext
    };
})();
