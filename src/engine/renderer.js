/* Psychedelia Studio - WebGL Renderer with GPU/CPU detection */
var Renderer = (function() {
    'use strict';

    var canvas, gl, ctx2d;
    var mode = 'none'; // 'webgl2', 'webgl', 'cpu'
    var running = true;
    var startTime = 0;
    var lastFrameTime = 0;
    var fps = 0;
    var fpsAccum = 0;
    var fpsFrames = 0;
    var mouseX = 0.5, mouseY = 0.5;
    var currentProgram = null;
    var uniformLocationCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    var attribLocationCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    var seed = Math.random() * 1000.0;
    var animSpeed = 1.0;
    var accumulatedTime = 0;
    var previewDurationSec = 10.0;
    var loopEnabled = false;       // Animation: continuous unless the loop is switched on
    var lastPreviewTime = 0;
    var globalRotation = 0;      // Current rotation in radians
    var rotationSpeed = 0;       // Radians per second
    var viewZoom = 1.0;          // Screen-space view zoom, 1.0 is neutral
    var viewZoomSpeed = 0.7;     // Oscillation speed when viewZoomDepth is above zero
    var viewZoomDepth = 0.0;     // Animated zoom amount, 0.0 is static
    var seedVec = [Math.random(), Math.random(), Math.random(), Math.random()];
    var animFrameId = null;
    var gpuInfo = { renderer: '', vendor: '', maxTex: 0 };
    var contextLost = false;
    var lastRenderSubmitMs = 0;
    var lastRenderFinishMs = 0;
    var renderCostEmaMs = 0;
    var inputPriorityUntilMs = 0;
    var inputPriorityEvents = 0;
    var inputPrioritySkippedFrames = 0;
    var inputPriorityPointerActive = false;
    var inputPriorityListenersReady = false;
    var inputPriorityMode = 'responsive';
    var inputPriorityProfiles = {
        visual: {
            label: 'Full Visual',
            minIntervalMs: 34,
            maxGapMs: 90,
            durationScale: 0.85
        },
        responsive: {
            label: 'Responsive',
            minIntervalMs: 78,
            maxGapMs: 190,
            durationScale: 1.15
        },
        strong: {
            label: 'Strong UI',
            minIntervalMs: 118,
            maxGapMs: 300,
            durationScale: 1.45
        }
    };

    // Fullscreen quad buffers
    var quadVAO = null;
    var quadVBO = null;

    // Multi-pass support
    var framebuffers = [];
    var fbTextures = [];

    // Post-process screen redirect
    var screenRedirectFB = null;

    // Preview quality: standard shader effects can render at a reduced
    // internal resolution and be upscaled, which is the main lever for
    // heavy raymarched effects. 'auto' adapts the scale to the frame rate.
    var qualityMode = 'auto';      // 'auto' or 'fixed'
    var fixedScale = 1.0;
    var autoScale = 1.0;
    var qualityAccum = 0;
    var qualityFrames = 0;
    var qualityGoodStreak = 0;
    var qualityBadStreak = 0;
    var qualityHoldUntilMs = 0;
    var lastQualityDrop = null;      // { scale, fps } before the last step down
    var qualityNoLowerUntil = 0;     // lowering paused after a step that did not help
    var maxPreviewFps = 0;         // 0 = follow the display refresh rate
    var recordFrameDue = 0;        // next frame time while recording (even pacing)
    var frameExportState = null;
    var lowFB = null, lowTex = null, lowW = 0, lowH = 0;
    var blitProgram = null, blitLocs = null;

    function init() {
        canvas = document.getElementById('mainCanvas');
        canvas.addEventListener('webglcontextlost', handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

        // Try WebGL2 first, then WebGL1
        gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
        if (gl) {
            mode = 'webgl2';
        } else {
            gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
            if (gl) {
                mode = 'webgl';
            } else {
                mode = 'cpu';
            }
        }

        if (mode !== 'cpu') {
            initWebGL();
        } else {
            initCPU();
        }

        updateBadge();
        setResolution(1280, 720);
        startTime = performance.now() / 1000.0;
        lastFrameTime = startTime;
        if (typeof ShadertoyUniforms !== 'undefined') {
            ShadertoyUniforms.init(canvas);
        }

        // Mouse tracking
        canvas.addEventListener('mousemove', function(e) {
            var rect = canvas.getBoundingClientRect();
            mouseX = (e.clientX - rect.left) / rect.width;
            mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
        });

        canvas.addEventListener('mouseleave', function() {
            mouseX = 0.5;
            mouseY = 0.5;
        });

        initInputPriorityListeners();
        requestFrame();
    }

    function initWebGL() {
        // Get GPU info
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
            gpuInfo.renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
            gpuInfo.vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
        } else {
            gpuInfo.renderer = gl.getParameter(gl.RENDERER);
            gpuInfo.vendor = gl.getParameter(gl.VENDOR);
        }
        gpuInfo.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);

        // Enable float textures for multi-pass
        if (mode === 'webgl') {
            gl.getExtension('OES_texture_float');
            gl.getExtension('OES_texture_float_linear');
        }

        // Create fullscreen quad
        var verts = new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1,  1,  1, -1,   1, 1
        ]);

        quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    }

    function initCPU() {
        ctx2d = canvas.getContext('2d');
    }

    function setResolution(w, h) {
        canvas.width = w;
        canvas.height = h;
        if (gl && !contextLost) {
            gl.viewport(0, 0, w, h);
            destroyFramebuffers();
            destroyLowRes();
        }
        if (typeof PostProcess !== 'undefined') PostProcess.resize(w, h);
    }

    function getResolution() {
        return canvas ? { width: canvas.width, height: canvas.height } : { width: 0, height: 0 };
    }

    // --- Framebuffer management for multi-pass effects ---
    function ensureFramebuffers(count) {
        while (framebuffers.length < count) {
            var fb = gl.createFramebuffer();
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            framebuffers.push(fb);
            fbTextures.push(tex);
        }
    }

    function setScreenRedirect(fb) { screenRedirectFB = fb; }

    function bindFramebuffer(index) {
        if (index < 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, screenRedirectFB);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[index]);
        }
    }

    function getFramebufferTexture(index) {
        return fbTextures[index];
    }

    function destroyFramebuffers() {
        for (var i = 0; i < framebuffers.length; i++) {
            gl.deleteFramebuffer(framebuffers[i]);
            gl.deleteTexture(fbTextures[i]);
        }
        framebuffers = [];
        fbTextures = [];
    }

    // --- Render Loop ---
    function requestFrame(delay) {
        // Offline frames do not need to wait for a screen refresh. A task per
        // frame still yields to controls, encoder callbacks and cancellation.
        if (frameExportState) {
            animFrameId = setTimeout(function() { renderLoop(performance.now()); }, delay || 0);
        } else {
            animFrameId = requestAnimationFrame(renderLoop);
        }
    }

    function renderLoop(timestamp) {
        if (contextLost) {
            requestFrame(50);
            return;
        }
        var offline = typeof VideoExport !== 'undefined' && VideoExport.isFrameExport && VideoExport.isFrameExport();
        if ((frameExportState && !offline) || (offline && !VideoExport.canCaptureFrame())) {
            lastFrameTime = timestamp / 1000;
            requestFrame(8);
            return;
        }
        if (!running && !offline) {
            lastFrameTime = timestamp / 1000;
            lastRenderSubmitMs = 0;
            // Pausing the animation during a live recording keeps capturing
            // the still image so its duration and audio remain synchronized.
            if (isRecordingActive() && VideoExport.captureFrame) VideoExport.captureFrame(true);
            requestFrame();
            return;
        }

        var now = offline ? frameExportState.clock + frameExportState.frames / frameExportState.fps : timestamp / 1000.0;
        // Clamp so a background tab or a long stall does not jump the clock.
        var wallDt = lastFrameTime > 0 ? Math.min(timestamp / 1000 - lastFrameTime, 0.25) : 0.016;
        var dt = offline ? 1 / frameExportState.fps : wallDt;
        lastFrameTime = timestamp / 1000;
        if (offline) frameExportState.frames++;
        // Beat Reactor: one analyser read per frame; its time surge speeds the clock on beats.
        var audioSpeed = 1;
        if (typeof AudioReactor !== 'undefined') {
            try { AudioReactor.update(now, dt); audioSpeed = AudioReactor.getSpeed(); } catch (err) { audioSpeed = 1; }
        }
        if (typeof Looks !== 'undefined' && Looks.update) Looks.update();
        accumulatedTime += dt * animSpeed * audioSpeed;
        globalRotation += dt * rotationSpeed;
        var time = getPreviewTime(accumulatedTime);
        if (loopEnabled && previewDurationSec > 0 && time + 0.0001 < lastPreviewTime && typeof ShadertoyUniforms !== 'undefined') {
            ShadertoyUniforms.resetFrameState();
        }
        lastPreviewTime = time;

        fpsAccum += wallDt;
        var recFps = recordingFps();
        if (offline) {
            recordFrameDue = 0;
        } else if (recFps > 0) {
            // Recording: render exactly at the recording frame rate on an even
            // schedule (24 fps on a 60 Hz screen alternates 3 and 2 refreshes).
            var interval = 1000 / recFps;
            if (!recordFrameDue || timestamp - recordFrameDue > interval * 2) recordFrameDue = timestamp;
            if (timestamp < recordFrameDue - 5) {
                updateFpsCounter();
                requestFrame();
                return;
            }
            recordFrameDue += interval;
        } else {
            recordFrameDue = 0;
            if (maxPreviewFps > 0 && lastRenderSubmitMs > 0 &&
                    timestamp - lastRenderSubmitMs < 1000 / maxPreviewFps - 2) {
                updateFpsCounter();
                requestFrame();
                return;
            }
        }
        if (shouldYieldRender(timestamp)) {
            inputPrioritySkippedFrames++;
            updateFpsCounter();
            requestFrame();
            return;
        }

        var renderDt = offline ? dt : (lastRenderSubmitMs > 0 ? Math.max(0.0001, (timestamp - lastRenderSubmitMs) / 1000.0) : dt);
        var renderStartMs = performance.now();
        lastRenderSubmitMs = timestamp;

        if (typeof ShadertoyUniforms !== 'undefined') {
            ShadertoyUniforms.updateFrame(time, renderDt, offline ? recFps : (fps || (renderDt > 0 ? 1 / renderDt : 60)));
        }

        // FPS calculation tracks submitted render frames, not skipped UI-yield frames.
        fpsFrames++;
        updateFpsCounter();
        if (!offline) updateAutoQuality(renderDt, timestamp);

        // Render current effect (with post-processing capture if active)
        var effect = EffectRegistry.getCurrent();
        if (effect) {
            var postActive = (typeof PostProcess !== 'undefined') && PostProcess.hasActive();

            // One failing frame must not stop the loop (the next frame is only
            // requested at the end), so errors are reported once and skipped.
            try {
                if (postActive) PostProcess.beginCapture();
                if (mode !== 'cpu' && effect.render) {
                    renderGPU(effect, time, renderDt);
                } else if (mode !== 'cpu' && effect.shader && currentProgram) {
                    renderGPU(effect, time, renderDt);
                } else if (effect.cpuRender) {
                    renderCPU(effect, time, renderDt);
                }
            } catch (err) {
                reportRenderError(effect.name, err);
                if (offline) VideoExport.failRecording('Rendering failed: ' + err.message);
            }

            if (postActive) {
                try { PostProcess.apply(time); } catch (err2) {
                    reportRenderError('FX', err2); setScreenRedirect(null);
                    if (offline) VideoExport.failRecording('Post-processing failed: ' + err2.message);
                }
            }
        }

        // Render overlays
        if (typeof Overlays !== 'undefined') {
            try { Overlays.render(time); } catch (err3) {
                reportRenderError('overlays', err3);
                if (offline) VideoExport.failRecording('Overlay rendering failed: ' + err3.message);
            }
        }

        // Hand this exact frame to the recorder (one video frame per render).
        if (recFps > 0 && VideoExport.captureFrame) {
            try { VideoExport.captureFrame(); } catch (err4) { reportRenderError('recording', err4); }
        }

        var renderCostMs = Math.max(0, performance.now() - renderStartMs);
        renderCostEmaMs = renderCostEmaMs > 0 ? renderCostEmaMs * 0.84 + renderCostMs * 0.16 : renderCostMs;
        lastRenderFinishMs = performance.now();

        requestFrame();
    }

    var renderErrorsShown = {};
    function reportRenderError(what, err) {
        if (renderErrorsShown[what]) return;
        renderErrorsShown[what] = true;
        console.error('Render error in ' + what + ':', err);
    }

    function scaledEffect(effect) {
        return !!(effect && effect.shader && !effect.render && mode !== 'cpu');
    }

    function currentRenderScale(effect) {
        if (!scaledEffect(effect)) return 1.0;
        if (frameExportState) return 1.0;
        // Recording Detail 'Full' means full internal resolution, whatever the preview quality.
        if (isRecordingActive() && recordingFullDetail()) return 1.0;
        if (qualityMode === 'auto') return autoScale;
        return fixedScale;
    }

    function recordingFps() {
        if (!isRecordingActive() || !VideoExport.getCaptureFps) return 0;
        return VideoExport.getCaptureFps() || 0;
    }

    // Recording Detail 'full' keeps full internal resolution; 'adaptive' lets
    // Auto quality lower it so heavy effects keep the recording frame rate.
    function recordingFullDetail() {
        var o = VideoExport.getOptions ? VideoExport.getOptions() : null;
        return !!(o && o.detail === 'full');
    }

    function updateAutoQuality(renderDt, timestamp) {
        if (qualityMode !== 'auto') return;
        var effect = typeof EffectRegistry !== 'undefined' ? EffectRegistry.getCurrent() : null;
        // Skip the first moments after a switch (compiles, warm-up hitches).
        if (!scaledEffect(effect) || isInputPriorityActive(timestamp) || renderDt > 0.5 || timestamp < qualityHoldUntilMs) {
            qualityAccum = 0;
            qualityFrames = 0;
            return;
        }
        qualityAccum += renderDt;
        qualityFrames++;
        if (qualityAccum < 0.7) return;
        var measured = qualityFrames / qualityAccum;
        qualityAccum = 0;
        qualityFrames = 0;
        var recFpsNow = recordingFps();
        var target = recFpsNow > 0 ? recFpsNow * 0.97 : (maxPreviewFps > 0 ? Math.min(maxPreviewFps, 60) * 0.9 : 50);
        // A step down must pay for itself: if the frame rate did not improve, the
        // slowdown is elsewhere (overlays, FX, another program), so the detail goes
        // back up and lowering pauses for a while instead of blurring for nothing.
        if (lastQualityDrop) {
            var drop = lastQualityDrop;
            lastQualityDrop = null;
            if (measured < drop.fps * 1.08) {
                autoScale = drop.scale;
                qualityNoLowerUntil = timestamp + (recFpsNow > 0 ? 30000 : 10000);
                qualityBadStreak = 0;
                updateQualityBadge();
                return;
            }
        }
        if (measured < target * 0.86 && autoScale > 0.4 && timestamp >= qualityNoLowerUntil) {
            qualityBadStreak++;
            qualityGoodStreak = 0;
            if (qualityBadStreak >= 2 || measured < target * 0.5) {
                lastQualityDrop = { scale: autoScale, fps: measured };
                autoScale = Math.max(0.4, autoScale * (measured < target * 0.6 ? 0.75 : 0.86));
                qualityBadStreak = 0;
                updateQualityBadge();
            }
        } else if (measured > target * 1.06 && autoScale < 1.0 && !recFpsNow) {
            qualityGoodStreak++;
            qualityBadStreak = 0;
            if (qualityGoodStreak >= 3) {
                autoScale = Math.min(1.0, autoScale * 1.1);
                if (autoScale > 0.97) autoScale = 1.0;
                qualityGoodStreak = 0;
                updateQualityBadge();
            }
        } else {
            qualityGoodStreak = 0;
            qualityBadStreak = 0;
        }
    }

    function updateQualityBadge() {
        var el = document.getElementById('qualityBadge');
        if (!el) return;
        var effect = typeof EffectRegistry !== 'undefined' ? EffectRegistry.getCurrent() : null;
        var scale = currentRenderScale(effect);
        if (scale >= 0.999) {
            el.classList.add('hidden');
        } else {
            el.textContent = Math.round(scale * 100) + '% res';
            el.title = qualityMode === 'auto' ? 'Auto preview quality lowered the internal resolution to keep motion smooth' : 'Fixed preview quality';
            el.classList.remove('hidden');
        }
    }

    function setQualityMode(value) {
        if (value === 'auto') {
            qualityMode = 'auto';
        } else {
            qualityMode = 'fixed';
            fixedScale = clampNumber(parseFloat(value), 0.25, 1, 1);
        }
        qualityAccum = 0;
        qualityFrames = 0;
        updateQualityBadge();
    }

    function resetAutoQuality() {
        autoScale = 1.0;
        qualityBadStreak = 0;
        qualityHoldUntilMs = performance.now() + 1500;
        qualityAccum = 0;
        qualityFrames = 0;
        qualityGoodStreak = 0;
        lastQualityDrop = null;
        qualityNoLowerUntil = 0;
        updateQualityBadge();
    }

    function getQualityState() {
        var effect = typeof EffectRegistry !== 'undefined' ? EffectRegistry.getCurrent() : null;
        return { mode: qualityMode, scale: currentRenderScale(effect), autoScale: autoScale, maxPreviewFps: maxPreviewFps };
    }

    function setMaxPreviewFps(value) {
        maxPreviewFps = Math.max(0, Math.min(240, Number(value) || 0));
    }

    function ensureLowRes(w, h) {
        if (lowFB && lowW === w && lowH === h) return;
        if (lowFB) { gl.deleteFramebuffer(lowFB); gl.deleteTexture(lowTex); }
        lowTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, lowTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        lowFB = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, lowFB);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lowTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        lowW = w;
        lowH = h;
    }

    function destroyLowRes() {
        if (gl && lowFB && !contextLost) {
            gl.deleteFramebuffer(lowFB);
            gl.deleteTexture(lowTex);
        }
        lowFB = null;
        lowTex = null;
        lowW = 0;
        lowH = 0;
    }

    function ensureBlitProgram() {
        if (blitProgram) return blitProgram;
        var vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, 'attribute vec2 a_position; varying vec2 v_uv; void main(){ v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }');
        gl.compileShader(vs);
        var fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, 'precision mediump float; uniform sampler2D u_tex; varying vec2 v_uv; void main(){ gl_FragColor = texture2D(u_tex, v_uv); }');
        gl.compileShader(fs);
        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteProgram(program);
            return null;
        }
        blitProgram = program;
        blitLocs = { pos: gl.getAttribLocation(program, 'a_position'), tex: gl.getUniformLocation(program, 'u_tex') };
        return blitProgram;
    }

    function blitLowRes() {
        var program = ensureBlitProgram();
        if (!program) return;
        gl.bindFramebuffer(gl.FRAMEBUFFER, screenRedirectFB);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, lowTex);
        gl.uniform1i(blitLocs.tex, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
        gl.enableVertexAttribArray(blitLocs.pos);
        gl.vertexAttribPointer(blitLocs.pos, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        // Unbind so the next frame can render into lowFB without a
        // texture feedback loop.
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function updateFpsCounter() {
        if (fpsAccum < 0.5) return;
        fps = Math.round(fpsFrames / fpsAccum);
        fpsAccum = 0;
        fpsFrames = 0;
        var el = document.getElementById('fpsCounter');
        if (el) el.textContent = fps + ' FPS';
        updateEffectStatus();
    }

    function updateEffectStatus() {
        var el = document.getElementById('effectStatus');
        if (!el || typeof EffectRegistry === 'undefined' || !EffectRegistry.getCurrent) return;
        var effect = EffectRegistry.getCurrent();
        var meta = effect && effect.fractalFlight;
        if (!effect || !meta || meta.kind !== 'progressive-density' || !effect.getDiagnostics) {
            el.className = 'hidden';
            el.textContent = '';
            return;
        }
        var diagnostics = effect.getDiagnostics();
        if (!diagnostics) {
            el.className = '';
            el.textContent = 'Preparing density renderer…';
            return;
        }
        if (diagnostics.workerStatus === 'error' || diagnostics.workerStatus === 'unsupported') {
            el.className = 'error';
            el.textContent = 'Density renderer unavailable' + (diagnostics.workerError ? ': ' + diagnostics.workerError : '');
            return;
        }
        if (!diagnostics.hasFrame) {
            el.className = '';
            el.textContent = diagnostics.pending ? 'Building first density frame…' : 'Preparing density renderer…';
            return;
        }
        el.className = 'ready';
        el.textContent = 'Accumulating density • ' + diagnostics.accumulationFrames + ' frame' +
            (diagnostics.accumulationFrames === 1 ? '' : 's');
    }

    function isRecordingActive() {
        if (typeof VideoExport === 'undefined' || !VideoExport.isRecording) return false;
        try {
            return !!VideoExport.isRecording();
        } catch (err) {
            return false;
        }
    }

    function browserHasPendingInput() {
        if (typeof navigator === 'undefined' || !navigator.scheduling || typeof navigator.scheduling.isInputPending !== 'function') {
            return false;
        }
        try {
            return !!navigator.scheduling.isInputPending({ includeContinuous: true });
        } catch (err) {
            try {
                return !!navigator.scheduling.isInputPending();
            } catch (fallbackErr) {
                return false;
            }
        }
    }

    function currentInputPriorityProfile() {
        return inputPriorityProfiles[inputPriorityMode] || inputPriorityProfiles.responsive;
    }

    function effectiveInputPriorityMinInterval() {
        var profile = currentInputPriorityProfile();
        var base = profile.minIntervalMs;
        if (inputPriorityMode !== 'visual' && renderCostEmaMs > 28) {
            base = Math.max(base, Math.min(profile.maxGapMs * 0.72, renderCostEmaMs * 1.18));
        }
        return Math.round(base);
    }

    function effectiveInputPriorityMaxGap() {
        return currentInputPriorityProfile().maxGapMs;
    }

    function shouldYieldRender(timestampMs) {
        if (!isInputPriorityActive(timestampMs) || isRecordingActive() || lastRenderSubmitMs <= 0) return false;
        var referenceMs = lastRenderFinishMs > 0 ? lastRenderFinishMs : lastRenderSubmitMs;
        var elapsedSinceRender = timestampMs - referenceMs;
        if (elapsedSinceRender >= effectiveInputPriorityMaxGap()) return false;
        if (browserHasPendingInput()) return true;
        return elapsedSinceRender < effectiveInputPriorityMinInterval();
    }

    function prioritizeInput(durationMs) {
        var nowMs = performance.now();
        var duration = Number(durationMs);
        if (!isFinite(duration) || duration <= 0) duration = 220;
        duration *= currentInputPriorityProfile().durationScale;
        inputPriorityUntilMs = Math.max(inputPriorityUntilMs, nowMs + duration);
        inputPriorityEvents++;
        return true;
    }

    function isInputPriorityActive(nowMs) {
        var currentMs = typeof nowMs === 'number' ? nowMs : performance.now();
        return inputPriorityUntilMs > currentMs;
    }

    function getInputPriorityState() {
        var nowMs = performance.now();
        return {
            active: isInputPriorityActive(nowMs),
            mode: inputPriorityMode,
            label: currentInputPriorityProfile().label,
            remainingMs: Math.max(0, Math.round(inputPriorityUntilMs - nowMs)),
            minIntervalMs: effectiveInputPriorityMinInterval(),
            maxGapMs: effectiveInputPriorityMaxGap(),
            events: inputPriorityEvents,
            framesSkipped: inputPrioritySkippedFrames,
            lastRenderSubmitMs: Math.round(lastRenderSubmitMs),
            lastRenderFinishMs: Math.round(lastRenderFinishMs),
            renderCostMs: Math.round(renderCostEmaMs)
        };
    }

    function setInputPriorityMode(modeName) {
        if (!inputPriorityProfiles[modeName]) modeName = 'responsive';
        inputPriorityMode = modeName;
        return inputPriorityMode;
    }

    function getInputPriorityMode() {
        return inputPriorityMode;
    }

    function clearInputPriority() {
        inputPriorityUntilMs = 0;
        inputPriorityPointerActive = false;
        return true;
    }

    function initInputPriorityListeners() {
        if (inputPriorityListenersReady || typeof document === 'undefined') return;
        inputPriorityListenersReady = true;
        document.addEventListener('pointerdown', handleInputPriorityEvent, true);
        document.addEventListener('pointermove', handleInputPriorityEvent, true);
        document.addEventListener('input', handleInputPriorityEvent, true);
        document.addEventListener('change', handleInputPriorityEvent, true);
        document.addEventListener('wheel', handleInputPriorityEvent, true);
        document.addEventListener('keydown', handleInputPriorityEvent, true);
        window.addEventListener('pointerup', endInputPriorityPointer, true);
        window.addEventListener('pointercancel', endInputPriorityPointer, true);
    }

    function handleInputPriorityEvent(e) {
        if (!isUiInteractionTarget(e.target)) return;
        if (e.type === 'pointerdown') {
            inputPriorityPointerActive = true;
            prioritizeInput(320);
            return;
        }
        if (e.type === 'pointermove') {
            if (inputPriorityPointerActive || e.buttons) prioritizeInput(140);
            return;
        }
        if (e.type === 'input' || e.type === 'wheel') {
            prioritizeInput(180);
            return;
        }
        prioritizeInput(240);
    }

    function endInputPriorityPointer() {
        if (!inputPriorityPointerActive) return;
        inputPriorityPointerActive = false;
        prioritizeInput(180);
    }

    function isUiInteractionTarget(target) {
        if (!target || target === canvas || !target.closest) return false;
        return !!target.closest('#sidebar, #topbar, #timelinePanel, .modal, button, input, select, textarea');
    }

    // Effects that compile one shader variant per mode: use the variant for
    // the current control values, compiling it in the background when it is
    // new. Until it is ready the previous variant keeps rendering.
    var variantStatusKey = '';

    function resolveVariantProgram(effect, params) {
        if (!effect.specialize || !effect.shader || typeof EffectRegistry === 'undefined' || !EffectRegistry.specFor) {
            return currentProgram;
        }
        var spec = EffectRegistry.specFor(effect, params);
        var program = ShaderManager.getProgram(effect.name, spec);
        if (program) {
            if (variantStatusKey) {
                variantStatusKey = '';
                EffectRegistry.setCompileStatus(null);
            }
            currentProgram = program;
            return program;
        }
        if (ShaderManager.hasFailed(effect.name, spec)) return currentProgram;
        if (frameExportState || (typeof window !== 'undefined' && window.__psySyncSwitch)) {
            // Automated tools: compile immediately so no background compiles
            // linger into the next test step.
            program = ShaderManager.createProgram(effect.shader, effect.name, spec);
            if (program) {
                currentProgram = program;
                return program;
            }
            return currentProgram;
        }
        var key = ShaderManager.specKey(effect.name, spec);
        if (!ShaderManager.isCompiling(effect.name, spec)) {
            ShaderManager.createProgramAsync(effect.shader, effect.name, null, spec);
        }
        if (variantStatusKey !== key) {
            variantStatusKey = key;
            var modeName = '';
            var param = (effect.params || []).filter(function(p) { return p.name === effect.specialize[0]; })[0];
            if (param && param.options) modeName = param.options[spec[param.name]] || '';
            EffectRegistry.setCompileStatus('Compiling ' + (modeName || effect.label) + '…');
        }
        return currentProgram;
    }

    function renderGPU(effect, time, dt) {
        // Let effect do custom multi-pass if it has a render function
        if (effect.render) {
            effect.render(gl, currentProgram, time, dt);
            return;
        }

        var params = effect.params ? Controls.getValues() : null;
        var activeProgram = resolveVariantProgram(effect, params);
        if (!activeProgram) return;

        var scale = currentRenderScale(effect);
        var drawW = canvas.width, drawH = canvas.height;
        var lowRes = scale < 0.999;
        if (lowRes) {
            drawW = Math.max(16, Math.round(canvas.width * scale));
            drawH = Math.max(16, Math.round(canvas.height * scale));
            ensureLowRes(drawW, drawH);
            gl.bindFramebuffer(gl.FRAMEBUFFER, lowFB);
            gl.viewport(0, 0, drawW, drawH);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, screenRedirectFB);
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        gl.useProgram(activeProgram);

        // Set standard uniforms
        var uTime = getUniformLocationCached(currentProgram, 'u_time');
        var uUnwrappedTime = getUniformLocationCached(currentProgram, 'u_unwrapped_time');
        var uRes = getUniformLocationCached(currentProgram, 'u_resolution');
        var uMouse = getUniformLocationCached(currentProgram, 'u_mouse');

        var uRot = getUniformLocationCached(currentProgram, 'u_global_rotation');
        var uViewZoom = getUniformLocationCached(currentProgram, 'u_view_zoom');
        var uViewZoomSpeed = getUniformLocationCached(currentProgram, 'u_view_zoom_speed');
        var uViewZoomDepth = getUniformLocationCached(currentProgram, 'u_view_zoom_depth');

        var uSeed = getUniformLocationCached(currentProgram, 'u_seed');
        var uSeedVec = getUniformLocationCached(currentProgram, 'u_seed_vec');

        if (uTime !== null) gl.uniform1f(uTime, time);
        if (uUnwrappedTime !== null) gl.uniform1f(uUnwrappedTime, accumulatedTime);
        if (uRes !== null) gl.uniform2f(uRes, drawW, drawH);
        if (uMouse !== null) gl.uniform2f(uMouse, mouseX, mouseY);
        if (uRot !== null) gl.uniform1f(uRot, globalRotation);
        if (uViewZoom !== null) gl.uniform1f(uViewZoom, viewZoom);
        if (uViewZoomSpeed !== null) gl.uniform1f(uViewZoomSpeed, viewZoomSpeed);
        if (uViewZoomDepth !== null) gl.uniform1f(uViewZoomDepth, viewZoomDepth);
        if (uSeed !== null) gl.uniform1f(uSeed, seed);
        if (uSeedVec !== null) gl.uniform4fv(uSeedVec, seedVec);
        setAudioUniforms(currentProgram);

        // Set effect-specific uniforms from params
        if (params) {
            for (var key in params) {
                var loc = getUniformLocationCached(currentProgram, 'u_' + key);
                if (loc !== null) {
                    var val = params[key];
                    if (typeof val === 'number') {
                        gl.uniform1f(loc, val);
                    } else if (Array.isArray(val)) {
                        if (val.length === 2) gl.uniform2fv(loc, val);
                        else if (val.length === 3) gl.uniform3fv(loc, val);
                        else if (val.length === 4) gl.uniform4fv(loc, val);
                    }
                }
            }
        }

        // Per-effect uniform hook (e.g. CPU-computed trajectories).
        if (typeof effect.setUniforms === 'function') {
            effect.setUniforms(gl, activeProgram, params || {}, getUniformLocationCached, time);
        }
        if (effect.diveTargets && typeof DiveTargets !== 'undefined') {
            DiveTargets.apply(gl, activeProgram, effect, params, getUniformLocationCached);
        }
        if (effect.paletteParams && effect.paletteParams.length && typeof PsyPalettes !== 'undefined') {
            PsyPalettes.bindForEffect(gl, activeProgram, effect, params, getUniformLocationCached);
        }

        // Draw fullscreen quad
        drawQuad();
        if (lowRes) blitLowRes();
    }

    // Beat Reactor feed for effects that declare them:
    //   u_audio = (bass, mids, highs, loudness), u_beat = (kick, snare, hat, beat clock).
    // The beat clock counts beats at the music tempo (studio BPM when silent).
    function setAudioUniforms(program) {
        var uAudio = getUniformLocationCached(program, 'u_audio');
        var uBeat = getUniformLocationCached(program, 'u_beat');
        if (uAudio === null && uBeat === null) return;
        var ar = typeof AudioReactor !== 'undefined' && AudioReactor.getSource ? AudioReactor : null;
        if (uAudio !== null) {
            if (ar) gl.uniform4f(uAudio, ar.getSource('bass'), ar.getSource('mid'), ar.getSource('high'), ar.getSource('level'));
            else gl.uniform4f(uAudio, 0, 0, 0, 0);
        }
        if (uBeat !== null) {
            if (ar) gl.uniform4f(uBeat, ar.getSource('kick'), ar.getSource('snare'), ar.getSource('hat'), ar.getBeatClock ? ar.getBeatClock() : 0);
            else gl.uniform4f(uBeat, 0, 0, 0, 0);
        }
    }

    function drawQuad() {
        gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
        var posLoc = getAttribLocationCached(currentProgram, 'a_position');
        if (posLoc < 0) return;
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function locationMap(cache, program, fallbackKey) {
        if (!program) return null;
        if (cache) {
            var cached = cache.get(program);
            if (!cached) {
                cached = {};
                cache.set(program, cached);
            }
            return cached;
        }
        if (!program[fallbackKey]) program[fallbackKey] = {};
        return program[fallbackKey];
    }

    function getUniformLocationCached(program, name) {
        var map = locationMap(uniformLocationCache, program, '_psyUniformLocations');
        if (!map) return null;
        if (!Object.prototype.hasOwnProperty.call(map, name)) {
            map[name] = gl.getUniformLocation(program, name);
        }
        return map[name];
    }

    function getAttribLocationCached(program, name) {
        var map = locationMap(attribLocationCache, program, '_psyAttribLocations');
        if (!map) return -1;
        if (!Object.prototype.hasOwnProperty.call(map, name)) {
            map[name] = gl.getAttribLocation(program, name);
        }
        return map[name];
    }

    function clearLocationCaches() {
        uniformLocationCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
        attribLocationCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    }

    function renderCPU(effect, time, dt) {
        var w = canvas.width;
        var h = canvas.height;
        var imageData = ctx2d.createImageData(w, h);
        var params = Controls.getValues();
        effect.cpuRender(imageData.data, w, h, time, dt, params, mouseX, mouseY);
        ctx2d.putImageData(imageData, 0, 0);
    }

    function setProgram(program) {
        currentProgram = program;
        variantStatusKey = '';
    }

    function updateBadge() {
        var badge = document.getElementById('gpuBadge');
        if (!badge) return;
        if (mode === 'cpu') {
            badge.textContent = 'CPU LIMITED';
            badge.className = 'gpu-badge cpu';
        } else {
            badge.textContent = mode.toUpperCase() + ' - GPU';
            badge.className = 'gpu-badge gpu';
        }

        // Update settings info
        var ri = document.getElementById('rendererInfo');
        var gi = document.getElementById('gpuInfo');
        var ti = document.getElementById('maxTexInfo');
        if (ri) ri.textContent = mode === 'cpu' ? 'Canvas 2D (CPU)' : mode.toUpperCase();
        if (gi) gi.textContent = gpuInfo.renderer || 'N/A';
        if (ti) ti.textContent = gpuInfo.maxTex ? gpuInfo.maxTex + 'px' : 'N/A';
    }

    function handleContextLost(e) {
        e.preventDefault();
        contextLost = true;
        running = false;
        if (isRecordingActive() && VideoExport.failRecording) VideoExport.failRecording('The graphics context was lost during recording. Try a lower resolution.');
        currentProgram = null;
        var badge = document.getElementById('gpuBadge');
        if (badge) {
            badge.textContent = 'WEBGL LOST';
            badge.className = 'gpu-badge cpu';
        }
    }

    function handleContextRestored() {
        contextLost = false;
        framebuffers = [];
        fbTextures = [];
        screenRedirectFB = null;
        currentProgram = null;
        lowFB = null;
        lowTex = null;
        lowW = 0;
        lowH = 0;
        blitProgram = null;
        clearLocationCaches();
        if (mode !== 'cpu') {
            initWebGL();
            if (typeof ShaderManager !== 'undefined' && ShaderManager.clearCache) ShaderManager.clearCache();
            if (typeof PsyPalettes !== 'undefined') PsyPalettes.resetTextures();
            if (typeof ShadertoyHost !== 'undefined' && ShadertoyHost.handleContextRestored) ShadertoyHost.handleContextRestored(gl);
            if (typeof PostProcess !== 'undefined') PostProcess.init();
            if (typeof EffectRegistry !== 'undefined' && EffectRegistry.reloadCurrent) EffectRegistry.reloadCurrent();
        }
        updateBadge();
        running = true;
    }

    function play() { running = true; }
    function pause() { running = false; }
    function isRunning() { return running; }
    function beginFrameExport(exportFps) {
        if (contextLost) throw new Error('The graphics context is unavailable.');
        if (typeof EffectRegistry !== 'undefined' && EffectRegistry.cancelPendingSwitch) EffectRegistry.cancelPendingSwitch();
        frameExportState = { fps: exportFps, frames: 0, clock: performance.now() / 1000 };
        updateQualityBadge();
        if (typeof AudioReactor !== 'undefined' && AudioReactor.resetSignal) AudioReactor.resetSignal();
    }
    function endFrameExport() {
        frameExportState = null;
        lastFrameTime = performance.now() / 1000;
        lastRenderSubmitMs = 0;
        recordFrameDue = 0;
        resetAutoQuality();
    }
    function getTime() { return getPreviewTime(accumulatedTime); }
    function getUnwrappedTime() { return accumulatedTime; }
    function setTime(seconds) {
        accumulatedTime = clampNumber(seconds, 0, 1000000000, accumulatedTime);
        lastPreviewTime = getPreviewTime(accumulatedTime);
        return accumulatedTime;
    }
    function resetTime() {
        startTime = performance.now() / 1000.0;
        accumulatedTime = 0;
        lastPreviewTime = 0;
        if (typeof ShadertoyUniforms !== 'undefined') {
            ShadertoyUniforms.resetFrameState();
        }
    }
    function getGL() { return gl; }
    function getCanvas() { return canvas; }
    function getMode() { return mode; }
    function isContextLost() { return contextLost; }
    function getGPUInfo() { return { renderer: gpuInfo.renderer, vendor: gpuInfo.vendor, maxTex: gpuInfo.maxTex }; }
    function getCtx2D() { return ctx2d; }
    function getFPS() { return fps; }
    function getMouse() { return { x: mouseX, y: mouseY }; }
    function getAnimSpeed() { return animSpeed; }
    function setAnimSpeed(s) { animSpeed = s; }
    function getPreviewTime(rawTime) {
        var t = typeof rawTime === 'number' ? rawTime : accumulatedTime;
        if (loopEnabled && previewDurationSec > 0.001) return ((t % previewDurationSec) + previewDurationSec) % previewDurationSec;
        return t;
    }
    function getPreviewDuration() { return previewDurationSec; }
    // Loop on: time wraps every previewDurationSec. Switching it off carries on
    // from the current moment instead of jumping ahead to the unwrapped time.
    function setLoopEnabled(on) {
        on = !!on;
        if (on === loopEnabled) return;
        if (!on) accumulatedTime = getPreviewTime(accumulatedTime);
        loopEnabled = on;
        lastPreviewTime = getPreviewTime(accumulatedTime);
    }
    function isLoopEnabled() { return loopEnabled; }
    function setPreviewDuration(seconds) { previewDurationSec = clampNumber(seconds, 1, 3600, 10.0); }
    function getRotationSpeed() { return rotationSpeed; }
    function setRotationSpeed(s) { rotationSpeed = s; }
    function getRotation() { return globalRotation; }
    function setRotation(r) { globalRotation = r; }
    function clampNumber(value, min, max, fallback) {
        var n = Number(value);
        if (!isFinite(n)) n = fallback;
        return Math.max(min, Math.min(max, n));
    }
    function getViewZoom() { return viewZoom; }
    function setViewZoom(z) { viewZoom = clampNumber(z, 0.05, 24, 1.0); }
    function getViewZoomSpeed() { return viewZoomSpeed; }
    function setViewZoomSpeed(s) { viewZoomSpeed = clampNumber(s, 0, 8, 0.0); }
    function getViewZoomDepth() { return viewZoomDepth; }
    function setViewZoomDepth(d) { viewZoomDepth = clampNumber(d, 0, 2.5, 0.0); }
    function getEffectiveViewZoom(time) {
        var t = typeof time === 'number' ? time : getPreviewTime(accumulatedTime);
        var motion = 1.0;
        if (viewZoomDepth > 0 && Math.abs(viewZoomSpeed) > 0.0001) {
            motion = Math.exp(Math.sin(t * viewZoomSpeed) * viewZoomDepth * 0.45);
        }
        return clampNumber(viewZoom * motion, 0.05, 24, 1.0);
    }
    function getViewZoomState() {
        return {
            zoom: viewZoom,
            speed: viewZoomSpeed,
            depth: viewZoomDepth,
            effective: getEffectiveViewZoom()
        };
    }
    function getSeed() { return seed; }
    function getSeedVec() { return seedVec; }
    function setSeed(nextSeed, nextSeedVec) {
        seed = clampNumber(nextSeed, 0, 1000, seed);
        if (Array.isArray(nextSeedVec) && nextSeedVec.length >= 4) {
            seedVec = nextSeedVec.slice(0, 4).map(function(value, index) {
                return clampNumber(value, 0, 1, seedVec[index]);
            });
        }
        return seed;
    }
    function randomizeSeed() {
        seed = Math.random() * 1000.0;
        seedVec = [Math.random(), Math.random(), Math.random(), Math.random()];
        return seed;
    }

    return {
        init: init,
        setResolution: setResolution,
        getResolution: getResolution,
        setProgram: setProgram,
        play: play,
        pause: pause,
        isRunning: isRunning,
        getTime: getTime,
        getUnwrappedTime: getUnwrappedTime,
        setTime: setTime,
        resetTime: resetTime,
        beginFrameExport: beginFrameExport,
        endFrameExport: endFrameExport,
        setLoopEnabled: setLoopEnabled,
        isLoopEnabled: isLoopEnabled,
        getGL: getGL,
        getCanvas: getCanvas,
        getMode: getMode,
        isContextLost: isContextLost,
        getGPUInfo: getGPUInfo,
        getCtx2D: getCtx2D,
        getFPS: getFPS,
        getMouse: getMouse,
        getAnimSpeed: getAnimSpeed,
        setAnimSpeed: setAnimSpeed,
        getPreviewDuration: getPreviewDuration,
        setPreviewDuration: setPreviewDuration,
        getRotationSpeed: getRotationSpeed,
        setRotationSpeed: setRotationSpeed,
        setAudioUniforms: setAudioUniforms,
        getRotation: getRotation,
        setRotation: setRotation,
        getViewZoom: getViewZoom,
        setViewZoom: setViewZoom,
        getViewZoomSpeed: getViewZoomSpeed,
        setViewZoomSpeed: setViewZoomSpeed,
        getViewZoomDepth: getViewZoomDepth,
        setViewZoomDepth: setViewZoomDepth,
        getEffectiveViewZoom: getEffectiveViewZoom,
        getViewZoomState: getViewZoomState,
        getSeed: getSeed,
        getSeedVec: getSeedVec,
        setSeed: setSeed,
        randomizeSeed: randomizeSeed,
        drawQuad: drawQuad,
        ensureFramebuffers: ensureFramebuffers,
        bindFramebuffer: bindFramebuffer,
        getFramebufferTexture: getFramebufferTexture,
        setScreenRedirect: setScreenRedirect,
        prioritizeInput: prioritizeInput,
        isInputPriorityActive: isInputPriorityActive,
        getInputPriorityState: getInputPriorityState,
        setInputPriorityMode: setInputPriorityMode,
        getInputPriorityMode: getInputPriorityMode,
        clearInputPriority: clearInputPriority,
        setQualityMode: setQualityMode,
        resetAutoQuality: resetAutoQuality,
        getQualityState: getQualityState,
        setMaxPreviewFps: setMaxPreviewFps
    };
})();
