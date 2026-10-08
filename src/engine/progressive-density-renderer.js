/* Psychedelia - Shared Progressive Density Renderer */
var ProgressiveDensityRenderer = (function() {
    'use strict';

    var DEFAULT_WORKER_URL = 'src/workers/progressive-density-worker.js';
    var activeInstance = null;

    function clamp(value, min, max, fallback) {
        value = Number(value);
        if (!isFinite(value)) value = fallback !== undefined ? fallback : min;
        return Math.max(min, Math.min(max, value));
    }

    function stableString(value) {
        if (value === null || value === undefined) return '';
        if (typeof value !== 'object') return String(value);
        if (Array.isArray(value)) return '[' + value.map(stableString).join(',') + ']';
        return '{' + Object.keys(value).sort().map(function(key) {
            return key + ':' + stableString(value[key]);
        }).join(',') + '}';
    }

    function nowMs() {
        return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    }

    // Density effects are accumulated into a finite texture. Rotating that
    // texture at its original size exposes its rectangular corners. Keep the
    // backing texture large enough to cover the output, using the same exact
    // rectangle-cover calculation as Generator Lab. Continuous rotation uses
    // a constant worst-case cover so the image does not visibly breathe.
    function rotationCoverScale(width, height, radians, animated) {
        width = Math.max(1, Number(width) || 1);
        height = Math.max(1, Number(height) || 1);
        if (animated) return Math.hypot(width, height) / Math.min(width, height);
        var sine = Math.abs(Math.sin(Number(radians) || 0));
        var cosine = Math.abs(Math.cos(Number(radians) || 0));
        return Math.max(
            cosine + height / width * sine,
            cosine + width / height * sine
        );
    }

    function absoluteWorkerUrl(workerUrl) {
        if (typeof URL !== 'undefined' && typeof document !== 'undefined') {
            return new URL(workerUrl, document.baseURI || window.location.href).href;
        }
        return workerUrl;
    }

    function createBlobImportWorker(workerUrl) {
        if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
            throw new Error('Blob worker fallback unavailable');
        }
        var source = 'importScripts(' + JSON.stringify(absoluteWorkerUrl(workerUrl)) + ');';
        var objectUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        try {
            return {
                worker: new Worker(objectUrl),
                objectUrl: objectUrl,
                mode: 'blob-importScripts'
            };
        } catch (err) {
            URL.revokeObjectURL(objectUrl);
            throw err;
        }
    }

    // The worker file also loads as a page script and publishes its own
    // source. A Blob worker built from that source needs no network or
    // file access, so it works when the app is opened from file://.
    function createInlineSourceWorker() {
        var source = typeof window !== 'undefined' ? window.PsyDensityWorkerSource : '';
        if (!source || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
            throw new Error('Inline worker source unavailable');
        }
        var objectUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        try {
            return {
                worker: new Worker(objectUrl),
                objectUrl: objectUrl,
                mode: 'blob-inline'
            };
        } catch (err) {
            URL.revokeObjectURL(objectUrl);
            throw err;
        }
    }

    function isFileProtocol() {
        return typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
    }

    function compile(gl, type, source, label) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('ProgressiveDensityRenderer shader compile error:', label, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(gl) {
        var vertex = [
            'attribute vec2 a_position;',
            'varying vec2 v_uv;',
            'void main() {',
            '    v_uv = a_position * 0.5 + 0.5;',
            '    gl_Position = vec4(a_position, 0.0, 1.0);',
            '}'
        ].join('\n');
        var fragment = [
            'precision highp float;',
            'uniform sampler2D u_density_texture;',
            'uniform vec2 u_density_texel;',
            'uniform float u_sharpness;',
            'uniform float u_view_zoom;',
            'uniform float u_view_rotation;',
            'uniform float u_view_aspect;',
            'varying vec2 v_uv;',
            'void main() {',
            '    vec2 p = v_uv - vec2(0.5);',
            '    p.x *= max(u_view_aspect, 0.0001);',
            '    float cr = cos(u_view_rotation);',
            '    float sr = sin(u_view_rotation);',
            '    p = mat2(cr, -sr, sr, cr) * p / max(u_view_zoom, 0.0001);',
            '    p.x /= max(u_view_aspect, 0.0001);',
            '    vec2 sampleUV = p + vec2(0.5);',
            '    bool outside = sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0;',
            '    vec4 c = outside ? vec4(0.004, 0.005, 0.010, 1.0) : texture2D(u_density_texture, sampleUV);',
            '    if (!outside && u_sharpness > 0.001) {',
            '        vec4 n = texture2D(u_density_texture, sampleUV + vec2(0.0, u_density_texel.y));',
            '        vec4 s = texture2D(u_density_texture, sampleUV - vec2(0.0, u_density_texel.y));',
            '        vec4 e = texture2D(u_density_texture, sampleUV + vec2(u_density_texel.x, 0.0));',
            '        vec4 w = texture2D(u_density_texture, sampleUV - vec2(u_density_texel.x, 0.0));',
            '        vec3 blur = (n.rgb + s.rgb + e.rgb + w.rgb) * 0.25;',
            '        c.rgb = clamp(c.rgb + (c.rgb - blur) * u_sharpness, 0.0, 1.0);',
            '    }',
            '    gl_FragColor = c;',
            '}'
        ].join('\n');
        var vs = compile(gl, gl.VERTEX_SHADER, vertex, 'vertex');
        var fs = compile(gl, gl.FRAGMENT_SHADER, fragment, 'fragment');
        if (!vs || !fs) return null;
        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('ProgressiveDensityRenderer program link error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        return program;
    }

    function DensityInstance(options) {
        options = options || {};
        this.workerUrl = options.workerUrl || DEFAULT_WORKER_URL;
        this.name = options.name || 'progressive-density';
        this.maxSide = Math.max(64, Math.floor(clamp(options.maxSide, 64, 4096, 768)));
        this.resolutionScale = clamp(options.resolutionScale, 0.05, 1, 0.35);
        this.gl = null;
        this.program = null;
        this.texture = null;
        this.buffer = null;
        this.locations = null;
        this.worker = null;
        this.workerObjectUrl = '';
        this.workerMode = 'none';
        this.workerStatus = 'idle';
        this.workerError = '';
        this.pending = false;
        this.requestId = 0;
        this.generation = 0;
        this.resetKey = '';
        this.tonemapKey = '';
        this.width = 0;
        this.height = 0;
        this.maxTextureSize = 0;
        this.accumulationFrames = 0;
        this.lastBatchSize = 0;
        this.resetCount = 0;
        this.workerResetCount = 0;
        this.staleMessages = 0;
        this.lastMaxValue = 0;
        this.hasFrame = false;
        this.cleaned = false;
        this.sharpness = 0;
        this.viewTime = 0;
        this.pendingResetKey = '';
        this.pendingResetSince = 0;
        this.resetDebounceMs = 0;
    }

    DensityInstance.prototype.init = function(gl) {
        if (!gl) return false;
        activeInstance = this;
        if (this.gl === gl && this.program && this.texture && this.buffer) return true;
        this.cleanup(this.gl);
        this.cleaned = false;
        this.gl = gl;
        this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
        this.program = createProgram(gl);
        this.texture = gl.createTexture();
        this.buffer = gl.createBuffer();
        if (!this.program || !this.texture || !this.buffer) return false;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.locations = {
            position: gl.getAttribLocation(this.program, 'a_position'),
            texture: gl.getUniformLocation(this.program, 'u_density_texture'),
            texel: gl.getUniformLocation(this.program, 'u_density_texel'),
            sharpness: gl.getUniformLocation(this.program, 'u_sharpness'),
            viewZoom: gl.getUniformLocation(this.program, 'u_view_zoom'),
            viewRotation: gl.getUniformLocation(this.program, 'u_view_rotation'),
            viewAspect: gl.getUniformLocation(this.program, 'u_view_aspect')
        };
        this.ensureWorker();
        return true;
    };

    DensityInstance.prototype.ensureWorker = function() {
        var self = this;
        if (this.worker || typeof Worker === 'undefined') {
            if (typeof Worker === 'undefined') this.workerStatus = 'unsupported';
            return !!this.worker;
        }
        function attach(worker, mode, objectUrl) {
            self.worker = worker;
            self.workerMode = mode || 'direct';
            self.workerObjectUrl = objectUrl || '';
            self.workerStatus = 'ready';
            self.workerError = '';
            self.worker.onmessage = function(event) {
                self.handleWorkerMessage(event.data || {});
            };
            self.worker.onerror = function(event) {
                // A path-loaded worker can fail asynchronously (blocked file
                // access, missing script). Retry once from the inline source
                // before reporting the lab as unavailable.
                if (self.workerMode !== 'blob-inline' && !self.inlineRetried && !self.hasFrame) {
                    self.inlineRetried = true;
                    if (event && event.preventDefault) event.preventDefault();
                    try {
                        var inline = createInlineSourceWorker();
                        self.terminateWorker();
                        attach(inline.worker, inline.mode, inline.objectUrl);
                        self.pending = false;
                        return;
                    } catch (inlineErr) { /* fall through to error state */ }
                }
                self.workerStatus = 'error';
                self.workerError = event && (event.message || event.filename) || 'worker error';
                self.pending = false;
            };
        }
        var attempts = [];
        if (isFileProtocol()) attempts.push(createInlineSourceWorker);
        attempts.push(function() {
            return { worker: new Worker(self.workerUrl), objectUrl: '', mode: 'direct' };
        });
        if (!isFileProtocol()) attempts.push(createInlineSourceWorker);
        attempts.push(function() { return createBlobImportWorker(self.workerUrl); });
        var messages = [];
        for (var i = 0; i < attempts.length; i++) {
            try {
                var created = attempts[i]();
                attach(created.worker, created.mode, created.objectUrl);
                return true;
            } catch (err) {
                messages.push(err && err.message || String(err));
            }
        }
        this.workerMode = 'none';
        this.workerObjectUrl = '';
        this.workerStatus = 'error';
        this.workerError = messages.join('; ');
        return false;
    };

    DensityInstance.prototype.releaseWorkerObjectUrl = function() {
        if (this.workerObjectUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
            try { URL.revokeObjectURL(this.workerObjectUrl); } catch (err) { /* noop */ }
        }
        this.workerObjectUrl = '';
    };

    DensityInstance.prototype.terminateWorker = function() {
        if (this.worker) {
            try { this.worker.postMessage({ type: 'close' }); } catch (err) { /* noop */ }
            this.worker.terminate();
            this.worker = null;
        }
        this.releaseWorkerObjectUrl();
        this.workerMode = 'none';
    };

    DensityInstance.prototype.restartWorker = function() {
        this.terminateWorker();
        this.workerStatus = 'idle';
        if (!this.cleaned) this.ensureWorker();
    };

    DensityInstance.prototype.computeSize = function(gl, config) {
        var canvas = Renderer.getCanvas ? Renderer.getCanvas() : gl.canvas;
        var scale = clamp(config.resolutionScale, 0.05, 1, this.resolutionScale);
        var maxSide = Math.min(this.maxTextureSize || 4096, Math.max(64, Math.floor(clamp(config.maxSide, 64, 4096, this.maxSide))));
        var width = Math.max(1, Math.floor(canvas.width * scale));
        var height = Math.max(1, Math.floor(canvas.height * scale));
        var ratio = Math.min(1, maxSide / Math.max(width, height));
        width = Math.max(1, Math.floor(width * ratio));
        height = Math.max(1, Math.floor(height * ratio));
        return { width: width, height: height, maxSide: maxSide };
    };

    DensityInstance.prototype.reset = function(reason) {
        this.generation++;
        this.pending = false;
        this.accumulationFrames = 0;
        this.lastBatchSize = 0;
        this.lastMaxValue = 0;
        this.pendingResetKey = '';
        this.pendingResetSince = 0;
        // Keep the last valid texture visible while a new structural generation
        // is computed. Clearing it here caused every slider adjustment to flash
        // to black, even though the stale frame is a better loading placeholder.
        this.resetCount++;
        this.resetReason = reason || 'reset';
        this.restartWorker();
    };

    DensityInstance.prototype.render = function(gl, time, config) {
        config = config || {};
        if (!this.init(gl)) return false;
        var size = this.computeSize(gl, config);
        var structural = config.structural || {};
        var tonemap = config.tonemap || {};
        var resetKey = String(config.resetKey !== undefined ? config.resetKey : stableString({
            densityType: config.densityType || 'test_spiral',
            width: size.width,
            height: size.height,
            structural: structural
        }));
        var tonemapKey = String(config.tonemapKey !== undefined ? config.tonemapKey : stableString(tonemap));
        this.sharpness = clamp(config.sharpness, 0, 1.5, 0);
        this.viewTime = config.viewTime === undefined ? (Number(time) || 0) : (Number(config.viewTime) || 0);
        this.resetDebounceMs = clamp(config.resetDebounceMs, 0, 1000, 0);
        var sizeChanged = this.width !== size.width || this.height !== size.height;
        var keyChanged = this.resetKey !== resetKey;
        if (!sizeChanged && keyChanged && this.resetKey && this.resetDebounceMs > 0) {
            var currentMs = nowMs();
            if (this.pendingResetKey !== resetKey) {
                this.pendingResetKey = resetKey;
                this.pendingResetSince = currentMs;
            }
            if (currentMs - this.pendingResetSince < this.resetDebounceMs) {
                // Keep displaying and finishing the current generation while a
                // slider is moving. Starting a worker for every pointer event
                // made progressive-density knobs appear unresponsive.
                this.draw(gl);
                return true;
            }
        } else if (!keyChanged) {
            this.pendingResetKey = '';
            this.pendingResetSince = 0;
        }
        if (sizeChanged || keyChanged) {
            this.width = size.width;
            this.height = size.height;
            this.resetKey = resetKey;
            this.reset('reset-key');
        }
        this.tonemapKey = tonemapKey;
        this.requestBatch(time, config, size, resetKey, tonemap);
        this.draw(gl);
        return true;
    };

    DensityInstance.prototype.requestBatch = function(time, config, size, resetKey, tonemap) {
        if (!this.worker && !this.ensureWorker()) return false;
        if (this.pending || this.cleaned) return false;
        var requestId = ++this.requestId;
        this.pending = true;
        this.workerStatus = 'busy';
        this.worker.postMessage({
            type: 'accumulate',
            requestId: requestId,
            generation: this.generation,
            resetKey: resetKey,
            densityType: config.densityType || 'test_spiral',
            width: size.width,
            height: size.height,
            batchSize: Math.floor(clamp(config.batchSize, 1, 200000, 12000)),
            decay: clamp(config.decay, 0, 1, 1),
            params: config.params || {},
            tonemap: {
                exposure: clamp(tonemap.exposure, 0.01, 12, 1.4),
                gamma: clamp(tonemap.gamma, 0.2, 4, 0.9),
                gain: clamp(tonemap.gain, 0.05, 8, 1.0),
                glow: clamp(tonemap.glow, 0, 4, 0.7),
                curve: clamp(tonemap.curve, 0.25, 3, 1.0),
                palette: Math.floor(clamp(tonemap.palette, -1, 12, -1)),
                colorPhase: clamp(tonemap.colorPhase, -100000, 100000, 0)
            },
            time: Number(time) || 0
        });
        return true;
    };

    DensityInstance.prototype.handleWorkerMessage = function(message) {
        if (this.cleaned) return;
        if (message.type === 'frame') {
            this.pending = false;
            if (message.generation !== this.generation || message.resetKey !== this.resetKey) {
                this.staleMessages++;
                this.workerStatus = 'ready';
                return;
            }
            this.workerStatus = message.workerStatus || 'ready';
            this.workerResetCount = message.resetCount || this.workerResetCount;
            this.accumulationFrames = message.frameCount || this.accumulationFrames;
            this.lastBatchSize = message.lastBatchSize || 0;
            this.lastMaxValue = message.maxValue || 0;
            this.uploadFrame(message.width, message.height, message.image);
        } else if (message.type === 'reset') {
            if (message.generation === this.generation) {
                this.workerResetCount = message.resetCount || this.workerResetCount;
                this.workerStatus = message.workerStatus || 'ready';
            } else {
                this.staleMessages++;
            }
        }
    };

    DensityInstance.prototype.uploadFrame = function(width, height, imageBuffer) {
        var gl = this.gl;
        if (!gl || !this.texture || !imageBuffer) return;
        width = Math.max(1, Math.floor(width));
        height = Math.max(1, Math.floor(height));
        if (width > this.maxTextureSize || height > this.maxTextureSize) {
            this.workerStatus = 'error';
            this.workerError = 'worker frame exceeds MAX_TEXTURE_SIZE';
            return;
        }
        var image = new Uint8ClampedArray(imageBuffer);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.hasFrame = true;
    };

    DensityInstance.prototype.draw = function(gl) {
        var canvas = Renderer.getCanvas ? Renderer.getCanvas() : gl.canvas;
        if (Renderer.bindFramebuffer) Renderer.bindFramebuffer(-1);
        else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        gl.clearColor(0.004, 0.005, 0.010, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!this.hasFrame || !this.texture || !this.program) return;
        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.locations.texture, 0);
        gl.uniform2f(this.locations.texel, 1 / Math.max(this.width, 1), 1 / Math.max(this.height, 1));
        gl.uniform1f(this.locations.sharpness, this.sharpness || 0);
        var viewZoom = Renderer.getEffectiveViewZoom ? Renderer.getEffectiveViewZoom(this.viewTime) :
            (Renderer.getViewZoom ? Renderer.getViewZoom() : 1);
        var viewRotation = Renderer.getRotation ? Renderer.getRotation() : 0;
        var rotationSpeed = Renderer.getRotationSpeed ? Renderer.getRotationSpeed() : 0;
        var coverScale = rotationCoverScale(canvas.width, canvas.height, viewRotation, Math.abs(rotationSpeed) > 0.0001);
        // Zooming out is evaluated while the worker plots its procedural scene.
        // This display pass therefore only performs crop-in zoom and edge-safe
        // rotation; it can never reveal the finite density framebuffer.
        var displayZoom = Math.max(1, viewZoom) * coverScale * 1.002;
        gl.uniform1f(this.locations.viewZoom, displayZoom);
        gl.uniform1f(this.locations.viewRotation, viewRotation);
        gl.uniform1f(this.locations.viewAspect, canvas.width / Math.max(canvas.height, 1));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.locations.position);
        gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.disableVertexAttribArray(this.locations.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.useProgram(null);
    };

    DensityInstance.prototype.cleanup = function(gl) {
        gl = gl || this.gl;
        this.cleaned = true;
        this.terminateWorker();
        this.workerStatus = 'terminated';
        this.pending = false;
        if (gl) {
            if (this.texture) gl.deleteTexture(this.texture);
            if (this.buffer) gl.deleteBuffer(this.buffer);
            if (this.program) gl.deleteProgram(this.program);
        }
        this.gl = null;
        this.program = null;
        this.texture = null;
        this.buffer = null;
        this.locations = null;
        this.hasFrame = false;
        if (activeInstance === this) activeInstance = null;
    };

    DensityInstance.prototype.getDiagnostics = function() {
        return {
            name: this.name,
            accumulationFrames: this.accumulationFrames,
            lastBatchSize: this.lastBatchSize,
            resetCount: this.resetCount,
            workerResetCount: this.workerResetCount,
            renderTargetSize: { width: this.width, height: this.height },
            maxTextureSize: this.maxTextureSize,
            workerMode: this.workerMode,
            workerStatus: this.workerStatus,
            workerError: this.workerError,
            pending: this.pending,
            pendingResetKey: this.pendingResetKey,
            resetDebounceMs: this.resetDebounceMs,
            resetDebounceRemainingMs: this.pendingResetKey ? Math.max(0, Math.round(this.resetDebounceMs - (nowMs() - this.pendingResetSince))) : 0,
            generation: this.generation,
            resetKey: this.resetKey,
            tonemapKey: this.tonemapKey,
            staleMessages: this.staleMessages,
            lastMaxValue: this.lastMaxValue,
            sharpness: this.sharpness,
            hasFrame: this.hasFrame,
            usesFramebuffer: false,
            resources: {
                program: !!this.program,
                texture: !!this.texture,
                buffer: !!this.buffer,
                worker: !!this.worker
            }
        };
    };

    function wait(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    async function selfTest() {
        if (typeof Renderer === 'undefined' || !Renderer.getGL) {
            return { available: false, success: false, failures: ['Renderer unavailable'] };
        }
        var gl = Renderer.getGL();
        if (!gl) return { available: false, success: false, failures: ['WebGL unavailable'] };
        var instance = new DensityInstance({ name: 'progressive-density-self-test', resolutionScale: 0.18, maxSide: 256 });
        var failures = [];
        try {
            var initOk = instance.init(gl);
            if (!initOk) failures.push('init failed');
            var firstConfig = {
                densityType: 'test_spiral',
                resetKey: 'spiral-a',
                structural: { seed: 0.2, turns: 7 },
                params: { seed: 0.2, turns: 7, radius: 0.84, jitter: 0.03, phase: 0 },
                tonemap: { exposure: 1.4, gamma: 0.85, gain: 1.0, glow: 0.7 },
                batchSize: 14000,
                resolutionScale: 0.18,
                maxSide: 256
            };
            var timerStart = performance.now();
            var lagPromise = new Promise(function(resolve) {
                setTimeout(function() {
                    resolve(performance.now() - timerStart);
                }, 35);
            });
            instance.render(gl, 0, firstConfig);
            var timerLagMs = await lagPromise;
            if (timerLagMs > 150) failures.push('worker accumulation blocked the UI timer');
            for (var i = 0; i < 8 && instance.accumulationFrames < 2; i++) {
                instance.render(gl, i * 0.1, firstConfig);
                await wait(80);
            }
            var afterFirst = instance.getDiagnostics();
            if (afterFirst.accumulationFrames < 1 || !afterFirst.hasFrame) failures.push('first accumulation frame missing');
            if (afterFirst.lastBatchSize <= 0) failures.push('last batch size missing');
            if (afterFirst.renderTargetSize.width <= 0 || afterFirst.renderTargetSize.height <= 0) failures.push('invalid render target size');
            if (afterFirst.renderTargetSize.width > afterFirst.maxTextureSize || afterFirst.renderTargetSize.height > afterFirst.maxTextureSize) failures.push('render target exceeds MAX_TEXTURE_SIZE');

            var resetsBeforeTonemap = afterFirst.resetCount;
            var tonemapConfig = {
                densityType: 'test_spiral',
                resetKey: 'spiral-a',
                structural: { seed: 0.2, turns: 7 },
                params: { seed: 0.2, turns: 7, radius: 0.84, jitter: 0.03, phase: 0.12 },
                tonemap: { exposure: 2.2, gamma: 0.72, gain: 1.1, glow: 1.1 },
                batchSize: 8000,
                resolutionScale: 0.18,
                maxSide: 256
            };
            for (var j = 0; j < 5; j++) {
                instance.render(gl, 1 + j * 0.1, tonemapConfig);
                await wait(70);
            }
            var afterTonemap = instance.getDiagnostics();
            if (afterTonemap.resetCount !== resetsBeforeTonemap) failures.push('tonemap-only change reset accumulation');

            var resetsBeforeKey = afterTonemap.resetCount;
            var resetConfig = {
                densityType: 'test_spiral',
                resetKey: 'spiral-b',
                structural: { seed: 0.5, turns: 9 },
                params: { seed: 0.5, turns: 9, radius: 0.74, jitter: 0.05, phase: 0.2 },
                tonemap: { exposure: 1.5, gamma: 0.9, gain: 1.0, glow: 0.6 },
                batchSize: 9000,
                resolutionScale: 0.18,
                maxSide: 256
            };
            instance.render(gl, 2, resetConfig);
            await wait(120);
            var afterReset = instance.getDiagnostics();
            if (afterReset.resetCount <= resetsBeforeKey) failures.push('reset key did not reset accumulation');
            if (afterReset.staleMessages !== 0) failures.push('unexpected stale worker messages');

            instance.render(gl, 3, resetConfig);
            instance.cleanup(gl);
            var afterCleanup = instance.getDiagnostics();
            if (afterCleanup.resources.worker || afterCleanup.resources.texture || afterCleanup.resources.program || afterCleanup.resources.buffer) failures.push('cleanup left resources');
            if (afterCleanup.workerStatus !== 'terminated') failures.push('worker did not terminate on cleanup');
            return {
                available: true,
                success: failures.length === 0,
                failures: failures,
                initOk: initOk,
                timerLagMs: Math.round(timerLagMs),
                first: afterFirst,
                tonemap: afterTonemap,
                reset: afterReset,
                cleanup: afterCleanup
            };
        } catch (err) {
            failures.push(err && err.message || String(err));
            try { instance.cleanup(gl); } catch (cleanupErr) { /* noop */ }
            return {
                available: true,
                success: false,
                failures: failures,
                diagnostics: instance.getDiagnostics()
            };
        }
    }

    return {
        create: function(options) { return new DensityInstance(options); },
        drawCurrent: function() {
            if (!activeInstance || !activeInstance.gl || !activeInstance.hasFrame) return false;
            activeInstance.draw(activeInstance.gl);
            activeInstance.gl.flush();
            activeInstance.gl.finish();
            return true;
        },
        selfTest: selfTest,
        DEFAULT_WORKER_URL: DEFAULT_WORKER_URL
    };
})();
