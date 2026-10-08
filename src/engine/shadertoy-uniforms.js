/* Psychedelia Studio - Shadertoy runtime uniforms and input state */
var ShadertoyUniforms = (function() {
    'use strict';

    var canvas = null;
    var initialized = false;
    var frameCounter = 0;
    var demoMouse = false;
    var mouseDown = false;
    var clickX = 0;
    var clickY = 0;

    var state = {
        time: 0,
        delta: 1 / 60,
        frameRate: 60,
        frame: 0,
        mouse: [0, 0, 0, 0],
        date: [1970, 1, 1, 0],
        sampleRate: 44100
    };

    function init(targetCanvas) {
        if (initialized) return;
        canvas = targetCanvas || (typeof Renderer !== 'undefined' ? Renderer.getCanvas() : null);
        if (!canvas) return;

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerCancel);
        initialized = true;
        resetFrameState();
    }

    function canvasPointFromEvent(e) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
        var scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
        var x = (e.clientX - rect.left) * scaleX;
        var y = canvas.height - (e.clientY - rect.top) * scaleY;
        return {
            x: Math.max(0, Math.min(canvas.width, x)),
            y: Math.max(0, Math.min(canvas.height, y))
        };
    }

    function signedCoord(value, sign) {
        var magnitude = Math.max(0.0001, Math.abs(value));
        return sign < 0 ? -magnitude : magnitude;
    }

    function onPointerDown(e) {
        if (!canvas) return;
        var p = canvasPointFromEvent(e);
        mouseDown = true;
        clickX = p.x;
        clickY = p.y;
        state.mouse = [p.x, p.y, signedCoord(clickX, 1), signedCoord(clickY, 1)];
        if (canvas.setPointerCapture && e.pointerId !== undefined) {
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        }
    }

    function onPointerMove(e) {
        if (!canvas) return;
        var p = canvasPointFromEvent(e);
        state.mouse[0] = p.x;
        state.mouse[1] = p.y;
        if (mouseDown) {
            state.mouse[2] = signedCoord(clickX, 1);
            state.mouse[3] = signedCoord(clickY, 1);
        }
    }

    function onPointerUp(e) {
        if (!canvas) return;
        var p = canvasPointFromEvent(e);
        mouseDown = false;
        state.mouse = [p.x, p.y, signedCoord(clickX, -1), signedCoord(clickY, -1)];
        if (canvas.releasePointerCapture && e.pointerId !== undefined) {
            try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
        }
    }

    function onPointerCancel(e) {
        onPointerUp(e);
    }

    function updateDate() {
        var now = new Date();
        state.date = [
            now.getFullYear(),
            now.getMonth() + 1,
            now.getDate(),
            now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000
        ];
    }

    function readSampleRate() {
        if (typeof Tone !== 'undefined' && Tone.context && Tone.context.sampleRate) {
            return Tone.context.sampleRate;
        }
        if (typeof Tone !== 'undefined' && Tone.getContext) {
            try {
                var ctx = Tone.getContext();
                if (ctx && ctx.sampleRate) return ctx.sampleRate;
                if (ctx && ctx.rawContext && ctx.rawContext.sampleRate) return ctx.rawContext.sampleRate;
            } catch (err) {
                // Fall through to browser defaults.
            }
        }
        return 44100;
    }

    function updateFrame(time, dt, fps) {
        if (!initialized) init();
        state.time = Math.max(0, Number(time) || 0);
        state.delta = Math.max(0, Number(dt) || 0);
        state.frameRate = fps && fps > 0 ? fps : (state.delta > 0 ? 1 / state.delta : 60);
        state.frame = frameCounter;
        state.sampleRate = readSampleRate();
        updateDate();
        frameCounter += 1;
    }

    function resetFrameState(options) {
        options = options || {};
        frameCounter = 0;
        state.time = 0;
        state.delta = 0;
        state.frame = 0;
        state.frameRate = 60;
        if (options.resetMouse) {
            mouseDown = false;
            clickX = 0;
            clickY = 0;
            state.mouse = [0, 0, 0, 0];
        }
        updateDate();
    }

    function setDemoMouse(enabled) {
        demoMouse = !!enabled;
    }

    function getResolution(target) {
        var c = target || canvas || (typeof Renderer !== 'undefined' ? Renderer.getCanvas() : null);
        if (!c) return [1, 1, 1];
        return [c.width || 1, c.height || 1, 1];
    }

    function getMouseForUpload(targetResolution) {
        if (!demoMouse) return state.mouse.slice();
        if (state.mouse[2] !== 0 || state.mouse[3] !== 0 || mouseDown) return state.mouse.slice();
        var res = targetResolution || getResolution();
        var x = res[0] * (0.5 + Math.cos(state.time * 0.7) * 0.22);
        var y = res[1] * (0.5 + Math.sin(state.time * 0.9) * 0.22);
        return [x, y, res[0] * 0.5, res[1] * 0.5];
    }

    function setUniform(gl, program, name, type, value) {
        var loc = gl.getUniformLocation(program, name);
        if (loc === null) return;
        if (type === '1f') gl.uniform1f(loc, value);
        else if (type === '1i') gl.uniform1i(loc, value);
        else if (type === '3f') gl.uniform3f(loc, value[0], value[1], value[2]);
        else if (type === '4f') gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
        else if (type === '1fv') gl.uniform1fv(loc, value);
        else if (type === '3fv') gl.uniform3fv(loc, value);
        else if (type === '4fv') gl.uniform4fv(loc, value);
    }

    function flattenChannelRes(channelResolution) {
        var out = [];
        for (var i = 0; i < 4; i++) {
            var r = channelResolution && channelResolution[i] ? channelResolution[i] : [1, 1, 1];
            out.push(r[0] || 1, r[1] || 1, r[2] || 1);
        }
        return new Float32Array(out);
    }

    function flattenChannelDate(channelDate) {
        var out = [];
        for (var i = 0; i < 4; i++) {
            var d = channelDate && channelDate[i] ? channelDate[i] : [0, 0, 0, 0];
            out.push(d[0] || 0, d[1] || 0, d[2] || 0, d[3] || 0);
        }
        return new Float32Array(out);
    }

    function upload(gl, program, options) {
        options = options || {};
        if (!program || !gl) return;
        var uploadState = options.uniformState || state;
        var resolution = options.resolution || getResolution(options.canvas);
        var mouse = uploadState.mouse ? uploadState.mouse : getMouseForUpload(resolution);
        var channelTime = options.channelTime || [0, 0, 0, 0];
        var channelDate = options.channelDate || null;

        setUniform(gl, program, 'iResolution', '3f', resolution);
        setUniform(gl, program, 'iTime', '1f', uploadState.time);
        setUniform(gl, program, 'iTimeDelta', '1f', uploadState.delta);
        setUniform(gl, program, 'iFrameRate', '1f', uploadState.frameRate);
        setUniform(gl, program, 'iFrame', '1i', uploadState.frame);
        setUniform(gl, program, 'iMouse', '4f', mouse);
        setUniform(gl, program, 'iDate', '4f', uploadState.date || state.date);
        setUniform(gl, program, 'iSampleRate', '1f', uploadState.sampleRate || state.sampleRate);
        if (typeof Renderer !== 'undefined') {
            if (Renderer.getViewZoom) setUniform(gl, program, 'u_view_zoom', '1f', Renderer.getViewZoom());
            if (Renderer.getViewZoomSpeed) setUniform(gl, program, 'u_view_zoom_speed', '1f', Renderer.getViewZoomSpeed());
            if (Renderer.getViewZoomDepth) setUniform(gl, program, 'u_view_zoom_depth', '1f', Renderer.getViewZoomDepth());
            if (Renderer.getRotation) setUniform(gl, program, 'u_global_rotation', '1f', Renderer.getRotation());
        }
        setUniform(gl, program, 'iChannelTime[0]', '1fv', new Float32Array(channelTime));
        setUniform(gl, program, 'iChannelResolution[0]', '3fv', flattenChannelRes(options.channelResolution));
        setUniform(gl, program, 'iChannelDate[0]', '4fv', flattenChannelDate(channelDate));

        for (var i = 0; i < 4; i++) {
            setUniform(gl, program, 'iChannel' + i, '1i', (options.textureUnitBase || 0) + i);
        }
    }

    function getState(target) {
        return {
            time: state.time,
            delta: state.delta,
            frameRate: state.frameRate,
            frame: state.frame,
            mouse: state.mouse.slice(),
            mouseDown: mouseDown,
            date: state.date.slice(),
            sampleRate: state.sampleRate,
            resolution: getResolution(target)
        };
    }

    return {
        init: init,
        updateFrame: updateFrame,
        resetFrameState: resetFrameState,
        setDemoMouse: setDemoMouse,
        upload: upload,
        getState: getState
    };
})();
