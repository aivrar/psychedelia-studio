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
        kick: 3, bass: 3, snare: 2, hat: 1, beat: 2, drop: 1, level: 1, mid: 1, high: 1,
        lfo_beat: 1, lfo_bar: 2, lfo_4bar: 1.5
    };
    // Sources that suit what a setting does: light on hits, colour on bass and
    // slow waves, fine detail on the highs. Anything else uses SOURCE_WEIGHTS.
    var SOURCE_BY_KIND = [
        { pattern: /glow|bright|exposure|intensity|flash|core|lights|gain|opacity|bloom|strength|amount/, weights: { kick: 3, beat: 1, snare: 1.5, level: 1 } },
        { pattern: /satur|hue|colou?r|tint|vivid|contrast|iridescence|temperature|vibrance/, weights: { bass: 2, lfo_bar: 2, lfo_4bar: 1, mid: 1 } },
        { pattern: /width|thick|size|length|amplitude|rays|foam|sparkle|detail|line|grain|count/, weights: { high: 2, hat: 2, mid: 1, snare: 1 } },
        { pattern: /fog|haze|density|warp|distort|turbulence|swirl|wave|blur|spread/, weights: { mid: 2, bass: 1.5, lfo_bar: 1, lfo_beat: 1 } }
    ];
    // Wild reactor links on the main effect: never the camera, view target,
    // fractal formula, iteration counts, clocks or other structural values.
    var WILD_SKIP = /(^|_)(cam|camera|view|horizon|inclination|altitude|perspective|sway|wander|tumble|reach|heading|lensing|height|target|pan|look|fov|zoom|orbit|flight|tilt|roll|yaw|pitch|twist|motion|phase|time|seed|iter|iterations|march|steps|bailout|power|formula|fold|julia|param|order|rule|kill|feed|warmup|depth|distance|dist|offset|translate|shear|scale|radius|constant|slice|inversion|morph|evolve|growth|drift|mode|type|style|symmetry|sides|segments|octaves|terms|layers|resolution|quality|precision)(_|$)|^(c_[xyzw]|seed_[ri]|julia_[xyri]|p_real|p_imag|relax_[ri]|[a-z])$/;
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
    // What the last look used: the next one usually picks something different
    // (not always, or a two-item pool would just alternate).
    var recent = { fx: [], overlays: [] };
    function pickFresh(list, avoid) {
        var fresh = list.filter(function(x) { return avoid.indexOf(x) < 0; });
        return pick(fresh.length && chance(0.8) ? fresh : list);
    }

    // Studio drops and sections never fire for an audio file or PC audio.
    function studioPlaying() {
        return typeof AudioAnalysis !== 'undefined' && AudioAnalysis.getSource && AudioAnalysis.getSource() === 'studio';
    }
    function usableSource(src) { return src === 'drop' && !studioPlaying() ? 'beat' : src; }
    function randomSource(key) {
        var weights = SOURCE_WEIGHTS;
        for (var i = 0; key && i < SOURCE_BY_KIND.length; i++) {
            if (SOURCE_BY_KIND[i].pattern.test(key)) { weights = SOURCE_BY_KIND[i].weights; break; }
        }
        return pickWeighted(weights, studioPlaying() ? null : ['drop']);
    }
    function randomAmount() { return (chance(0.2) ? -1 : 1) * Math.round(rand(0.12, 0.45) * 100) / 100; }

    function numeric(p) { return !!p && (!p.type || p.type === 'float' || p.type === 'int') && p.max > p.min; }
    function stepOf(def) { return def.type === 'select' ? 1 : Number(def.step) || (def.type === 'int' ? 1 : 0); }
    // Uniform over the allowed values. For whole-number and stepped settings
    // every step is equally likely (rounding a uniform float gave the first
    // and last options half the chance of the others).
    function uniformIn(def, low, high) {
        var step = stepOf(def);
        if (!step || !(high > low)) return rand(low, high);
        var n = Math.floor((high - low) / step + 1e-8) + 1;
        return low + Math.floor(Math.random() * n) * step;
    }
    function limitedValue(scope, name, key, def, current) {
        var style = styles[scope], bounds = ShuffleProfiles.bounds(scope, name, key, def, style);
        var v = style === 'gentle' ? uniformIn(def, bounds[0], bounds[1]) : jitter(def, key, current, bounds);
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
    // It stays inside the shuffle bounds: a default outside them (an overlay
    // opacity of 0.8 with a 0.65 cap) used to land on the cap every time, so
    // then the whole allowed range is used instead. Values that would leave
    // the bounds are folded back in rather than piling up on the edge.
    function jitter(def, key, current, bounds) {
        var low = bounds ? bounds[0] : Number(def.min), high = bounds ? bounds[1] : Number(def.max);
        if (def.type === 'select') return uniformIn(def, low, high);
        var min = Number(def.min), max = Number(def.max);
        if (!(max > min)) return current;
        if (!(high > low)) return low;
        var base = def.default !== undefined ? Number(def.default) : current;
        if (!isFinite(base) || base < low || base > high) return uniformIn(def, low, high);
        var span = (max - min) * (GENTLE.test(key) ? 0.12 : 0.38);
        var v = base + (Math.random() * 2 - 1) * span;
        for (var fold = 0; fold < 4 && (v < low || v > high); fold++) v = v < low ? 2 * low - v : 2 * high - v;
        v = Math.max(low, Math.min(high, v));
        var step = stepOf(def);
        if (step) v = min + Math.round((v - min) / step) * step;
        return Math.max(low, Math.min(high, v));
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
                if (amt) PostProcess.setMod(name, k, usableSource(m[0]), amt);
            });
        }
        // Settings that already have a link are not linked again.
        var linked = PostProcess.getMods ? PostProcess.getMods(name) : {};
        var keys = Object.keys(fx.paramDefs).filter(function(k) { return linkable('fx', name, k, fx.paramDefs[k]) && !linked[k]; });
        var n = 1 + (chance(0.4) ? 1 : 0);
        for (var i = 0; i < n && keys.length; i++) {
            var key = pick(keys); keys.splice(keys.indexOf(key), 1);
            var amount = linkAmount('fx', name, key, fx.paramDefs[key], fx.params[key], randomAmount());
            if (amount) PostProcess.setMod(name, key, randomSource(key), amount);
        }
    }

    function shuffleFx() {
        if (typeof PostProcess === 'undefined') return;
        var on = PostProcess.getEffects().filter(function(fx) { return fx.enabled; });
        if (keep.fx) {
            on.forEach(function(fx) { linkFx(fx.name, fx); });
        } else {
            var chosen = [];
            var pools = styles.fx === 'gentle' ? [
                { chance: 1, names: ['color_grade', 'color_wash'] },
                { chance: 0.7, names: ['bloom', 'grain', 'sharpen'] }
            ] : FX_POOLS;
            pools.forEach(function(pool) {
                if (!chance(pool.chance)) return;
                var avail = pool.names.filter(function(n) { return !!PostProcess.getEffect(n) &&
                    !(chosen.indexOf('edge_glow') >= 0 && /bloom|god_rays|anamorphic/.test(n)); });
                if (avail.length) chosen.push(pickFresh(avail, recent.fx));
            });
            if (!chosen.length) chosen.push('color_grade');
            recent.fx = chosen.slice();
            // A trail or echo pass that stays on keeps its picture instead of
            // restarting from black.
            PostProcess.resetAll(on.map(function(fx) { return fx.name; }).filter(function(n) { return chosen.indexOf(n) >= 0; }));
            chosen.forEach(function(name) {
                var fx = PostProcess.getEffect(name);
                if (!fx) return;
                Object.keys(fx.paramDefs).forEach(function(k) {
                    var p = fx.paramDefs[k];
                    var change = !KEEP_DEFAULT.test(k) && (p.type !== 'select' || chance(0.5));
                    if (styles.fx === 'gentle') change = ShuffleProfiles.gentleKeys('fx', name).indexOf(k) >= 0;
                    // Bounds also cover default Mix and categorical modes. Wild
                    // varies Mix a little below its cap instead of always the cap.
                    var v = change ? limitedValue('fx', name, k, p, fx.params[k]) :
                        ShuffleProfiles.value('fx', name, k, p, styles.fx, k === 'mix' && styles.fx === 'wild' ? rand(0.6, 0.8) : fx.params[k]);
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
                    var fixed = m[1];
                    // "Drops (Studio)" never fires for a file or PC audio: use Bar.
                    if (/_sync$/.test(key) && Overlays.syncTypes && Overlays.syncTypes[fixed] === 'drop' && !studioPlaying()) fixed = Overlays.syncTypes.indexOf('bar');
                    Overlays.setParam(key, ShuffleProfiles.value('overlays', def.id, key, p, styles.overlays, fixed));
                }
            } else if (p && styles.overlays === 'wild' && linkable('overlays', def.id, key, p)) {
                var amount = linkAmount('overlays', def.id, key, p, Overlays.getParam(key), m[1]);
                if (amount) Overlays.setMod(key, usableSource(m[0]), amount);
            }
        });
        // Settings that already have a link are not linked again.
        var keys = def.params.filter(function(p) {
            return linkable('overlays', def.id, p.name, p) && !(Overlays.getMod && Overlays.getMod(p.name));
        });
        if (keys.length) {
            var p = pick(keys), amount = linkAmount('overlays', def.id, p.name, p, Overlays.getParam(p.name), randomAmount());
            if (amount) Overlays.setMod(p.name, randomSource(p.name), amount);
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
            var chosen = [], avoidRecent = chance(0.8);
            for (var i = 0; i < count; i++) {
                var avoid = avoidRecent ? chosen.concat(recent.overlays) : chosen;
                var left = Object.keys(weights).filter(function(k) { return avoid.indexOf(k) < 0; });
                chosen.push(pickWeighted(weights, left.length ? avoid : chosen));
            }
            recent.overlays = chosen.slice();
            chosen.forEach(function(id) {
                var def = defs.filter(function(d) { return d.id === id; })[0];
                if (!def) return;
                def.params.forEach(function(p) {
                    if (p.type === 'text' || p.type === 'textarea' || p.type === 'image' || KEEP_DEFAULT.test(p.name)) return;
                    // Vignette and scanlines darken the picture: a bright random
                    // colour would turn them into a coloured wash.
                    if (p.type === 'color') { if (id !== 'vignette' && id !== 'scanlines') Overlays.setParam(p.name, randomColor()); return; }
                    var change = p.type !== 'select' || chance(0.6);
                    if (styles.overlays === 'gentle') change = ShuffleProfiles.gentleKeys('overlays', id).indexOf(p.name) >= 0 || /color_mode|shape|frame_style/.test(p.name);
                    var v = change ? limitedValue('overlays', id, p.name, p, Overlays.getParam(p.name)) :
                        ShuffleProfiles.value('overlays', id, p.name, p, styles.overlays, Overlays.getParam(p.name));
                    Overlays.setParam(p.name, v);
                });
                linkOverlay(def);
                Overlays.setEnabled(id, true);
            });
        }
        refresh('overlays');
    }

    // ------------------------------------------------------------ Global reactions
    function shuffleReactor() {
        if (typeof AudioReactor === 'undefined') return;
        // The on/off switch (V) is the user's: shuffle changes the amounts
        // and links but never switches global reactions back on.
        if (styles.reactor === 'gentle') {
            AudioReactor.applyPreset('off');
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
        // Links on the main effect: looks (light, colour, texture), never the
        // camera, view target, formula or clocks, and each setting only once.
        var params = (AudioReactor.getLinkableParams ? AudioReactor.getLinkableParams() : []).filter(function(p) {
            return !KEEP_DEFAULT.test(p.name) && !NO_LINK.test(p.name) && !WILD_SKIP.test(p.name);
        });
        var values = typeof Controls !== 'undefined' && Controls.getValues ? Controls.getValues() : {};
        for (var i = 0; i < 3; i++) {
            var use = params.length && (i === 0 ? chance(0.6) : chance(0.25));
            if (!use) { AudioReactor.setLink(i, { param: '' }); continue; }
            var p = pick(params); params.splice(params.indexOf(p), 1);
            AudioReactor.setLink(i, { param: p.name, source: randomSource(p.name), amount: reactorAmount(p, values[p.name]) });
        }
        refresh('reactor');
    }

    // A quarter of the range at most, pointed the way the setting has room to
    // move, so a link pulses the value instead of pinning it to an end.
    function reactorAmount(p, base) {
        var span = p.max - p.min;
        base = Number(base);
        if (!isFinite(base)) base = isFinite(Number(p.default)) ? Number(p.default) : p.min;
        var up = (p.max - base) / span, down = (base - p.min) / span;
        var size = Math.min(rand(0.08, 0.25), Math.max(up, down));
        var sign = up >= size && down >= size ? (chance(0.2) ? -1 : 1) : (up >= down ? 1 : -1);
        return Math.round(sign * size * 100) / 100;
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
    // The toggles follow the reactor's own change event (V key, Audio tab,
    // shuffles, loaded setups) instead of polling it.
    var watching = false;
    function watchReactor() {
        if (watching || typeof AudioReactor === 'undefined' || !AudioReactor.onSettingsChange) return;
        watching = true;
        AudioReactor.onSettingsChange(syncGlobalToggles);
    }
    watchReactor();

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
        watchReactor();
        syncGlobalToggles();
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
