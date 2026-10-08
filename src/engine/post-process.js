/* Psychedelia Studio - WebGL Post-Processing Pipeline
 * Captures the rendered effect to a framebuffer, applies shader passes, outputs to screen.
 * Pass definitions live in PostFxLibrary. Every numeric setting can be
 * modulated by the Beat Reactor (setMod), and trigger passes get u_age, the
 * time since the last beat-synced trigger.
 */
var PostProcess = (function() {
    'use strict';

    var gl;
    var isWebGL2 = false;
    var width = 0, height = 0;

    // Framebuffers
    var captureFB = null, captureTex = null;
    var pingFB = null, pingTex = null;
    var pongFB = null, pongTex = null;

    // History buffers for effects that read their own previous output.

    var quadVBO = null;
    var blitProgram = null;
    var audioProgram = null;
    var locationCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

    var effects = {};
    var effectOrder = [];
    var capturing = false;
    var initialized = false;

    // === Shader compilation (independent of ShaderManager) ===

    function getVertexSrc() {
        if (isWebGL2) {
            return '#version 300 es\nin vec2 a_position;\nout vec2 v_uv;\nvoid main(){v_uv=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}';
        }
        return 'attribute vec2 a_position;\nvarying vec2 v_uv;\nvoid main(){v_uv=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}';
    }

    function adaptFrag(src) {
        if (isWebGL2) {
            src = src.replace(/texture2D/g, 'texture');
            src = src.replace(/gl_FragColor/g, 'fragColor');
            return '#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\n' + src;
        }
        return 'precision highp float;\nvarying vec2 v_uv;\n' + src;
    }

    function compile(type, source) {
        var s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('PostProcess shader:', gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            return null;
        }
        return s;
    }

    function buildProgram(fragSrc) {
        var vs = compile(gl.VERTEX_SHADER, getVertexSrc());
        var fs = compile(gl.FRAGMENT_SHADER, adaptFrag(fragSrc));
        if (!vs || !fs) return null;
        var p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error('PostProcess link:', gl.getProgramInfoLog(p));
            gl.deleteProgram(p);
            return null;
        }
        return p;
    }

    // Passes compile on first use, so a large library does not slow startup.
    function ensureProgram(fx) {
        if (!fx || fx.program || fx.failed || !gl) return fx ? fx.program : null;
        fx.program = buildProgram(fx.src);
        if (!fx.program) {
            fx.failed = true;
            console.warn('PostProcess: failed to compile ' + fx.name);
        }
        return fx.program;
    }

    function copyMods(mods) {
        var out = {};
        for (var k in mods) out[k] = { src: mods[k].src, amt: mods[k].amt };
        return out;
    }

    function snapshotEffectState() {
        var state = {};
        for (var i = 0; i < effectOrder.length; i++) {
            var name = effectOrder[i];
            var fx = effects[name];
            if (!fx) continue;
            var params = {};
            for (var key in fx.params) params[key] = fx.params[key];
            state[name] = {
                enabled: !!fx.enabled,
                params: params,
                mods: copyMods(fx.mods)
            };
        }
        return state;
    }

    function restoreEffectState(state) {
        state = state || {};
        for (var name in state) {
            if (!effects[name]) continue;
            effects[name].enabled = !!state[name].enabled;
            for (var key in state[name].params) {
                if (effects[name].params.hasOwnProperty(key)) effects[name].params[key] = state[name].params[key];
            }
            if (state[name].mods) effects[name].mods = copyMods(state[name].mods);
            if (effects[name].enabled) ensureProgram(effects[name]);
        }
    }

    function clearLocationCache() {
        locationCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    }

    function locationMap(program) {
        if (!program) return null;
        if (locationCache) {
            var cached = locationCache.get(program);
            if (!cached) {
                cached = {};
                locationCache.set(program, cached);
            }
            return cached;
        }
        if (!program._psyPostLocations) program._psyPostLocations = {};
        return program._psyPostLocations;
    }

    function uniformLocation(program, name) {
        var map = locationMap(program);
        if (!map) return null;
        if (!Object.prototype.hasOwnProperty.call(map, name)) {
            map[name] = gl.getUniformLocation(program, name);
        }
        return map[name];
    }

    function attribLocation(program, name) {
        var map = locationMap(program);
        if (!map) return -1;
        var key = 'attr:' + name;
        if (!Object.prototype.hasOwnProperty.call(map, key)) {
            map[key] = gl.getAttribLocation(program, name);
        }
        return map[key];
    }

    function destroyPrograms() {
        if (!gl) return;
        for (var i = 0; i < effectOrder.length; i++) {
            var fx = effects[effectOrder[i]];
            if (fx && fx.program) gl.deleteProgram(fx.program);
        }
        if (blitProgram) gl.deleteProgram(blitProgram);
        if (audioProgram) gl.deleteProgram(audioProgram);
        if (quadVBO) gl.deleteBuffer(quadVBO);
        blitProgram = null;
        audioProgram = null;
        quadVBO = null;
        clearLocationCache();
    }

    // === Framebuffer management ===

    function createFB() {
        var fb = gl.createFramebuffer();
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fb: fb, tex: tex };
    }

    function createFramebuffers() {
        destroyFramebuffers();
        if (width === 0 || height === 0) return;
        var c = createFB(); captureFB = c.fb; captureTex = c.tex;
        var p1 = createFB(); pingFB = p1.fb; pingTex = p1.tex;
        var p2 = createFB(); pongFB = p2.fb; pongTex = p2.tex;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Each feedback pass keeps its own pair of frames (written this frame / read
    // from last frame), so several can run together. Made on first use.
    function ensureHistory(fx) {
        if (fx.hist && fx.hist.w === width && fx.hist.h === height) return fx.hist;
        destroyHistory(fx);
        var a = createFB(), b = createFB();
        [a, b].forEach(function(x) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, x.fb);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
        });
        fx.hist = { fb: [a.fb, b.fb], tex: [a.tex, b.tex], index: 0, w: width, h: height };
        return fx.hist;
    }

    function destroyHistory(fx) {
        if (!fx.hist || !gl) { fx.hist = null; return; }
        fx.hist.fb.forEach(function(x) { if (x) gl.deleteFramebuffer(x); });
        fx.hist.tex.forEach(function(x) { if (x) gl.deleteTexture(x); });
        fx.hist = null;
    }

    function destroyFramebuffers() {
        if (!gl) return;
        var fbs = [captureFB, pingFB, pongFB];
        var texs = [captureTex, pingTex, pongTex];
        for (var k in effects) destroyHistory(effects[k]);
        for (var i = 0; i < fbs.length; i++) {
            if (fbs[i]) gl.deleteFramebuffer(fbs[i]);
            if (texs[i]) gl.deleteTexture(texs[i]);
        }
        captureFB = captureTex = pingFB = pingTex = pongFB = pongTex = null;
    }

    // === Drawing ===

    function drawQuad(program) {
        gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
        var loc = attribLocation(program, 'a_position');
        if (loc < 0) return;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // === Effect registration ===

    function registerEffect(name, label, shaderSrc, paramDefs, options) {
        options = options || {};
        var params = {};
        for (var k in paramDefs) {
            params[k] = paramDefs[k].default !== undefined ? paramDefs[k].default : 0;
        }
        effects[name] = {
            name: name,
            label: label,
            category: options.category || 'Other',
            hint: options.hint || '',
            src: shaderSrc,
            program: null,
            failed: false,
            enabled: false,
            paramDefs: paramDefs,
            params: params,
            mods: {},
            react: options.react || {},
            history: !!options.history,
            lut: !!options.lut,
            trigger: !!options.trigger
        };
        effectOrder.push(name);
    }

    function registerAllEffects() {
        if (typeof PostFxLibrary === 'undefined') return;
        PostFxLibrary.list().forEach(function(def) {
            var o = def.options || {};
            registerEffect(def.name, def.label, def.src, def.params, {
                category: def.category, hint: def.hint, react: def.react,
                history: o.history, lut: o.lut, trigger: o.trigger
            });
        });
    }

    // === Beat Reactor modulation ===

    function effectiveParam(fx, key) {
        var base = fx.params[key];
        var mod = fx.mods[key];
        if (!mod || !mod.amt || typeof AudioReactor === 'undefined' || !AudioReactor.applyMod) return base;
        return AudioReactor.applyMod(base, fx.paramDefs[key], mod);
    }

    // Seconds since the pass's trigger fired: the chosen beat event while
    // audio plays, otherwise the free-running interval.
    function triggerAge(fx, time) {
        var types = typeof PostFxLibrary !== 'undefined' ? PostFxLibrary.syncTypes : ['free'];
        var sync = types[Math.round(fx.params.sync || 0)] || 'free';
        if (sync !== 'free' && typeof AudioReactor !== 'undefined' && AudioReactor.getTrigger) {
            var tr = AudioReactor.getTrigger(sync);
            if (tr.live) return Math.min(tr.age, 30);
        }
        var interval = Math.max(0.05, Number(effectiveParam(fx, 'interval')) || 1);
        return time - Math.floor(time / interval) * interval;
    }

    function setMod(name, param, src, amt) {
        var fx = effects[name];
        if (!fx || !fx.paramDefs[param] || fx.paramDefs[param].type === 'select' || !isFinite(Number(amt))) return false;
        if (src && typeof AudioReactor !== 'undefined' && AudioReactor.isSource && !AudioReactor.isSource(src)) return false;
        amt = Math.max(-1, Math.min(1, Number(amt) || 0));
        if (!src) delete fx.mods[param];
        else fx.mods[param] = { src: String(src), amt: amt };
        return true;
    }

    function getMod(name, param) {
        var fx = effects[name];
        var m = fx && fx.mods[param];
        return m ? { src: m.src, amt: m.amt } : null;
    }

    function getMods(name) { return effects[name] ? copyMods(effects[name].mods) : {}; }
    function hasMods(name) { return !!effects[name] && Object.keys(effects[name].mods).length > 0; }
    function clearMods(name) { if (effects[name]) effects[name].mods = {}; }

    // Applies the pass's suggested Beat Reactor links (the "Auto" button).
    function applyReactDefaults(name) {
        var fx = effects[name];
        if (!fx) return false;
        fx.mods = {};
        for (var key in fx.react) setMod(name, key, fx.react[key][0], fx.react[key][1]);
        return true;
    }

    // Back to factory state: off, default settings, no Beat Reactor links.
    function resetEffect(name) {
        var fx = effects[name];
        if (!fx) return;
        fx.enabled = false;
        destroyHistory(fx);
        fx.mods = {};
        for (var k in fx.paramDefs) fx.params[k] = fx.paramDefs[k].default !== undefined ? fx.paramDefs[k].default : 0;
    }

    function resetAll() { effectOrder.forEach(resetEffect); }

    function getEffectiveParam(name, param) {
        var fx = effects[name];
        return fx ? effectiveParam(fx, param) : 0;
    }

    // === Public API ===

    function init() {
        var previousState = snapshotEffectState();
        if (initialized) {
            destroyFramebuffers();
            destroyPrograms();
        }
        effects = {};
        effectOrder = [];
        capturing = false;
        initialized = false;
        gl = Renderer.getGL();
        if (!gl) return;
        isWebGL2 = Renderer.getMode() === 'webgl2';

        var res = Renderer.getResolution();
        width = res.width;
        height = res.height;

        var verts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
        quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        blitProgram = buildProgram(
            'uniform sampler2D u_tex;\n' +
            'void main() { gl_FragColor = texture2D(u_tex, v_uv); }'
        );

        audioProgram = buildProgram(AUDIO_PASS_SRC);
        createFramebuffers();
        registerAllEffects();
        restoreEffectState(previousState);
        initialized = true;
    }

    function resize(w, h) {
        width = w; height = h;
        if (initialized) createFramebuffers();
    }

    function audioPassActive() {
        return !!audioProgram && typeof AudioReactor !== 'undefined' && AudioReactor.postActive();
    }

    function hasActive() {
        if (!initialized) return false;
        if (audioPassActive()) return true;
        for (var i = 0; i < effectOrder.length; i++) {
            if (effects[effectOrder[i]].enabled) return true;
        }
        return false;
    }

    function beginCapture() {
        if (!initialized || !hasActive()) return false;
        gl.bindFramebuffer(gl.FRAMEBUFFER, captureFB);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        Renderer.setScreenRedirect(captureFB);
        capturing = true;
        return true;
    }

    function apply(time) {
        if (!capturing) return;
        Renderer.setScreenRedirect(null);
        capturing = false;

        var readTex = captureTex;
        var usePing = true;

        for (var i = 0; i < effectOrder.length; i++) {
            var fx = effects[effectOrder[i]];
            if (!fx.enabled) continue;
            var program = ensureProgram(fx);
            if (!program) continue;

            var writeFB = usePing ? pingFB : pongFB;
            var writeTex = usePing ? pingTex : pongTex;
            var hist = fx.history ? ensureHistory(fx) : null;
            if (hist) {
                // Write into this pass's current frame, read its previous one.
                writeFB = hist.fb[hist.index];
                writeTex = hist.tex[hist.index];
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, hist.tex[1 - hist.index]);
                gl.activeTexture(gl.TEXTURE0);
            }
            if (fx.lut && typeof PsyPalettes !== 'undefined') {
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, PsyPalettes.texture(gl, fx.params.palette || 0));
                gl.activeTexture(gl.TEXTURE0);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, writeFB);
            gl.viewport(0, 0, width, height);
            gl.useProgram(program);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, readTex);
            var texLoc = uniformLocation(program, 'u_tex');
            if (texLoc !== null) gl.uniform1i(texLoc, 0);
            var prevLoc = uniformLocation(program, 'u_prev');
            if (prevLoc !== null) gl.uniform1i(prevLoc, 1);
            var lutLoc = uniformLocation(program, 'u_lut');
            if (lutLoc !== null) gl.uniform1i(lutLoc, 2);

            var resLoc = uniformLocation(program, 'u_resolution');
            if (resLoc !== null) gl.uniform2f(resLoc, width, height);
            var timeLoc = uniformLocation(program, 'u_time');
            if (timeLoc !== null) gl.uniform1f(timeLoc, time);
            if (fx.trigger) {
                var ageLoc = uniformLocation(program, 'u_age');
                if (ageLoc !== null) gl.uniform1f(ageLoc, triggerAge(fx, time));
            }

            for (var p in fx.params) {
                var loc = uniformLocation(program, 'u_' + p);
                if (loc !== null) gl.uniform1f(loc, effectiveParam(fx, p));
            }

            drawQuad(program);
            readTex = writeTex;
            if (hist) {
                hist.index = 1 - hist.index;
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, null);
                gl.activeTexture(gl.TEXTURE0);
            } else {
                usePing = !usePing;
            }
        }

        // Beat Reactor pass: zoom punch, rotation kick, shake, RGB split,
        // hue shift, colour pump and flash, driven by AudioReactor.
        if (audioPassActive()) {
            var o = AudioReactor.getOutputs();
            var aFB = usePing ? pingFB : pongFB;
            var aTex = usePing ? pingTex : pongTex;
            gl.bindFramebuffer(gl.FRAMEBUFFER, aFB);
            gl.viewport(0, 0, width, height);
            gl.useProgram(audioProgram);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, readTex);
            var aLoc = function(n) { return uniformLocation(audioProgram, n); };
            if (aLoc('u_tex') !== null) gl.uniform1i(aLoc('u_tex'), 0);
            if (aLoc('u_resolution') !== null) gl.uniform2f(aLoc('u_resolution'), width, height);
            if (aLoc('u_zoom') !== null) gl.uniform1f(aLoc('u_zoom'), o.zoom);
            if (aLoc('u_rot') !== null) gl.uniform1f(aLoc('u_rot'), o.rotate);
            if (aLoc('u_flash') !== null) gl.uniform1f(aLoc('u_flash'), o.flash);
            if (aLoc('u_hue') !== null) gl.uniform1f(aLoc('u_hue'), o.hue);
            if (aLoc('u_chroma') !== null) gl.uniform1f(aLoc('u_chroma'), o.chroma);
            if (aLoc('u_pump') !== null) gl.uniform1f(aLoc('u_pump'), o.pump);
            if (aLoc('u_shake') !== null) gl.uniform2f(aLoc('u_shake'), o.shakeX, o.shakeY);
            drawQuad(audioProgram);
            readTex = aTex;
        }

        // Final blit to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
        gl.useProgram(blitProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTex);
        var blitTexLoc = uniformLocation(blitProgram, 'u_tex');
        if (blitTexLoc !== null) gl.uniform1i(blitTexLoc, 0);
        drawQuad(blitProgram);
    }

    function setEnabled(name, val) {
        var fx = effects[name];
        if (!fx) return;
        // A feedback pass starts from black each time it is switched on.
        if (fx.enabled !== !!val) destroyHistory(fx);
        fx.enabled = !!val;
        if (fx.enabled) ensureProgram(fx);
    }
    function isEnabled(name) { return effects[name] ? effects[name].enabled : false; }
    function setParam(name, param, val) { if (effects[name]) effects[name].params[param] = val; }
    function getParam(name, param) { return effects[name] ? effects[name].params[param] : 0; }
    function getEffects() { return effectOrder.map(function(n) { return effects[n]; }); }
    function getEffect(name) { return effects[name] || null; }
    function getCategories() { return typeof PostFxLibrary !== 'undefined' ? PostFxLibrary.categories.slice() : []; }
    function disableAll() { effectOrder.forEach(function(n) { effects[n].enabled = false; destroyHistory(effects[n]); }); }

    var AUDIO_PASS_SRC = [
        'uniform sampler2D u_tex;',
        'uniform vec2 u_resolution;',
        'uniform float u_zoom;',
        'uniform float u_rot;',
        'uniform float u_flash;',
        'uniform float u_hue;',
        'uniform float u_chroma;',
        'uniform float u_pump;',
        'uniform vec2 u_shake;',
        'vec3 hueRot(vec3 c, float a) {',
        '    vec3 k = vec3(0.57735);',
        '    float ca = cos(a);',
        '    return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);',
        '}',
        // Mirror at the borders so zoom-outs and rotations never show edges.
        'vec2 mirrorUV(vec2 uv) { return 1.0 - abs(1.0 - mod(uv, 2.0)); }',
        'void main() {',
        '    float aspect = u_resolution.x / max(u_resolution.y, 1.0);',
        '    vec2 d = v_uv - 0.5;',
        '    d.x *= aspect;',
        '    float c = cos(u_rot), s = sin(u_rot);',
        '    d = mat2(c, -s, s, c) * d / max(u_zoom, 0.2);',
        '    d.x /= aspect;',
        '    vec2 uv = d + 0.5 + u_shake;',
        '    vec2 off = (v_uv - 0.5) * u_chroma * 2.0;',
        '    vec3 col;',
        '    col.r = texture2D(u_tex, mirrorUV(uv + off)).r;',
        '    col.g = texture2D(u_tex, mirrorUV(uv)).g;',
        '    col.b = texture2D(u_tex, mirrorUV(uv - off)).b;',
        '    if (abs(u_hue) > 0.0005) col = max(hueRot(col, u_hue * 6.28318), 0.0);',
        '    float l = dot(col, vec3(0.299, 0.587, 0.114));',
        '    col = max(mix(vec3(l), col, 1.0 + u_pump * 0.7), 0.0);',
        '    col = col * (1.0 + u_pump * 0.15) * (1.0 + u_flash * 0.9) + u_flash * 0.05;',
        '    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
        '}'
    ].join(String.fromCharCode(10));

    return {
        init: init,
        resize: resize,
        hasActive: hasActive,
        beginCapture: beginCapture,
        apply: apply,
        setEnabled: setEnabled,
        isEnabled: isEnabled,
        setParam: setParam,
        getParam: getParam,
        getEffects: getEffects,
        getEffect: getEffect,
        getCategories: getCategories,
        disableAll: disableAll,
        setMod: setMod,
        getMod: getMod,
        getMods: getMods,
        hasMods: hasMods,
        clearMods: clearMods,
        applyReactDefaults: applyReactDefaults,
        resetEffect: resetEffect,
        resetAll: resetAll,
        getEffectiveParam: getEffectiveParam
    };
})();
