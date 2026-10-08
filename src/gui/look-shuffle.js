/* Psychedelia Studio - Shuffle and Reset for FX, overlays and Beat Reactor
 * Shuffle rolls a random "look": a few effects with tasteful random settings
 * and random Beat Reactor links. Reset puts a scope back to factory state.
 * Auto-shuffle re-rolls every N bars (or on each new song section) using the
 * Beat Reactor's beat clock, or the studio tempo when no audio is playing.
 * Scopes: 'fx', 'overlays', 'reactor' (global reactions + parameter links).
 */
var Looks = (function() {
    'use strict';

    var auto = { fx: 'off', overlays: 'off', reactor: 'off' };
    var keep = { fx: false, overlays: false };
    var styles = { fx: 'gentle', overlays: 'gentle', reactor: 'gentle' };
    var autoState = {};
    var listeners = [];

    // Effect pools: one pass from each, so a look stays readable.
    var FX_POOLS = [
        { chance: 0.85, names: ['mirror', 'droste', 'swirl', 'wave', 'fisheye', 'shockwave', 'zoom_blur', 'trails', 'pixelate', 'heat_haze', 'rgb_echo', 'slit_scan', 'datamosh'] },
        { chance: 0.6, names: ['color_wash', 'palette_map', 'color_grade', 'posterize', 'edge_glow', 'halftone', 'led_wall', 'oil_paint', 'relief', 'holo_foil', 'vision', 'pixel_sort', 'stained_glass', 'watercolour'] },
        { chance: 0.7, names: ['bloom', 'chromatic', 'glitch', 'vhs', 'crt', 'grain', 'tilt_shift', 'god_rays', 'anamorphic', 'dither', 'ascii'] }
    ];
    // Overlay weights. Strobe is left out on purpose: random fast flashing is unpleasant.
    var OVERLAY_WEIGHTS = {
        lasers: 1, spotlights: 1, lightning: 0.7, figures: 1, rings: 1, frame: 0.6,
        particles: 1, vignette: 0.5, scanlines: 0.35, spectrum: 0.6, fireworks: 0.8, plexus: 1,
        laser_room: 0.9, bokeh: 0.8, matrix: 0.5, hexgrid: 0.9, sacred: 0.8, cinematic: 0.3
    };
    var SOURCE_WEIGHTS = {
        kick: 3, bass: 3, snare: 2, hat: 1, beat: 2, drop: 1, level: 1,
        lfo_beat: 1, lfo_bar: 2, lfo_4bar: 1.5
    };
    // Settings left at their defaults when shuffling (layout or plumbing, not looks).
    var KEEP_DEFAULT = /center|interval|quality|sync|seed|^mix$|_mix$|fps|text_|_x$|_y$|strobe_|every|blend_original|probability/;
    // Settings that scale time inside a shader: modulating them makes the image
    // jump instead of pulse, so random links skip them.
    var NO_LINK = /speed|spin|rotation|rate|cycle|shimmer/;
    var GENTLE = /invert|brightness|gamma|contrast|tint|temperature|vibrance|opacity|flash|threshold/;

    function rand(a, b) { return a + Math.random() * (b - a); }
    function chance(p) { return Math.random() < p; }
    function pickWeighted(weights, exclude) {
        var keys = Object.keys(weights).filter(function(k) { return !exclude || exclude.indexOf(k) < 0; });
        var total = keys.reduce(function(s, k) { return s + weights[k]; }, 0);
        var r = Math.random() * total;
        for (var i = 0; i < keys.length; i++) { r -= weights[keys[i]]; if (r <= 0) return keys[i]; }
        return keys[keys.length - 1];
    }
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

    function randomSource() { return pickWeighted(SOURCE_WEIGHTS); }
    function randomAmount() { return (chance(0.2) ? -1 : 1) * Math.round(rand(0.12, 0.45) * 100) / 100; }

    function numeric(p) { return !!p && (!p.type || p.type === 'float' || p.type === 'int') && p.max > p.min; }
    function limitedValue(scope, name, key, def, current) {
        var style = styles[scope], bounds = ShuffleProfiles.bounds(scope, name, key, def, style);
        var v = style === 'gentle' ? rand(bounds[0], bounds[1]) : jitter(def, key, current);
        return ShuffleProfiles.value(scope, name, key, def, style, v);
    }
    function linkAmount(scope, name, key, def, base, amount) {
        return ShuffleProfiles.amount(scope, name, key, def, styles[scope], base, amount);
    }
    function linkable(scope, name, key, def) {
        if (!numeric(def) || KEEP_DEFAULT.test(key) || NO_LINK.test(key)) return false;
        if (styles[scope] !== 'gentle') return true;
        // Preserve scene moves light/colour/opacity, never geometry or clocks.
        return ShuffleProfiles.gentleKeys(scope, name).indexOf(key) >= 0 &&
            /brightness|saturation|hue_shift|temperature|tint|vibrance|opacity|glow|intensity|strength/.test(key);
    }

    // A nearby random value: stays recognisable instead of jumping to extremes.
    function jitter(def, key, current) {
        if (def.type === 'select') return Math.floor(Math.random() * (def.options || [0]).length);
        var min = Number(def.min), max = Number(def.max);
        if (!(max > min)) return current;
        var base = def.default !== undefined ? Number(def.default) : current;
        var span = (max - min) * (GENTLE.test(key) ? 0.12 : 0.38);
        var v = Math.max(min, Math.min(max, base + (Math.random() * 2 - 1) * span));
        if (def.type === 'int') v = Math.round(v);
        else if (def.step) v = Math.round(v / def.step) * def.step;
        return v;
    }

    function randomColor() {
        var h = Math.random(), s = rand(0.6, 1), l = rand(0.5, 0.65);
        var a = s * Math.min(l, 1 - l);
        function f(n) { var k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
        return [f(0), f(8), f(4)];
    }

    // ------------------------------------------------------------ FX
    function linkFx(name, fx) {
        PostProcess.clearMods(name);
        if (styles.fx === 'wild' && fx.react && chance(0.7)) {
            Object.keys(fx.react).forEach(function(k) {
                if (!linkable('fx', name, k, fx.paramDefs[k])) return;
                var m = fx.react[k], amt = linkAmount('fx', name, k, fx.paramDefs[k], fx.params[k], m[1]);
                if (amt) PostProcess.setMod(name, k, m[0], amt);
            });
        }
        var keys = Object.keys(fx.paramDefs).filter(function(k) { return linkable('fx', name, k, fx.paramDefs[k]); });
        var n = 1 + (chance(0.4) ? 1 : 0);
        for (var i = 0; i < n && keys.length; i++) {
            var key = pick(keys); keys.splice(keys.indexOf(key), 1);
            var amount = linkAmount('fx', name, key, fx.paramDefs[key], fx.params[key], randomAmount());
            if (amount) PostProcess.setMod(name, key, randomSource(), amount);
        }
    }

    function shuffleFx() {
        if (typeof PostProcess === 'undefined') return;
        var on = PostProcess.getEffects().filter(function(fx) { return fx.enabled; });
        if (keep.fx) {
            on.forEach(function(fx) { linkFx(fx.name, fx); });
        } else {
            PostProcess.resetAll();
            var chosen = [];
            var pools = styles.fx === 'gentle' ? [
                { chance: 1, names: ['color_grade', 'color_wash'] },
                { chance: 0.7, names: ['bloom', 'grain', 'sharpen'] }
            ] : FX_POOLS;
            pools.forEach(function(pool) {
                if (!chance(pool.chance)) return;
                var avail = pool.names.filter(function(n) { return !!PostProcess.getEffect(n) &&
                    !(chosen.indexOf('edge_glow') >= 0 && /bloom|god_rays|anamorphic/.test(n)); });
                if (avail.length) chosen.push(pick(avail));
            });
            if (!chosen.length) chosen.push('color_grade');
            chosen.forEach(function(name) {
                var fx = PostProcess.getEffect(name);
                if (!fx) return;
                Object.keys(fx.paramDefs).forEach(function(k) {
                    var p = fx.paramDefs[k];
                    var change = !KEEP_DEFAULT.test(k) && (p.type !== 'select' || chance(0.5));
                    if (styles.fx === 'gentle') change = ShuffleProfiles.gentleKeys('fx', name).indexOf(k) >= 0;
                    // Bounds also cover default Mix and categorical modes.
                    var v = change ? limitedValue('fx', name, k, p, fx.params[k]) :
                        ShuffleProfiles.value('fx', name, k, p, styles.fx, fx.params[k]);
                    PostProcess.setParam(name, k, v);
                });
                linkFx(name, fx);
                PostProcess.setEnabled(name, true);
            });
        }
        refresh('fx');
    }

    // ------------------------------------------------------------ Overlays
    function linkOverlay(def) {
        Overlays.clearMods(def.id);
        if (def.react && chance(0.75)) Object.keys(def.react).forEach(function(key) {
            var m = def.react[key], p = def.params.filter(function(p) { return p.name === key; })[0];
            if (m[0] === '=') {
                if (!keep.overlays && p && (styles.overlays === 'wild' || /_sync$/.test(key))) {
                    Overlays.setParam(key, ShuffleProfiles.value('overlays', def.id, key, p, styles.overlays, m[1]));
                }
            } else if (p && styles.overlays === 'wild' && linkable('overlays', def.id, key, p)) {
                var amount = linkAmount('overlays', def.id, key, p, Overlays.getParam(key), m[1]);
                if (amount) Overlays.setMod(key, m[0], amount);
            }
        });
        var keys = def.params.filter(function(p) {
            return linkable('overlays', def.id, p.name, p);
        });
        if (keys.length) {
            var p = pick(keys), amount = linkAmount('overlays', def.id, p.name, p, Overlays.getParam(p.name), randomAmount());
            if (amount) Overlays.setMod(p.name, randomSource(), amount);
        }
    }

    function shuffleOverlays() {
        if (typeof Overlays === 'undefined') return;
        var defs = Overlays.getDefs();
        var on = defs.filter(function(d) { return Overlays.isEnabled(d.id); });
        if (keep.overlays) {
            on.forEach(linkOverlay);
        } else {
            Overlays.resetAll();
            var count = styles.overlays === 'gentle' ? (chance(0.65) ? 1 : 2) : (chance(0.45) ? 1 : (chance(0.7) ? 2 : 3));
            var weights = styles.overlays === 'gentle' ? { particles: 1, rings: 1, frame: 0.6, vignette: 0.4, bokeh: 0.8, spectrum: 0.6 } : OVERLAY_WEIGHTS;
            var chosen = [];
            for (var i = 0; i < count; i++) chosen.push(pickWeighted(weights, chosen));
            chosen.forEach(function(id) {
                var def = defs.filter(function(d) { return d.id === id; })[0];
                if (!def) return;
                def.params.forEach(function(p) {
                    if (p.type === 'text' || p.type === 'textarea' || p.type === 'image' || KEEP_DEFAULT.test(p.name)) return;
                    if (p.type === 'color') { if (id !== 'vignette') Overlays.setParam(p.name, randomColor()); return; }
                    var change = p.type !== 'select' || chance(0.6);
                    if (styles.overlays === 'gentle') change = ShuffleProfiles.gentleKeys('overlays', id).indexOf(p.name) >= 0 || /color_mode|shape|frame_style/.test(p.name);
                    var v = change ? limitedValue('overlays', id, p.name, p, Overlays.getParam(p.name)) :
                        ShuffleProfiles.value('overlays', id, p.name, p, styles.overlays, Overlays.getParam(p.name));
                    Overlays.setParam(p.name, v);
                });
                if (id === 'lightning') Overlays.setParam('bolt_flash', Math.min(Overlays.getParam('bolt_flash'), 0.15));
                linkOverlay(def);
                Overlays.setEnabled(id, true);
            });
        }
        refresh('overlays');
    }

    // ------------------------------------------------------------ Global reactions
    function shuffleReactor() {
        if (typeof AudioReactor === 'undefined') return;
        if (styles.reactor === 'gentle') {
            AudioReactor.applyPreset('off'); AudioReactor.set('enabled', true);
            AudioReactor.set('speed', rand(0.08, 0.2)); AudioReactor.set('pump', rand(0.04, 0.14));
            AudioReactor.set('hue', rand(0, 0.08));
            AudioReactor.suggestLinks(); refresh('reactor'); return;
        }
        var plan = {
            zoom: [0.8, 0.1, 0.6], rotate: [0.4, 0.1, 0.6], speed: [0.6, 0.1, 0.6], flash: [0.5, 0.05, 0.35],
            hue: [0.4, 0.2, 0.8], chroma: [0.5, 0.1, 0.6], pump: [0.6, 0.1, 0.6], shake: [0.15, 0.1, 0.4]
        };
        var any = false;
        Object.keys(plan).forEach(function(k) {
            var p = plan[k];
            var v = chance(p[0]) ? Math.round(rand(p[1], p[2]) * 100) / 100 : 0;
            if (v) any = true;
            AudioReactor.set(k, v);
        });
        if (!any) AudioReactor.set('zoom', 0.35);
        AudioReactor.set('enabled', true);
        var params = AudioReactor.getLinkableParams ? AudioReactor.getLinkableParams() : [];
        for (var i = 0; i < 3; i++) {
            var use = params.length && i === 0 ? chance(0.6) : params.length && chance(0.25);
            AudioReactor.setLink(i, use ? { param: pick(params).name, source: randomSource(), amount: randomAmount() } : { param: '' });
        }
        refresh('reactor');
    }

    // ------------------------------------------------------------ Public
    function shuffle(scope) {
        if (scope === 'fx') shuffleFx();
        else if (scope === 'overlays') shuffleOverlays();
        else if (scope === 'reactor') shuffleReactor();
        else { shuffleFx(); shuffleOverlays(); }
    }

    function reset(scope) {
        if ((scope === 'fx' || scope === 'all') && typeof PostProcess !== 'undefined') { PostProcess.resetAll(); refresh('fx'); }
        if ((scope === 'overlays' || scope === 'all') && typeof Overlays !== 'undefined') { Overlays.resetAll(); refresh('overlays'); }
        if ((scope === 'reactor' || scope === 'all') && typeof AudioReactor !== 'undefined') { AudioReactor.resetAll(); refresh('reactor'); }
        if (scope === 'all') { auto.fx = auto.overlays = auto.reactor = 'off'; syncToolbars(); }
    }

    function refresh(scope) {
        if (scope === 'fx' && typeof PostProcessControls !== 'undefined' && PostProcessControls.rebuild) PostProcessControls.rebuild();
        if (scope === 'overlays' && typeof OverlayControls !== 'undefined' && OverlayControls.rebuild) OverlayControls.rebuild();
        if (scope === 'reactor' && typeof MusicControls !== 'undefined' && MusicControls.refreshReactor) MusicControls.refreshReactor();
        listeners.forEach(function(fn) { try { fn(scope); } catch (err) { /* noop */ } });
    }

    // ------------------------------------------------------------ Auto-shuffle
    var AUTO_OPTIONS = [
        ['off', 'Auto-shuffle: off'], ['4', 'Every 4 bars'], ['8', 'Every 8 bars'],
        ['16', 'Every 16 bars'], ['section', 'Each section (Studio) / 16 bars']
    ];

    function setAuto(scope, mode) {
        if (!Object.prototype.hasOwnProperty.call(auto, scope) || !AUTO_OPTIONS.some(function(row) { return row[0] === mode; })) return false;
        auto[scope] = mode;
        autoState[scope] = null;
        syncToolbars();
        return true;
    }

    // One shared beat clock for live preview and frame-by-frame export. It
    // already follows Studio, detected/locked file tempo, or silent Studio BPM.
    // Switching signal/seek/export establishes a fresh bar-aligned schedule.
    function tick() {
        if (typeof AudioReactor === 'undefined' || !AudioReactor.getBeatClock) return;
        var beat = AudioReactor.getBeatClock();
        if (!isFinite(beat)) return;
        var state = AudioReactor.getState(), analysis = AudioReactor.getAnalysis() || {};
        var offline = typeof VideoExport !== 'undefined' && VideoExport.isFrameExport && VideoExport.isFrameExport();
        var key = [state.source, analysis.signalVersion || 0, !!offline].join(':');
        ['fx', 'overlays', 'reactor'].forEach(function(scope) {
            var mode = auto[scope];
            if (mode === 'off') return;
            var section = mode === 'section' && state.studioSync;
            var kind = section ? 'section' : 'bars', period = (mode === 'section' ? 16 : Number(mode)) * 4;
            var count = section ? AudioReactor.getTrigger('drop').count : 0;
            var s = autoState[scope], due = false;
            if (!s || s.key !== key || s.kind !== kind || beat < s.last - 0.001 || count < s.count) {
                autoState[scope] = { key: key, kind: kind, last: beat, count: count,
                    next: (Math.floor(beat / 4) + period / 4) * 4 };
                return;
            }
            s.last = beat;
            if (section) {
                due = count > s.count; s.count = count;
            } else {
                due = beat + 1e-8 >= s.next;
                // A delayed frame rolls once and retains the musical grid;
                // never burst through a queue of missed looks or drift late.
                if (due) s.next += (Math.floor((Math.max(0, beat - s.next) + 1e-8) / period) + 1) * period;
            }
            if (due) shuffle(scope);
        });
    }
    window.setInterval(syncGlobalToggles, 150);

    function setStyle(scope, style) {
        if (!Object.prototype.hasOwnProperty.call(styles, scope) || ['gentle', 'wild'].indexOf(style) < 0) return false;
        styles[scope] = style; syncToolbars(); return true;
    }
    function setKeep(scope, on) {
        if (!Object.prototype.hasOwnProperty.call(keep, scope)) return false;
        keep[scope] = !!on; syncToolbars(); return true;
    }
    function getConfiguration() { return { styles: Object.assign({}, styles), keep: Object.assign({}, keep) }; }
    function setConfiguration(config) {
        config = config || {};
        Object.keys(styles).forEach(function(scope) { setStyle(scope, config.styles && config.styles[scope] === 'wild' ? 'wild' : 'gentle'); });
        Object.keys(keep).forEach(function(scope) { setKeep(scope, config.keep && config.keep[scope]); });
    }

    // ------------------------------------------------------------ Global reactions switch
    var globalToggles = [];

    function globalOn() {
        return typeof AudioReactor !== 'undefined' && AudioReactor.getSettings().enabled;
    }

    function setGlobal(on) {
        if (typeof AudioReactor === 'undefined') return;
        AudioReactor.set('enabled', !!on);
        syncGlobalToggles();
    }

    function toggleGlobal() { setGlobal(!globalOn()); return globalOn(); }

    function syncGlobalToggles() {
        if (typeof AudioReactor === 'undefined') return;
        var on = globalOn();
        var style = AudioReactor.presetName ? AudioReactor.presetName() : 'custom';
        var label = style.charAt(0).toUpperCase() + style.slice(1);
        globalToggles.forEach(function(t) {
            if (t.cb.checked !== on) t.cb.checked = on;
            var txt = on ? 'on, style: ' + label : 'off';
            if (t.state.textContent !== txt) t.state.textContent = txt;
        });
        var audioCb = document.getElementById('reactorEnabled');
        if (audioCb && audioCb.checked !== on) audioCb.checked = on;
    }

    function globalToggle() {
        var row = document.createElement('label');
        row.className = 'looks-global';
        row.title = 'The Beat Reactor global style (Audio tab) moves every effect with the music. ' +
            'Turn it off to keep effect beat controls and your own links active (V)';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = globalOn();
        cb.addEventListener('change', function() { setGlobal(this.checked); });
        var name = document.createElement('span');
        name.className = 'looks-global-name';
        name.textContent = 'Global beat reactions';
        var state = document.createElement('span');
        state.className = 'looks-global-state';
        row.appendChild(cb);
        row.appendChild(name);
        row.appendChild(state);
        globalToggles.push({ cb: cb, state: state });
        return row;
    }

    // ------------------------------------------------------------ Toolbar
    var toolbars = [];

    function toolbar(scope) {
        var bar = document.createElement('div');
        bar.className = 'looks-bar';
        bar.dataset.scope = scope;
        var shuffleBtn = document.createElement('button');
        shuffleBtn.type = 'button';
        shuffleBtn.className = 'sm-btn looks-shuffle';
        shuffleBtn.innerHTML = '&#127922; Shuffle';
        shuffleBtn.title = scope === 'reactor' ?
            'Random global reactions and parameter links (B)' :
            'Random ' + (scope === 'fx' ? 'FX' : 'overlays') + ' with random Beat Reactor links. Press again for another (B)';
        shuffleBtn.addEventListener('click', function() { shuffle(scope); });

        var resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'sm-btn looks-reset';
        resetBtn.innerHTML = '&#8634; Reset';
        resetBtn.title = scope === 'reactor' ? 'Global style back to Club, parameter links removed' :
            'Turn every ' + (scope === 'fx' ? 'FX' : 'overlay') + ' off and back to its default settings, links removed';
        resetBtn.addEventListener('click', function() { setAuto(scope, 'off'); reset(scope); });

        var autoSel = document.createElement('select');
        autoSel.className = 'looks-auto';
        autoSel.setAttribute('aria-label', scope + ' auto-shuffle interval');
        autoSel.title = '4 beats per bar. Follows detected or locked tempo, otherwise Studio BPM. Each new section uses Studio sections; other sources use 16 bars.';
        AUTO_OPTIONS.forEach(function(o) {
            var opt = document.createElement('option');
            opt.value = o[0];
            opt.textContent = o[1];
            autoSel.appendChild(opt);
        });
        autoSel.value = auto[scope];
        autoSel.addEventListener('change', function() { setAuto(scope, this.value); });

        if (scope !== 'reactor') bar.appendChild(globalToggle());
        bar.appendChild(shuffleBtn);
        bar.appendChild(resetBtn);
        var styleSel = document.createElement('select');
        styleSel.className = 'looks-style';
        styleSel.setAttribute('aria-label', scope + ' shuffle style');
        [['gentle', 'Preserve scene'], ['wild', 'Wild — full effects']].forEach(function(row) {
            var option = document.createElement('option'); option.value = row[0]; option.textContent = row[1]; styleSel.appendChild(option);
        });
        styleSel.value = styles[scope];
        styleSel.addEventListener('change', function() { setStyle(scope, this.value); });
        bar.appendChild(styleSel);
        bar.appendChild(autoSel);
        var hint = document.createElement('div'); hint.className = 'looks-hint'; bar.appendChild(hint);

        var keepCb = null;
        if (scope !== 'reactor') {
            var keepRow = document.createElement('label');
            keepRow.className = 'looks-keep';
            keepRow.title = 'Shuffle only the Beat Reactor links of the effects that are already on';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = keep[scope];
            keepCb = cb;
            cb.addEventListener('change', function() { setKeep(scope, this.checked); });
            keepRow.appendChild(cb);
            keepRow.appendChild(document.createTextNode(' Keep my ' + (scope === 'fx' ? 'FX' : 'overlays') + ', shuffle links only'));
            bar.appendChild(keepRow);

            // Long lists: show only what is switched on.
            var onlyRow = document.createElement('label');
            onlyRow.className = 'looks-keep';
            onlyRow.title = 'Hide everything that is switched off';
            var onlyCb = document.createElement('input');
            onlyCb.type = 'checkbox';
            onlyCb.addEventListener('change', function() {
                var box = document.getElementById(scope === 'fx' ? 'postfxContainer' : 'overlayContainer');
                if (box) box.classList.toggle('only-active', this.checked);
            });
            onlyRow.appendChild(onlyCb);
            onlyRow.appendChild(document.createTextNode(' Show only active ' + (scope === 'fx' ? 'FX' : 'overlays')));
            bar.appendChild(onlyRow);
        }
        toolbars.push({ scope: scope, sel: autoSel, style: styleSel, hint: hint, keep: keepCb });
        syncToolbars();
        return bar;
    }

    function syncToolbars() {
        toolbars.forEach(function(t) {
            t.sel.value = auto[t.scope]; t.style.value = styles[t.scope];
            if (t.keep) t.keep.checked = keep[t.scope];
            var wild = t.scope === 'fx' ? 'Full twists, mirrors and bold styles, with limits on washout.' :
                (t.scope === 'overlays' ? 'Full overlay variety, with limits on coverage and brightness.' : 'Full movement, colour and beat links.');
            t.hint.textContent = styles[t.scope] === 'wild' ? wild + ' Applies to Shuffle and Auto.' :
                (keep[t.scope] ? 'Gentle light and colour links only. Your current effects and settings stay as they are.' :
                    (t.scope === 'reactor' ? 'Gentle colour and time surge. Applies to Shuffle and Auto.' :
                        'Light, colour and sparse accents for Shuffle and Auto. Global beat motion is controlled above.'));
        });
    }

    return {
        shuffle: shuffle,
        reset: reset,
        setAuto: setAuto,
        getAuto: function(scope) { return auto[scope]; },
        update: tick,
        setStyle: setStyle,
        getStyle: function(scope) { return styles[scope]; },
        setKeep: setKeep,
        getConfiguration: getConfiguration,
        setConfiguration: setConfiguration,
        toolbar: toolbar,
        setGlobal: setGlobal,
        toggleGlobal: toggleGlobal,
        onChange: function(fn) { if (typeof fn === 'function') listeners.push(fn); }
    };
})();
