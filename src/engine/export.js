/* Psychedelia Studio - Video Export (WebCodecs and MediaRecorder)
 * Records the effect canvas plus overlays, with the app's sound (studio
 * music, audio file and captured playback mixed together). MP4 (H.264 +
 * AAC) is used when the browser can encode it, otherwise WebM (VP9 + Opus).
 * Bitrate follows a quality preset scaled by resolution and frame rate.
 * Smooth MP4 exports use a fixed animation step and encoder backpressure;
 * live recordings use wall time and can miss frames when rendering is slow.
 */
var VideoExport = (function() {
    'use strict';

    var mediaRecorder = null;
    var chunks = [];
    var recording = false;
    var onStopCallback = null;
    var lastError = '';
    var lastInfo = '';
    var captureCanvas = null;
    var captureCtx = null;
    var captureStream = null;
    var recordStream = null;
    var audioMix = null;
    var captureFrameId = null;
    var captureSourceCanvas = null;
    var captureActive = false;
    var captureFps = 30;
    var captureLastDraw = 0;
    var currentMime = '';
    var stopTimer = null;
    var recordStart = 0;
    var recordDuration = 0;     // seconds; 0 = until stopped
    var recordBytes = 0;
    var recordBitrate = 0;      // video + audio bits per second, for size estimates
    var indicatorTimer = null;
    var finalizing = false;     // stopped, still writing the file
    var pendingPreparation = false;
    var renderJob = null;       // Dedicated Render MP4 request; live preferences are restored afterward.
    var timedCallback = null;   // save callback of the current timed recording

    var options = { format: 'mp4', quality: 'high', audio: 'all', detail: 'adaptive', mode: 'live' };
    var videoTrack = null;
    var wc = null;             // WebCodecs session (MP4 path)
    var wcSupport = null;      // { h264, aac } once probed
    var frameLocked = false;   // frames pushed by the renderer (requestFrame) instead of sampled

    // Bits per pixel per frame for each preset; bitrate = w * h * fps * bpp.
    var QUALITY = {
        draft: { label: 'Draft', bpp: 0.06, audio: 128000 },
        standard: { label: 'Standard', bpp: 0.12, audio: 160000 },
        high: { label: 'High', bpp: 0.22, audio: 192000 },
        very_high: { label: 'Very High', bpp: 0.35, audio: 256000 },
        max: { label: 'Maximum', bpp: 0.55, audio: 320000 }
    };

    var BLEND_MODES = {
        normal: 'source-over',
        multiply: 'multiply',
        screen: 'screen',
        overlay: 'overlay',
        'hard-light': 'hard-light',
        difference: 'difference'
    };

    function typeSupported(mime) {
        try { return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime); } catch (err) { return false; }
    }

    // H.264 levels (High profile): [level id, max macroblocks/s, max frame size in
    // macroblocks, max bitrate in kbps]. Players use the level to decide whether
    // they can play a file, so it has to cover the frame size and bitrate too.
    var AVC_LEVELS = [
        ['28', 245760, 8192, 25000],     // 4.0
        ['29', 245760, 8192, 62500],     // 4.1
        ['2a', 522240, 8704, 62500],     // 4.2
        ['32', 589824, 22080, 168750],   // 5.0
        ['33', 983040, 36864, 300000],   // 5.1
        ['34', 2073600, 36864, 300000]   // 5.2
    ];

    function avcLevel(w, h, fps, bitrate) {
        var frame = Math.ceil(w / 16) * Math.ceil(h / 16);
        var rate = frame * (fps || 30);
        var kbps = (bitrate || 0) / 1000;
        for (var i = 0; i < AVC_LEVELS.length; i++) {
            var L = AVC_LEVELS[i];
            if (rate <= L[1] && frame <= L[2] && kbps <= L[3]) return L[0];
        }
        return '34';
    }

    function candidates(format, withAudio, w, h, fps) {
        if (format === 'mp4') {
            var lv = avcLevel(w, h, fps, videoBitrate(w, h, fps, options.quality));
            var v = ['avc1.6400' + lv, 'avc1.4d00' + lv, 'avc1.42e0' + lv, 'avc1'];
            var list = [];
            v.forEach(function(c) {
                if (withAudio) {
                    list.push('video/mp4;codecs=' + c + ',mp4a.40.2');
                    list.push('video/mp4;codecs=' + c + ',opus');
                } else {
                    list.push('video/mp4;codecs=' + c);
                }
            });
            list.push('video/mp4');
            return list;
        }
        return withAudio ?
            ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'] :
            ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    }

    function pickMime(format, withAudio, w, h, fps) {
        var list = candidates(format, withAudio, w, h, fps);
        for (var i = 0; i < list.length; i++) if (typeSupported(list[i])) return list[i];
        return '';
    }

    function getFormats() {
        return [
            { id: 'mp4', label: 'MP4 (H.264 + AAC)', supported: formatSupported('mp4', 1280, 720, 30) },
            { id: 'webm', label: 'WebM (VP9 + Opus)', supported: formatSupported('webm', 1280, 720, 30) }
        ];
    }

    function isSupported() {
        if (wcSupport && wcSupport.h264 && typeof HTMLCanvasElement !== 'undefined') return true;
        return typeof MediaRecorder !== 'undefined' &&
               typeof HTMLCanvasElement !== 'undefined' &&
               !!HTMLCanvasElement.prototype.captureStream &&
               (!!pickMime('mp4', false, 1280, 720, 30) || !!pickMime('webm', false, 1280, 720, 30));
    }

    function getMimeType() {
        return pickMime(options.format, false, 1280, 720, 30) || pickMime('webm', false, 1280, 720, 30);
    }

    function videoBitrate(w, h, fps, quality) {
        var q = QUALITY[quality] || QUALITY.high;
        return Math.round(Math.max(2e6, Math.min(150e6, w * h * (fps || 30) * q.bpp)));
    }

    function setOptions(next) {
        if (recording || finalizing || pendingPreparation) return getOptions();
        next = next || {};
        if (next.format === 'mp4' || next.format === 'webm') options.format = next.format;
        if (QUALITY[next.quality]) options.quality = next.quality;
        if (next.audio === 'all' || next.audio === 'none') options.audio = next.audio;
        if (next.detail === 'adaptive' || next.detail === 'full') options.detail = next.detail;
        if (next.mode === 'live' || next.mode === 'smooth') options.mode = next.mode;
        return getOptions();
    }

    function getOptions() { return { format: options.format, quality: options.quality, audio: options.audio, detail: options.detail, mode: options.mode }; }

    // Plain-language summary for the Output panel.
    function formatSupported(fmt, w, h, fps) {
        if (fmt === 'mp4' && wcSupport && wcSupport.h264) return true;
        return !!pickMime(fmt, false, w, h, fps);
    }

    // Audio bitrate the recording will really use for the current format.
    function audioBitrateFor(fmt) {
        var q = QUALITY[options.quality] || QUALITY.high;
        return fmt === 'mp4' && wcSupport && wcSupport.aac ? aacBitrate(q.audio) : q.audio;
    }

    // Whether the hardware H.264 encoder takes this size and frame rate. Without
    // it the browser encodes in software, which can't keep up at 4K 60 fps.
    // Cached per setting; resolves true when a new answer came in.
    var hwCache = {};
    function hwKey(w, h, fps) { return w + 'x' + h + '@' + fps + ':' + options.quality; }
    function checkHardware(w, h, fps) {
        var key = hwKey(w, h, fps);
        if (key in hwCache || typeof VideoEncoder === 'undefined') return Promise.resolve(false);
        var bitrate = videoBitrate(w, h, fps, options.quality);
        hwCache[key] = undefined;
        return VideoEncoder.isConfigSupported({
            codec: 'avc1.6400' + avcLevel(w, h, fps, bitrate), width: w, height: h, framerate: fps, bitrate: bitrate,
            hardwareAcceleration: 'prefer-hardware', avc: { format: 'avc' }
        }).then(function(r) { hwCache[key] = !!r.supported; return true; })
          .catch(function() { hwCache[key] = null; return false; });
    }

    // extra: text placed before any warning (the app adds the recording length).
    function describe(w, h, fps, extra) {
        if (options.mode === 'smooth') {
            return 'Smooth MP4 - ' + h + 'p at ' + fps + ' fps. Renders every frame at full detail; may take longer than playback. ' +
                (options.audio === 'none' ? 'Video only, without audio reactions.' : 'Sound and beat reactions from the selected Audio Source. Studio starts a new take; files start at their current position. Capture Playback needs live recording.') + ' Choose a recording length.';
        }
        var fmt = options.format;
        var note = '';
        if (!formatSupported(fmt, w, h, fps)) {
            fmt = fmt === 'mp4' ? 'webm' : 'mp4';
            if (!formatSupported(fmt, w, h, fps)) return 'Recording is not supported in this browser.';
            note = ' (' + options.format.toUpperCase() + ' not supported here, using ' + fmt.toUpperCase() + ')';
        }
        var vbps = videoBitrate(w, h, fps, options.quality);
        var abps = options.audio === 'none' ? 0 : audioBitrateFor(fmt);
        var mbps = vbps / 1e6;
        var sizePerMin = (vbps + abps) * 60 / 8 / 1048576;
        var warn = '';
        if (fmt === 'mp4' && hwCache[hwKey(w, h, fps)] === false) {
            warn = '. Hardware encoding was not confirmed for these settings. Live recording may drop frames; use Smooth MP4 for video with every frame';
        } else if (fmt === 'webm' && h >= 1440) {
            warn = '. High-resolution live recording may drop frames if rendering or encoding cannot keep up';
        }
        return fmt.toUpperCase() + note + ' - ' + h + 'p' + fps + ' - ' + mbps.toFixed(mbps < 10 ? 1 : 0) + ' Mbps (~' +
            Math.round(sizePerMin) + ' MB/min) - ' + (abps ? 'with sound (' + Math.round(abps / 1000) + ' kbps)' : 'no sound') +
            (extra ? ' - ' + extra : '') + warn;
    }

    function setLastError(message) {
        lastError = String(message || 'Recording failed.');
        return false;
    }

    function getLastError() {
        return lastError;
    }

    function overlayCanvas(id) {
        var canvas = document.getElementById(id);
        if (!canvas || canvas.width <= 0 || canvas.height <= 0) return null;
        return canvas;
    }

    function currentBlendMode(canvas) {
        if (!canvas) return 'source-over';
        var mode = '';
        try {
            mode = window.getComputedStyle ? window.getComputedStyle(canvas).mixBlendMode : canvas.style.mixBlendMode;
        } catch (err) {
            mode = canvas.style && canvas.style.mixBlendMode || '';
        }
        return BLEND_MODES[mode || 'normal'] || 'source-over';
    }

    function ensureCaptureCanvas(source) {
        if (!captureCanvas) {
            captureCanvas = document.createElement('canvas');
            captureCtx = captureCanvas.getContext('2d', { alpha: false });
        }
        if (!captureCanvas || !captureCtx) return false;
        if (captureCanvas.width !== source.width || captureCanvas.height !== source.height) {
            captureCanvas.width = source.width;
            captureCanvas.height = source.height;
        }
        return true;
    }

    function drawOverlay(canvas, blendMode) {
        if (!canvas || !captureCtx) return;
        captureCtx.save();
        captureCtx.globalCompositeOperation = blendMode || 'source-over';
        captureCtx.drawImage(canvas, 0, 0, captureCanvas.width, captureCanvas.height);
        captureCtx.restore();
    }

    function composite() {
        // Replace the entire base, including transparent pixels, without a
        // separate full-canvas clear (otherwise transparent frames leave trails).
        captureCtx.globalCompositeOperation = 'copy';
        captureCtx.drawImage(captureSourceCanvas, 0, 0, captureCanvas.width, captureCanvas.height);
        captureCtx.globalCompositeOperation = 'source-over';
        var layers = activeOverlayLayers();
        if (layers.main) drawOverlay(overlayCanvas('overlayCanvas'), 'source-over');
        if (layers.strobe) drawOverlay(overlayCanvas('strobeCanvas'), currentBlendMode(overlayCanvas('strobeCanvas')));
    }

    function activeOverlayLayers() {
        if (typeof Overlays === 'undefined' || !Overlays.getEnabled) return { main: true, strobe: true };
        var enabled = Overlays.getEnabled();
        return { main: Object.keys(enabled).some(function(k) {
            return k !== 'strobe' && enabled[k] && (k !== 'flash' || Overlays.getParam('flash_active'));
        }), strobe: !!enabled.strobe };
    }

    // Fallback for browsers without requestFrame: sample on our own timer.
    function drawCaptureFrame(timestamp) {
        if (!captureActive || !captureSourceCanvas || !captureCtx) return;
        var minInterval = 1000 / Math.max(1, captureFps);
        if (!captureLastDraw || timestamp - captureLastDraw >= minInterval * 0.75) {
            captureLastDraw = timestamp;
            composite();
        }
        captureFrameId = requestAnimationFrame(drawCaptureFrame);
    }

    // Called by the renderer right after each rendered frame while recording,
    // so every video frame is a fresh frame at an even interval.
    function captureFrame(throttle) {
        if (wc) {
            if (captureActive) {
                try { captureWebCodecsFrame(); } catch (err) { failRecording('Frame capture failed: ' + err.message); }
            }
            return;
        }
        if (!captureActive || !frameLocked || !captureSourceCanvas || !captureCtx || !videoTrack) return;
        var now = performance.now();
        if (throttle && captureLastDraw && now - captureLastDraw < 1000 / captureFps - 2) return;
        captureLastDraw = now;
        composite();
        try { videoTrack.requestFrame(); } catch (err) { /* noop */ }
    }

    function startCompositeStream(canvas, fps) {
        if (!ensureCaptureCanvas(canvas)) {
            setLastError('Could not create recording compositor.');
            return null;
        }
        captureSourceCanvas = canvas;
        captureActive = true;
        captureFps = fps || 30;
        captureLastDraw = 0;
        var stream = captureCanvas.captureStream(0);
        videoTrack = stream.getVideoTracks()[0] || null;
        frameLocked = !!(videoTrack && typeof videoTrack.requestFrame === 'function');
        if (frameLocked) {
            composite();
            videoTrack.requestFrame();
            return stream;
        }
        stream.getTracks().forEach(function(t) { try { t.stop(); } catch (err) { /* noop */ } });
        videoTrack = null;
        drawCaptureFrame(performance.now());
        return captureCanvas.captureStream(captureFps);
    }

    // AudioWorklet that hands the mixed sound to the page in blocks of 2048
    // samples, with the frame number of each block. It runs on the audio thread,
    // so a busy page can delay the blocks but never lose them.
    var TAP_SOURCE = [
        'class PsyRecordTap extends AudioWorkletProcessor {',
        '    constructor() { super(); this.size = 2048; this.n = 0; this.l = null; this.r = null; }',
        '    process(inputs) {',
        '        const inp = inputs[0] || [];',
        '        const len = (inp[0] && inp[0].length) || 128;',
        '        if (!this.l) { this.l = new Float32Array(this.size); this.r = new Float32Array(this.size); this.start = currentFrame; }',
        '        const a = inp[0], b = inp[1] || inp[0];',
        '        if (a) { this.l.set(a, this.n); this.r.set(b, this.n); }',
        '        this.n += len;',
        '        if (this.n >= this.size) {',
        '            this.port.postMessage({ frame: this.start, l: this.l, r: this.r }, [this.l.buffer, this.r.buffer]);',
        '            this.l = null; this.r = null; this.n = 0;',
        '        }',
        '        return true;',
        '    }',
        '}',
        "registerProcessor('psy-record-tap', PsyRecordTap);"
    ].join('\n');
    var tapUrl = null;
    function tapModuleUrl() {
        if (!tapUrl) tapUrl = URL.createObjectURL(new Blob([TAP_SOURCE], { type: 'application/javascript' }));
        return tapUrl;
    }

    // Sound sources to record: the studio music, the audio file, captured playback.
    function recordSources() {
        var list = [];
        if (typeof Music !== 'undefined' && Music.getRecordStream) {
            var ms = Music.getRecordStream();
            if (ms) list.push({ stream: ms, music: true });
        }
        if (typeof AudioAnalysis !== 'undefined' && AudioAnalysis.getRecordStreams) {
            try {
                AudioAnalysis.getRecordStreams().forEach(function(s) { list.push({ stream: s, music: false }); });
            } catch (err) { /* noop */ }
        }
        return list.filter(function(x) { return x.stream && x.stream.getAudioTracks && x.stream.getAudioTracks().length; });
    }

    // The studio music plays about 15 dB quieter than finished tracks, so the
    // recording lifts it (into a limiter) to a normal video level.
    var MUSIC_RECORD_GAIN = 3.2;   // about +10 dB

    // One audio track for the recording, from a small mixer that runs from the
    // moment REC is pressed. It always delivers sound frames (silence until
    // something plays), so the audio starts with the video and stays in sync,
    // and sources that start mid-recording are connected as they appear.
    function buildAudioTrack() {
        if (options.audio === 'none' || options.mode === 'smooth') return null;
        if (typeof Music !== 'undefined' && Music.init && Music.isReady && !Music.isReady()) {
            // Set up the music graph now so music started mid-recording is captured.
            try { Music.init(function() {}); } catch (err) { /* noop */ }
        }
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            var first = recordSources()[0];
            return first ? { track: first.stream.getAudioTracks()[0].clone(), ctx: null } : null;
        }
        var ctx;
        // AAC only takes 44.1 or 48 kHz, whatever rate the sound card runs at.
        try { ctx = new AudioCtx({ sampleRate: 48000 }); } catch (err2) { ctx = new AudioCtx(); }
        var dest = ctx.createMediaStreamDestination();
        var limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -1.5;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.15;
        limiter.connect(dest);
        var musicGain = ctx.createGain();
        musicGain.gain.value = MUSIC_RECORD_GAIN;
        musicGain.connect(limiter);
        // A running source keeps the mixer producing frames while nothing plays.
        var keepAlive = ctx.createConstantSource();
        keepAlive.offset.value = 0;
        keepAlive.connect(dest);
        keepAlive.start();
        var mix = { track: dest.stream.getAudioTracks()[0], ctx: ctx, connected: {}, timer: null, tapReady: null };
        // Sample-accurate tap on the audio thread for the MP4 path (see onTapAudio).
        if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
            // A data: URL loads on file:// pages (blob: URLs are refused there); blob: is the backup.
            mix.tapReady = ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,' + encodeURIComponent(TAP_SOURCE))
                .catch(function() { return ctx.audioWorklet.addModule(tapModuleUrl()); })
                .then(function() {
                if (ctx.state === 'closed') return null;
                var node = new AudioWorkletNode(ctx, 'psy-record-tap', {
                    numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit'
                });
                limiter.connect(node);
                var mute = ctx.createGain();
                mute.gain.value = 0;
                node.connect(mute);
                mute.connect(ctx.destination);
                return node;
            }).catch(function(err) {
                console.warn('Recording audio tap unavailable, using the stream reader:', err);
                return null;
            });
        }
        function attach() {
            recordSources().forEach(function(src) {
                var key = src.stream.getAudioTracks().map(function(t) { return t.id; }).join(',');
                if (mix.connected[key]) return;
                try {
                    ctx.createMediaStreamSource(src.stream).connect(src.music ? musicGain : limiter);
                    mix.connected[key] = true;
                } catch (err3) { /* noop */ }
            });
        }
        attach();
        mix.timer = setInterval(attach, 500);
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(function() {});
        return mix;
    }

    function stopCompositeStream() {
        captureActive = false;
        if (captureFrameId) {
            cancelAnimationFrame(captureFrameId);
            captureFrameId = null;
        }
        [captureStream, recordStream].forEach(function(stream) {
            if (!stream) return;
            stream.getTracks().forEach(function(track) {
                try { track.stop(); } catch (err) { /* noop */ }
            });
        });
        if (audioMix && audioMix.timer) clearInterval(audioMix.timer);
        if (audioMix && audioMix.ctx) {
            try { audioMix.ctx.close().catch(function() {}); } catch (err2) { /* noop */ }
        }
        audioMix = null;
        videoTrack = null;
        frameLocked = false;
        captureStream = null;
        recordStream = null;
        captureSourceCanvas = null;
        captureLastDraw = 0;
    }

    function clearStopTimer() {
        if (stopTimer) clearTimeout(stopTimer);
        stopTimer = null;
    }

    function formatClock(sec) {
        sec = Math.max(0, Math.floor(sec));
        var m = Math.floor(sec / 60), s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function getStatus() {
        var elapsed = recording ? Math.max(0, performance.now() - recordStart) / 1000 : 0;
        if (wc && wc.offline) elapsed = wc.frames / wc.fps;
        var bytes = wc ? wc.writer.getBytes() : recordBytes;
        var target = wc && wc.offline ? Math.max(1, Math.round(recordDuration * wc.fps)) : 0;
        var wallElapsed = Math.max(0, performance.now() - recordStart) / 1000;
        var renderElapsed = wc && wc.t0 !== null ? Math.max(0, performance.now() - wc.t0) / 1000 : 0;
        var renderFps = wc && renderElapsed > 0 ? wc.frames / renderElapsed : 0;
        return { recording: recording, elapsed: elapsed, duration: recordDuration, bytes: bytes, mime: currentMime,
            mode: wc && wc.offline ? 'smooth' : 'live', encoder: wc ? 'webcodecs' : 'mediarecorder', frames: wc ? wc.frames : 0, drops: wc ? wc.drops : 0, audioPath: wc ? wc.audioPath || '' : '',
            directRender: !!renderJob, preparing: !!(wc && wc.waitingAudio), saving: finalizing || pendingPreparation && !recording,
            canceling: !!(renderJob && renderJob.canceled), totalFrames: target, progress: target ? Math.min(1, wc.frames / target) : 0,
            wallElapsed: wallElapsed, renderFps: renderFps, remainingSeconds: renderFps > 0 ? Math.max(0, target - wc.frames) / renderFps : null };
    }

    // REC badge: elapsed time, the remaining time for timed recordings, and size so far.
    function paintIndicator() {
        var indicator = document.getElementById('recordingIndicator');
        if (!indicator || !recording) return;
        var st = getStatus();
        var text = '● REC ' + formatClock(st.elapsed);
        if (st.duration > 0) text += ' / ' + formatClock(st.duration);
        // MP4 data often arrives only at the end, so show an estimate until real bytes arrive.
        var bytes = st.bytes > 0 ? st.bytes : recordBitrate / 8 * st.elapsed;
        if (bytes > 0) text += '  ' + (st.bytes > 0 ? '' : '~') + (bytes / 1048576).toFixed(bytes < 104857600 ? 1 : 0) + ' MB';
        // Frames captured over the last two seconds, so a struggling recording shows while it happens.
        var slow = false;
        if (wc && wc.offline) {
            text = wc.waitingAudio ? 'Preparing soundtrack… Click to cancel' : 'Rendering ' + formatClock(st.elapsed) + ' / ' + formatClock(st.duration) + '  ' + wc.frames + ' frames';
        } else if (wc) {
            var now = performance.now();
            fpsSamples.push({ t: now, f: wc.frames });
            while (fpsSamples.length > 2 && now - fpsSamples[0].t > 2000) fpsSamples.shift();
            var a = fpsSamples[0], span = (now - a.t) / 1000;
            if (span > 0.9) {
                var fps = (wc.frames - a.f) / span;
                slow = fps < wc.fps * 0.8;
                text += '  ' + Math.round(fps) + ' fps' + (slow ? ' (dropping frames)' : '');
            }
        }
        indicator.classList.toggle('struggling', slow);
        indicator.textContent = text;
    }
    var fpsSamples = [];

    // Output settings only apply when a recording starts, so they are locked
    // while one is running or being saved.
    var LOCKED_WHILE_RECORDING = ['resSelect', 'fpsSelect', 'loopMode', 'durationInput', 'recLength', 'recFormat', 'recQuality', 'recDetail', 'recAudio', 'recMode', 'renderLengthMode', 'renderSeconds', 'btnRenderAudio', 'btnRenderMP4'];
    var lockedSettings = [];
    var lockedControls = new Map(), lockObserver = null, editingLocked = false;
    var CONTROL_SELECTOR = 'input, select, button, textarea';
    function lockControl(el) {
        if (!el || (editingLocked && ['btnRecord', 'btnRenderCancel', 'btnRenderStop'].indexOf(el.id) >= 0)) return;
        if (!lockedControls.has(el)) {
            var saved = { el: el, disabled: el.disabled, title: el.title };
            lockedControls.set(el, saved); lockedSettings.push(saved);
        }
        if (!el.disabled) el.disabled = true;
        if (el.title !== 'Locked while recording') el.title = 'Locked while recording';
    }
    function lockOutputSettings(on) {
        if (!on) {
            if (lockObserver) { lockObserver.disconnect(); lockObserver = null; }
            editingLocked = false;
            lockedSettings.forEach(function(s) { s.el.disabled = s.disabled; s.el.title = s.title; });
            lockedSettings = []; lockedControls.clear();
            return;
        }
        if (lockedSettings.length) return;
        editingLocked = options.mode === 'smooth';
        var elements = LOCKED_WHILE_RECORDING.map(function(id) { return document.getElementById(id); });
        // A slow export must not change scenes/settings halfway through a frame sequence.
        if (editingLocked) elements = elements.concat(Array.from(document.querySelectorAll(CONTROL_SELECTOR)));
        elements.forEach(lockControl);
        if (editingLocked && typeof MutationObserver !== 'undefined') {
            // Auto-shuffle rebuilds FX/overlay rows; audio status refreshes can
            // re-enable existing controls. Keep both locked through saving.
            lockObserver = new MutationObserver(function(records) {
                if (!editingLocked) return;
                var removed = false;
                records.forEach(function(record) {
                    if (record.type === 'attributes') {
                        if (lockedControls.has(record.target)) lockControl(record.target);
                        return;
                    }
                    if (record.removedNodes.length) removed = true;
                    Array.from(record.addedNodes).forEach(function(node) {
                        if (node.nodeType !== 1) return;
                        if (node.matches(CONTROL_SELECTOR)) lockControl(node);
                        Array.from(node.querySelectorAll(CONTROL_SELECTOR)).forEach(lockControl);
                    });
                });
                if (removed) lockedSettings = lockedSettings.filter(function(s) {
                    if (s.el.isConnected) return true;
                    lockedControls.delete(s.el); return false;
                });
            });
            lockObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
        }
    }

    function setSavingUi(on) {
        var indicator = document.getElementById('recordingIndicator');
        if (!indicator) return;
        indicator.classList.toggle('hidden', !on);
        indicator.classList.toggle('saving', !!on);
        indicator.textContent = on ? 'Saving video…' : '● REC';
    }

    function finishSaving() {
        finalizing = false;
        if (pendingPreparation) { setSavingUi(true); return; }
        setSavingUi(false);
        lockOutputSettings(false);
        if (renderJob && renderJob.started) { options = renderJob.previousOptions; renderJob = null; }
    }

    function updateRecordingUi(active) {
        var button = document.getElementById('btnRecord');
        var indicator = document.getElementById('recordingIndicator');
        if (button) button.classList.toggle('recording', !!active);
        if (active) lockOutputSettings(true);
        if (indicator) {
            indicator.classList.toggle('hidden', !active);
            if (!indicator.dataset.wired) {
                indicator.dataset.wired = '1';
                indicator.addEventListener('click', function() { stopRecording(); });
            }
        }
        if (indicatorTimer) { clearInterval(indicatorTimer); indicatorTimer = null; }
        if (active) {
            fpsSamples = [];
            paintIndicator();
            indicatorTimer = setInterval(paintIndicator, 250);
        } else if (indicator) {
            indicator.textContent = '● REC';
        }
    }

    // ------------------------------------------------------------ WebCodecs MP4
    // Live capture follows wall time; smooth export advances by one frame only
    // after the encoder has room, independently of display/encoding speed.
    function probe() {
        if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined' || typeof Mp4Writer === 'undefined') {
            wcSupport = { h264: false, aac: false };
            return Promise.resolve(wcSupport);
        }
        var vcfg = { codec: 'avc1.640028', width: 1280, height: 720, bitrate: 6e6, framerate: 30, avc: { format: 'avc' } };
        var v = VideoEncoder.isConfigSupported(vcfg).then(function(r) { return !!r.supported; }).catch(function() { return false; });
        // The highest AAC bitrate the system encoder takes (Windows stops at 192k).
        var a = typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined' &&
            (typeof AudioWorkletNode !== 'undefined' || typeof MediaStreamTrackProcessor !== 'undefined') ?
            Promise.all(AAC_BITRATES.map(function(br) {
                return AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: br })
                    .then(function(r) { return r.supported ? br : 0; }).catch(function() { return 0; });
            })).then(function(list) { return Math.max.apply(null, list); }) :
            Promise.resolve(0);
        return Promise.all([v, a]).then(function(r) {
            wcSupport = { h264: r[0], aac: r[1] > 0, aacMax: r[1] };
            return wcSupport;
        });
    }

    var AAC_BITRATES = [320000, 256000, 192000, 160000, 128000, 96000];

    // The preset's audio bitrate, lowered to one the AAC encoder accepts.
    function aacBitrate(want) {
        var max = Math.min(want, wcSupport && wcSupport.aacMax || 192000);
        for (var i = 0; i < AAC_BITRATES.length; i++) if (AAC_BITRATES[i] <= max) return AAC_BITRATES[i];
        return 96000;
    }
    var probeReady = probe();

    function useWebCodecs() {
        return (options.format === 'mp4' || options.mode === 'smooth') && !!wcSupport && wcSupport.h264 &&
            (options.mode === 'smooth' || options.audio === 'none' || wcSupport.aac);
    }

    function startWebCodecs(canvas, fps, duration) {
        if (!ensureCaptureCanvas(canvas)) return false;
        var w = canvas.width, h = canvas.height;
        if (w % 2 || h % 2) return false;
        captureSourceCanvas = canvas;
        captureActive = true;
        captureFps = fps;
        frameLocked = true;
        audioMix = buildAudioTrack();
        var audioTrack = audioMix && audioMix.track ? audioMix.track : null;
        if (audioTrack) recordStream = new MediaStream([audioTrack]);
        var q = QUALITY[options.quality] || QUALITY.high;
        var offlineSound = options.mode === 'smooth' && options.audio !== 'none';
        var session = {
            writer: Mp4Writer.create({ width: w, height: h, fps: fps, audio: !!audioTrack || offlineSound }),
            fps: fps, t0: null, lastSlot: -1, frames: 0, drops: 0,
            offline: options.mode === 'smooth',
            audioTrack: audioTrack, waitingAudio: !!audioTrack || offlineSound, failed: false, stopping: false,
            encoder: null, audioEncoder: null, reader: null
        };
        wc = session; // Own resources before configure(), which can throw.
        session.encoder = new VideoEncoder({
            output: function(chunk, meta) { session.writer.addVideo(chunk, meta); },
            error: function(e) { if (wc === session) failRecording('Video encoder: ' + (e && e.message || e)); }
        });
        var bitrate = videoBitrate(w, h, fps, options.quality);
        session.encoder.configure({
            codec: 'avc1.6400' + avcLevel(w, h, fps, bitrate), width: w, height: h, bitrate: bitrate, framerate: fps,
            hardwareAcceleration: hwCache[hwKey(w, h, fps)] === true ? 'prefer-hardware' : 'no-preference',
            bitrateMode: 'variable', latencyMode: 'quality', avc: { format: 'avc' }
        });
        var audioBitrate = aacBitrate(q.audio);
        recordBitrate = bitrate + (audioTrack || offlineSound ? audioBitrate : 0);
        session.audioBitrate = audioBitrate;
        if (offlineSound) {
            pendingPreparation = true;
            var audioSettings = renderJob ? renderJob.plan.audioSettings : null;
            session.offlinePrep = Promise.resolve().then(function() { return OfflineAudio.prepare(Math.max(1, Math.round(duration * fps)) / fps, audioSettings); });
            session.offlinePrep.then(function(data) {
                if (wc !== session || session.stopping) { data.restore(); return; }
                session.offlineData = data; session.sr = data.buffer.sampleRate; session.audioPath = 'offline'; session.waitingAudio = false;
            }).catch(function(error) { if (wc === session && !session.stopping) failRecording('Soundtrack preparation failed: ' + error.message); })
              .finally(function() { pendingPreparation = false; if (!wc && !recording) finishSaving(); });
        } else if (audioTrack && audioMix.tapReady) startAudioTap(session, audioMix);
        else if (audioTrack) startAudioPump(session, audioBitrate);
        currentMime = 'video/mp4';
        wc = session;
        return true;
    }

    function closeSession(s) {
        if (!s) return;
        s.stopping = true;
        s.audioClosed = true;
        if (s.reader) { try { s.reader.cancel().catch(function() {}); } catch (err) {} }
        if (s.tap) { s.tap.port.onmessage = null; try { s.tap.disconnect(); } catch (err2) {} }
        [s.encoder, s.audioEncoder].forEach(function(enc) { if (enc) { try { enc.close(); } catch (err3) {} } });
        if (s.offline && typeof Renderer !== 'undefined' && Renderer.endFrameExport) Renderer.endFrameExport();
        if (s.offlineData) { s.offlineData.restore(); s.offlineData = null; }
    }

    function failRecording(message, canceled) {
        setLastError(message);
        if (mediaRecorder) {
            mediaRecorder.ondataavailable = null;
            mediaRecorder.onstop = null;
            mediaRecorder.onerror = null;
            try { if (mediaRecorder.state !== 'inactive') mediaRecorder.stop(); } catch (err) {}
            mediaRecorder = null;
        }
        chunks = [];
        if (wc) { wc.failed = true; closeSession(wc); wc = null; }
        captureActive = false;
        recording = false;
        clearStopTimer();
        stopCompositeStream();
        updateRecordingUi(false);
        finishSaving();
        window.dispatchEvent(new CustomEvent(canceled ? 'psychedelia:render-canceled' : 'psychedelia:recording-error', { detail: { message: lastError } }));
        return false;
    }

    function cancelRender() {
        if (!recording || !wc || !wc.offline) return false;
        if (renderJob) renderJob.canceled = true;
        failRecording('Render canceled.', true);
        return true;
    }

    function isFrameExport() { return !!(recording && wc && wc.offline); }
    function canCaptureFrame() {
        return !!(wc && !wc.failed && !wc.stopping && !wc.waitingAudio &&
            wc.encoder.state === 'configured' && wc.encoder.encodeQueueSize < Math.max(32, wc.fps) &&
            (!wc.audioEncoder || wc.audioEncoder.encodeQueueSize < 64));
    }
    function getOfflineAnalysis() { return wc && wc.offlineData ? wc.offlineData.analysis(wc.frames, wc.fps) : null; }
    function getOfflineMusic() { return wc && wc.offlineData ? wc.offlineData.music : null; }
    function encodeOfflineAudio(s, endFrame) {
        var b = s.offlineData.buffer, l = b.getChannelData(0), r = b.getChannelData(Math.min(1, b.numberOfChannels - 1));
        while ((s.nextFrame || 0) < endFrame) {
            var start = s.nextFrame || 0, end = Math.min(start + 4096, endFrame, b.length);
            if (end <= start) { var n = Math.min(4096, endFrame - start); encodePcm(s, new Float32Array(n), new Float32Array(n), start); }
            else encodePcm(s, l.subarray(start, end), r.subarray(start, end), start);
        }
    }

    // MP4 sound from the AudioWorklet tap. Timestamps come from the sample
    // count, so the sound is continuous whatever the page is doing; the block
    // numbers are mapped onto page time to line the first sample up with the
    // first video frame.
    function startAudioTap(session, mix) {
        session.sr = mix.ctx.sampleRate;
        session.pcm = [];
        session.audioOffset = null;   // page time (ms) of sample frame 0
        session.pcmCount = 0;
        mix.tapReady.then(function(node) {
            if (session.stopping) return;
            if (!node) { startAudioPump(session, session.audioBitrate); return; }
            session.audioPath = 'worklet';
            session.tap = node;
            node.port.onmessage = function(e) {
                try { onTapAudio(session, e.data); }
                catch (err) { if (wc === session) failRecording('Audio capture failed: ' + err.message); }
            };
        }).catch(function(err) { if (wc === session) failRecording('Audio capture failed: ' + err.message); });
        // Never hold the video back for long if the audio is slow to start.
        setTimeout(function() { session.waitingAudio = false; }, 1500);
    }

    function onTapAudio(s, d) {
        if (s.audioClosed || s.audioFailed) return;
        var n = d.l.length;
        // The newest sample was produced just now; the smallest estimate over the
        // first blocks has the least message delay in it.
        var est = performance.now() - (d.frame + n) / s.sr * 1000;
        if (s.audioOffset === null || (s.pcmCount < 24 && est < s.audioOffset)) s.audioOffset = est;
        s.pcmCount++;
        s.waitingAudio = false;
        s.pcm.push(d);
        if (s.t0 !== null) flushTapAudio(s);
    }

    function flushTapAudio(s) {
        if (s.audioOffset === null) return;
        if (s.audioStart === undefined) s.audioStart = Math.round((s.t0 - s.audioOffset) / 1000 * s.sr);
        while (s.pcm.length) {
            var d = s.pcm.shift();
            var end = d.frame + d.l.length;
            if (end <= s.audioStart) continue;
            var skip = Math.max(0, s.audioStart - d.frame);
            encodePcm(s, d.l.subarray(skip), d.r.subarray(skip), d.frame + skip - s.audioStart);
        }
    }

    function encodePcm(s, l, r, frameIndex) {
        if (!s.audioEncoder && !s.audioFailed) {
            var enc = new AudioEncoder({
                output: function(chunk, meta) { s.writer.addAudio(chunk, meta); },
                error: function(e) {
                    s.audioFailed = true;
                    if (wc === s) failRecording('Audio encoder: ' + (e && e.message || e));
                }
            });
            s.audioEncoder = enc;
            enc.configure({ codec: 'mp4a.40.2', sampleRate: s.sr, numberOfChannels: 2, bitrate: s.audioBitrate });
        }
        if (!s.audioEncoder || s.audioEncoder.state !== 'configured') return;
        // The sound track runs unbroken from the first video frame: anything
        // missing (sound that started late) becomes silence, overlaps are skipped.
        if (s.nextFrame === undefined) s.nextFrame = 0;
        while (frameIndex > s.nextFrame) {
            var gap = Math.min(4096, frameIndex - s.nextFrame);
            encodeBlock(s, new Float32Array(gap), new Float32Array(gap), s.nextFrame);
        }
        if (frameIndex < s.nextFrame) {
            var cut = s.nextFrame - frameIndex;
            if (cut >= l.length) return;
            l = l.subarray(cut); r = r.subarray(cut); frameIndex = s.nextFrame;
        }
        encodeBlock(s, l, r, frameIndex);
    }

    function encodeBlock(s, l, r, frameIndex) {
        if (s.audioEncoder.encodeQueueSize > 256) throw new Error('Audio encoding cannot keep up. Try a lower resolution.');
        var n = l.length;
        if (!n) return;
        var data = new Float32Array(n * 2);
        data.set(l, 0);
        data.set(r, n);
        var ad = new AudioData({ format: 'f32-planar', sampleRate: s.sr, numberOfFrames: n, numberOfChannels: 2,
            timestamp: Math.round(frameIndex / s.sr * 1e6), data: data });
        try { s.audioEncoder.encode(ad); } finally { ad.close(); }
        s.nextFrame = frameIndex + n;
    }

    // Fallback without AudioWorklet: pulls audio from the mixed track. Video
    // starts when the first audio arrives so both tracks begin together.
    function startAudioPump(session, bitrate) {
        session.audioPath = 'reader';
        session.pcm = [];
        session.audioOffset = null;
        session.pcmCount = 0;
        var processor = new MediaStreamTrackProcessor({ track: session.audioTrack });
        var reader = processor.readable.getReader();
        session.reader = reader;
        function pump() {
            reader.read().then(function(res) {
                var data = res.value;
                if (res.done || session.stopping) { if (data) data.close(); return; }
                try {
                    session.sr = data.sampleRate;
                    var l = new Float32Array(data.numberOfFrames), r = new Float32Array(data.numberOfFrames);
                    data.copyTo(l, { planeIndex: 0, format: 'f32-planar' });
                    data.copyTo(r, { planeIndex: data.numberOfChannels > 1 ? 1 : 0, format: 'f32-planar' });
                    // Preserve missing sample intervals instead of concatenating them away.
                    onTapAudio(session, { frame: Math.round(data.timestamp * session.sr / 1e6), l: l, r: r });
                } finally { data.close(); }
                pump();
            }).catch(function(err) { if (!session.stopping && wc === session) failRecording('Audio reader: ' + err.message); });
        }
        pump();
        // Never hold the video back for long if the audio is slow to start.
        setTimeout(function() { session.waitingAudio = false; }, 1500);
    }

    function captureWebCodecsFrame() {
        var s = wc;
        if (!s || s.failed || s.stopping || s.waitingAudio) return;
        var now = performance.now();
        if (s.t0 === null) {
            s.t0 = now;
            if (s.pcm) flushTapAudio(s);
        }
        // Bound queued pixel buffers. Smooth export waits before rendering;
        // live capture reports missed frames and keeps wall-clock audio sync.
        if (!canCaptureFrame()) return;
        // Snap to the frame-rate grid: even durations, and an honest gap if a frame was missed.
        var slot = s.offline ? s.frames : Math.round((now - s.t0) / 1000 * s.fps);
        if (slot <= s.lastSlot) return; // Never push video ahead of the audio clock.
        var lastSlot = recordDuration > 0 ? Math.max(1, Math.round(recordDuration * s.fps)) : 0;
        if (lastSlot && slot >= lastSlot) {
            if (!s.endQueued) {
                s.endQueued = true;
                setTimeout(function() { if (wc === s && recording) stopRecording(timedCallback); }, 0);
            }
            return;
        }
        var layers = activeOverlayLayers();
        var source = captureSourceCanvas;
        if (layers.main || layers.strobe) { composite(); source = captureCanvas; }
        var pts = Math.round(slot * 1e6 / s.fps);
        var frame = new VideoFrame(source, { timestamp: pts, duration: Math.round((slot + 1) * 1e6 / s.fps) - pts });
        try {
            s.encoder.encode(frame, { keyFrame: s.frames % Math.max(1, Math.round(s.fps * 2)) === 0 });
        } finally {
            frame.close();
        }
        s.frames++;
        if (s.offlineData) encodeOfflineAudio(s, Math.round(s.frames / s.fps * s.sr));
        s.drops += Math.max(0, slot - s.lastSlot - 1);
        s.lastSlot = slot;
        if (lastSlot && slot + 1 >= lastSlot) stopRecording(timedCallback);
    }

    function stopWebCodecs(callback) {
        var s = wc;
        s.endSlot = s.lastSlot + 1;
        if (!s.offline && s.t0 !== null) {
            s.endSlot = Math.max(s.endSlot, Math.ceil((performance.now() - s.t0) / 1000 * s.fps));
            if (recordDuration > 0) s.endSlot = Math.min(s.endSlot, Math.max(1, Math.round(recordDuration * s.fps)));
        }
        s.stopping = true;
        captureActive = false;
        recording = false;
        finalizing = true;
        clearStopTimer();
        updateRecordingUi(false);
        setSavingUi(true);
        var flushVideo = s.encoder.state === 'configured' ? s.encoder.flush() : Promise.reject(new Error('Video encoder closed before saving.'));
        flushVideo.then(function() {
            if (s.failed) throw new Error(lastError);
            try { s.encoder.close(); } catch (err) { /* noop */ }
            if (s.reader) { try { s.reader.cancel().catch(function() {}); } catch (err2) { /* noop */ } }
            // Worklet sound: take the blocks still on their way, then fill to the
            // last video frame with silence so both tracks end together.
            if (s.offlineData) {
                encodeOfflineAudio(s, Math.round(s.endSlot / s.fps * s.sr)); s.audioClosed = true; return null;
            }
            if (!s.audioTrack) return null;
            return new Promise(function(r) { setTimeout(r, 150); }).then(function() {
                s.audioClosed = true;
                if (!s.audioEncoder || s.audioEncoder.state !== 'configured' || s.nextFrame === undefined) throw new Error('No audio was captured.');
                var endFrame = Math.round(s.endSlot / s.fps * s.sr);
                while (s.nextFrame < endFrame) {
                    var gap = Math.min(4096, endFrame - s.nextFrame);
                    encodePcm(s, new Float32Array(gap), new Float32Array(gap), s.nextFrame);
                }
            });
        }).then(function() {
            return s.audioEncoder && s.audioEncoder.state === 'configured' ? s.audioEncoder.flush() : null;
        }).then(function() {
            if (s.failed || wc !== s) return;
            if (s.offline && s.writer.getFrameCount() !== s.frames) throw new Error('The encoder did not return every requested frame.');
            var blob = s.writer.getFrameCount() ? s.writer.finish(s.endSlot / s.fps * 1e6) : null;
            if (!blob) throw new Error('No video frames were captured.');
            closeSession(s);
            wc = null;
            stopCompositeStream();
            finishSaving();
            if (blob && blob.size > 0 && callback) callback(blob);
            if (blob) {
                // Tell the app how it went (it shows a note when frames were dropped).
                var seconds = s.endSlot / s.fps;
                try {
                    window.dispatchEvent(new CustomEvent('psychedelia:recording-saved', { detail: {
                        seconds: seconds, frames: s.writer.getFrameCount(), fps: s.fps, avgFps: s.writer.getFrameCount() / Math.max(seconds, 0.001),
                        megabytes: blob.size / 1048576, audio: !!s.audioEncoder, mode: s.offline ? 'smooth' : 'live', drops: s.drops
                    } }));
                } catch (errEv) { /* noop */ }
            }
        }).catch(function(err) {
            if (wc === s) failRecording('Saving the video failed: ' + (err && err.message || err));
        });
    }

    function startRecording(canvas, fps, durationSec) {
        if (recording) return setLastError('A recording is already running.');
        if (finalizing) return setLastError('Still saving the last recording. Try again in a moment.');
        if (pendingPreparation) return setLastError('Finishing the previous soundtrack preparation. Try again in a moment.');
        lastError = '';
        lastInfo = '';
        if (!canvas || !canvas.width || !canvas.height || (!useWebCodecs() && typeof canvas.captureStream !== 'function')) {
            return setLastError('Recording is not available for this canvas.');
        }
        if (!isSupported()) {
            return setLastError('MediaRecorder recording is not supported in this browser.');
        }

        fps = Number(fps || 30);
        if (!isFinite(fps) || fps < 1 || fps > 120) return setLastError('Choose a frame rate between 1 and 120 fps.');
        if (options.mode === 'smooth') {
            if (!(durationSec > 0)) return setLastError('Choose a recording length for Smooth MP4.');
            if (!useWebCodecs()) return setLastError('Smooth MP4 needs H.264 WebCodecs support. Try current Chrome or Edge.');
            if (typeof Timeline !== 'undefined' && Timeline.isPlaying()) return setLastError('Pause the timeline before exporting a smooth clip.');
            if (options.audio !== 'none' && (!wcSupport.aac || typeof OfflineAudio === 'undefined')) return setLastError('Smooth MP4 with sound needs AAC audio encoding support.');
            var soundtrackSource = renderJob ? renderJob.plan.audioSettings.source : (typeof AudioAnalysis !== 'undefined' ? AudioAnalysis.getSource() : 'studio');
            if (options.audio !== 'none' && ['studio', 'file'].indexOf(soundtrackSource) < 0) return setLastError('Choose Studio Music or an Audio File for Smooth MP4 with sound.');
        }
        timedCallback = null;
        chunks = [];
        onStopCallback = null;

        if (useWebCodecs()) {
            try {
                if (startWebCodecs(canvas, fps, durationSec)) {
                    recording = true;
                    recordStart = performance.now();
                    recordDuration = durationSec || 0;
                    recordBytes = 0;
                    if (wc.offline) Renderer.beginFrameExport(fps);
                    lastInfo = wc.offline ? 'Smooth MP4' + (options.audio === 'none' ? ' without sound' : ' with soundtrack and beat reactions') : 'MP4' + (wc.audioTrack ? ' with sound' : ' without sound');
                    updateRecordingUi(true);
                    return true;
                }
            } catch (err) {
                console.warn('WebCodecs recording unavailable, using MediaRecorder:', err);
            }
            closeSession(wc);
            wc = null;
            recording = false;
            stopCompositeStream();
            updateRecordingUi(false);
            finishSaving();
            if (options.mode === 'smooth') return setLastError('Could not start Smooth MP4 at this resolution. Try a smaller even-sized canvas.');
        }

        try {
            captureStream = startCompositeStream(canvas, fps);
            if (!captureStream) return false;
            audioMix = buildAudioTrack();
            var tracks = captureStream.getVideoTracks();
            if (audioMix && audioMix.track) tracks = tracks.concat([audioMix.track]);
            recordStream = new MediaStream(tracks);
            var withAudio = !!(audioMix && audioMix.track);

            var w = canvas.width, h = canvas.height;
            var mimeType = pickMime(options.format, withAudio, w, h, fps);
            var fellBack = false;
            if (!mimeType) {
                mimeType = pickMime(options.format === 'mp4' ? 'webm' : 'mp4', withAudio, w, h, fps);
                fellBack = true;
            }
            if (!mimeType) {
                stopCompositeStream();
                return setLastError('No supported recording format was found.');
            }
            currentMime = mimeType;
            var q = QUALITY[options.quality] || QUALITY.high;
            var config = {
                mimeType: mimeType,
                videoBitsPerSecond: videoBitrate(w, h, fps, options.quality),
                videoKeyFrameIntervalDuration: 2000
            };
            if (withAudio) config.audioBitsPerSecond = q.audio;
            recordBitrate = config.videoBitsPerSecond + (withAudio ? q.audio : 0);
            mediaRecorder = new MediaRecorder(recordStream, config);
            var recorder = mediaRecorder;

            mediaRecorder.ondataavailable = function(e) {
                if (mediaRecorder !== recorder) return;
                if (e.data.size > 0) {
                    chunks.push(e.data);
                    recordBytes += e.data.size;
                }
            };

            mediaRecorder.onerror = function(e) {
                if (mediaRecorder !== recorder) return;
                failRecording(e && e.error && e.error.message || 'MediaRecorder failed.');
            };

            mediaRecorder.onstop = function() {
                if (mediaRecorder !== recorder) return;
                var elapsedMs = performance.now() - recordStart;
                var doneCallback = onStopCallback || timedCallback || saveVideo;
                recording = false;
                clearStopTimer();
                updateRecordingUi(false);
                stopCompositeStream();
                var blob = new Blob(chunks, { type: currentMime.split(';')[0] });
                chunks = [];
                var done = function(out) {
                    if (mediaRecorder !== recorder) return;
                    if (!out.size) { failRecording('No video data was captured.'); return; }
                    mediaRecorder = null;
                    finishSaving();
                    try {
                        doneCallback(out);
                        window.dispatchEvent(new CustomEvent('psychedelia:recording-saved', { detail: {
                            seconds: elapsedMs / 1000, megabytes: out.size / 1048576, audio: withAudio, mode: 'live'
                        } }));
                    } catch (err) { failRecording('Saving the video failed: ' + err.message); }
                };
                if (/webm/.test(currentMime)) fixWebmDuration(blob, elapsedMs).then(done);
                else done(blob);
            };

            mediaRecorder.start(250);
            recording = true;
            recordStart = performance.now();
            recordDuration = 0;
            recordBytes = 0;
            lastInfo = (mimeType.indexOf('mp4') >= 0 ? 'MP4' : 'WebM') + (withAudio ? ' with sound' : ' (no sound source found)') +
                (fellBack ? ', ' + options.format.toUpperCase() + ' is not supported here' : '');
            updateRecordingUi(true);
            return true;
        } catch (err) {
            stopCompositeStream();
            mediaRecorder = null;
            recording = false;
            updateRecordingUi(false);
            finishSaving();
            return setLastError(err && err.message || String(err));
        }
    }

    function stopRecording(callback) {
        if (finalizing) return;
        clearStopTimer();
        if (wc && recording) {
            if (wc.offline && !wc.frames) { failRecording(wc.waitingAudio ? 'Soundtrack preparation canceled.' : 'Export stopped before its first frame.'); return; }
            onStopCallback = callback || timedCallback || saveVideo;
            stopWebCodecs(onStopCallback);
            return;
        }
        if (!recording || !mediaRecorder) return;

        onStopCallback = callback || timedCallback || saveVideo;
        try {
            finalizing = true;
            recording = false;
            captureActive = false;
            updateRecordingUi(false);
            setSavingUi(true);
            mediaRecorder.stop();
        } catch (err) {
            setLastError(err && err.message || String(err));
            recording = false;
            stopCompositeStream();
            updateRecordingUi(false);
            finishSaving();
        }
    }

    function saveVideo(blob) {
        var effect = EffectRegistry.getCurrent();
        var name = effect ? effect.name : 'video';
        // Local date and time, e.g. 2026-10-06_14-06-25
        var d = new Date();
        var two = function(n) { return (n < 10 ? '0' : '') + n; };
        var timestamp = d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + '_' +
            two(d.getHours()) + '-' + two(d.getMinutes()) + '-' + two(d.getSeconds());
        var ext = /mp4/.test(blob.type || currentMime) ? '.mp4' : '.webm';
        var filename = 'psychedelia_' + name + '_' + timestamp + ext;

        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        // Also save to gallery (in-memory for this session)
        Gallery.addVideo(blob, filename, {
            effect: name,
            timestamp: Date.now(),
            params: (Controls.getBaseValues ? Controls.getBaseValues() : Controls.getValues())
        });

        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }

    function isRecording() { return recording; }

    function getRenderPlan(config) {
        config = config || {};
        var mode = config.lengthMode || 'custom', audio = config.audio === 'none' ? 'none' : 'all';
        var source = typeof AudioAnalysis !== 'undefined' ? AudioAnalysis.getSource() : 'studio';
        var duration = Number(config.duration), fps = Number(config.fps || 60), audioSettings = { source: source };
        function invalid(message) { return { valid: false, error: message }; }
        if (['custom', 'audio', 'remaining'].indexOf(mode) < 0) return invalid('Choose a render length.');
        if (mode !== 'custom') {
            var file = typeof AudioAnalysis !== 'undefined' && AudioAnalysis.getFileStatus();
            if (!file || !file.hasFile || !isFinite(file.duration) || file.duration <= 0 || file.state === 'loading') return invalid('Choose an audio file and wait for it to load.');
            var offset = mode === 'remaining' ? Math.max(0, Math.min(file.duration, Number(file.currentTime) || 0)) : 0;
            duration = file.duration - offset;
            if (duration <= 0) return invalid('The audio is at its end. Move its playhead back or choose the full track.');
            audioSettings = { source: 'file', offset: offset, loop: false };
        }
        if (!isFinite(duration) || duration <= 0 || duration > 3600) return invalid('Set a render length greater than 0 and up to 3600 seconds.');
        if (!isFinite(fps) || fps < 1 || fps > 120) return invalid('Choose a frame rate between 1 and 120 FPS.');
        if (audio !== 'none' && duration > 600) return invalid('Rendering with sound supports up to 10 minutes. Choose a shorter duration or remaining audio.');
        if (audio !== 'none' && ['studio', 'file'].indexOf(audioSettings.source) < 0) return invalid('Choose Studio Music or an Audio File for rendering with sound.');
        if (audio !== 'none' && audioSettings.source === 'file' && !AudioAnalysis.getFile()) return invalid('Choose an audio file before rendering with sound.');
        return { valid: true, duration: duration, fps: fps, audio: audio, audioSettings: audioSettings, lengthMode: mode };
    }

    function renderMP4(canvas, config, callback) {
        if (recording || finalizing || pendingPreparation || renderJob) return setLastError('Wait for the current recording or render to finish.');
        var plan = getRenderPlan(config);
        if (!plan.valid) return setLastError(plan.error);
        var job = { plan: plan, previousOptions: getOptions(), started: false, canceled: false };
        renderJob = job;
        setOptions({ format: 'mp4', mode: 'smooth', detail: 'full', audio: plan.audio, quality: config && config.quality });
        if (!timedRecording(canvas, plan.duration, plan.fps, callback)) {
            options = job.previousOptions; renderJob = null; return false;
        }
        job.started = true;
        return true;
    }

    // The stop timer belongs to this recording only, so stopping early and
    // starting again can no longer be cut short by an old timer.
    function timedRecording(canvas, durationSec, fps, callback) {
        durationSec = Number(durationSec);
        if (!isFinite(durationSec) || durationSec <= 0 || durationSec > 3600) return setLastError('Choose a recording length between 0 and 3600 seconds.');
        if (!startRecording(canvas, fps, durationSec)) return false;
        clearStopTimer();
        recordDuration = durationSec;
        timedCallback = callback;
        if (wc && wc.offline) { paintIndicator(); return true; }
        // Live MP4 stops on its presentation-time deadline; this timer is a
        // backstop when rendering stalls, and the normal stop for MediaRecorder.
        stopTimer = setTimeout(function() {
            stopTimer = null;
            stopRecording(callback);
        }, durationSec * 1000 + (wc ? 3000 : 0));
        paintIndicator();
        return true;
    }

    // Chrome's WebM recordings carry no duration, so players show no length and
    // seek poorly. This writes a Duration into the Segment Info header.
    function readVint(b, pos, keepMarker) {
        var first = b[pos];
        if (first === undefined) return null;
        var len = 1, mask = 0x80;
        while (len <= 8 && !(first & mask)) { len++; mask >>= 1; }
        if (len > 8 || pos + len > b.length) return null;
        var value = keepMarker ? first : (first & (mask - 1));
        for (var i = 1; i < len; i++) value = value * 256 + b[pos + i];
        return { value: value, len: len, unknown: !keepMarker && value === Math.pow(2, 7 * len) - 1 };
    }

    function fixWebmDuration(blob, durationMs) {
        if (!blob.slice || !blob.arrayBuffer) return Promise.resolve(blob);
        return blob.slice(0, Math.min(blob.size, 1 << 20)).arrayBuffer().then(function(buf) {
            var b = new Uint8Array(buf);
            var id = readVint(b, 0, true), size;
            if (!id || id.value !== 0x1A45DFA3) return blob;
            size = readVint(b, id.len);
            var pos = id.len + size.len + size.value;
            id = readVint(b, pos, true);
            if (!id || id.value !== 0x18538067) return blob;
            size = readVint(b, pos + id.len);
            pos += id.len + size.len;
            while (pos < b.length - 8) {
                id = readVint(b, pos, true);
                size = id && readVint(b, pos + id.len);
                if (!id || !size || id.value === 0x114D9B74) return blob;   // a SeekHead would need its offsets moved
                var start = pos + id.len + size.len;
                if (id.value === 0x1549A966) {
                    var end = start + size.value;
                    if (size.unknown || end > b.length) return blob;
                    var scale = 1000000;
                    for (var p = start; p < end;) {
                        var cid = readVint(b, p, true), cs = cid && readVint(b, p + cid.len);
                        if (!cid || !cs) return blob;
                        var cd = p + cid.len + cs.len;
                        if (cid.value === 0x4489) return blob;   // already has a duration
                        if (cid.value === 0x2AD7B1) { scale = 0; for (var k = 0; k < cs.value; k++) scale = scale * 256 + b[cd + k]; }
                        p = cd + cs.value;
                    }
                    var body = new Uint8Array(size.value + 11);
                    body.set(b.subarray(start, end), 0);
                    body[size.value] = 0x44; body[size.value + 1] = 0x89; body[size.value + 2] = 0x88;
                    new DataView(body.buffer).setFloat64(size.value + 3, durationMs * 1e6 / (scale || 1e6));
                    var head = new Uint8Array(id.len + 8);
                    head.set(b.subarray(pos, pos + id.len), 0);
                    head[id.len] = 0x01;
                    for (var j = 7, n = body.length; j >= 1; j--) { head[id.len + j] = n % 256; n = Math.floor(n / 256); }
                    return new Blob([b.slice(0, pos), head, body, blob.slice(end)], { type: blob.type });
                }
                if (size.unknown) return blob;
                pos = start + size.value;
            }
            return blob;
        }).catch(function() { return blob; });
    }

    // Closing or reloading the tab would lose a recording in progress.
    window.addEventListener('beforeunload', function(e) {
        if (!recording && !finalizing) return;
        e.preventDefault();
        e.returnValue = '';
    });

    return {
        isSupported: isSupported,
        startRecording: startRecording,
        stopRecording: stopRecording,
        isRecording: isRecording,
        isSaving: function() { return finalizing || pendingPreparation; },
        isEditingLocked: function() { return editingLocked; },
        timedRecording: timedRecording,
        renderMP4: renderMP4,
        getRenderPlan: getRenderPlan,
        cancelRender: cancelRender,
        saveVideo: saveVideo,
        getLastError: getLastError,
        getLastInfo: function() { return lastInfo; },
        getStatus: getStatus,
        getOfflineAnalysis: getOfflineAnalysis,
        getOfflineMusic: getOfflineMusic,
        captureFrame: captureFrame,
        isFrameExport: isFrameExport,
        canCaptureFrame: canCaptureFrame,
        failRecording: failRecording,
        getCaptureFps: function() { return recording && frameLocked ? captureFps : 0; },
        probe: probe,
        ready: function() { return probeReady; },
        getMimeType: getMimeType,
        getFormats: getFormats,
        getQualities: function() { return Object.keys(QUALITY).map(function(k) { return { id: k, label: QUALITY[k].label }; }); },
        setOptions: setOptions,
        getOptions: getOptions,
        describe: describe,
        checkHardware: checkHardware,
        videoBitrate: videoBitrate
    };
})();
