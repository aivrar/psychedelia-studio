/* Psychedelia Studio - Post-Processing Controls UI
 * One group per pass, grouped by category. Numeric settings get a Beat
 * Reactor link button (ReactUI); each pass has an Auto button.
 */
var PostProcessControls = (function() {
    'use strict';

    var groups = [];

    function init() {
        var sidebar = document.getElementById('sidebar');

        var panel = document.createElement('section');
        panel.className = 'panel';
        panel.id = 'postfxPanel';
        panel.innerHTML = '<h2 class="panel-title">Post FX</h2>' +
            '<div class="fx-toolbar"><span id="postfxActive">No FX active</span></div>' +
            '<div id="postfxContainer"></div>';

        // Insert before the overlay panel
        var overlayPanel = document.getElementById('overlayPanel');
        if (overlayPanel) {
            sidebar.insertBefore(panel, overlayPanel);
        } else {
            sidebar.appendChild(panel);
        }

        var container = document.getElementById('postfxContainer');
        if (typeof ReactUI !== 'undefined') panel.insertBefore(ReactUI.helpText(), panel.querySelector('.fx-toolbar'));
        if (typeof Looks !== 'undefined') panel.insertBefore(Looks.toolbar('fx'), panel.querySelector('.fx-toolbar'));
        buildControls(container);
        updateActive();
    }

    // Rebuilds every group from the engine state (after Shuffle / Reset).
    function rebuild() {
        var container = document.getElementById('postfxContainer');
        if (!container) return;
        container.innerHTML = '';
        groups = [];
        buildControls(container);
        updateActive();
    }

    function updateActive() {
        var el = document.getElementById('postfxActive');
        if (!el) return;
        var on = groups.filter(function(g) { return g.cb.checked; }).map(function(g) { return g.label; });
        el.textContent = on.length ? on.length + ' active: ' + on.join(', ') : 'No FX active';
        el.title = el.textContent;
    }

    function buildControls(container) {
        var fxList = PostProcess.getEffects();
        var cats = PostProcess.getCategories ? PostProcess.getCategories() : [];
        var seen = {};
        cats.forEach(function(c) { seen[c] = true; });
        fxList.forEach(function(fx) { if (!seen[fx.category]) { seen[fx.category] = true; cats.push(fx.category); } });

        cats.forEach(function(cat) {
            var list = fxList.filter(function(fx) { return fx.category === cat; });
            if (!list.length) return;
            var wrap = document.createElement('div');
            wrap.className = 'fx-category';
            wrap.dataset.title = cat;
            list.forEach(function(fx) { wrap.appendChild(buildGroup(fx)); });
            container.appendChild(wrap);
        });
    }

    function buildGroup(fx) {
        var group = document.createElement('div');
        group.className = 'overlay-group';
        var reacts = [];

        var toggleRow = document.createElement('div');
        toggleRow.className = 'overlay-toggle-row';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'pfx_' + fx.name;

        var lbl = document.createElement('label');
        lbl.htmlFor = 'pfx_' + fx.name;
        lbl.textContent = fx.label;

        toggleRow.appendChild(cb);
        toggleRow.appendChild(lbl);

        var paramDiv = document.createElement('div');
        paramDiv.className = 'overlay-params';
        paramDiv.style.display = 'none';

        cb.checked = PostProcess.isEnabled(fx.name);
        paramDiv.style.display = cb.checked ? 'block' : 'none';
        group.classList.toggle('is-on', cb.checked);
        cb.addEventListener('change', function() {
            PostProcess.setEnabled(fx.name, cb.checked);
            paramDiv.style.display = cb.checked ? 'block' : 'none';
            group.classList.toggle('is-on', cb.checked);
            updateActive();
        });

        var auto = null;
        if (typeof ReactUI !== 'undefined' && fx.react && Object.keys(fx.react).length) {
            auto = ReactUI.autoButton(function() { return PostProcess.hasMods(fx.name); }, function(on) {
                if (on) PostProcess.applyReactDefaults(fx.name);
                else PostProcess.clearMods(fx.name);
                reacts.forEach(function(r) { r.refresh(); });
                if (on && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
            });
            toggleRow.appendChild(auto);
        }
        group.appendChild(toggleRow);

        if (fx.hint) {
            var hint = document.createElement('div');
            hint.className = 'fx-hint';
            hint.textContent = fx.hint;
            paramDiv.appendChild(hint);
        }

        for (var key in fx.paramDefs) {
            var r = buildParamRow(paramDiv, fx, key, fx.paramDefs[key], function() { if (auto) auto.sync(); });
            if (r) reacts.push(r);
        }

        group.appendChild(paramDiv);
        groups.push({ cb: cb, label: fx.label });
        return group;
    }

    function buildParamRow(container, fx, paramKey, p, onModChange) {
        var fxName = fx.name;
        var row = document.createElement('div');
        row.className = 'param-row';

        var label = document.createElement('label');
        label.textContent = p.label;
        row.appendChild(label);
        container.appendChild(row);

        if (p.type === 'select') {
            var sel = document.createElement('select');
            (p.options || []).forEach(function(opt, i) {
                var o = document.createElement('option');
                o.value = i;
                o.textContent = opt;
                sel.appendChild(o);
            });
            sel.value = PostProcess.getParam(fxName, paramKey);
            sel.addEventListener('change', function() {
                PostProcess.setParam(fxName, paramKey, parseInt(sel.value, 10));
            });
            row.appendChild(sel);
            return null;
        }

        var wrap = document.createElement('div');
        wrap.className = 'slider-wrap';

        var slider = document.createElement('input');
        slider.type = 'range';
        slider.min = p.min;
        slider.max = p.max;
        slider.step = p.step || 0.01;
        slider.value = PostProcess.getParam(fxName, paramKey);
        slider.dataset.default = String(p.default);
        if (window.UIShell && UIShell.paintRange) UIShell.paintRange(slider);

        var valSpan = document.createElement('span');
        valSpan.className = 'val-display';
        valSpan.textContent = format(slider.value, p);

        slider.addEventListener('input', function() {
            var v = p.type === 'int' ? parseInt(slider.value, 10) : parseFloat(slider.value);
            PostProcess.setParam(fxName, paramKey, v);
            valSpan.textContent = format(v, p);
        });

        wrap.appendChild(slider);
        wrap.appendChild(valSpan);
        row.appendChild(wrap);

        if (typeof ReactUI === 'undefined') return null;
        return ReactUI.attach({
            row: row, wrap: wrap, def: p,
            get: function() { return PostProcess.getMod(fxName, paramKey); },
            set: function(src, amt) { PostProcess.setMod(fxName, paramKey, src, amt); onModChange(); },
            live: function() { return PostProcess.getEffectiveParam(fxName, paramKey); },
            base: function() { return PostProcess.getParam(fxName, paramKey); }
        });
    }

    function format(v, p) {
        v = Number(v);
        if (p.type === 'int') return String(Math.round(v));
        var step = Number(p.step) || 0.01;
        return v.toFixed(step < 0.01 ? 3 : 2);
    }

    return { init: init, rebuild: rebuild };
})();
