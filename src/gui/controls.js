/* Psychedelia Studio - GUI Controls */
var Controls = (function() {
    'use strict';

    var container = null;
    var values = {};
    var paramDefs = [];
    var currentMeta = null;
    var collapsedGroups = {};

    function init() {
        container = document.getElementById('paramsContainer');
    }

    function buildParams(params, meta) {
        if (!container) init();
        params = Array.isArray(params) ? params : [];
        container.innerHTML = '';
        values = {};
        paramDefs = params;
        currentMeta = meta || null;

        buildPresetStrip(currentMeta);

        var currentGroup = null;
        var currentGroupEl = null;
        var currentGroupBody = null;

        params.forEach(function(p) {
            var groupName = p.group || null;
            if (groupName !== currentGroup) {
                currentGroup = groupName;
                currentGroupEl = null;
                currentGroupBody = null;
                if (groupName) {
                    currentGroupEl = document.createElement('div');
                    currentGroupEl.className = 'param-group' + (collapsedGroups[groupName] ? ' collapsed' : '');

                    var groupToggle = document.createElement('button');
                    groupToggle.type = 'button';
                    groupToggle.className = 'param-group-toggle';
                    groupToggle.dataset.group = groupName;
                    groupToggle.setAttribute('aria-expanded', collapsedGroups[groupName] ? 'false' : 'true');

                    var groupTitle = document.createElement('span');
                    groupTitle.className = 'param-group-title';
                    groupTitle.textContent = groupName;

                    var groupState = document.createElement('span');
                    groupState.className = 'param-group-state';
                    groupState.textContent = collapsedGroups[groupName] ? '+' : '-';

                    groupToggle.appendChild(groupTitle);
                    groupToggle.appendChild(groupState);
                    groupToggle.addEventListener('click', function() {
                        var group = this.dataset.group;
                        collapsedGroups[group] = !collapsedGroups[group];
                        var parent = this.parentNode;
                        if (parent) parent.classList.toggle('collapsed', collapsedGroups[group]);
                        this.setAttribute('aria-expanded', collapsedGroups[group] ? 'false' : 'true');
                        var state = this.querySelector('.param-group-state');
                        if (state) state.textContent = collapsedGroups[group] ? '+' : '-';
                    });

                    currentGroupBody = document.createElement('div');
                    currentGroupBody.className = 'param-group-body';

                    currentGroupEl.appendChild(groupToggle);
                    currentGroupEl.appendChild(currentGroupBody);
                    container.appendChild(currentGroupEl);
                }
            }

            values[p.name] = defaultValueForParam(p);

            var row = document.createElement('div');
            row.className = 'param-row param-row-' + (p.type || 'float');
            row.dataset.param = p.name;

            var label = document.createElement('label');
            label.textContent = p.label || p.name;
            label.title = p.label || p.name;
            row.appendChild(label);

            if (p.type === 'float' || p.type === 'int' || !p.type) {
                var wrap = document.createElement('div');
                wrap.className = 'slider-wrap';

                var slider = document.createElement('input');
                slider.type = 'range';
                slider.min = p.min !== undefined ? p.min : 0;
                slider.max = p.max !== undefined ? p.max : 1;
                slider.step = p.step || (p.type === 'int' ? 1 : 0.01);
                slider.value = values[p.name];
                slider.dataset.default = String(factoryDefault(p));
                slider.setAttribute('aria-label', p.label || p.name);
                slider.title = p.label || p.name;

                var valSpan = document.createElement('span');
                valSpan.className = 'val-display';
                valSpan.textContent = formatVal(values[p.name], p);
                slider.setAttribute('aria-valuetext', valSpan.textContent);

                function updateSliderValue() {
                    var v = p.type === 'int' ? parseInt(slider.value) : parseFloat(slider.value);
                    values[p.name] = v;
                    valSpan.textContent = formatVal(v, p);
                    slider.setAttribute('aria-valuetext', valSpan.textContent);
                    markPresetCustom();
                }

                slider.addEventListener('input', updateSliderValue);
                // Some embedded browsers only commit range changes on release.
                // Keeping a change listener makes the final knob position reliable.
                slider.addEventListener('change', updateSliderValue);

                wrap.appendChild(slider);
                wrap.appendChild(valSpan);
                row.appendChild(wrap);
            } else if (p.type === 'color') {
                var colorInput = document.createElement('input');
                colorInput.type = 'color';
                colorInput.value = p.default || '#ff00ff';
                values[p.name] = hexToVec3(colorInput.value);

                colorInput.addEventListener('input', function() {
                    values[p.name] = hexToVec3(colorInput.value);
                    markPresetCustom();
                });

                row.appendChild(colorInput);
            } else if (p.type === 'bool') {
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !!p.default;
                values[p.name] = p.default ? 1.0 : 0.0;

                cb.addEventListener('change', function() {
                    values[p.name] = cb.checked ? 1.0 : 0.0;
                    markPresetCustom();
                });

                row.appendChild(cb);
            } else if (p.type === 'select') {
                var sel = document.createElement('select');
                var options = p.options || [];
                function makeOption(i) {
                    var o = document.createElement('option');
                    o.value = i;
                    o.textContent = options[i];
                    return o;
                }
                if (Array.isArray(p.optionGroups) && p.optionGroups.length) {
                    p.optionGroups.forEach(function(g) {
                        if (!g.count) return;
                        var og = document.createElement('optgroup');
                        og.label = g.label;
                        for (var gi = g.start; gi < g.start + g.count && gi < options.length; gi++) {
                            og.appendChild(makeOption(gi));
                        }
                        sel.appendChild(og);
                    });
                } else {
                    options.forEach(function(opt, i) { sel.appendChild(makeOption(i)); });
                }
                sel.value = p.default !== undefined ? p.default : 0;
                values[p.name] = isFinite(parseFloat(sel.value)) ? parseFloat(sel.value) : 0;

                sel.addEventListener('change', function() {
                    values[p.name] = parseFloat(sel.value);
                    updatePaletteSwatch(row, p, values[p.name]);
                    markPresetCustom();
                });

                if (p.paletteNative !== undefined) {
                    row.classList.add('param-row-palette');
                    var palWrap = document.createElement('div');
                    palWrap.className = 'palette-wrap';
                    var swatch = document.createElement('div');
                    swatch.className = 'palette-swatch';
                    palWrap.appendChild(sel);
                    palWrap.appendChild(swatch);
                    row.appendChild(palWrap);
                    updatePaletteSwatch(row, p, values[p.name]);
                } else {
                    row.appendChild(sel);
                }
            }

            (currentGroupBody || currentGroupEl || container).appendChild(row);
        });
    }

    // Gradient preview under a palette select. Effect-original palettes are
    // defined in each shader, so only library palettes get a swatch.
    function updatePaletteSwatch(row, p, value) {
        if (!row || p.paletteNative === undefined) return;
        var swatch = row.querySelector('.palette-swatch');
        if (!swatch) return;
        var libIndex = Math.round(Number(value) || 0) - p.paletteNative;
        if (libIndex >= 0 && typeof PsyPalettes !== 'undefined') {
            swatch.style.backgroundImage = PsyPalettes.cssGradient(libIndex);
            swatch.classList.remove('native');
            swatch.title = PsyPalettes.list[libIndex] ? PsyPalettes.list[libIndex].group + ' palette' : '';
        } else {
            swatch.style.backgroundImage = '';
            swatch.classList.add('native');
            swatch.title = 'Effect original palette';
        }
    }

    function buildPresetStrip(meta) {
        var presets = meta && Array.isArray(meta.smokePresets) ? meta.smokePresets : [];
        if (!presets.length) return;

        var strip = document.createElement('div');
        strip.className = 'preset-strip';
        strip.dataset.presetCount = String(presets.length);

        var label = document.createElement('label');
        label.textContent = 'Starter Preset';
        label.title = 'Starter Preset';
        strip.appendChild(label);

        var controls = document.createElement('div');
        controls.className = 'preset-controls';

        var select = document.createElement('select');
        select.id = 'fractalPresetSelect';
        select.title = 'Starter Preset';
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Defaults / Custom';
        placeholder.selected = true;
        select.appendChild(placeholder);
        presets.forEach(function(preset, index) {
            var opt = document.createElement('option');
            opt.value = index;
            opt.textContent = preset && preset.name ? preset.name : 'Preset ' + (index + 1);
            select.appendChild(opt);
        });
        select.addEventListener('change', function() {
            if (select.value === '') {
                resetToDefaults();
                return;
            }
            applyPreset(parseInt(select.value, 10) || 0);
        });

        controls.appendChild(select);
        strip.appendChild(controls);
        container.appendChild(strip);
    }

    function formatVal(v, p) {
        if (p.type === 'int') return v.toString();
        return v.toFixed(2);
    }

    // The effect's own default, even after Randomize replaced p.default.
    function factoryDefault(p) {
        if (p._origDefault === undefined) return defaultValueForParam(p);
        var q = {};
        for (var k in p) q[k] = p[k];
        q.default = p._origDefault;
        return defaultValueForParam(q);
    }

    function defaultValueForParam(p) {
        if (p.type === 'color') return hexToVec3(p.default || '#ff00ff');
        if (p.type === 'bool') return p.default ? 1.0 : 0.0;
        if (p.type === 'select') {
            var selectDefault = p.default !== undefined ? p.default : 0;
            return isFinite(parseFloat(selectDefault)) ? parseFloat(selectDefault) : 0;
        }
        return p.default !== undefined ? p.default : (p.min !== undefined ? p.min : 0);
    }

    function markPresetCustom() {
        if (!container) return;
        var select = container.querySelector('#fractalPresetSelect');
        if (select) select.value = '';
    }

    function syncPresetSelection() {
        var select = container && container.querySelector('#fractalPresetSelect');
        if (!select) return;
        var presets = currentMeta && currentMeta.smokePresets || [];
        var index = presets.findIndex(function(preset) {
            return paramDefs.every(function(p) {
                var expected = preset.values && Object.prototype.hasOwnProperty.call(preset.values, p.name) ? preset.values[p.name] : factoryDefault(p);
                return JSON.stringify(values[p.name]) === JSON.stringify(expected);
            });
        });
        select.value = index < 0 ? '' : String(index);
    }

    function hexToVec3(hex) {
        var r = parseInt(hex.substr(1, 2), 16) / 255;
        var g = parseInt(hex.substr(3, 2), 16) / 255;
        var b = parseInt(hex.substr(5, 2), 16) / 255;
        return [r, g, b];
    }

    function vec3ToHex(vec) {
        if (!Array.isArray(vec) || vec.length < 3) return '#ffffff';
        var r = Math.max(0, Math.min(255, Math.round(vec[0] * 255)));
        var g = Math.max(0, Math.min(255, Math.round(vec[1] * 255)));
        var b = Math.max(0, Math.min(255, Math.round(vec[2] * 255)));
        return '#' + [r, g, b].map(function(v) {
            return v.toString(16).padStart(2, '0');
        }).join('');
    }

    // While Beat Reactor parameter links are live, renders see a modulated
    // copy; getBaseValues() always returns the user's own settings.
    function getValues() {
        if (typeof AudioReactor !== 'undefined' && AudioReactor.hasLinks()) return AudioReactor.modulate(values, paramDefs);
        return values;
    }
    function getBaseValues() { return values; }

    function setValues(newVals) {
        for (var key in newVals) {
            if (values.hasOwnProperty(key)) {
                values[key] = newVals[key];
                syncControlValue(key, newVals[key]);
            }
        }
    }

    function applyPreset(index) {
        var presets = currentMeta && Array.isArray(currentMeta.smokePresets) ? currentMeta.smokePresets : [];
        var preset = presets[index];
        if (!preset) return false;
        // Presets are complete states relative to the effect defaults. Without
        // this reset, omitted knobs leaked in from the previously selected
        // preset or a custom edit and made the sidebar disagree with the preset.
        var defaults = {};
        paramDefs.forEach(function(p) {
            defaults[p.name] = factoryDefault(p);
        });
        setValues(defaults);
        setValues(preset.values || {});
        var select = container ? container.querySelector('#fractalPresetSelect') : null;
        if (select) select.value = String(index);
        if (window.Renderer && Renderer.resetTime) Renderer.resetTime();
        return true;
    }

    function resetToDefaults() {
        var defaults = {};
        paramDefs.forEach(function(p) {
            defaults[p.name] = factoryDefault(p);
        });
        setValues(defaults);
        var select = container ? container.querySelector('#fractalPresetSelect') : null;
        if (select) select.value = '';
        if (window.Renderer && Renderer.resetTime) Renderer.resetTime();
        return true;
    }

    function getParamDef(name) {
        for (var i = 0; i < paramDefs.length; i++) {
            if (paramDefs[i].name === name) return paramDefs[i];
        }
        return null;
    }

    function syncControlValue(name, value) {
        if (!container) return;
        var p = getParamDef(name);
        var row = container.querySelector('[data-param="' + name + '"]');
        if (!p || !row) return;

        if (p.type === 'float' || p.type === 'int' || !p.type) {
            var slider = row.querySelector('input[type="range"]');
            var valSpan = row.querySelector('.val-display');
            if (slider) {
                slider.value = value;
                if (window.UIShell) UIShell.paintRange(slider);
            }
            if (valSpan) valSpan.textContent = formatVal(value, p);
        } else if (p.type === 'select') {
            var select = row.querySelector('select');
            if (select) select.value = value;
            updatePaletteSwatch(row, p, value);
        } else if (p.type === 'bool') {
            var checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = !!value;
        } else if (p.type === 'color') {
            var colorInput = row.querySelector('input[type="color"]');
            if (colorInput) colorInput.value = typeof value === 'string' ? value : vec3ToHex(value);
        }
    }

    function getParamDefs() { return paramDefs; }

    function randomize() {
        // Randomize seed
        Renderer.randomizeSeed();
        Renderer.resetTime();

        // Rebuild with randomized defaults
        var randomDefs = paramDefs.map(function(p) {
            var newP = {};
            for (var k in p) newP[k] = p[k];
            newP._origDefault = p._origDefault !== undefined ? p._origDefault : p.default;

            if (p.type === 'color') {
                var r = Math.floor(Math.random() * 256);
                var g = Math.floor(Math.random() * 256);
                var b = Math.floor(Math.random() * 256);
                newP.default = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            } else if (p.type === 'bool') {
                newP.default = Math.random() > 0.5;
            } else if (p.type === 'select') {
                var optCount = (p.options || []).length;
                newP.default = optCount > 0 ? Math.floor(Math.random() * optCount) : 0;
            } else {
                var min = p.min !== undefined ? p.min : 0;
                var max = p.max !== undefined ? p.max : 1;
                var val = min + Math.random() * (max - min);
                if (p.type === 'int') val = Math.round(val);
                newP.default = val;
            }
            return newP;
        });

        buildParams(randomDefs, currentMeta);
    }

    return {
        init: init,
        buildParams: buildParams,
        getValues: getValues,
        getBaseValues: getBaseValues,
        setValues: setValues,
        syncPresetSelection: syncPresetSelection,
        applyPreset: applyPreset,
        resetToDefaults: resetToDefaults,
        getParamDefs: getParamDefs,
        randomize: randomize
    };
})();
