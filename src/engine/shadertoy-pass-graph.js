/* Psychedelia Studio - Shadertoy multipass graph and ping-pong buffers */
var ShadertoyPassGraph = (function() {
    'use strict';

    var BUFFER_IDS = ['bufferA', 'bufferB', 'bufferC', 'bufferD'];
    var PASS_ORDER = ['bufferA', 'bufferB', 'bufferC', 'bufferD', 'image'];
    var LABELS = {
        common: 'Common',
        image: 'Image',
        bufferA: 'Buffer A',
        bufferB: 'Buffer B',
        bufferC: 'Buffer C',
        bufferD: 'Buffer D'
    };
    var FORMATS = ['rgba8', 'rgba16f', 'rgba32f'];

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function makeProjectId() {
        return 'shader-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 100000).toString(36);
    }

    function defaultChannels() {
        return [
            { slot: 0, kind: 'none' },
            { slot: 1, kind: 'none' },
            { slot: 2, kind: 'none' },
            { slot: 3, kind: 'none' }
        ];
    }

    function makePass(id, source, enabled) {
        return {
            id: id,
            type: id === 'image' ? 'image' : 'buffer',
            label: LABELS[id] || id,
            enabled: enabled !== false,
            resolutionScale: 1,
            source: source || '',
            channels: defaultChannels()
        };
    }

    function makeDefaultProject(imageSource) {
        return {
            id: makeProjectId(),
            version: 2,
            type: 'psychedelia-shadertoy-project',
            name: 'Untitled Shadertoy',
            description: '',
            license: '',
            attribution: null,
            settings: {
                renderTargetFormat: 'rgba8',
                safeMode: false
            },
            common: { source: '' },
            passes: [
                makePass('bufferA', '', false),
                makePass('bufferB', '', false),
                makePass('bufferC', '', false),
                makePass('bufferD', '', false),
                makePass('image', imageSource || '', true)
            ]
        };
    }

    function normalizeProject(project) {
        var normalized = makeDefaultProject();
        if (!project) return normalized;
        normalized.id = project.id || normalized.id;
        normalized.name = project.name || normalized.name;
        normalized.description = typeof project.description === 'string' ? project.description : '';
        normalized.license = typeof project.license === 'string' ? project.license : '';
        normalized.attribution = project.attribution || null;
        normalized.settings = {
            renderTargetFormat: FORMATS.indexOf(project.settings && project.settings.renderTargetFormat) >= 0 ? project.settings.renderTargetFormat : 'rgba8',
            safeMode: !!(project.settings && project.settings.safeMode)
        };
        normalized.common.source = project.common && typeof project.common.source === 'string' ? project.common.source : '';

        var incoming = {};
        (project.passes || []).forEach(function(pass) {
            incoming[pass.id || pass.name] = pass;
        });

        normalized.passes = normalized.passes.map(function(base) {
            var pass = incoming[base.id];
            if (!pass) return base;
            return {
                id: base.id,
                type: base.type,
                label: base.label,
                enabled: base.id === 'image' ? true : !!pass.enabled,
                resolutionScale: Number(pass.resolutionScale) > 0 ? Number(pass.resolutionScale) : 1,
                source: typeof pass.source === 'string' ? pass.source : (typeof pass.code === 'string' ? pass.code : ''),
                channels: normalizeChannels(pass.channels)
            };
        });
        return normalized;
    }

    function normalizeChannels(channels) {
        var out = defaultChannels();
        (channels || []).forEach(function(channel, i) {
            var slot = channel.slot !== undefined ? channel.slot : i;
            if (slot < 0 || slot > 3) return;
            out[slot] = {
                slot: slot,
                kind: channel.kind || channel.type || 'none',
                sourceId: channel.sourceId || channel.id || null,
                url: channel.url || null,
                dataUrl: channel.dataUrl || null,
                sampler: channel.sampler || {},
                message: channel.message || ''
            };
        });
        return out;
    }

    function PassGraph(gl, project) {
        this.gl = gl;
        this.project = normalizeProject(project);
        this.programs = {};
        this.compileResults = {};
        this.buffers = {};
        this.blackTexture = null;
        this.width = 0;
        this.height = 0;
        this.frame = 0;
        this.formatCache = {};
        this.targetFormatStatus = {
            requested: this.project.settings.renderTargetFormat || 'rgba8',
            active: 'rgba8',
            renderable: true,
            warning: ''
        };
        this.status = {
            success: false,
            shaderLog: 'Not compiled',
            passResults: {}
        };
        this.ensureBlackTexture();
    }

    PassGraph.prototype.ensureBlackTexture = function() {
        var gl = this.gl;
        if (!gl || this.blackTexture) return this.blackTexture;
        this.blackTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.blackTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return this.blackTexture;
    };

    PassGraph.prototype.getPass = function(id) {
        for (var i = 0; i < this.project.passes.length; i++) {
            if (this.project.passes[i].id === id) return this.project.passes[i];
        }
        return null;
    };

    PassGraph.prototype.setProject = function(project) {
        this.project = normalizeProject(project);
        this.targetFormatStatus.requested = this.project.settings.renderTargetFormat || 'rgba8';
        this.destroyTargets();
        this.reset();
    };

    PassGraph.prototype.getProject = function() {
        return clone(this.project);
    };

    PassGraph.prototype.setMetadata = function(metadata) {
        metadata = metadata || {};
        if (metadata.id) this.project.id = String(metadata.id);
        if (metadata.name !== undefined) this.project.name = String(metadata.name || 'Untitled Shadertoy');
        if (metadata.description !== undefined) this.project.description = String(metadata.description || '');
        if (metadata.license !== undefined) this.project.license = String(metadata.license || '');
        if (metadata.attribution !== undefined) this.project.attribution = metadata.attribution || null;
    };

    PassGraph.prototype.setRenderTargetFormat = function(format) {
        format = FORMATS.indexOf(format) >= 0 ? format : 'rgba8';
        this.project.settings.renderTargetFormat = format;
        this.targetFormatStatus.requested = format;
        this.destroyTargets();
        this.resize(this.width, this.height);
        this.status = this.rebuildStatus();
    };

    PassGraph.prototype.setPassSource = function(id, src) {
        var pass = this.getPass(id);
        if (pass) pass.source = String(src || '');
    };

    PassGraph.prototype.setCommonSource = function(src) {
        this.project.common.source = String(src || '');
    };

    PassGraph.prototype.setPassEnabled = function(id, enabled) {
        var pass = this.getPass(id);
        if (pass && id !== 'image') pass.enabled = !!enabled;
    };

    PassGraph.prototype.copyBufferPass = function(fromId, toId) {
        var from = this.getPass(fromId);
        var to = this.getPass(toId);
        if (!from || !to || toId === 'image') return false;
        to.enabled = true;
        to.resolutionScale = from.resolutionScale || 1;
        to.source = from.source || '';
        to.channels = clone(from.channels || defaultChannels());
        if (this.programs[toId]) this.gl.deleteProgram(this.programs[toId]);
        delete this.programs[toId];
        delete this.compileResults[toId];
        this.status = this.rebuildStatus();
        this.reset();
        return true;
    };

    PassGraph.prototype.clearBufferPass = function(id) {
        var pass = this.getPass(id);
        if (!pass || id === 'image') return false;
        pass.enabled = false;
        pass.resolutionScale = 1;
        pass.source = '';
        pass.channels = defaultChannels();
        if (this.programs[id]) this.gl.deleteProgram(this.programs[id]);
        delete this.programs[id];
        delete this.compileResults[id];
        this.status = this.rebuildStatus();
        this.reset();
        return true;
    };

    PassGraph.prototype.setPassResolutionScale = function(id, scale) {
        var pass = this.getPass(id);
        if (!pass || id === 'image') return;
        pass.resolutionScale = Math.max(0.125, Math.min(1, Number(scale) || 1));
        this.destroyTargets();
        this.resize(this.width, this.height);
    };

    PassGraph.prototype.setChannel = function(passId, slot, channel) {
        var pass = this.getPass(passId);
        if (!pass || slot < 0 || slot > 3) return;
        pass.channels[slot] = {
            slot: slot,
            kind: channel.kind || 'none',
            sourceId: channel.sourceId || null,
            url: channel.url || null,
            dataUrl: channel.dataUrl || null,
            sampler: channel.sampler || {},
            message: channel.message || ''
        };
    };

    PassGraph.prototype.destroyPrograms = function() {
        var gl = this.gl;
        for (var id in this.programs) {
            if (this.programs[id]) gl.deleteProgram(this.programs[id]);
        }
        this.programs = {};
    };

    PassGraph.prototype.compileAll = function() {
        var gl = this.gl;
        this.destroyPrograms();
        this.compileResults = {};
        var common = this.project.common.source || '';

        for (var i = 0; i < this.project.passes.length; i++) {
            var pass = this.project.passes[i];
            if (!pass.enabled) continue;
            var result = ShadertoyCompiler.createProgram(gl, {
                passId: pass.id,
                passName: pass.label,
                commonSource: common,
                passSource: pass.source
            });
            this.compileResults[pass.id] = result;
            if (result.success) {
                this.programs[pass.id] = result.program;
            }
        }

        this.status = this.rebuildStatus();
        if (this.status.success) this.reset();
        return this.status;
    };

    PassGraph.prototype.compilePass = function(id) {
        if (id === 'common') return this.compileAll();
        var pass = this.getPass(id);
        if (!pass) {
            this.status = {
                success: false,
                shaderLog: 'Unknown pass: ' + id,
                warnings: collectWarnings(this.compileResults),
                passResults: this.compileResults
            };
            return this.status;
        }
        if (!pass.enabled) {
            if (this.programs[id]) this.gl.deleteProgram(this.programs[id]);
            delete this.programs[id];
            delete this.compileResults[id];
            this.status = this.rebuildStatus();
            return this.status;
        }

        var oldProgram = this.programs[id];
        if (oldProgram) this.gl.deleteProgram(oldProgram);
        delete this.programs[id];

        var result = ShadertoyCompiler.createProgram(this.gl, {
            passId: pass.id,
            passName: pass.label,
            commonSource: this.project.common.source || '',
            passSource: pass.source
        });
        this.compileResults[id] = result;
        if (result.success) this.programs[id] = result.program;

        this.status = this.rebuildStatus();
        if (this.status.success) this.reset();
        return this.status;
    };

    PassGraph.prototype.rebuildStatus = function() {
        var success = true;
        var logs = [];
        for (var i = 0; i < this.project.passes.length; i++) {
            var pass = this.project.passes[i];
            if (!pass.enabled) continue;
            var result = this.compileResults[pass.id];
            if (!result || !result.success || !this.programs[pass.id]) {
                success = false;
                logs.push(pass.label + ': ' + (result ? (result.shaderLog || result.linkLog || 'Compile failed') : 'Not compiled'));
            }
        }
        var warnings = collectWarnings(this.compileResults);
        if (this.targetFormatStatus && this.targetFormatStatus.warning) warnings.push(this.targetFormatStatus.warning);
        return {
            success: success,
            shaderLog: logs.join('\n'),
            warnings: warnings,
            passResults: this.compileResults
        };
    };

    function collectWarnings(results) {
        var warnings = [];
        for (var id in results) {
            (results[id].warnings || []).forEach(function(warning) {
                warnings.push((LABELS[id] || id) + ': ' + warning);
            });
        }
        return warnings;
    }

    PassGraph.prototype.formatSpec = function(name) {
        var gl = this.gl;
        var isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        if (name === 'rgba8') {
            return { name: 'rgba8', internalFormat: gl.RGBA, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
        }
        if (name === 'rgba16f') {
            if (isWebGL2) {
                if (!gl.getExtension('EXT_color_buffer_float')) return null;
                return { name: 'rgba16f', internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT };
            }
            var half = gl.getExtension('OES_texture_half_float');
            var halfColor = gl.getExtension('EXT_color_buffer_half_float');
            return half && halfColor ? { name: 'rgba16f', internalFormat: gl.RGBA, format: gl.RGBA, type: half.HALF_FLOAT_OES } : null;
        }
        if (name === 'rgba32f') {
            if (isWebGL2) {
                if (!gl.getExtension('EXT_color_buffer_float')) return null;
                return { name: 'rgba32f', internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT };
            }
            var floatExt = gl.getExtension('OES_texture_float');
            var floatColor = gl.getExtension('WEBGL_color_buffer_float');
            return floatExt && floatColor ? { name: 'rgba32f', internalFormat: gl.RGBA, format: gl.RGBA, type: gl.FLOAT } : null;
        }
        return null;
    };

    PassGraph.prototype.testFormat = function(name) {
        if (this.formatCache[name]) return this.formatCache[name];
        var gl = this.gl;
        var spec = this.formatSpec(name);
        if (!spec) {
            this.formatCache[name] = { renderable: false, spec: null, status: 'missing-extension' };
            return this.formatCache[name];
        }
        var tex = gl.createTexture();
        var fb = gl.createFramebuffer();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, spec.internalFormat, 4, 4, 0, spec.format, spec.type, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(fb);
        gl.deleteTexture(tex);
        this.formatCache[name] = { renderable: status === gl.FRAMEBUFFER_COMPLETE, spec: spec, status: status };
        return this.formatCache[name];
    };

    PassGraph.prototype.resolveTargetFormat = function() {
        var requested = this.project.settings.renderTargetFormat || 'rgba8';
        var order = requested === 'rgba32f' ? ['rgba32f', 'rgba16f', 'rgba8'] : (requested === 'rgba16f' ? ['rgba16f', 'rgba8'] : ['rgba8']);
        for (var i = 0; i < order.length; i++) {
            var tested = this.testFormat(order[i]);
            if (tested.renderable) {
                this.targetFormatStatus = {
                    requested: requested,
                    active: order[i],
                    renderable: true,
                    status: tested.status,
                    warning: order[i] === requested ? '' : requested.toUpperCase() + ' render target is unsupported; using ' + order[i].toUpperCase() + '.'
                };
                return tested.spec;
            }
        }
        var fallback = this.formatSpec('rgba8');
        this.targetFormatStatus = {
            requested: requested,
            active: 'rgba8',
            renderable: false,
            warning: 'No requested render target format was framebuffer-complete; using RGBA8.'
        };
        return fallback;
    };

    PassGraph.prototype.createTarget = function(width, height) {
        var gl = this.gl;
        var spec = this.resolveTargetFormat();
        var fb = gl.createFramebuffer();
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, spec.internalFormat, width, height, 0, spec.format, spec.type, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return {
            fb: fb,
            tex: tex,
            width: width,
            height: height,
            format: this.targetFormatStatus.active,
            complete: status === gl.FRAMEBUFFER_COMPLETE,
            status: status
        };
    };

    PassGraph.prototype.destroyTargets = function() {
        var gl = this.gl;
        for (var id in this.buffers) {
            var record = this.buffers[id];
            for (var i = 0; i < record.targets.length; i++) {
                gl.deleteFramebuffer(record.targets[i].fb);
                gl.deleteTexture(record.targets[i].tex);
            }
        }
        this.buffers = {};
    };

    PassGraph.prototype.resize = function(width, height) {
        width = Math.max(1, Math.floor(width || 1));
        height = Math.max(1, Math.floor(height || 1));
        if (this.width === width && this.height === height && Object.keys(this.buffers).length) return;
        this.width = width;
        this.height = height;
        this.destroyTargets();

        for (var i = 0; i < BUFFER_IDS.length; i++) {
            var id = BUFFER_IDS[i];
            var pass = this.getPass(id);
            var scale = pass ? pass.resolutionScale || 1 : 1;
            var w = Math.max(1, Math.floor(width * scale));
            var h = Math.max(1, Math.floor(height * scale));
            var a = this.createTarget(w, h);
            var b = this.createTarget(w, h);
            this.buffers[id] = {
                id: id,
                targets: [a, b],
                writeIndex: 0,
                width: w,
                height: h,
                complete: a.complete && b.complete,
                status: a.complete ? b.status : a.status
            };
        }
        this.clearAllBuffers();
        this.status = this.rebuildStatus();
    };

    PassGraph.prototype.clearAllBuffers = function() {
        var gl = this.gl;
        for (var id in this.buffers) {
            var record = this.buffers[id];
            for (var i = 0; i < record.targets.length; i++) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, record.targets[i].fb);
                gl.viewport(0, 0, record.targets[i].width, record.targets[i].height);
                gl.clearColor(0, 0, 0, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            record.writeIndex = 0;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    PassGraph.prototype.reset = function() {
        if (!this.gl) return;
        var canvas = Renderer.getCanvas();
        this.resize(canvas.width, canvas.height);
        this.clearAllBuffers();
        this.frame = 0;
    };

    PassGraph.prototype.getLatestTexture = function(bufferId, currentTextures) {
        if (currentTextures && currentTextures[bufferId]) return currentTextures[bufferId].tex;
        var record = this.buffers[bufferId];
        if (!record) return this.blackTexture;
        return record.targets[1 - record.writeIndex].tex;
    };

    PassGraph.prototype.getTextureResolution = function(bufferId, currentTextures) {
        if (currentTextures && currentTextures[bufferId]) {
            return [currentTextures[bufferId].width, currentTextures[bufferId].height, 1];
        }
        var record = this.buffers[bufferId];
        if (!record) return [1, 1, 1];
        return [record.width, record.height, 1];
    };

    function isPowerOfTwo(n) {
        return n > 0 && (n & (n - 1)) === 0;
    }

    PassGraph.prototype.applySampler = function(texture, sampler, width, height) {
        if (!texture) return;
        sampler = sampler || {};
        var gl = this.gl;
        var filter = sampler.filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
        var wrapName = sampler.wrap || 'clamp';
        var wrap = gl.CLAMP_TO_EDGE;
        var isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        var pot = isPowerOfTwo(width || 1) && isPowerOfTwo(height || 1);
        if (wrapName === 'repeat') wrap = gl.REPEAT;
        else if (wrapName === 'mirror') wrap = gl.MIRRORED_REPEAT;
        if (!isWebGL2 && !pot && wrap !== gl.CLAMP_TO_EDGE) wrap = gl.CLAMP_TO_EDGE;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    };

    function renderTime(options) {
        return options && options.uniformState ? options.uniformState.time : ShadertoyUniforms.getState().time;
    }

    PassGraph.prototype.resolveChannel = function(pass, slot, destTarget, currentTextures, options) {
        var channel = pass.channels[slot] || { kind: 'none' };
        var kind = channel.kind || 'none';
        var texture = this.blackTexture;
        var resolution = [1, 1, 1];
        var sourceId = channel.sourceId;
        var time = 0;

        if (kind === 'self' || (kind === 'buffer' && sourceId === pass.id)) {
            sourceId = pass.id;
            var own = this.buffers[pass.id];
            if (own) {
                var previous = own.targets[1 - own.writeIndex];
                texture = previous.tex;
                resolution = [previous.width, previous.height, 1];
                time = renderTime(options);
            }
        } else if (kind === 'buffer' && sourceId) {
            texture = this.getLatestTexture(sourceId, currentTextures);
            resolution = this.getTextureResolution(sourceId, currentTextures);
            time = renderTime(options);
        } else if ((kind === 'procedural' || kind === 'image' || kind === 'keyboard' || kind === 'audio' || kind === 'video' || kind === 'webcam' || kind === 'microphone' || kind === 'unsupported') && typeof ShadertoyChannels !== 'undefined') {
            var resolved = ShadertoyChannels.resolve(this.gl, channel, this.blackTexture, options);
            texture = resolved.texture || this.blackTexture;
            resolution = resolved.resolution || [1, 1, 1];
            return { texture: texture, resolution: resolution, time: resolved.time || 0, date: resolved.date, status: resolved.status };
        }

        if (destTarget && texture === destTarget.tex) {
            texture = this.blackTexture;
            resolution = [1, 1, 1];
        }
        if (kind === 'self' || kind === 'buffer') {
            this.applySampler(texture, channel.sampler, resolution[0], resolution[1]);
        }

        return { texture: texture, resolution: resolution, time: time, date: [0, 0, 0, 0] };
    };

    PassGraph.prototype.bindChannels = function(program, pass, destTarget, currentTextures, options) {
        var gl = this.gl;
        var resolutions = [];
        var times = [];
        var dates = [];
        for (var i = 0; i < 4; i++) {
            var resolved = this.resolveChannel(pass, i, destTarget, currentTextures, options);
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, resolved.texture || this.blackTexture);
            resolutions[i] = resolved.resolution;
            times[i] = resolved.time || 0;
            dates[i] = resolved.date || [0, 0, 0, 0];
        }
        return { resolutions: resolutions, times: times, dates: dates };
    };

    PassGraph.prototype.uploadExtraUniforms = function(program, uniforms) {
        if (!uniforms) return;
        var gl = this.gl;
        function location(name) {
            var loc = gl.getUniformLocation(program, name);
            if (loc !== null || name.indexOf('u_') === 0) return loc;
            return gl.getUniformLocation(program, 'u_' + name);
        }
        for (var key in uniforms) {
            if (!Object.prototype.hasOwnProperty.call(uniforms, key)) continue;
            var value = uniforms[key];
            if (value === undefined || value === null) continue;
            var loc = location(key);
            if (loc === null) continue;
            if (typeof value === 'number') {
                gl.uniform1f(loc, value);
            } else if (typeof value === 'boolean') {
                gl.uniform1f(loc, value ? 1 : 0);
            } else if (Array.isArray(value) || value instanceof Float32Array) {
                if (value.length === 2) gl.uniform2fv(loc, value);
                else if (value.length === 3) gl.uniform3fv(loc, value);
                else if (value.length === 4) gl.uniform4fv(loc, value);
                else if (value.length > 4) gl.uniform1fv(loc, value);
            }
        }
    };

    PassGraph.prototype.renderPass = function(pass, destTarget, currentTextures, options) {
        options = options || {};
        var gl = this.gl;
        var program = this.programs[pass.id];
        if (!program) return null;
        var width = destTarget ? destTarget.width : this.width;
        var height = destTarget ? destTarget.height : this.height;

        if (destTarget) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, destTarget.fb);
        } else {
            Renderer.bindFramebuffer(-1);
        }
        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        var channelState = this.bindChannels(program, pass, destTarget, currentTextures, options);
        ShadertoyUniforms.upload(gl, program, {
            resolution: [width, height, 1],
            uniformState: options.uniformState || null,
            channelResolution: channelState.resolutions,
            channelTime: channelState.times,
            channelDate: channelState.dates
        });
        this.uploadExtraUniforms(program, options.uniforms);
        Renderer.setProgram(program);
        Renderer.drawQuad();
        return { tex: destTarget ? destTarget.tex : null, width: width, height: height };
    };

    PassGraph.prototype.render = function(options) {
        options = options || {};
        var gl = this.gl;
        if (!this.status.success) return false;
        var canvas = Renderer.getCanvas();
        this.resize(canvas.width, canvas.height);
        var currentTextures = {};

        for (var i = 0; i < BUFFER_IDS.length; i++) {
            var id = BUFFER_IDS[i];
            var pass = this.getPass(id);
            if (!pass || !pass.enabled) continue;
            var record = this.buffers[id];
            if (!record || !record.complete) {
                this.status.success = false;
                this.status.shaderLog = (LABELS[id] || id) + ': framebuffer incomplete (' + (record ? record.status : 'missing') + ')';
                return false;
            }
            var dest = record.targets[record.writeIndex];
            this.renderPass(pass, dest, currentTextures, options);
            currentTextures[id] = { tex: dest.tex, width: dest.width, height: dest.height };
            record.writeIndex = 1 - record.writeIndex;
        }

        var image = this.getPass('image');
        this.renderPass(image, null, currentTextures, options);
        this.frame += 1;
        return true;
    };

    PassGraph.prototype.getStatus = function() {
        return this.status;
    };

    PassGraph.prototype.getDiagnostics = function() {
        var buffers = {};
        for (var id in this.buffers) {
            buffers[id] = {
                width: this.buffers[id].width,
                height: this.buffers[id].height,
                complete: this.buffers[id].complete,
                format: this.buffers[id].targets[0] && this.buffers[id].targets[0].format || this.targetFormatStatus.active
            };
        }
        return {
            renderTargetFormat: clone(this.targetFormatStatus),
            buffers: buffers,
            fps: typeof Renderer !== 'undefined' && Renderer.getFPS ? Renderer.getFPS() : 0,
            renderer: typeof Renderer !== 'undefined' && Renderer.getMode ? Renderer.getMode() : 'unknown',
            gpu: typeof Renderer !== 'undefined' && Renderer.getGPUInfo ? Renderer.getGPUInfo() : null
        };
    };

    PassGraph.prototype.dispose = function() {
        this.destroyPrograms();
        this.destroyTargets();
        if (this.blackTexture) {
            this.gl.deleteTexture(this.blackTexture);
            this.blackTexture = null;
        }
    };

    return {
        create: function(gl, project) { return new PassGraph(gl, project); },
        makeDefaultProject: makeDefaultProject,
        normalizeProject: normalizeProject,
        bufferIds: BUFFER_IDS.slice(),
        formats: FORMATS.slice(),
        passOrder: PASS_ORDER.slice(),
        labels: clone(LABELS)
    };
})();
