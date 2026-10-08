/* Psychedelia Studio - Shadertoy channel texture manager */
var ShadertoyChannels = (function() {
    'use strict';

    var glRef = null;
    var cache = {};
    var statuses = {};
    var listeners = [];
    var keyboardReady = false;
    var keyDown = new Uint8Array(256);
    var keyPressed = new Uint8Array(256);
    var keyToggled = new Uint8Array(256);
    var audioTexture = null;
    var audioData = new Uint8Array(512 * 2 * 4);
    var keyboardTexture = null;
    var keyboardData = new Uint8Array(256 * 3 * 4);
    var webcamEntry = null;
    var microphoneEntry = null;
    var audioFilled = false;
    var microphoneFilled = false;
    var mediaPaused = false;
    var pausedTime = null;

    function init(gl) {
        glRef = gl || glRef;
        initKeyboard();
    }

    function initKeyboard() {
        if (keyboardReady) return;
        window.addEventListener('keydown', function(e) {
            var code = keyCode(e);
            if (code < 0) return;
            if (!e.repeat) {
                keyPressed[code] = 255;
                keyToggled[code] = keyToggled[code] ? 0 : 255;
            }
            keyDown[code] = 255;
        });
        window.addEventListener('keyup', function(e) {
            var code = keyCode(e);
            if (code >= 0) keyDown[code] = 0;
        });
        keyboardReady = true;
    }

    function keyCode(e) {
        var code = e.keyCode || e.which || 0;
        return code >= 0 && code < 256 ? code : -1;
    }

    function notify() {
        listeners.forEach(function(fn) {
            try { fn(); } catch (err) { /* noop */ }
        });
    }

    function onStatusChange(fn) {
        listeners.push(fn);
    }

    function currentTime(options) {
        if (options && options.uniformState) return options.uniformState.time;
        if (pausedTime !== null) return pausedTime;
        return ShadertoyUniforms.getState().time;
    }

    function playbackPaused() {
        return mediaPaused || (typeof Renderer !== 'undefined' && Renderer.isRunning && !Renderer.isRunning());
    }

    function hashString(str) {
        var hash = 2166136261;
        for (var i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    function samplerKey(sampler) {
        sampler = sampler || {};
        return [
            sampler.filter || 'linear',
            sampler.wrap || 'clamp',
            sampler.vflip ? 'flip' : 'noflip',
            sampler.mipmap ? 'mip' : 'nomip'
        ].join(':');
    }

    function channelKey(channel) {
        channel = channel || {};
        if (channel.kind === 'procedural') return 'procedural:' + (channel.sourceId || 'checker') + ':' + samplerKey(channel.sampler);
        if (channel.kind === 'image') return 'image:' + hashString(channel.dataUrl || channel.url || '') + ':' + samplerKey(channel.sampler);
        if (channel.kind === 'video' && channel.sourceId === 'demo') return 'video:demo:' + samplerKey(channel.sampler);
        if (channel.kind === 'video') return 'video:' + hashString(channel.dataUrl || channel.url || '') + ':' + samplerKey(channel.sampler);
        if (channel.kind === 'webcam') return 'webcam:' + samplerKey(channel.sampler);
        if (channel.kind === 'microphone') return 'microphone';
        if (channel.kind === 'audio') return 'audio';
        if (channel.kind === 'keyboard') return 'keyboard';
        if (channel.kind === 'unsupported') return 'unsupported:' + hashString(channel.message || '');
        return channel.kind || 'none';
    }

    function isPowerOfTwo(n) {
        return n > 0 && (n & (n - 1)) === 0;
    }

    function applySampler(gl, texture, width, height, sampler, status) {
        sampler = sampler || {};
        gl.bindTexture(gl.TEXTURE_2D, texture);
        var filter = sampler.filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
        var wrapName = sampler.wrap || 'clamp';
        var wrap = gl.CLAMP_TO_EDGE;
        var pot = isPowerOfTwo(width) && isPowerOfTwo(height);

        if (wrapName === 'repeat') wrap = gl.REPEAT;
        else if (wrapName === 'mirror') wrap = gl.MIRRORED_REPEAT;

        if (!pot && Renderer.getMode && Renderer.getMode() === 'webgl' && wrap !== gl.CLAMP_TO_EDGE) {
            wrap = gl.CLAMP_TO_EDGE;
            status.warning = 'Repeat and mirror require power-of-two textures in WebGL1; clamped fallback is active.';
            status.message = status.warning;
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

        if (sampler.mipmap && pot) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter === gl.NEAREST ? gl.NEAREST_MIPMAP_NEAREST : gl.LINEAR_MIPMAP_LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    }

    function createTexture(gl, width, height, data, sampler, status) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        applySampler(gl, texture, width, height, sampler, status || {});
        return {
            texture: texture,
            width: width,
            height: height,
            time: 0
        };
    }

    function makeProceduralPixels(kind, width, height) {
        var data = new Uint8Array(width * height * 4);
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var i = (y * width + x) * 4;
                var v = 0;
                if (kind === 'noise' || kind === 'value_noise') {
                    v = Math.floor(fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) * 255);
                    if (kind === 'value_noise') v = Math.floor(v * 0.65 + ((x ^ y) & 31) * 2);
                    data[i] = v;
                    data[i + 1] = v;
                    data[i + 2] = v;
                } else if (kind === 'gradient') {
                    data[i] = Math.floor(255 * x / Math.max(1, width - 1));
                    data[i + 1] = Math.floor(255 * y / Math.max(1, height - 1));
                    data[i + 2] = 220;
                } else {
                    v = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2) ? 235 : 25;
                    data[i] = v;
                    data[i + 1] = v;
                    data[i + 2] = v;
                }
                data[i + 3] = 255;
            }
        }
        return data;
    }

    function fract(v) {
        return v - Math.floor(v);
    }

    function resolveProcedural(gl, channel, fallback) {
        var kind = channel.sourceId || 'checker';
        var key = channelKey(channel);
        if (!cache[key]) {
            var size = kind === 'gradient' ? [256, 64] : [128, 128];
            var status = { state: 'ready', message: '', kind: 'procedural', width: size[0], height: size[1] };
            cache[key] = createTexture(gl, size[0], size[1], makeProceduralPixels(kind, size[0], size[1]), channel.sampler, status);
            statuses[key] = status;
        }
        return {
            texture: cache[key].texture,
            resolution: [cache[key].width, cache[key].height, 1],
            time: 0,
            status: statuses[key]
        };
    }

    function resolveImage(gl, channel, fallback) {
        var src = channel.dataUrl || channel.url || '';
        var key = channelKey(channel);
        if (!src) {
            return fallbackResult(fallback, { state: 'empty', message: 'No image selected.' });
        }
        if (cache[key] && statuses[key] && statuses[key].state === 'ready') {
            return {
                texture: cache[key].texture,
                resolution: [cache[key].width, cache[key].height, 1],
                time: 0,
                status: statuses[key]
            };
        }
        if (!statuses[key]) {
            statuses[key] = { state: 'loading', message: 'Loading image...', kind: 'image', width: 1, height: 1 };
            var img = new Image();
            if (channel.url && !channel.dataUrl && !/^(data:|blob:)/.test(channel.url)) img.crossOrigin = 'anonymous';
            img.onload = function() {
                var status = { state: 'ready', message: '', kind: 'image', width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, channel.sampler && channel.sampler.vflip ? 1 : 0);
                var texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                applySampler(gl, texture, status.width, status.height, channel.sampler, status);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
                cache[key] = { texture: texture, width: status.width, height: status.height, time: 0 };
                statuses[key] = status;
                notify();
            };
            img.onerror = function() {
                statuses[key] = {
                    state: 'error',
                    message: channel.url ? 'Image URL failed to load or was blocked by CORS.' : 'Image file failed to load.',
                    kind: 'image',
                    width: 1,
                    height: 1
                };
                notify();
            };
            img.src = src;
        }
        return fallbackResult(fallback, statuses[key]);
    }

    function resolveKeyboard(gl, channel, fallback) {
        var key = channelKey(channel);
        if (!keyboardTexture) {
            keyboardTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, keyboardTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 3, 0, gl.RGBA, gl.UNSIGNED_BYTE, keyboardData);
            applySampler(gl, keyboardTexture, 256, 3, { filter: 'nearest', wrap: 'clamp' }, {});
        }
        for (var x = 0; x < 256; x++) {
            writePixel(keyboardData, 256, x, 0, keyDown[x]);
            writePixel(keyboardData, 256, x, 1, keyPressed[x]);
            writePixel(keyboardData, 256, x, 2, keyToggled[x]);
            keyPressed[x] = 0;
        }
        gl.bindTexture(gl.TEXTURE_2D, keyboardTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 3, gl.RGBA, gl.UNSIGNED_BYTE, keyboardData);
        statuses[key] = { state: 'ready', message: '', kind: 'keyboard', width: 256, height: 3 };
        return { texture: keyboardTexture, resolution: [256, 3, 1], time: 0, status: statuses[key] };
    }

    function writePixel(data, width, x, y, value) {
        var i = (y * width + x) * 4;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
    }

    function resolveAudio(gl, channel, fallback, options) {
        var key = channelKey(channel);
        if (!audioTexture) {
            audioTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, audioTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, audioData);
            applySampler(gl, audioTexture, 512, 2, { filter: 'linear', wrap: 'clamp' }, {});
        }
        if (!mediaPaused || !audioFilled) {
            fillAudioData(audioData, options);
            audioFilled = true;
        }
        gl.bindTexture(gl.TEXTURE_2D, audioTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 512, 2, gl.RGBA, gl.UNSIGNED_BYTE, audioData);
        var audioStatus = getAudioStatus();
        statuses[key] = {
            state: 'ready',
            message: audioStatus.message,
            kind: 'audio',
            audioSource: audioStatus.source,
            width: 512,
            height: 2
        };
        return { texture: audioTexture, resolution: [512, 2, 1], time: currentTime(options), status: statuses[key] };
    }

    function fillAudioData(data, options) {
        var analysis = getAudioAnalysis(options);
        var t = currentTime(options);
        for (var x = 0; x < 512; x++) {
            var wave = 0.5 + 0.45 * Math.sin(t * 4.0 + x * 0.07);
            var fft = Math.max(0, 1.0 - x / 512) * (0.35 + 0.35 * Math.sin(t * 2.0));
            if (analysis && analysis.waveform && analysis.fft && (analysis.available || analysis.source === 'fallback')) {
                wave = audioSample(analysis.waveform, x, analysis.byteData, wave);
                fft = audioSample(analysis.fft, x, analysis.byteData, fft);
            }
            writePixel(data, 512, x, 0, Math.floor(Math.max(0, Math.min(1, wave)) * 255));
            writePixel(data, 512, x, 1, Math.floor(Math.max(0, Math.min(1, fft)) * 255));
        }
    }

    function getAudioAnalysis(options) {
        if (typeof AudioAnalysis !== 'undefined' && AudioAnalysis.getAnalysis) {
            try { return AudioAnalysis.getAnalysis(options); } catch (err) { /* fallback below */ }
        }
        if (typeof Music !== 'undefined' && Music.getAnalysis) {
            try { return Music.getAnalysis(); } catch (err2) { /* fallback below */ }
        }
        return null;
    }

    function getAudioStatus() {
        if (typeof AudioAnalysis !== 'undefined' && AudioAnalysis.getStatus) {
            try {
                var status = AudioAnalysis.getStatus();
                return {
                    source: status.source || 'fallback',
                    message: status.message || ''
                };
            } catch (err) { /* fallback below */ }
        }
        if (typeof Music !== 'undefined' && Music.isReady && Music.isReady()) return { source: 'music', message: '' };
        return { source: 'fallback', message: 'Audio analyser fallback is active until music starts.' };
    }

    function audioSample(array, index, byteData, fallback) {
        if (!array || array[index] === undefined) return fallback;
        var value = Number(array[index]);
        if (!isFinite(value)) return fallback;
        return byteData ? value / 255 : value;
    }

    function resolveVideo(gl, channel, fallback, options) {
        if (channel.sourceId === 'demo') return resolveDemoVideo(gl, channel, fallback, options);
        var src = channel.dataUrl || channel.url || '';
        var key = channelKey(channel);
        if (!src) return fallbackResult(fallback, { state: 'empty', message: 'No video selected.' });
        var entry = cache[key];
        if (!entry) {
            entry = cache[key] = makeVideoEntry(gl, channel, src, key);
        }
        updateVideoPlayback(entry.video);
        if (entry.ready && entry.video.readyState >= 2) {
            uploadVideoFrame(gl, entry, channel);
            return {
                texture: entry.texture,
                resolution: [entry.width || 1, entry.height || 1, 1],
                time: entry.video.currentTime || 0,
                status: statuses[key]
            };
        }
        return fallbackResult(fallback, statuses[key]);
    }

    function resolveDemoVideo(gl, channel, fallback, options) {
        var key = channelKey(channel);
        var entry = cache[key];
        if (!entry) {
            entry = cache[key] = {
                texture: gl.createTexture(),
                width: 64,
                height: 64,
                data: new Uint8Array(64 * 64 * 4)
            };
            gl.bindTexture(gl.TEXTURE_2D, entry.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, entry.width, entry.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, entry.data);
            applySampler(gl, entry.texture, entry.width, entry.height, channel.sampler, {});
        }
        var t = currentTime(options);
        for (var y = 0; y < entry.height; y++) {
            for (var x = 0; x < entry.width; x++) {
                var i = (y * entry.width + x) * 4;
                var wave = Math.sin(t * 5.0 + x * 0.2 + y * 0.12) > 0 ? 255 : 0;
                entry.data[i] = wave;
                entry.data[i + 1] = Math.floor(80 + 80 * Math.sin(t + y * 0.1));
                entry.data[i + 2] = 255 - wave;
                entry.data[i + 3] = 255;
            }
        }
        gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, entry.width, entry.height, gl.RGBA, gl.UNSIGNED_BYTE, entry.data);
        statuses[key] = { state: 'ready', message: '', kind: 'video', width: entry.width, height: entry.height };
        return { texture: entry.texture, resolution: [entry.width, entry.height, 1], time: t, status: statuses[key] };
    }

    function makeVideoEntry(gl, channel, src, key) {
        statuses[key] = { state: 'loading', message: 'Loading video...', kind: 'video', width: 1, height: 1 };
        var video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        if (channel.url && !channel.dataUrl && !/^(data:|blob:)/.test(channel.url)) video.crossOrigin = 'anonymous';
        var entry = { video: video, texture: null, width: 1, height: 1, ready: false };
        video.onloadeddata = function() {
            entry.width = video.videoWidth || 1;
            entry.height = video.videoHeight || 1;
            entry.texture = gl.createTexture();
            entry.ready = true;
            statuses[key] = { state: 'ready', message: '', kind: 'video', width: entry.width, height: entry.height };
            updateVideoPlayback(video);
            notify();
        };
        video.onerror = function() {
            statuses[key] = { state: 'error', message: 'Video failed to load.', kind: 'video', width: 1, height: 1 };
            notify();
        };
        video.src = src;
        video.load();
        return entry;
    }

    function updateVideoPlayback(video) {
        if (!video) return;
        if (playbackPaused()) {
            try { video.pause(); } catch (err) { /* noop */ }
        } else if (video.paused) {
            var playPromise = video.play();
            if (playPromise && playPromise.catch) playPromise.catch(function() {});
        }
    }

    function uploadVideoFrame(gl, entry, channel) {
        if (!entry.texture) return;
        gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, channel.sampler && channel.sampler.vflip ? 1 : 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, entry.video);
        applySampler(gl, entry.texture, entry.width, entry.height, channel.sampler, {});
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    }

    function resolveWebcam(gl, channel, fallback, options) {
        if (webcamEntry && webcamEntry.ready) {
            updateVideoPlayback(webcamEntry.video);
            uploadVideoFrame(gl, webcamEntry, channel);
            return {
                texture: webcamEntry.texture,
                resolution: [webcamEntry.width || 1, webcamEntry.height || 1, 1],
                time: currentTime(options),
                status: statuses.webcam
            };
        }
        if (!webcamEntry) requestWebcam(gl);
        return fallbackResult(fallback, statuses.webcam || { state: 'permission', message: 'Waiting for webcam permission.' });
    }

    function requestWebcam(gl) {
        statuses.webcam = { state: 'permission', message: 'Waiting for webcam permission.', kind: 'webcam', width: 1, height: 1 };
        webcamEntry = { video: document.createElement('video'), texture: null, ready: false, width: 1, height: 1 };
        var entry = webcamEntry;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            statuses.webcam = { state: 'error', message: 'Webcam is not available in this browser.', kind: 'webcam', width: 1, height: 1 };
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
            if (webcamEntry !== entry) {
                stopStream(stream);
                return;
            }
            var video = entry.video;
            entry.stream = stream;
            video.muted = true;
            video.playsInline = true;
            video.srcObject = stream;
            video.onloadedmetadata = function() {
                if (webcamEntry !== entry) return;
                entry.width = video.videoWidth || 1;
                entry.height = video.videoHeight || 1;
                entry.texture = gl.createTexture();
                entry.ready = true;
                statuses.webcam = { state: 'ready', message: '', kind: 'webcam', width: entry.width, height: entry.height };
                updateVideoPlayback(video);
                notify();
            };
            updateVideoPlayback(video);
        }).catch(function(err) {
            if (webcamEntry !== entry) return;
            statuses.webcam = { state: 'error', message: 'Webcam permission denied or unavailable.', kind: 'webcam', width: 1, height: 1 };
            notify();
        });
    }

    function resolveMicrophone(gl, channel, fallback, options) {
        if (microphoneEntry && microphoneEntry.ready) {
            if (!mediaPaused || !microphoneFilled) {
                fillMicrophoneData(microphoneEntry);
                microphoneFilled = true;
            }
            gl.bindTexture(gl.TEXTURE_2D, microphoneEntry.texture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 512, 2, gl.RGBA, gl.UNSIGNED_BYTE, microphoneEntry.data);
            return { texture: microphoneEntry.texture, resolution: [512, 2, 1], time: currentTime(options), status: statuses.microphone };
        }
        if (!microphoneEntry) requestMicrophone(gl);
        return fallbackResult(fallback, statuses.microphone || { state: 'permission', message: 'Waiting for microphone permission.' });
    }

    function requestMicrophone(gl) {
        statuses.microphone = { state: 'permission', message: 'Waiting for microphone permission.', kind: 'microphone', width: 512, height: 2 };
        microphoneEntry = { ready: false, texture: null, data: new Uint8Array(512 * 2 * 4), analyser: null, context: null, stream: null, source: null, timeData: new Uint8Array(512), freqData: new Uint8Array(512) };
        var entry = microphoneEntry;
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !AudioCtx) {
            statuses.microphone = { state: 'error', message: 'Microphone is not available in this browser.', kind: 'microphone', width: 512, height: 2 };
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
            if (microphoneEntry !== entry) {
                stopStream(stream);
                return;
            }
            var ctx = new AudioCtx();
            var source = ctx.createMediaStreamSource(stream);
            var analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            source.connect(analyser);
            entry.analyser = analyser;
            entry.context = ctx;
            entry.stream = stream;
            entry.source = source;
            entry.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, entry.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, entry.data);
            applySampler(gl, entry.texture, 512, 2, { filter: 'linear', wrap: 'clamp' }, {});
            entry.ready = true;
            statuses.microphone = { state: 'ready', message: '', kind: 'microphone', width: 512, height: 2 };
            notify();
        }).catch(function(err) {
            if (microphoneEntry !== entry) return;
            statuses.microphone = { state: 'error', message: 'Microphone permission denied or unavailable.', kind: 'microphone', width: 512, height: 2 };
            notify();
        });
    }

    function fillMicrophoneData(entry) {
        entry.analyser.getByteTimeDomainData(entry.timeData);
        entry.analyser.getByteFrequencyData(entry.freqData);
        for (var x = 0; x < 512; x++) {
            writePixel(entry.data, 512, x, 0, entry.timeData[x]);
            writePixel(entry.data, 512, x, 1, entry.freqData[x]);
        }
    }

    function fallbackResult(fallback, status) {
        return {
            texture: fallback,
            resolution: [1, 1, 1],
            time: 0,
            status: status || { state: 'fallback', message: '' }
        };
    }

    function resolve(gl, channel, fallback, options) {
        init(gl);
        channel = channel || { kind: 'none' };
        if (channel.kind === 'unsupported') {
            return fallbackResult(fallback, {
                state: 'error',
                message: channel.message || 'Unsupported Shadertoy input source.',
                kind: 'unsupported',
                width: 1,
                height: 1
            });
        }
        if (channel.kind === 'procedural') return resolveProcedural(gl, channel, fallback);
        if (channel.kind === 'image') return resolveImage(gl, channel, fallback);
        if (channel.kind === 'keyboard') return resolveKeyboard(gl, channel, fallback);
        if (channel.kind === 'audio') return resolveAudio(gl, channel, fallback, options);
        if (channel.kind === 'video') return resolveVideo(gl, channel, fallback, options);
        if (channel.kind === 'webcam') return resolveWebcam(gl, channel, fallback, options);
        if (channel.kind === 'microphone') return resolveMicrophone(gl, channel, fallback, options);
        return fallbackResult(fallback, { state: 'none', message: '' });
    }

    function setPaused(value, state) {
        mediaPaused = !!value;
        pausedTime = mediaPaused && state && typeof state.time === 'number' ? state.time : null;
        for (var key in cache) {
            if (cache[key] && cache[key].video) updateVideoPlayback(cache[key].video);
        }
        if (webcamEntry && webcamEntry.video) updateVideoPlayback(webcamEntry.video);
        if (microphoneEntry && microphoneEntry.context) {
            try {
                if (mediaPaused && microphoneEntry.context.state === 'running') microphoneEntry.context.suspend();
                else if (!mediaPaused && microphoneEntry.context.state === 'suspended') microphoneEntry.context.resume();
            } catch (err) { /* noop */ }
        }
    }

    function stopStream(stream) {
        if (!stream || !stream.getTracks) return;
        stream.getTracks().forEach(function(track) {
            try { track.stop(); } catch (err) { /* noop */ }
        });
    }

    function releaseUserMedia() {
        if (webcamEntry) {
            stopStream(webcamEntry.stream);
            if (webcamEntry.video) {
                try { webcamEntry.video.pause(); } catch (err) { /* noop */ }
                webcamEntry.video.srcObject = null;
            }
            webcamEntry = null;
            statuses.webcam = { state: 'none', message: '', kind: 'webcam', width: 1, height: 1 };
        }
        if (microphoneEntry) {
            stopStream(microphoneEntry.stream);
            if (microphoneEntry.context && microphoneEntry.context.close) {
                try { microphoneEntry.context.close(); } catch (err) { /* noop */ }
            }
            microphoneEntry = null;
            microphoneFilled = false;
            statuses.microphone = { state: 'none', message: '', kind: 'microphone', width: 512, height: 2 };
        }
        notify();
    }

    function getStatus(channel) {
        if (channel && channel.kind === 'webcam') return statuses.webcam || { state: 'none', message: '' };
        if (channel && channel.kind === 'microphone') return statuses.microphone || { state: 'none', message: '' };
        if (channel && channel.kind === 'unsupported') return { state: 'error', message: channel.message || 'Unsupported Shadertoy input source.', kind: 'unsupported', width: 1, height: 1 };
        return statuses[channelKey(channel)] || { state: 'none', message: '' };
    }

    function getProceduralNames() {
        return ['checker', 'noise', 'gradient', 'value_noise'];
    }

    return {
        init: init,
        resolve: resolve,
        getStatus: getStatus,
        getProceduralNames: getProceduralNames,
        onStatusChange: onStatusChange,
        setPaused: setPaused,
        releaseUserMedia: releaseUserMedia
    };
})();
