/* Complete local setups. Assets live in IndexedDB; settings never resume sound
 * or screen capture automatically. Debounced autosave also catches API edits. */
var Setups = (function() {
    'use strict';
    var database = null, initialized = false, busy = false, lastSnapshot = '', timer = null;
    var assetKeys = new WeakMap(), assetPromises = new WeakMap(), entries = [];
    var selected = '', limits = { named: 50, name: 80 };
    function el(id) { return document.getElementById(id); }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function blocked() { return busy || (typeof VideoExport !== 'undefined' && (VideoExport.isRecording() || VideoExport.isSaving())); }
    function report(message, error) {
        var out = el('setupStatus'); if (out) out.textContent = message;
        if (error && window.PsychedeliaNotify) window.PsychedeliaNotify(message, 'error');
    }
    function open() {
        return new Promise(function(resolve, reject) {
            var request = indexedDB.open('psychedelia.setups.v1', 1);
            request.onupgradeneeded = function() {
                request.result.createObjectStore('setups', { keyPath: 'id' });
                request.result.createObjectStore('assets');
            };
            request.onsuccess = function() { database = request.result; resolve(database); };
            request.onerror = function() { reject(request.error); };
            request.onblocked = function() { reject(new Error('Close other Psychedelia tabs to enable setup storage.')); };
        });
    }
    function read(store, key) {
        return new Promise(function(resolve, reject) {
            var request = database.transaction(store).objectStore(store).get(key);
            request.onsuccess = function() { resolve(request.result); };
            request.onerror = function() { reject(request.error); };
        });
    }
    function write(store, value, key, remove) {
        return new Promise(function(resolve, reject) {
            var tx = database.transaction(store, 'readwrite'), target = tx.objectStore(store);
            if (remove) target.delete(key);
            else if (key === undefined) target.put(value);
            else target.put(value, key);
            tx.oncomplete = function() { resolve(true); };
            tx.onerror = tx.onabort = function() { reject(tx.error || new Error('Setup storage failed.')); };
        });
    }
    function asset(file) {
        if (!file) return null;
        if (!assetKeys.has(file)) {
            var key = 'asset-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
            assetKeys.set(file, key);
            assetPromises.set(file, write('assets', file, key).catch(function(error) {
                // Failed transactions did not store this asset. Do not cache
                // their rejection forever: the same upload must be retryable.
                if (assetKeys.get(file) === key) { assetKeys.delete(file); assetPromises.delete(file); }
                throw error;
            }));
        }
        return assetKeys.get(file);
    }
    async function capture() {
        var effect = EffectRegistry.getCurrent();
        if (!effect) throw new Error('Choose an effect before saving a setup.');
        var file = AudioAnalysis.getFile(), fileState = AudioAnalysis.getFileStatus();
        var imageFiles = Overlays.getImageFiles(), images = {};
        var pending = [];
        if (file) { asset(file); pending.push(assetPromises.get(file)); }
        Object.keys(imageFiles).forEach(function(k) {
            if (!imageFiles[k]) return;
            images[k] = asset(imageFiles[k]); pending.push(assetPromises.get(imageFiles[k]));
        });
        var overlays = {};
        Overlays.getDefs().forEach(function(d) {
            var values = {}, mods = {};
            d.params.forEach(function(p) {
                if (p.type !== 'image') values[p.name] = Overlays.getParam(p.name);
                var mod = Overlays.getMod(p.name); if (mod) mods[p.name] = mod;
            });
            overlays[d.id] = { enabled: !!Overlays.isEnabled(d.id), params: values, mods: mods };
        });
        var fx = {};
        PostProcess.getEffects().forEach(function(d) { fx[d.name] = { enabled: !!d.enabled, params: d.params, mods: PostProcess.getMods(d.name) }; });
        var snapshot = clone({ version: 1, effect: effect.name, values: Controls.getBaseValues(), seed: Renderer.getSeed(), seedVec: Renderer.getSeedVec(),
            motion: { speed: Renderer.getAnimSpeed(), rotation: Renderer.getRotation(), spin: Renderer.getRotationSpeed(),
                zoom: Renderer.getViewZoom(), zoomSpeed: Renderer.getViewZoomSpeed(), zoomDepth: Renderer.getViewZoomDepth() },
            reactor: AudioReactor.getConfiguration(), music: Music.getSettings(),
            audio: { source: AudioAnalysis.getSource(), gain: fileState.gain, loop: fileState.loop, file: file ? assetKeys.get(file) : null },
            fx: fx, overlays: overlays, images: images,
            shuffle: Looks.getConfiguration(),
            auto: { fx: Looks.getAuto('fx'), overlays: Looks.getAuto('overlays'), reactor: Looks.getAuto('reactor') } });
        await Promise.all(pending); return snapshot;
    }
    function object(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
    function values(input, defs) {
        if (!object(input)) throw new Error('Invalid setup parameters.');
        var out = {};
        defs.forEach(function(p) {
            if (!Object.prototype.hasOwnProperty.call(input, p.name)) return;
            var v = input[p.name];
            if (p.type === 'color') {
                if (!Array.isArray(v) || v.length !== 3 || v.some(function(n) { return typeof n !== 'number' || !isFinite(n); })) throw new Error('Invalid setup color.');
                out[p.name] = v.map(function(n) { return Math.max(0, Math.min(1, n)); });
            } else if (p.type === 'text' || p.type === 'textarea') {
                if (typeof v !== 'string' || v.length > 20000) throw new Error('Invalid setup text.'); out[p.name] = v;
            } else if (p.type !== 'image') {
                if (typeof v !== 'number' || !isFinite(v)) throw new Error('Invalid setup number.');
                var min = p.type === 'select' || p.type === 'bool' ? 0 : p.min;
                var max = p.type === 'select' ? (p.options || []).length - 1 : p.type === 'bool' ? 1 : p.max;
                out[p.name] = Math.max(min === undefined ? v : min, Math.min(max === undefined ? v : max, v));
                if (p.type === 'select' || p.type === 'int' || p.type === 'bool') out[p.name] = Math.round(out[p.name]);
            }
        }); return out;
    }
    function normalize(snapshot) {
        if (!object(snapshot) || snapshot.version !== 1 || !EffectRegistry.getList().some(function(e) { return e.name === snapshot.effect; })) throw new Error('This setup needs an available effect and a supported setup version.');
        var out = clone(snapshot), def = EffectRegistry.getDefinition(out.effect);
        out.values = values(out.values, def.params || []);
        if (!object(out.reactor) || !object(out.music) || !object(out.audio) || !object(out.motion)) throw new Error('Incomplete setup.');
        if (['studio', 'file', 'capture', 'fallback'].indexOf(out.audio.source) < 0) throw new Error('Invalid setup audio source.');
        Object.keys(out.motion).forEach(function(k) { if (typeof out.motion[k] !== 'number' || !isFinite(out.motion[k])) throw new Error('Invalid setup motion.'); });
        Object.keys(out.fx || {}).forEach(function(name) {
            var effect = PostProcess.getEffect(name);
            if (!effect) { delete out.fx[name]; return; }
            out.fx[name].params = values(out.fx[name].params, Object.keys(effect.paramDefs).map(function(k) { return Object.assign({ name: k }, effect.paramDefs[k]); }));
        });
        Object.keys(out.overlays || {}).forEach(function(id) {
            var def = Overlays.getDefs().filter(function(d) { return d.id === id; })[0];
            if (!def) { delete out.overlays[id]; return; }
            out.overlays[id].params = values(out.overlays[id].params, def.params);
        });
        return out;
    }
    async function apply(snapshot) {
        if (blocked()) throw new Error('Wait for recording or the current setup operation to finish.');
        var state = normalize(snapshot);
        busy = true;
        try {
            var file = state.audio.file ? await read('assets', state.audio.file) : null;
            var imageAssets = {};
            for (var key of Object.keys(state.images || {})) imageAssets[key] = await read('assets', state.images[key]);
            if (!EffectRegistry.switchTo(state.effect, { values: state.values, skipFallback: true })) throw new Error('Could not render the setup effect. Your current effect is still active.');
            Music.stop(); AudioAnalysis.stopCapture(); AudioAnalysis.pauseFile();
            Music.setSettings(state.music); AudioReactor.setConfiguration(state.reactor); AudioReactor.resetSignal();
            if (file) { assetKeys.set(file, state.audio.file); assetPromises.set(file, Promise.resolve()); await AudioAnalysis.loadFile(file); }
            else AudioAnalysis.clearFile();
            AudioAnalysis.setFileGain(state.audio.gain); AudioAnalysis.setFileLoop(state.audio.loop); AudioAnalysis.setSource(state.audio.source);
            PostProcess.resetAll();
            Object.keys(state.fx || {}).forEach(function(name) {
                var row = state.fx[name]; Object.keys(row.params).forEach(function(k) { PostProcess.setParam(name, k, row.params[k]); });
                Object.keys(row.mods || {}).forEach(function(k) { var m = row.mods[k]; if (m) PostProcess.setMod(name, k, m.src, m.amt); });
                PostProcess.setEnabled(name, row.enabled);
            });
            Overlays.resetAll();
            Overlays.getDefs().forEach(function(d) { d.params.forEach(function(p) { if (p.type === 'image') Overlays.setImage(p.name, imageAssets[p.name] || null); }); });
            Object.keys(imageAssets).forEach(function(k) { if (imageAssets[k]) { assetKeys.set(imageAssets[k], state.images[k]); assetPromises.set(imageAssets[k], Promise.resolve()); } });
            Object.keys(state.overlays || {}).forEach(function(id) {
                var row = state.overlays[id]; Object.keys(row.params).forEach(function(k) { Overlays.setParam(k, row.params[k]); });
                Object.keys(row.mods || {}).forEach(function(k) { var m = row.mods[k]; if (m) Overlays.setMod(k, m.src, m.amt); });
                Overlays.setEnabled(id, row.enabled);
            });
            var m = state.motion; Renderer.setAnimSpeed(m.speed); Renderer.setRotation(m.rotation); Renderer.setRotationSpeed(m.spin);
            Renderer.setViewZoom(m.zoom); Renderer.setViewZoomSpeed(m.zoomSpeed); Renderer.setViewZoomDepth(m.zoomDepth); Renderer.setSeed(state.seed, state.seedVec);
            ['fx', 'overlays', 'reactor'].forEach(function(scope) { var mode = state.auto && state.auto[scope]; Looks.setAuto(scope, ['off', '4', '8', '16', 'section'].indexOf(mode) >= 0 ? mode : 'off'); });
            Looks.setConfiguration(state.shuffle);
            MusicControls.refresh(); if (PostProcessControls.rebuild) PostProcessControls.rebuild(); OverlayControls.rebuild();
            [['animSpeed', m.speed], ['rotSpeed', m.spin], ['viewZoom', m.zoom], ['viewZoomSpeed', m.zoomSpeed], ['viewZoomDepth', m.zoomDepth]].forEach(function(row) {
                var control = el(row[0]); if (control) { control.value = row[1]; control.dispatchEvent(new Event('input', { bubbles: true })); }
            });
            if (typeof UIShell !== 'undefined') UIShell.initCollapsibles();
            if (typeof EditHistory !== 'undefined') EditHistory.clear();
            lastSnapshot = ''; report(file || !state.audio.file ? 'Setup restored. Press Play when ready.' : 'Setup restored; its audio file is missing from browser storage.', !!state.audio.file && !file);
            return true;
        } finally { busy = false; }
    }
    async function autosave() {
        if (!initialized || blocked()) return false;
        try {
            var snapshot = await capture(), signature = JSON.stringify(snapshot);
            if (signature === lastSnapshot || blocked()) return true;
            await write('setups', { id: 'current', snapshot: snapshot }); lastSnapshot = signature; return true;
        } catch (error) { report('Setup could not be saved: ' + error.message, true); return false; }
    }
    async function reloadList() {
        entries = await new Promise(function(resolve, reject) {
            var req = database.transaction('setups').objectStore('setups').getAll();
            req.onsuccess = function() { resolve(req.result.filter(function(row) { return row.id !== 'current'; }).sort(function(a, b) { return a.name.localeCompare(b.name); })); };
            req.onerror = function() { reject(req.error); };
        });
        var select = el('setupSelect'); if (!select) return;
        select.replaceChildren(); var blank = document.createElement('option'); blank.value = ''; blank.textContent = 'Choose a saved setup'; select.appendChild(blank);
        entries.forEach(function(row) { var option = document.createElement('option'); option.value = row.id; option.textContent = row.name; select.appendChild(option); }); select.value = selected;
    }
    async function save(name) {
        if (blocked()) throw new Error('Wait for the current operation to finish.');
        name = String(name || '').trim(); if (!name || name.length > limits.name) throw new Error('Give the setup a name of 1–80 characters.');
        var existing = entries.filter(function(row) { return row.name === name; })[0];
        if (!existing && entries.length >= limits.named) throw new Error('Up to 50 setups can be saved. Delete one to make room.');
        var snapshot = await capture();
        var id = existing ? existing.id : 'named-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        await write('setups', { id: id, name: name, snapshot: snapshot }); selected = id; await reloadList(); report('Saved “' + name + '”.'); return id;
    }
    async function load(id) { var row = await read('setups', id); if (!row) throw new Error('That setup is no longer saved.'); await apply(row.snapshot); selected = id; await autosave(); return true; }
    async function remove(id) { if (!id || id === 'current' || blocked()) return false; await write('setups', null, id, true); selected = ''; await reloadList(); report('Saved setup deleted.'); return true; }
    function mount() {
        var group = document.createElement('div'); group.className = 'collapsible setup-controls'; group.dataset.section = 'setups';
        group.innerHTML = '<label class="panel-title section-head">Saved Setups</label><div class="reactor-link-help">Music, mixer, effects, palettes, FX, overlays, files and beat links. Your latest setup is restored automatically.</div>' +
            '<select id="setupSelect" aria-label="Saved setup"></select><div class="setup-name-row"><input id="setupName" type="text" maxlength="80" placeholder="Setup name" aria-label="Setup name"><button id="setupSave" class="sm-btn" type="button">Save</button></div>' +
            '<div class="setup-actions"><button id="setupLoad" class="sm-btn" type="button">Load</button><button id="setupDelete" class="sm-btn" type="button">Delete saved</button></div><div id="setupStatus" class="reactor-link-help" role="status">Stored in this browser.</div>';
        el('musicPanel').prepend(group);
        ['setupSelect', 'setupName', 'setupSave', 'setupLoad', 'setupDelete'].forEach(function(id) { el(id).disabled = true; });
        function action(fn) { Promise.resolve().then(fn).catch(function(e) { report(e.message, true); }); }
        el('setupSave').addEventListener('click', function() { action(function() { return save(el('setupName').value); }); });
        el('setupLoad').addEventListener('click', function() { action(function() { if (!selected) throw new Error('Choose a saved setup first.'); return load(selected); }); });
        el('setupDelete').addEventListener('click', function() { action(function() { return remove(selected); }); });
        el('setupSelect').addEventListener('change', function() { selected = this.value; var row = entries.filter(function(e) { return e.id === selected; })[0]; el('setupName').value = row ? row.name : ''; });
    }
    async function init() {
        mount();
        var changed = false;
        function userChange(e) { if (e.target && e.target.closest && e.target.closest('input, select, button, textarea')) changed = true; }
        document.addEventListener('input', userChange); document.addEventListener('change', userChange); document.addEventListener('click', userChange);
        var initialMusic = JSON.stringify(Music.getSettings()), initialSource = AudioAnalysis.getSource();
        try {
            await open(); await reloadList(); var saved = await read('setups', 'current');
            // A slow database must not overwrite a Play click or edits made
            // while the app was opening. Explicit named loads still restore.
            if (saved && !changed && !Music.isPlaying() && !Music.isStarting() &&
                initialMusic === JSON.stringify(Music.getSettings()) && initialSource === AudioAnalysis.getSource()) await apply(saved.snapshot);
            initialized = true;
            ['setupSelect', 'setupName', 'setupSave', 'setupLoad', 'setupDelete'].forEach(function(id) { el(id).disabled = false; });
            if (typeof UIShell !== 'undefined') UIShell.initCollapsibles();
            function schedule() { if (timer) clearTimeout(timer); timer = setTimeout(autosave, 350); }
            document.addEventListener('input', schedule); document.addEventListener('change', schedule);
            EffectRegistry.onSwitch(schedule); Music.onChange(schedule); Looks.onChange(schedule);
            window.addEventListener('pagehide', autosave); window.setInterval(autosave, 1500);
            await autosave(); return true;
        } catch (e) { report('Saved setups unavailable: ' + e.message, true); return false; }
        finally { document.removeEventListener('input', userChange); document.removeEventListener('change', userChange); document.removeEventListener('click', userChange); }
    }
    return { init: init, capture: capture, apply: apply, save: save, load: load, remove: remove, autosave: autosave,
        getList: function() { return entries.map(function(e) { return { id: e.id, name: e.name }; }); }, isBusy: function() { return busy; } };
})();
