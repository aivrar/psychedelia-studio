/* Psychedelia Studio - Beat Reactor link controls for FX and overlay settings
 * attach() adds a small note button to a slider row. It opens a link row
 * underneath: what drives the setting (kick, bass, tempo wave ...), how
 * much, and a live marker showing where the modulated value sits.
 */
var ReactUI = (function() {
    'use strict';

    var meters = [];
    var loopStarted = false;

    function sources() {
        return typeof AudioReactor !== 'undefined' && AudioReactor.getSources ? AudioReactor.getSources() : [];
    }

    // opts: { row, wrap, def, get() -> {src, amt} | null, set(src, amt), live() -> number }
    function attach(opts) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'react-btn';
        btn.title = 'Beat Reactor: move this setting with the music';
        btn.innerHTML = '&#9835;';
        opts.wrap.classList.add('has-react');
        opts.wrap.appendChild(btn);

        var rr = document.createElement('div');
        rr.className = 'react-row';
        rr.hidden = true;

        var srcSel = document.createElement('select');
        srcSel.title = 'What drives this setting';
        var off = document.createElement('option');
        off.value = '';
        off.textContent = 'Off';
        srcSel.appendChild(off);
        sources().forEach(function(s) {
            var o = document.createElement('option');
            o.value = s.id;
            o.textContent = s.label;
            srcSel.appendChild(o);
        });

        var amt = document.createElement('input');
        amt.type = 'range';
        amt.className = 'psy-range';
        amt.min = '-100';
        amt.max = '100';
        amt.step = '1';
        amt.value = '30';
        amt.dataset.noReset = '1';
        amt.title = 'How far the music pushes it (negative pushes the other way)';

        var amtVal = document.createElement('span');
        amtVal.className = 'react-amt';

        var meter = document.createElement('div');
        meter.className = 'react-meter';
        meter.innerHTML = '<span class="react-base"></span><span class="react-live"></span>';

        rr.appendChild(srcSel);
        rr.appendChild(amt);
        rr.appendChild(amtVal);
        rr.appendChild(meter);
        opts.row.parentNode.insertBefore(rr, opts.row.nextSibling);

        function paint() {
            amtVal.textContent = (amt.value > 0 ? '+' : '') + amt.value + '%';
            if (window.UIShell && UIShell.paintRange) UIShell.paintRange(amt);
        }

        function refresh() {
            var m = opts.get();
            btn.classList.toggle('on', !!m);
            srcSel.value = m ? m.src : '';
            if (m) amt.value = String(Math.round(m.amt * 100));
            if (m && rr.hidden && rr.dataset.autoOpen !== 'no') rr.hidden = false;
            paint();
        }

        btn.addEventListener('click', function() {
            if (rr.hidden) {
                rr.hidden = false;
                rr.dataset.autoOpen = '';
                if (!opts.get()) opts.set('kick', 0.3);
            } else {
                rr.hidden = true;
                rr.dataset.autoOpen = 'no';
            }
            refresh();
        });
        srcSel.addEventListener('change', function() {
            if (!this.value) opts.set('', 0);
            else opts.set(this.value, Number(amt.value) / 100);
            refresh();
        });
        amt.addEventListener('input', function() {
            if (srcSel.value) opts.set(srcSel.value, Number(this.value) / 100);
            btn.classList.toggle('on', !!opts.get());
            paint();
        });
        amt.addEventListener('dblclick', function() {
            this.value = '30';
            if (srcSel.value) opts.set(srcSel.value, 0.3);
            paint();
        });

        meters.push({ rr: rr, meter: meter, def: opts.def, get: opts.get, live: opts.live, base: opts.base });
        startLoop();
        refresh();
        return { refresh: refresh };
    }

    // Header button that applies or clears an effect's suggested links.
    function autoButton(isOn, onToggle) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'react-auto-btn';
        b.innerHTML = '&#9835; Auto';
        b.title = 'Beat Reactor: link this effect to the music with suggested settings (click again to remove)';
        function sync() { b.classList.toggle('on', !!isOn()); }
        b.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            onToggle(!isOn());
            sync();
        });
        b.sync = sync;
        sync();
        return b;
    }

    // Live markers: where the modulated value currently sits in the range.
    function startLoop() {
        if (loopStarted) return;
        loopStarted = true;
        var tick = 0;
        function loop() {
            window.requestAnimationFrame(loop);
            if ((tick++ & 1) === 1) return;
            for (var i = 0; i < meters.length; i++) {
                var m = meters[i];
                if (!m.rr.isConnected) { meters.splice(i, 1); i--; continue; }
                if (m.rr.hidden || m.rr.offsetParent === null) continue;
                var min = Number(m.def.min), max = Number(m.def.max);
                var span = max - min || 1;
                var v = Number(m.live());
                var b = Number(m.base());
                m.meter.lastChild.style.left = (Math.max(0, Math.min(1, (v - min) / span)) * 100).toFixed(1) + '%';
                m.meter.firstChild.style.left = (Math.max(0, Math.min(1, (b - min) / span)) * 100).toFixed(1) + '%';
            }
        }
        window.requestAnimationFrame(loop);
    }

    function helpText() {
        var d = document.createElement('div');
        d.className = 'react-help';
        d.innerHTML = '<b>&#9835;</b> next to a setting links it to the <b>Beat Reactor</b>: kicks, bass, drops, or tempo waves ' +
            '(those also run without audio). <b>&#9835; Auto</b> applies suggested links for that effect.';
        return d;
    }

    return { attach: attach, autoButton: autoButton, helpText: helpText };
})();
