/* Psychedelia Studio - Overlay Controls UI
 * Built from Overlays.getDefs(), grouped by category. Numeric settings get
 * a Beat Reactor link button (ReactUI); each overlay has an Auto button.
 */
var OverlayControls = (function() {
    'use strict';

    function init() {
        var sidebar = document.getElementById('sidebar');

        var panel = document.createElement('section');
        panel.className = 'panel';
        panel.id = 'overlayPanel';
        panel.innerHTML = '<h2 class="panel-title">Overlays</h2><div id="overlayContainer"></div>';
        sidebar.appendChild(panel);

        var container = document.getElementById('overlayContainer');
        if (typeof ReactUI !== 'undefined') panel.insertBefore(ReactUI.helpText(), container);
        if (typeof Looks !== 'undefined') panel.insertBefore(Looks.toolbar('overlays'), container);
        buildOverlayToggles(container);
    }

    // Rebuilds every group from the engine state (after Shuffle / Reset).
    function rebuild() {
        var container = document.getElementById('overlayContainer');
        if (!container) return;
        container.innerHTML = '';
        buildOverlayToggles(container);
    }

    function buildOverlayToggles(container) {
        var defs = Overlays.getDefs();
        var cats = Overlays.getCategories ? Overlays.getCategories() : [''];
        cats.forEach(function(cat) {
            var list = defs.filter(function(d) { return (d.category || '') === cat; });
            if (!list.length) return;
            // The category title is a CSS pseudo-element, so the first overlay
            // stays the wrapper's first child.
            var wrap = document.createElement('div');
            wrap.className = 'fx-category';
            wrap.dataset.title = cat;
            list.forEach(function(ov) { wrap.appendChild(buildGroup(ov)); });
            container.appendChild(wrap);
        });
    }

    function buildGroup(ov) {
        var group = document.createElement('div');
        group.className = 'overlay-group';
        var controls = {};
        var reacts = [];

        var toggleRow = document.createElement('div');
        toggleRow.className = 'overlay-toggle-row';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'ov_' + ov.id;

        var lbl = document.createElement('label');
        lbl.htmlFor = 'ov_' + ov.id;
        lbl.textContent = ov.label;

        var paramDiv = document.createElement('div');
        paramDiv.className = 'overlay-params';
        paramDiv.style.display = 'none';

        cb.checked = !!Overlays.isEnabled(ov.id);
        paramDiv.style.display = cb.checked ? 'block' : 'none';
        group.classList.toggle('is-on', cb.checked);
        cb.addEventListener('change', function() {
            Overlays.setEnabled(ov.id, cb.checked);
            paramDiv.style.display = cb.checked ? 'block' : 'none';
            group.classList.toggle('is-on', cb.checked);
        });

        toggleRow.appendChild(cb);
        toggleRow.appendChild(lbl);
        if (typeof ReactUI !== 'undefined' && ov.react) {
            var auto = ReactUI.autoButton(function() { return Overlays.hasMods(ov.id); }, function(on) {
                var changed = on ? Overlays.applyReactDefaults(ov.id) : Overlays.resetReact(ov.id);
                changed.forEach(function(name) { if (controls[name]) controls[name](Overlays.getParam(name)); });
                reacts.forEach(function(r) { r.refresh(); });
                if (on && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
            });
            toggleRow.appendChild(auto);
        }
        group.appendChild(toggleRow);

        if (ov.hint) {
            var hint = document.createElement('div');
            hint.className = 'fx-hint';
            hint.textContent = ov.hint;
            paramDiv.appendChild(hint);
        }

        (ov.params || []).forEach(function(p) {
            var row = document.createElement('div');
            row.className = 'param-row';
            var label = document.createElement('label');
            label.textContent = p.label;
            row.appendChild(label);
            paramDiv.appendChild(row);

            if (p.type === 'select') {
                var sel = document.createElement('select');
                (p.options || []).forEach(function(opt, i) {
                    var o = document.createElement('option');
                    o.value = i;
                    o.textContent = opt;
                    sel.appendChild(o);
                });
                sel.value = String(Overlays.getParam(p.name) !== undefined ? Overlays.getParam(p.name) : (p.default || 0));
                sel.addEventListener('change', function() { Overlays.setParam(p.name, parseInt(sel.value, 10)); });
                controls[p.name] = function(v) { sel.value = String(v); };
                row.appendChild(sel);
            } else if (p.type === 'color') {
                var colorInput = document.createElement('input');
                colorInput.type = 'color';
                colorInput.value = vec3ToHex(Overlays.getParam(p.name)) || p.default || '#ffffff';
                colorInput.addEventListener('input', function() { Overlays.setParam(p.name, hexToVec3(colorInput.value)); });
                controls[p.name] = function(v) { colorInput.value = vec3ToHex(v); };
                row.appendChild(colorInput);
            } else if (p.type === 'image') {
                var file = document.createElement('input');
                file.type = 'file';
                file.accept = 'image/*';
                file.style.display = 'none';
                var pick = document.createElement('button');
                pick.type = 'button';
                pick.className = 'panel-action';
                pick.textContent = 'Choose…';
                var clear = document.createElement('button');
                clear.type = 'button';
                clear.className = 'panel-action';
                clear.textContent = 'Clear';
                var fileName = document.createElement('span');
                fileName.className = 'image-name';
                var showName = function() {
                    var has = !!(Overlays.hasImage && Overlays.hasImage(p.name));
                    fileName.textContent = has ? String(Overlays.getParam(p.name) || 'image') : 'none chosen';
                    clear.disabled = !has;
                };
                pick.addEventListener('click', function() { file.click(); });
                file.addEventListener('change', function() {
                    if (file.files && file.files[0]) {
                        Overlays.setImage(p.name, file.files[0]);
                        if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
                    }
                    file.value = '';
                    showName();
                });
                clear.addEventListener('click', function() { Overlays.setImage(p.name, null); showName(); });
                controls[p.name] = showName;
                var box = document.createElement('div');
                box.className = 'image-pick';
                box.appendChild(pick);
                box.appendChild(clear);
                box.appendChild(fileName);
                box.appendChild(file);
                row.appendChild(box);
                showName();
            } else if (p.type === 'textarea') {
                var area = document.createElement('textarea');
                area.rows = 4;
                area.spellcheck = false;
                area.value = String(Overlays.getParam(p.name) || '');
                area.addEventListener('input', function() { Overlays.setParam(p.name, area.value); });
                controls[p.name] = function(v) { area.value = String(v || ''); };
                row.classList.add('param-row-tall');
                row.appendChild(area);
            } else if (p.type === 'text') {
                var input = document.createElement('input');
                input.type = 'text';
                input.value = String(Overlays.getParam(p.name) || '');
                input.maxLength = 80;
                input.addEventListener('input', function() { Overlays.setParam(p.name, input.value); });
                controls[p.name] = function(v) { input.value = String(v || ''); };
                row.appendChild(input);
            } else {
                var wrap = document.createElement('div');
                wrap.className = 'slider-wrap';
                var slider = document.createElement('input');
                slider.type = 'range';
                slider.min = p.min;
                slider.max = p.max;
                slider.step = p.step || 0.01;
                slider.value = Overlays.getParam(p.name);
                slider.dataset.default = String(p.default);
                if (window.UIShell && UIShell.paintRange) UIShell.paintRange(slider);
                var valSpan = document.createElement('span');
                valSpan.className = 'val-display';
                valSpan.textContent = formatValue(Overlays.getParam(p.name), p);
                slider.addEventListener('input', function() {
                    var v = p.type === 'int' ? parseInt(slider.value, 10) : parseFloat(slider.value);
                    Overlays.setParam(p.name, v);
                    valSpan.textContent = formatValue(v, p);
                });
                controls[p.name] = function(v) {
                    slider.value = v;
                    valSpan.textContent = formatValue(v, p);
                    if (window.UIShell && UIShell.paintRange) UIShell.paintRange(slider);
                };
                wrap.appendChild(slider);
                wrap.appendChild(valSpan);
                row.appendChild(wrap);
                if (typeof ReactUI !== 'undefined') {
                    reacts.push(ReactUI.attach({
                        row: row, wrap: wrap, def: p,
                        get: function() { return Overlays.getMod(p.name); },
                        set: function(src, amt) { Overlays.setMod(p.name, src, amt); if (auto) auto.sync(); },
                        live: function() { return Overlays.getEffectiveParam(p.name); },
                        base: function() { return Overlays.getParam(p.name); }
                    }));
                }
            }
        });

        group.appendChild(paramDiv);
        return group;
    }

    function formatValue(value, param) {
        if (param.type === 'int') return String(parseInt(value, 10));
        if (param.format === 'percent') return Math.round(value * 100) + '%';
        var precision = param.precision !== undefined ? param.precision : 2;
        return Number(value).toFixed(precision);
    }

    function hexToVec3(hex) {
        return [
            parseInt(hex.substr(1, 2), 16) / 255,
            parseInt(hex.substr(3, 2), 16) / 255,
            parseInt(hex.substr(5, 2), 16) / 255
        ];
    }

    function vec3ToHex(v) {
        if (!Array.isArray(v)) return '';
        return '#' + v.map(function(c) {
            var s = Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16);
            return s.length < 2 ? '0' + s : s;
        }).join('');
    }

    return { init: init, rebuild: rebuild };
})();
