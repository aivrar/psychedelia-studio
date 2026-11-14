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

    // Session-only user approvals. Projects arrive from untrusted routes
    // (pasted/imported JSON, the Shadertoy API, the library, the project
    // restored from localStorage), so a camera/microphone channel or a
    // local-network URL inside one must not start on its own. These flags are
    // set only by explicit clicks in the channel UI and are never serialised.
    var mediaArmed = { webcam: false, microphone: false };
    var approvedUrls = {};
    var sessionBlobUrls = {};
    var classifyCache = {};
    var classifyCacheSize = 0;

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

    // ---- URL hygiene -------------------------------------------------------

    var MEDIA_DATA_URL = /^data:(image|video|audio)\/[a-z0-9][a-z0-9.+-]*(;[^,]*)?,/i;

    function pageInfo(page) {
        if (page) return page;
        var loc = typeof location !== 'undefined' && location ? location : {};
        return { href: loc.href || '', protocol: loc.protocol || '', origin: loc.origin || '' };
    }

    function ipv4Private(a, b) {
        return a === 0 || a === 10 || a === 127 ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 100 && b >= 64 && b <= 127) ||
            a >= 224;
    }

    // True for loopback, private, link-local and local-only names. Public DNS
    // names that resolve to private addresses cannot be detected here.
    function isPrivateHost(hostname) {
        var h = String(hostname || '').toLowerCase().replace(/\.$/, '');
        if (!h) return true;
        if (h.charAt(0) === '[' && h.charAt(h.length - 1) === ']') h = h.slice(1, -1);
        if (h.indexOf(':') >= 0) {
            if (h === '::' || h === '::1') return true;
            var mapped = /^::ffff:(\d+)\.(\d+)\.\d+\.\d+$/.exec(h);
            if (mapped) return ipv4Private(Number(mapped[1]), Number(mapped[2]));
            var mappedHex = /^::ffff:([0-9a-f]{1,4}):[0-9a-f]{1,4}$/.exec(h);
            if (mappedHex) {
                var hi = parseInt(mappedHex[1], 16);
                return ipv4Private(hi >> 8, hi & 255);
            }
            var first = h.indexOf('::') === 0 ? 0 : parseInt(h.split(':')[0], 16);
            if (!isFinite(first)) return true;
            return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xffc0) === 0xfec0 || first === 0;
        }
        var v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
        if (v4) return ipv4Private(Number(v4[1]), Number(v4[2]));
        if (h === 'localhost' || /\.localhost$/.test(h) || /\.local$/.test(h) || /\.internal$/.test(h)) return true;
        // Single-label names (http://router/) only resolve on the local network.
        return h.indexOf('.') < 0;
    }

    // Classifies a channel source string. verdict: 'allow' (load now),
    // 'confirm' (local-network host: load only after a user click), 'reject'
    // (never load) or 'empty'. `field` is 'url' or 'dataUrl'.
    function classifyUrl(raw, field, page) {
        page = pageInfo(page);
        var src = String(raw == null ? '' : raw).trim();
        if (!src) return { verdict: 'empty', href: '', host: '', reason: '' };
        if (/^data:/i.test(src)) {
            return MEDIA_DATA_URL.test(src)
                ? { verdict: 'allow', href: src, host: '', reason: '' }
                : { verdict: 'reject', href: '', host: '', reason: 'Embedded data was ignored: only image, video or audio data is accepted.' };
        }
        if (/^blob:/i.test(src)) {
            // A matching origin does not prove this page made the blob (another
            // same-origin tab may have), so only blob: URLs registered by this
            // session's own code are accepted. Channel file picks currently
            // become data: URLs, so in practice project blob: URLs are rejected.
            return sessionBlobUrls[src]
                ? { verdict: 'allow', href: src, host: '', reason: '' }
                : { verdict: 'reject', href: '', host: '', reason: 'This blob: URL was not created in this session and was ignored.' };
        }
        if (field === 'dataUrl') {
            return { verdict: 'reject', href: '', host: '', reason: 'Embedded data was ignored: only image, video or audio data is accepted.' };
        }
        var parsed = null;
        try { parsed = page.href ? new URL(src, page.href) : new URL(src); } catch (err) { parsed = null; }
        if (!parsed) return { verdict: 'reject', href: '', host: '', reason: 'Not a valid URL.' };
        var protocol = parsed.protocol;
        if (protocol === 'http:' && page.protocol === 'https:') {
            return { verdict: 'reject', href: '', host: parsed.host, reason: 'http:// URLs cannot load on an https page; use an https:// URL.' };
        }
        if (protocol !== 'https:' && protocol !== 'http:') {
            return { verdict: 'reject', href: '', host: '', reason: 'Only https:// URLs (or image/video files) are supported.' };
        }
        // Same origin skips the private-host check: it is the server the app is already loaded from (e.g. localhost dev), so no new exposure.
        if (page.origin && page.origin !== 'null' && parsed.origin === page.origin) {
            return { verdict: 'allow', href: parsed.href, host: parsed.host, reason: '' };
        }
        if (isPrivateHost(parsed.hostname)) {
            return { verdict: 'confirm', href: parsed.href, host: parsed.host, reason: 'Local network address.' };
        }
        return { verdict: 'allow', href: parsed.href, host: parsed.host, reason: '' };
    }

    function classifyCached(raw, field) {
        var key = field + '|' + raw;
        if (classifyCache[key]) return classifyCache[key];
        if (classifyCacheSize > 256) {
            classifyCache = {};
            classifyCacheSize = 0;
        }
        classifyCacheSize++;
        return (classifyCache[key] = classifyUrl(raw, field));
    }

    // Decides what an image/video channel may load right now. Returns
    // { verdict, src, field, status } where src is what to fetch when the
    // verdict is 'allow'. An invalid dataUrl is ignored (falls back to url).
    function checkSource(channel) {
        channel = channel || {};
        var dataCheck = channel.dataUrl ? classifyCached(String(channel.dataUrl), 'dataUrl') : null;
        if (dataCheck && dataCheck.verdict === 'allow') return { verdict: 'allow', src: dataCheck.href, field: 'dataUrl', status: null };
        var urlCheck = channel.url ? classifyCached(String(channel.url), 'url') : null;
        var kind = channel.kind === 'video' ? 'video' : 'image';
        if (!urlCheck) {
            if (!dataCheck) return { verdict: 'empty', src: '', field: '', status: null };
            return { verdict: 'reject', src: '', field: 'dataUrl', status: sourceStatus(kind, 'error', dataCheck.reason) };
        }
        if (urlCheck.verdict === 'allow' || (urlCheck.verdict === 'confirm' && approvedUrls[urlCheck.href])) {
            return { verdict: 'allow', src: urlCheck.href, field: 'url', status: null };
        }
        if (urlCheck.verdict === 'confirm') {
            var status = sourceStatus(kind, 'blocked', urlCheck.host + ' is a local network address. Click to load ' + urlCheck.host + '.');
            status.action = { type: 'url', url: urlCheck.href, label: 'Load ' + urlCheck.host };
            return { verdict: 'confirm', src: '', field: 'url', status: status };
        }
        return { verdict: urlCheck.verdict, src: '', field: 'url', status: sourceStatus(kind, 'error', urlCheck.reason) };
    }

    function sourceStatus(kind, state, message) {
        return { state: state, message: message, kind: kind, width: 1, height: 1 };
    }

    // Called when the user types/confirms a URL or clicks "Load <host>".
    function allowUrl(raw) {
        var check = classifyUrl(raw, 'url');
        if (check.verdict !== 'allow' && check.verdict !== 'confirm') return false;
        if (!approvedUrls[check.href]) {
            approvedUrls[check.href] = true;
            notify();
        }
        return true;
    }

    // Session-only registry of blob: URLs this page created for a channel
    // (e.g. a future file picker using URL.createObjectURL). Never serialised.
    function registerBlobUrl(url) {
        url = String(url || '');
        if (!/^blob:/i.test(url)) return false;
        sessionBlobUrls[url] = true;
        classifyCache = {};
        classifyCacheSize = 0;
        return true;
    }

    function revokeBlobUrl(url) {
        url = String(url || '');
        if (!sessionBlobUrls[url]) return false;
        delete sessionBlobUrls[url];
        classifyCache = {};
        classifyCacheSize = 0;
        try { if (typeof URL !== 'undefined' && URL.revokeObjectURL) URL.revokeObjectURL(url); } catch (err) { /* noop */ }
        notify();
        return true;
    }

    // ---- Camera / microphone gating ---------------------------------------

    function mediaGateStatus(kind) {
        var label = kind === 'webcam' ? 'Camera' : 'Microphone';
        return {
            state: 'permission',
            gated: true,
            message: label + ' is off — click Enable ' + label.toLowerCase() + ' to use it.',
            kind: kind,
            width: kind === 'webcam' ? 1 : 512,
            height: kind === 'webcam' ? 1 : 2,
            action: { type: 'media', kind: kind, label: 'Enable ' + label.toLowerCase() }
        };
    }

    // Arms webcam/microphone for this page session after a user action in the
    // channel UI (choosing the input or clicking Enable).
    function allowMedia(kind) {
        if (kind !== 'webcam' && kind !== 'microphone') return false;
        if (!mediaArmed[kind]) {
            mediaArmed[kind] = true;
            if (statuses[kind] && statuses[kind].gated) delete statuses[kind];
            notify();
        }
        return true;
    }

    function isMediaAllowed(kind) {
        return !!mediaArmed[kind];
    }

    // Used when a whole new project is loaded: its camera/mic channels did not
    // come from a click in this session, so they must be enabled again.
    function revokeMedia() {
        mediaArmed.webcam = false;
        mediaArmed.microphone = false;
        releaseUserMedia();
    }

    // Stops the webcam/microphone stream when no enabled pass of `project`
    // references it any more (channel changed, pass cleared/disabled, project
    // replaced).
    function releaseUnusedMedia(project) {
        var uses = { webcam: false, microphone: false };
        ((project && project.passes) || []).forEach(function(pass) {
            if (!pass || (pass.id !== 'image' && !pass.enabled)) return;
            (pass.channels || []).forEach(function(channel) {
                if (channel && (channel.kind === 'webcam' || channel.kind === 'microphone')) uses[channel.kind] = true;
            });
        });
        var changed = false;
        if (!uses.webcam && webcamEntry) changed = releaseWebcam() || changed;
        if (!uses.microphone && microphoneEntry) changed = releaseMicrophone() || changed;
        if (changed) notify();
        return uses;
    }

    function channelSourceKey(channel) {
        var check = checkSource(channel);
        return check.verdict === 'allow' ? check.src : (channel.dataUrl || channel.url || '');
    }

    function channelKey(channel) {
        channel = channel || {};
        if (channel.kind === 'procedural') return 'procedural:' + (channel.sourceId || 'checker') + ':' + samplerKey(channel.sampler);
        if (channel.kind === 'image') return 'image:' + hashString(channelSourceKey(channel)) + ':' + samplerKey(channel.sampler);
        if (channel.kind === 'video' && channel.sourceId === 'demo') return 'video:demo:' + samplerKey(channel.sampler);
        if (channel.kind === 'video') return 'video:' + hashString(channelSourceKey(channel)) + ':' + samplerKey(channel.sampler);
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
        var check = checkSource(channel);
        if (check.verdict === 'empty') {
            return fallbackResult(fallback, { state: 'empty', message: 'No image selected.' });
        }
        if (check.verdict !== 'allow') return fallbackResult(fallback, check.status);
        var src = check.src;
        var fromUrl = check.field === 'url';
        var key = channelKey(channel);
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
            if (fromUrl && !/^(data:|blob:)/i.test(src)) img.crossOrigin = 'anonymous';
            img.onload = function() {
                var status = { state: 'ready', message: '', kind: 'image', width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
                var texture = null;
                try {
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, channel.sampler && channel.sampler.vflip ? 1 : 0);
                    texture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                    applySampler(gl, texture, status.width, status.height, channel.sampler, status);
                } catch (err) {
                    // Tainted (cross-origin) or otherwise unusable image.
                    if (texture) {
                        try { gl.deleteTexture(texture); } catch (err2) { /* noop */ }
                    }
                    texture = null;
                    status = { state: 'error', message: 'Image loaded but could not be used as a texture (blocked by cross-origin rules).', kind: 'image', width: 1, height: 1 };
                }
                try { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0); } catch (err3) { /* noop */ }
                if (texture) cache[key] = { texture: texture, width: status.width, height: status.height, time: 0 };
                statuses[key] = status;
                notify();
            };
            img.onerror = function() {
                statuses[key] = {
                    state: 'error',
                    message: fromUrl ? 'Image URL failed to load or was blocked by CORS.' : 'Image file failed to load.',
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
        var check = checkSource(channel);
        if (check.verdict === 'empty') return fallbackResult(fallback, { state: 'empty', message: 'No video selected.' });
        if (check.verdict !== 'allow') return fallbackResult(fallback, check.status);
        var src = check.src;
        var key = channelKey(channel);
        var entry = cache[key];
        if (!entry) {
            entry = cache[key] = makeVideoEntry(gl, channel, src, key, check.field === 'url');
        }
        if (entry.failed) return fallbackResult(fallback, statuses[key]);
        updateVideoPlayback(entry.video);
        if (entry.ready && entry.video.readyState >= 2) {
            if (!uploadVideoFrame(gl, entry, channel)) {
                entry.failed = true;
                try { entry.video.pause(); } catch (err) { /* noop */ }
                statuses[key] = { state: 'error', message: 'Video loaded but could not be used as a texture (blocked by cross-origin rules).', kind: 'video', width: 1, height: 1 };
                notify();
                return fallbackResult(fallback, statuses[key]);
            }
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

    function makeVideoEntry(gl, channel, src, key, fromUrl) {
        statuses[key] = { state: 'loading', message: 'Loading video...', kind: 'video', width: 1, height: 1 };
        var video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        if (fromUrl && !/^(data:|blob:)/i.test(src)) video.crossOrigin = 'anonymous';
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

    // Returns false when the frame cannot be uploaded (e.g. a cross-origin
    // video without CORS taints WebGL and texImage2D throws).
    function uploadVideoFrame(gl, entry, channel) {
        if (!entry.texture) return true;
        var ok = true;
        try {
            gl.bindTexture(gl.TEXTURE_2D, entry.texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, channel.sampler && channel.sampler.vflip ? 1 : 0);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, entry.video);
            applySampler(gl, entry.texture, entry.width, entry.height, channel.sampler, {});
        } catch (err) {
            ok = false;
        }
        try { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0); } catch (err2) { /* noop */ }
        return ok;
    }

    function resolveWebcam(gl, channel, fallback, options) {
        if (!mediaArmed.webcam) {
            // Imported/restored webcam channel: never start the camera
            // without a click in this session.
            if (!statuses.webcam || !statuses.webcam.gated) statuses.webcam = mediaGateStatus('webcam');
            return fallbackResult(fallback, statuses.webcam);
        }
        if (webcamEntry && webcamEntry.ready) {
            if (!webcamEntry.texture) webcamEntry.texture = gl.createTexture();
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
        if (!mediaArmed.microphone) {
            if (!statuses.microphone || !statuses.microphone.gated) statuses.microphone = mediaGateStatus('microphone');
            return fallbackResult(fallback, statuses.microphone);
        }
        if (microphoneEntry && microphoneEntry.ready) {
            if (!microphoneEntry.texture) {
                microphoneEntry.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, microphoneEntry.texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, microphoneEntry.data);
                applySampler(gl, microphoneEntry.texture, 512, 2, { filter: 'linear', wrap: 'clamp' }, {});
            }
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

    // A pending getUserMedia request is abandoned by clearing the entry: its
    // .then() sees webcamEntry !== entry and stops the late stream.
    function releaseWebcam() {
        if (!webcamEntry) return false;
        stopStream(webcamEntry.stream);
        if (webcamEntry.video) {
            try { webcamEntry.video.pause(); } catch (err) { /* noop */ }
            try { webcamEntry.video.srcObject = null; } catch (err2) { /* noop */ }
        }
        if (webcamEntry.texture && glRef) {
            try { glRef.deleteTexture(webcamEntry.texture); } catch (err3) { /* noop */ }
        }
        webcamEntry = null;
        statuses.webcam = { state: 'none', message: '', kind: 'webcam', width: 1, height: 1 };
        return true;
    }

    function releaseMicrophone() {
        if (!microphoneEntry) return false;
        stopStream(microphoneEntry.stream);
        if (microphoneEntry.source && microphoneEntry.source.disconnect) {
            try { microphoneEntry.source.disconnect(); } catch (err) { /* noop */ }
        }
        if (microphoneEntry.context && microphoneEntry.context.close) {
            try {
                var closing = microphoneEntry.context.close();
                if (closing && closing.catch) closing.catch(function() {});
            } catch (err2) { /* noop */ }
        }
        if (microphoneEntry.texture && glRef) {
            try { glRef.deleteTexture(microphoneEntry.texture); } catch (err3) { /* noop */ }
        }
        microphoneEntry = null;
        microphoneFilled = false;
        statuses.microphone = { state: 'none', message: '', kind: 'microphone', width: 512, height: 2 };
        return true;
    }

    function releaseUserMedia() {
        releaseWebcam();
        releaseMicrophone();
        notify();
    }

    // Drops every GL object (and the statuses that vouch for them) after a
    // context loss/restore so channels are recreated lazily on next resolve.
    // Webcam/microphone streams are kept; only their textures are recreated.
    function reset(gl) {
        glRef = gl || glRef;
        for (var key in cache) {
            var entry = cache[key];
            if (entry && entry.video) {
                entry.video.onloadeddata = null;
                entry.video.onerror = null;
                try { entry.video.pause(); } catch (err) { /* noop */ }
            }
        }
        cache = {};
        var kept = {};
        if (statuses.webcam) kept.webcam = statuses.webcam;
        if (statuses.microphone) kept.microphone = statuses.microphone;
        statuses = kept;
        keyboardTexture = null;
        audioTexture = null;
        audioFilled = false;
        microphoneFilled = false;
        if (webcamEntry) webcamEntry.texture = null;
        if (microphoneEntry) microphoneEntry.texture = null;
        notify();
    }

    function getStatus(channel) {
        if (channel && (channel.kind === 'webcam' || channel.kind === 'microphone')) {
            if (!mediaArmed[channel.kind]) return mediaGateStatus(channel.kind);
            return statuses[channel.kind] || { state: 'none', message: '' };
        }
        if (channel && channel.kind === 'unsupported') return { state: 'error', message: channel.message || 'Unsupported Shadertoy input source.', kind: 'unsupported', width: 1, height: 1 };
        if (channel && (channel.kind === 'image' || (channel.kind === 'video' && channel.sourceId !== 'demo'))) {
            var check = checkSource(channel);
            if (check.status && check.verdict !== 'allow') return check.status;
        }
        return statuses[channelKey(channel)] || { state: 'none', message: '' };
    }

    // Image-channel preview source that is safe to show without a network
    // request (data:/same-session blob: only), or '' when none.
    function previewSource(channel) {
        if (!channel || channel.kind !== 'image') return '';
        var check = checkSource(channel);
        if (check.verdict !== 'allow' || !/^(data:image\/|blob:)/i.test(check.src)) return '';
        return check.src;
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
        releaseUserMedia: releaseUserMedia,
        releaseUnusedMedia: releaseUnusedMedia,
        allowMedia: allowMedia,
        isMediaAllowed: isMediaAllowed,
        revokeMedia: revokeMedia,
        allowUrl: allowUrl,
        registerBlobUrl: registerBlobUrl,
        revokeBlobUrl: revokeBlobUrl,
        classifyUrl: classifyUrl,
        checkSource: checkSource,
        previewSource: previewSource,
        reset: reset
    };
})();
