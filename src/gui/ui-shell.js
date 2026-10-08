/* Psychedelia Studio - UI Shell
 * Sidebar tabs, effect stepping, favorites, snapshots, hide-UI mode, the
 * shortcut sheet, and remembered settings (localStorage, per browser).
 */
var UIShell = (function() {
    'use strict';

    var STORE_KEY = 'psychedelia.ui.v1';
    var store = { tab: 'effect', favorites: [], settings: {}, lastEffect: '', collapsed: {} };
    var toastTimer = null;

    function load() {
        try {
            var raw = window.localStorage && localStorage.getItem(STORE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    store.tab = parsed.tab || 'effect';
                    store.favorites = Array.isArray(parsed.favorites) ? parsed.favorites : [];
                    store.settings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
                    store.lastEffect = parsed.lastEffect || '';
                    store.collapsed = parsed.collapsed && typeof parsed.collapsed === 'object' ? parsed.collapsed : {};
                }
            }
        } catch (err) { /* storage unavailable: keep defaults */ }
    }

    function save() {
        try {
            if (window.localStorage) localStorage.setItem(STORE_KEY, JSON.stringify(store));
        } catch (err) { /* ignore */ }
    }

    // --- Tabs -----------------------------------------------------------------
    function movePanel(id, pane) {
        var panel = document.getElementById(id);
        var target = document.querySelector('.tab-pane[data-pane="' + pane + '"]');
        if (panel && target && panel.parentNode !== target) target.appendChild(panel);
    }

    function setTab(name) {
        var tabs = document.querySelectorAll('.side-tab');
        var found = false;
        tabs.forEach(function(tab) {
            var on = tab.dataset.tab === name;
            if (on) found = true;
            tab.classList.toggle('active', on);
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        if (!found) return;
        document.querySelectorAll('.tab-pane').forEach(function(pane) {
            pane.classList.toggle('active', pane.dataset.pane === name);
        });
        var sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.scrollTop = 0;
        store.tab = name;
        save();
    }

    function tabNames() {
        return Array.prototype.map.call(document.querySelectorAll('.side-tab'), function(tab) { return tab.dataset.tab; });
    }

    // --- Favorites ------------------------------------------------------------
    function isFavorite(name) {
        return store.favorites.indexOf(name) >= 0;
    }

    function toggleFavorite(name) {
        var current = EffectRegistry.getCurrent();
        name = name || (current && current.name);
        if (!name) return;
        var i = store.favorites.indexOf(name);
        if (i >= 0) store.favorites.splice(i, 1);
        else store.favorites.push(name);
        save();
        updateEffectMeta();
        if (window.PsychedeliaRefreshEffects) window.PsychedeliaRefreshEffects();
        toast(isFavorite(name) ? '★ Added to favorites' : 'Removed from favorites');
    }

    // --- Effect stepping --------------------------------------------------------
    function stepEffect(dir) {
        var select = document.getElementById('effectSelect');
        if (!select) return;
        var values = Array.prototype.filter.call(select.options, function(o) { return !!o.value && !o.disabled; })
            .map(function(o) { return o.value; });
        if (!values.length) return;
        var current = EffectRegistry.getCurrent();
        var index = values.indexOf(current && current.name);
        var next = values[((index < 0 ? (dir > 0 ? -1 : 0) : index) + dir + values.length) % values.length];
        select.value = next;
        EffectRegistry.switchToAsync(next);
        var def = EffectRegistry.getDefinition(next);
        toast(def ? def.label : next);
    }

    function toast(text) {
        var el = document.getElementById('effectToast');
        if (!el) return;
        el.textContent = text;
        el.classList.remove('hidden');
        el.classList.remove('fade');
        void el.offsetWidth;
        el.classList.add('fade');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function() { el.classList.add('hidden'); }, 1800);
    }

    function updateEffectMeta() {
        var effect = EffectRegistry.getCurrent();
        var catChip = document.getElementById('effectCategoryChip');
        var costChip = document.getElementById('effectCostChip');
        var fav = document.getElementById('btnFavorite');
        if (!effect) return;
        if (catChip) catChip.textContent = effect.category || 'Other';
        var meta = effect.fractalFlight;
        var cost = meta && meta.renderCost ? meta.renderCost : (meta && meta.kind === 'de-raymarch' ? 'heavy' : '');
        if (costChip) {
            costChip.textContent = cost ? cost + ' GPU' : '';
            costChip.className = 'chip cost-' + (cost || 'none') + (cost ? '' : ' hidden');
        }
        if (fav) {
            var on = isFavorite(effect.name);
            fav.classList.toggle('active', on);
            fav.setAttribute('aria-pressed', on ? 'true' : 'false');
            fav.title = on ? 'Remove from favorites (S)' : 'Add to favorites (S)';
        }
    }

    // --- Snapshot ---------------------------------------------------------------
    function snapshot() {
        var main = Renderer.getCanvas();
        if (!main) return;
        var out = document.createElement('canvas');
        out.width = main.width;
        out.height = main.height;
        var ctx = out.getContext('2d');
        ctx.drawImage(main, 0, 0);
        ['overlayCanvas', 'strobeCanvas'].forEach(function(id) {
            var layer = document.getElementById(id);
            if (layer && layer.width && layer.height) ctx.drawImage(layer, 0, 0, out.width, out.height);
        });
        var effect = EffectRegistry.getCurrent();
        var stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        var name = 'psychedelia-' + (effect ? effect.name : 'frame') + '-' + stamp + '.png';
        out.toBlob(function(blob) {
            if (!blob) return;
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
            toast('Snapshot saved');
        }, 'image/png');
    }

    // --- Hide UI ------------------------------------------------------------------
    function toggleUI(force) {
        var hide = typeof force === 'boolean' ? force : !document.body.classList.contains('ui-hidden');
        document.body.classList.toggle('ui-hidden', hide);
        // The canvas area changes size; let overlay canvases realign.
        setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 30);
        if (hide) toast('Press H to show the interface');
    }

    function showHelp() {
        var modal = document.getElementById('helpModal');
        if (modal) modal.classList.remove('hidden');
    }

    // --- Range fill ---------------------------------------------------------------
    // Paints the filled part of a slider track (CSS reads --fill).
    function paintRange(el) {
        if (!el || el.type !== 'range') return;
        var min = parseFloat(el.min) || 0, max = parseFloat(el.max);
        if (!isFinite(max)) max = 100;
        var v = parseFloat(el.value);
        var pct = max > min ? (v - min) / (max - min) * 100 : 0;
        el.style.setProperty('--fill', Math.max(0, Math.min(100, pct)) + '%');
    }

    function paintAllRanges(root) {
        (root || document).querySelectorAll('input[type="range"]').forEach(paintRange);
    }

    // --- Settings persistence -------------------------------------------------------
    var PERSISTED = ['resSelect', 'fpsSelect', 'qualitySelect', 'previewFpsSelect', 'uiPriorityMode', 'recFormat', 'recQuality', 'recAudio', 'recLength', 'recDetail', 'loopMode', 'recMode', 'renderLengthMode', 'renderSeconds'];

    function restoreSettings() {
        PERSISTED.forEach(function(id) {
            var el = document.getElementById(id);
            var value = store.settings[id];
            if (!el || value === undefined || el.value === value) return;
            var exists = Array.prototype.some.call(el.options || [], function(o) { return o.value === value; });
            if (id === 'renderSeconds') exists = isFinite(Number(value)) && Number(value) >= 0.1 && Number(value) <= 3600;
            if (!exists) return;
            el.value = value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function watchSettings() {
        PERSISTED.forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', function() {
                store.settings[id] = el.value;
                save();
            });
        });
    }

    // Collapsible sections: click a section title to fold it; remembered per section.
    function initCollapsibles() {
        document.querySelectorAll('#sidebar .collapsible').forEach(function(sec) {
            var id = sec.dataset.section;
            var head = sec.querySelector(':scope > .section-head');
            if (!id || !head || head.dataset.wired) return;
            head.dataset.wired = '1';
            head.setAttribute('role', 'button');
            head.setAttribute('tabindex', '0');
            var saved = store.collapsed[id];
            var collapsed = saved !== undefined ? !!saved : sec.dataset.collapsedDefault === '1';
            sec.classList.toggle('is-collapsed', collapsed);
            head.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            function toggle(e) {
                if (e && e.target && e.target.closest('button, input, select, a')) return;
                var now = !sec.classList.contains('is-collapsed');
                sec.classList.toggle('is-collapsed', now);
                head.setAttribute('aria-expanded', now ? 'false' : 'true');
                store.collapsed[id] = now;
                save();
            }
            head.addEventListener('click', toggle);
            head.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
            });
        });
    }

    // Double-click any slider to put it back to its default (data-default, or
    // the value it was created with). Sliders with their own reset opt out.
    function initSliderReset() {
        document.addEventListener('dblclick', function(e) {
            var el = e.target;
            if (!el || el.type !== 'range' || el.dataset.noReset || el.disabled) return;
            var def = el.dataset.default !== undefined ? el.dataset.default : el.getAttribute('value');
            if (def === null || def === undefined || def === '' || def === 'undefined') return;
            el.value = def;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function init() {
        load();
        initSliderReset();
        movePanel('postfxPanel', 'fx');
        movePanel('overlayPanel', 'overlay');
        movePanel('musicPanel', 'audio');

        document.querySelectorAll('.side-tab').forEach(function(tab) {
            tab.addEventListener('click', function() { setTab(tab.dataset.tab); });
        });
        // Automated tools always start on the Effect tab.
        setTab(window.__psySyncSwitch ? 'effect' : (store.tab || 'effect'));

        function on(id, fn) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        }
        on('btnPrevEffect', function() { stepEffect(-1); });
        on('btnNextEffect', function() { stepEffect(1); });
        on('btnFavorite', function() { toggleFavorite(); });
        on('btnSnapshot', snapshot);
        on('btnHideUI', function() { toggleUI(true); });
        on('btnShowUI', function() { toggleUI(false); });
        on('btnHelp', showHelp);
        on('helpClose', function() { document.getElementById('helpModal').classList.add('hidden'); });

        document.addEventListener('input', function(e) {
            if (e.target && e.target.type === 'range') paintRange(e.target);
        }, true);
        document.addEventListener('change', function(e) {
            if (e.target && e.target.type === 'range') paintRange(e.target);
        }, true);
        paintAllRanges();
        initCollapsibles();
        // Parameter rows are rebuilt on every effect switch / preset.
        var params = document.getElementById('paramsContainer');
        if (params && typeof MutationObserver !== 'undefined') {
            new MutationObserver(function() { paintAllRanges(params); }).observe(params, { childList: true, subtree: true });
        }

        EffectRegistry.onSwitch(function(name) {
            updateEffectMeta();
            paintAllRanges();
            store.lastEffect = name;
            save();
        });

        watchSettings();
        if (!window.__psySyncSwitch) restoreSettings();
        updateEffectMeta();
    }

    function lastEffect() {
        return window.__psySyncSwitch ? '' : store.lastEffect;
    }

    return {
        initCollapsibles: initCollapsibles,
        init: init,
        setTab: setTab,
        getTab: function() { return store.tab || 'effect'; },
        tabNames: tabNames,
        stepEffect: stepEffect,
        isFavorite: isFavorite,
        toggleFavorite: toggleFavorite,
        snapshot: snapshot,
        toggleUI: toggleUI,
        showHelp: showHelp,
        toast: toast,
        paintRange: paintRange,
        paintAllRanges: paintAllRanges,
        updateEffectMeta: updateEffectMeta,
        lastEffect: lastEffect
    };
})();
