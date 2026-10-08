/* Session edit history. Only user edits create entries; animation, audio
 * analysis, automatic shuffles and playback never advance the history. */
var EditHistory = (function() {
    'use strict';
    var undoStack = [], redoStack = [], ready = false, restoring = false;
    var eventToken = null, mergeTarget = null, limit = 80;
    function copy(v) { return JSON.parse(JSON.stringify(v)); }
    function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
    function blocked() {
        return !ready || restoring || Setups.isBusy() || VideoExport.isRecording() || VideoExport.isSaving() || Timeline.isPlaying();
    }
    function capture() {
        var effect = EffectRegistry.getCurrent(), fx = {}, overlays = {};
        PostProcess.getEffects().forEach(function(d) {
            fx[d.name] = { enabled: !!d.enabled, params: d.params, mods: PostProcess.getMods(d.name) };
        });
        Overlays.getDefs().forEach(function(d) {
            var params = {}, mods = {};
            d.params.forEach(function(p) {
                if (p.type !== 'image') params[p.name] = Overlays.getParam(p.name);
                var m = Overlays.getMod(p.name); if (m) mods[p.name] = m;
            });
            overlays[d.id] = { enabled: !!Overlays.isEnabled(d.id), params: params, mods: mods };
        });
        // The rotation angle, animation clock and music playhead are live
        // transport state. Capturing them would manufacture edits every frame.
        var file = AudioAnalysis.getFileStatus();
        return copy({ effect: effect.name, values: Controls.getBaseValues(), seed: Renderer.getSeed(), seedVec: Renderer.getSeedVec(),
            motion: { speed: Renderer.getAnimSpeed(), spin: Renderer.getRotationSpeed(), zoom: Renderer.getViewZoom(),
                zoomSpeed: Renderer.getViewZoomSpeed(), zoomDepth: Renderer.getViewZoomDepth() },
            reactor: AudioReactor.getConfiguration(), music: Music.getSettings(), fx: fx, overlays: overlays,
            file: { gain: file.gain, loop: file.loop },
            shuffle: Looks.getConfiguration(),
            auto: { fx: Looks.getAuto('fx'), overlays: Looks.getAuto('overlays'), reactor: Looks.getAuto('reactor') } });
    }
    function updateButtons() {
        [['btnUndo', undoStack, 'Undo'], ['btnRedo', redoStack, 'Redo']].forEach(function(row) {
            var button = document.getElementById(row[0]); if (!button) return;
            button.disabled = blocked() || !row[1].length;
            button.title = row[2] + (row[1].length ? ': ' + row[1][row[1].length - 1].label : '') +
                (row[2] === 'Undo' ? ' (Ctrl+Z)' : ' (Ctrl+Y / Ctrl+Shift+Z)');
        });
    }
    function begin(label) {
        if (blocked() || eventToken) return null;
        return { before: capture(), label: label || 'Change settings' };
    }
    function end(token, target) {
        if (!token || blocked()) return;
        var after = capture();
        // Record the angle only for an explicit Motion Reset. Ordinary edits
        // must not rewind the continuously advancing rotation on undo.
        if (typeof token.before.motion.rotation === 'number') after.motion.rotation = Renderer.getRotation();
        if (same(token.before, after)) return;
        var last = undoStack[undoStack.length - 1];
        if (target && target === mergeTarget && last && last.target === target) {
            last.after = after;
            if (same(last.before, after)) undoStack.pop();
        } else {
            undoStack.push({ before: token.before, after: after, label: token.label, target: target || null });
            if (undoStack.length > limit) undoStack.shift();
        }
        mergeTarget = target || null; redoStack = []; updateButtons();
    }
    // Apply only properties changed by this edit, retaining unrelated live or
    // automatic changes made since. Effect changes restore the entire scene.
    function changed(from, to, fn) {
        Object.keys(to).forEach(function(k) { if (!same(from[k], to[k])) fn(k, to[k]); });
    }
    function apply(from, to) {
        var switched = from.effect !== to.effect || EffectRegistry.getCurrent().name !== to.effect;
        if (switched) {
            if (!EffectRegistry.switchTo(to.effect, { values: to.values, skipFallback: true })) throw new Error('The effect could not be restored.');
        } else {
            var values = {};
            changed(from.values, to.values, function(k, v) { values[k] = v; });
            Controls.setValues(values);
        }
        Controls.syncPresetSelection();
        if (switched || from.seed !== to.seed || !same(from.seedVec, to.seedVec)) Renderer.setSeed(to.seed, to.seedVec);
        var motion = { speed: ['setAnimSpeed', 'animSpeed'], spin: ['setRotationSpeed', 'rotSpeed'], rotation: ['setRotation', null],
            zoom: ['setViewZoom', 'viewZoom'], zoomSpeed: ['setViewZoomSpeed', 'viewZoomSpeed'], zoomDepth: ['setViewZoomDepth', 'viewZoomDepth'] };
        changed(from.motion, to.motion, function(k, v) {
            Renderer[motion[k][0]](v);
            var input = motion[k][1] ? document.getElementById(motion[k][1]) : null;
            if (input) { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        if (!same(from.reactor, to.reactor)) {
            var config = AudioReactor.getConfiguration();
            changed(from.reactor.settings, to.reactor.settings, function(k, v) { config.settings[k] = v; });
            changed(from.reactor.effectLinks, to.reactor.effectLinks, function(k, v) { config.effectLinks[k] = v; });
            AudioReactor.setConfiguration(config);
        }
        if (!same(from.music, to.music)) {
            var musicPatch = {};
            changed(from.music, to.music, function(k, v) { musicPatch[k] = v; });
            Music.setSettings(musicPatch);
        }
        if (from.file.gain !== to.file.gain) AudioAnalysis.setFileGain(to.file.gain);
        if (from.file.loop !== to.file.loop) AudioAnalysis.setFileLoop(to.file.loop);
        changed(from.fx, to.fx, function(name, row) {
            changed(from.fx[name].params, row.params, function(k, v) { PostProcess.setParam(name, k, v); });
            if (!same(from.fx[name].mods, row.mods)) {
                PostProcess.clearMods(name);
                Object.keys(row.mods).forEach(function(k) { var m = row.mods[k]; PostProcess.setMod(name, k, m.src, m.amt); });
            }
            if (from.fx[name].enabled !== row.enabled) PostProcess.setEnabled(name, row.enabled);
        });
        changed(from.overlays, to.overlays, function(id, row) {
            changed(from.overlays[id].params, row.params, function(k, v) { Overlays.setParam(k, v); });
            if (!same(from.overlays[id].mods, row.mods)) {
                Overlays.clearMods(id);
                Object.keys(row.mods).forEach(function(k) { var m = row.mods[k]; Overlays.setMod(k, m.src, m.amt); });
            }
            if (from.overlays[id].enabled !== row.enabled) Overlays.setEnabled(id, row.enabled);
        });
        changed(from.auto, to.auto, function(k, v) { Looks.setAuto(k, v); });
        if (!same(from.shuffle, to.shuffle)) Looks.setConfiguration(to.shuffle);
        MusicControls.refresh(); PostProcessControls.rebuild(); OverlayControls.rebuild(); UIShell.initCollapsibles();
    }
    function travel(backwards) {
        if (eventToken) flushEvent();
        if (blocked()) return false;
        var source = backwards ? undoStack : redoStack, dest = backwards ? redoStack : undoStack;
        var entry = source[source.length - 1]; if (!entry) return false;
        restoring = true; mergeTarget = null;
        try {
            EffectRegistry.cancelPendingSwitch();
            apply(backwards ? entry.after : entry.before, backwards ? entry.before : entry.after);
            source.pop(); dest.push(entry); return true;
        } catch (error) {
            if (window.PsychedeliaNotify) window.PsychedeliaNotify('Could not restore this edit: ' + error.message, 'error');
            return false;
        } finally { restoring = false; updateButtons(); }
    }
    function clear() { undoStack = []; redoStack = []; eventToken = null; mergeTarget = null; updateButtons(); }
    function textField(target) {
        return target && (target.isContentEditable || target.tagName === 'TEXTAREA' ||
            (target.tagName === 'INPUT' && ['text', 'search', 'url', 'email', 'password', 'number'].indexOf(target.type) >= 0));
    }
    function flushEvent() {
        var token = eventToken; eventToken = null;
        if (token) end(token, token.target);
    }
    function observe(event) {
        if (blocked() || eventToken) return;
        var target = event.target;
        if (!target || !target.closest || target.closest('#btnUndo, #btnRedo, #setupLoad') || target.type === 'file') return;
        if (event.type === 'keydown') {
            if (event.ctrlKey || event.metaKey || event.altKey || textField(target) || !/^(n|b|x|v|\[|\]|ArrowLeft|ArrowRight)$/i.test(event.key)) return;
        } else if (!target.closest('input, select, textarea, button, .react-chip')) return;
        var button = target.closest('button');
        var row = target.closest('.param-row'), caption = row && row.querySelector('label');
        var label = button ? (button.getAttribute('aria-label') || button.textContent || button.title).trim() :
            'Change ' + (target.getAttribute('aria-label') || (caption && caption.textContent) || 'settings');
        var token = begin(label); if (!token) return;
        if (target.closest('#motionReset')) token.before.motion.rotation = Renderer.getRotation();
        token.target = (event.type === 'input' || event.type === 'change') && /^(INPUT|TEXTAREA)$/.test(target.tagName) ? target : null;
        eventToken = token;
        queueMicrotask(function() { if (eventToken === token) flushEvent(); });
    }
    function init() {
        if (ready) return;
        ready = true;
        document.getElementById('btnUndo').addEventListener('click', function() { travel(true); });
        document.getElementById('btnRedo').addEventListener('click', function() { travel(false); });
        document.addEventListener('keydown', function(e) {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || textField(e.target)) return;
            var key = e.key.toLowerCase();
            if (key !== 'z' && key !== 'y') return;
            e.preventDefault(); e.stopImmediatePropagation(); travel(key === 'z' && !e.shiftKey);
        }, true);
        ['input', 'change', 'click', 'dblclick', 'keydown'].forEach(function(type) { document.addEventListener(type, observe, true); });
        ['pointerup', 'focusout', 'change'].forEach(function(type) {
            document.addEventListener(type, function() { queueMicrotask(function() { mergeTarget = null; }); });
        });
        window.setInterval(updateButtons, 250); updateButtons();
    }
    return { init: init, begin: begin, end: end, clear: clear, undo: function() { return travel(true); }, redo: function() { return travel(false); },
        getState: function() { return { ready: ready, undo: undoStack.length, redo: redoStack.length, blocked: blocked() }; } };
})();
