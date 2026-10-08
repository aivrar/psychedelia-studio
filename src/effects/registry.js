/* Psychedelia Studio - Effect Registry */
var EffectRegistry = (function() {
    'use strict';

    var effects = {};
    var currentEffect = null;
    var effectOrder = [];

    function register(def) {
        /*
         * def = {
         *   name: 'plasma',
         *   label: 'Plasma',
         *   category: 'Demoscene',
         *   description: 'Classic lava lamp plasma effect',
         *   params: [ { name: 'speed', label: 'Speed', min: 0, max: 5, default: 1 }, ... ],
         *   shader: 'fragment shader source string' (for GPU),
         *   cpuRender: function(data, w, h, time, dt, params, mx, my) {} (for CPU fallback),
         *   render: function(gl, program, time, dt) {} (optional custom GPU render),
         *   init: function(gl) {} (optional init),
         *   cleanup: function(gl) {} (optional cleanup)
         * }
         */
        validateEffectContract(def);
        // Palette selects marked palette: true get the shared library appended.
        if (typeof PsyPalettes !== 'undefined' && Array.isArray(def.params)) {
            def.paletteParams = [];
            def.params.forEach(function(param) {
                if (!param || !param.palette) return;
                PsyPalettes.expandParam(param);
                def.paletteParams.push({ name: param.name, native: param.paletteNative });
            });
        }
        if (!def.specialize && def.shader && def.fractalFlight && def.fractalFlight.modeParam) {
            def.specialize = [def.fractalFlight.modeParam];
        }
        effects[def.name] = def;
        if (effectOrder.indexOf(def.name) === -1) {
            effectOrder.push(def.name);
        }
    }

    function validateEffectContract(def) {
        if (!def || !def.fractalFlight) return;
        var meta = def.fractalFlight;
        var validators = [];
        if (meta.kind === 'fractal-lab' || meta.kind === 'progressive-density') {
            if (typeof FractalLab !== 'undefined' && FractalLab.validateEffect) validators.push(FractalLab.validateEffect);
        } else if (typeof FractalFlight !== 'undefined' && FractalFlight.validateEffect) {
            validators.push(FractalFlight.validateEffect);
        }
        validators.forEach(function(validate) {
            var result = validate(def);
            if (result && !result.ok && result.errors && result.errors.length) {
                console.warn('Fractal metadata validation failed for ' + def.name + ': ' + result.errors.join('; '));
            }
        });
    }

    // Values of the effect's specialised (compile-time constant) params.
    function specFor(def, values) {
        if (!def || !Array.isArray(def.specialize) || !def.specialize.length) return null;
        var spec = {};
        def.specialize.forEach(function(paramName) {
            var value;
            if (values && values.hasOwnProperty(paramName)) {
                value = values[paramName];
            } else {
                var param = (def.params || []).filter(function(p) { return p.name === paramName; })[0];
                value = param && param.default !== undefined ? param.default : 0;
            }
            spec[paramName] = Math.round(Number(value) || 0);
        });
        return spec;
    }

    function switchTo(name, opts) {
        if (!effects[name]) return false;
        opts = opts || {};
        if (!opts._internal) {
            // A direct switch supersedes any background compile in flight.
            asyncRequest++;
            setCompileStatus(null);
        }

        var nextEffect = effects[name];
        var previousEffect = currentEffect;
        var program = null;
        var isCpu = Renderer.getMode() === 'cpu';
        if (isCpu && !nextEffect.cpuRender) {
            console.warn('Effect ' + name + ' does not support CPU rendering.');
            if (!opts.skipFallback) {
                var cpuFallback = fallbackName(name, previousEffect, true);
                if (cpuFallback) return switchTo(cpuFallback, { skipFallback: true, _internal: true });
            }
            if (previousEffect) {
                updateSelect(previousEffect.name);
                updateDescription(previousEffect);
            }
            return false;
        }
        var needsProgram = !isCpu && nextEffect.shader;

        // Compile before replacing the active effect. If compilation fails and
        // there is no CPU/custom render path, keep or restore a working effect
        // instead of leaving the canvas black.
        if (needsProgram) {
            program = opts.hasOwnProperty('program') ? opts.program : ShaderManager.createProgram(nextEffect.shader, name, specFor(nextEffect, opts.values));
            if (!program && !nextEffect.cpuRender && !nextEffect.render) {
                console.warn('Shader compile failed for ' + name + ', restoring a working effect');
                if (!opts.skipFallback) {
                    var fallback = fallbackName(name, previousEffect, false);
                    if (fallback) return switchTo(fallback, { skipFallback: true, _internal: true });
                }
                if (previousEffect) {
                    updateSelect(previousEffect.name);
                    updateDescription(previousEffect);
                }
                return false;
            }
        }

        var historyEdit = typeof EditHistory !== 'undefined' ? EditHistory.begin('Change effect') : null;
        // Cleanup old only after the next effect is known to be renderable.
        if (previousEffect && previousEffect !== nextEffect && previousEffect.cleanup) {
            previousEffect.cleanup(Renderer.getGL());
        }

        currentEffect = nextEffect;
        Renderer.setProgram(program);

        // New seed per effect switch
        Renderer.randomizeSeed();

        // Build GUI params
        Controls.buildParams(currentEffect.params || [], currentEffect.fractalFlight || null);
        if (opts.values && Controls.setValues) Controls.setValues(opts.values);
        updateDescription(currentEffect);
        updateSelect(name);

        // Run init
        if (currentEffect.init) {
            currentEffect.init(Renderer.getGL());
        }

        Renderer.resetTime();
        notifySwitch(name);
        if (historyEdit) EditHistory.end(historyEdit);
        return true;
    }

    // UI entry point: compiles the next shader in the background (where the
    // browser supports it) while the current effect keeps running, then
    // switches. Programmatic callers that need the switch to happen
    // immediately keep using switchTo().
    var asyncRequest = 0;
    var switchListeners = [];

    function notifySwitch(name) {
        switchListeners.forEach(function(fn) {
            try { fn(name); } catch (err) { console.error(err); }
        });
    }

    function onSwitch(fn) {
        if (typeof fn === 'function') switchListeners.push(fn);
    }

    function switchToAsync(name, opts) {
        var def = effects[name];
        if (!def) return false;
        var request = ++asyncRequest;
        var isCpu = Renderer.getMode() === 'cpu';
        var spec = specFor(def, opts && opts.values);
        if (isCpu || !def.shader || ShaderManager.getProgram(name, spec) || !ShaderManager.createProgramAsync) {
            setCompileStatus(null);
            return switchTo(name, opts);
        }
        setCompileStatus(def);
        ShaderManager.createProgramAsync(def.shader, name, function(program) {
            if (request !== asyncRequest) return; // superseded by a newer pick
            setCompileStatus(null);
            var switchOpts = {};
            for (var key in (opts || {})) switchOpts[key] = opts[key];
            switchOpts.program = program;
            switchOpts._internal = true;
            switchTo(name, switchOpts);
        }, spec);
        return true;
    }

    function cancelPendingSwitch() {
        asyncRequest++;
        setCompileStatus(null);
    }

    function setCompileStatus(defOrText) {
        var el = document.getElementById('compileStatus');
        if (!el) return;
        if (!defOrText) {
            el.classList.add('hidden');
            return;
        }
        var text = typeof defOrText === 'string' ? defOrText :
            'Compiling ' + (defOrText.label || defOrText.name) + '…';
        var label = el.querySelector('.compile-label');
        if (label) label.textContent = text;
        el.classList.remove('hidden');
    }

    function getDefinition(name) {
        return effects[name] || null;
    }

    function fallbackName(failedName, previousEffect, requireCpuRender) {
        if (previousEffect && previousEffect.name && previousEffect.name !== failedName &&
                (!requireCpuRender || previousEffect.cpuRender)) {
            return previousEffect.name;
        }
        if (!requireCpuRender && failedName !== 'plasma' && effects.plasma) return 'plasma';
        for (var i = 0; i < effectOrder.length; i++) {
            var candidate = effects[effectOrder[i]];
            if (effectOrder[i] !== failedName && (!requireCpuRender || candidate.cpuRender)) return effectOrder[i];
        }
        return null;
    }

    function updateDescription(effect) {
        var descEl = document.getElementById('effectDesc');
        if (descEl) descEl.textContent = effect.description || '';
    }

    function updateSelect(name) {
        var select = document.getElementById('effectSelect');
        if (select) select.value = name;
    }

    function getCurrent() { return currentEffect; }

    function reloadCurrent() {
        if (!currentEffect) return false;
        return switchTo(currentEffect.name);
    }

    function getList() {
        return effectOrder.map(function(name) {
            return {
                name: name,
                label: effects[name].label,
                category: effects[name].category,
                fractalFlight: effects[name].fractalFlight || null
            };
        });
    }

    function getCategories() {
        var cats = {};
        effectOrder.forEach(function(name) {
            var cat = effects[name].category || 'Other';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push({
                name: name,
                label: effects[name].label,
                fractalFlight: effects[name].fractalFlight || null
            });
        });
        return cats;
    }

    function getMetadata(name) {
        return effects[name] ? (effects[name].fractalFlight || null) : null;
    }

    return {
        register: register,
        switchTo: switchTo,
        switchToAsync: switchToAsync,
        cancelPendingSwitch: cancelPendingSwitch,
        onSwitch: onSwitch,
        getDefinition: getDefinition,
        specFor: specFor,
        setCompileStatus: setCompileStatus,
        reloadCurrent: reloadCurrent,
        getCurrent: getCurrent,
        getList: getList,
        getCategories: getCategories,
        getMetadata: getMetadata
    };
})();
