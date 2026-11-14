/* Psychedelia Studio - Smart Infinite-Dive Targets
 *
 * The infinite dives used to aim each loop at a random point near the
 * user's target. Most such points sit inside the set or in a smooth
 * exterior band, so the deep end of every loop was a flat field of colour
 * before the next wave arrived. This module searches the fractal on the CPU
 * for boundary points that still show structure at the deepest zoom of the
 * loop, and hands the shader a table of them: one per dive cycle.
 *
 * Effects opt in with `diveTargets: { kind, ... }` on their definition; the
 * renderer calls DiveTargets.apply() before drawing.
 *
 * The search takes up to about half a second for some effects, so in the
 * interactive preview it runs as a resumable job in slices of a few ms
 * between frames; the previous table keeps being served until the new one
 * is complete. Frame export and automation (__psySyncSwitch) still compute
 * synchronously, as before. Both give the same table for the same inputs.
 */
var DiveTargets = (function() {
    'use strict';

    var TABLE_SIZE = 12;
    var SLICE_MS = 6;
    // effect name -> { key, table, count, pendingKey, timer, job, jobKey }
    var states = {};
    var lastSyncHint = false;

    function nowMs() {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    // The formula is picked once per point rather than on every iteration;
    // each branch does exactly the arithmetic it did inside the loop.
    function escapeCount(kind, cx, cy, maxIter, power) {
        var x = 0, y = 0, nx, ny, i;
        if (kind === 'mandelbrot') {
            for (i = 0; i < maxIter; i++) {
                nx = x * x - y * y + cx;
                ny = 2 * x * y + cy;
                x = nx;
                y = ny;
                if (x * x + y * y > 256) return i + 1;
            }
            return -1;
        }
        if (kind === 'burning_ship') {
            for (i = 0; i < maxIter; i++) {
                var ax = Math.abs(x), ay = Math.abs(y);
                nx = ax * ax - ay * ay + cx;
                ny = 2 * ax * ay + cy;
                x = nx;
                y = ny;
                if (x * x + y * y > 256) return i + 1;
            }
            return -1;
        }
        if (kind === 'tricorn' && power === 2) {
            for (i = 0; i < maxIter; i++) {
                nx = x * x - y * y + cx;
                ny = -2 * x * y + cy;
                x = nx;
                y = ny;
                if (x * x + y * y > 256) return i + 1;
            }
            return -1;
        }
        var conj = kind === 'tricorn';
        if (power === Math.round(power) && power <= 8) {
            // Integer powers: repeated complex multiply (much faster than
            // the polar form, same result).
            for (i = 0; i < maxIter; i++) {
                var zy = conj ? -y : y;
                var px = x, py = zy;
                for (var k = 1; k < power; k++) {
                    var tx = px * x - py * zy;
                    py = px * zy + py * x;
                    px = tx;
                }
                nx = px + cx;
                ny = py + cy;
                x = nx;
                y = ny;
                if (x * x + y * y > 256) return i + 1;
            }
            return -1;
        }
        // multibrot / tricorn with a real power, matching the shaders'
        // polar form (tricorn conjugates first).
        for (i = 0; i < maxIter; i++) {
            var yy = conj ? -y : y;
            var r = Math.sqrt(x * x + yy * yy);
            var a = Math.atan2(yy, x);
            var rp = Math.pow(r, power);
            nx = rp * Math.cos(a * power) + cx;
            ny = rp * Math.sin(a * power) + cy;
            x = nx;
            y = ny;
            if (x * x + y * y > 256) return i + 1;
        }
        return -1;
    }

    function mulberry(seed) {
        var t = seed >>> 0;
        return function() {
            t += 0x6D2B79F5;
            var r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    // How much structure a window of half-size h around (x, y) shows.
    function detailScore(kind, x, y, h, maxIter, power) {
        var n = 7, sum = 0, sumSq = 0, inside = 0, count = 0;
        for (var j = 0; j < n; j++) {
            for (var i = 0; i < n; i++) {
                var px = x + (i / (n - 1) - 0.5) * 2 * h * 1.6;
                var py = y + (j / (n - 1) - 0.5) * 2 * h;
                var e = escapeCount(kind, px, py, maxIter, power);
                var v;
                if (e < 0) { inside++; v = Math.log(maxIter + 1) + 0.6; }
                else v = Math.log(e + 1);
                sum += v;
                sumSq += v * v;
                count++;
            }
        }
        var mean = sum / count;
        var std = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
        var insideFrac = inside / count;
        if (insideFrac > 0.82 || std < 0.04) return 0;
        // Penalise pixel-level noise: chaotic regions (common in the Burning
        // Ship) vary wildly between neighbouring pixels and read as static
        // rather than structure.
        var px = h * 2 / 640;
        var noise = 0;
        for (var q = 0; q < 8; q++) {
            var ox = x + (((q * 37) % 7) / 6 - 0.5) * h;
            var oy = y + (((q * 53) % 5) / 4 - 0.5) * h;
            var e1 = escapeCount(kind, ox, oy, maxIter, power);
            var e2 = escapeCount(kind, ox + px, oy + px * 0.5, maxIter, power);
            var l1 = e1 < 0 ? Math.log(maxIter + 1) : Math.log(e1 + 1);
            var l2 = e2 < 0 ? Math.log(maxIter + 1) : Math.log(e2 + 1);
            noise += Math.abs(l1 - l2);
        }
        noise /= 8;
        var noiseFactor = noise > 0.12 ? Math.max(0.05, 1 - (noise - 0.12) * 3) : 1;
        return std * (1 - Math.abs(insideFrac - 0.25) * 0.6) * noiseFactor;
    }

    // The boundary search as a resumable job. run(deadline) works until
    // nowMs() reaches deadline (Infinity: to the end) and returns true once
    // the result is ready. The steps and the random sequence are the same
    // however the work is sliced, so the result is too.
    function createSearch(opts) {
        var kind = opts.kind;
        var maxIter = Math.max(60, Math.min(900, Math.round(opts.maxIter)));
        var power = opts.power || 2;
        var depth = Math.max(1, opts.depth);
        var h = 1.5 * Math.pow(2, -depth);
        var hHalf = h * Math.pow(2, depth * 0.5);
        var rand = mulberry(Math.floor((opts.seed || 1) * 1000) + 17);
        var found = [];
        var radii = opts.radii || [0.22, 0.6, 1.6];
        var ri = 0, radius = 0, k = 0, c = 0;
        var candidates = null, scored = null;
        var phase = 'radius';
        var done = false;

        function startRadius() {
            if (ri >= radii.length || found.length >= TABLE_SIZE) {
                // Shuffle so the journey order varies with the seed.
                for (var z = found.length - 1; z > 0; z--) {
                    var w = Math.floor(rand() * (z + 1));
                    var tmp = found[z]; found[z] = found[w]; found[w] = tmp;
                }
                done = true;
                return;
            }
            radius = radii[ri];
            candidates = [];
            k = 0;
            phase = 'sample';
        }

        // Up to 100 random points; once all 1800 are in, keep the 160 that
        // escape latest (escaping late = close to the boundary).
        function sampleSome() {
            var end = Math.min(1800, k + 100);
            for (; k < end; k++) {
                var ang = rand() * Math.PI * 2;
                var rr = Math.sqrt(rand()) * radius;
                var cx = opts.centerX + Math.cos(ang) * rr;
                var cy = opts.centerY + Math.sin(ang) * rr;
                var e = escapeCount(kind, cx, cy, maxIter, power);
                if (e > maxIter * 0.18) candidates.push({ x: cx, y: cy, e: e });
            }
            if (k < 1800) return;
            candidates.sort(function(a, b) { return b.e - a.e; });
            candidates = candidates.slice(0, 160);
            scored = [];
            c = 0;
            phase = 'score';
        }

        // One candidate; after the last, pick well separated targets.
        function scoreOne() {
            if (c < candidates.length) {
                var s = detailScore(kind, candidates[c].x, candidates[c].y, h, maxIter, power);
                // Also want structure halfway down the dive.
                if (s > 0) s += 0.5 * detailScore(kind, candidates[c].x, candidates[c].y, hHalf, maxIter, power);
                if (s > 0.08) scored.push({ x: candidates[c].x, y: candidates[c].y, s: s });
                c++;
                return;
            }
            scored.sort(function(a, b) { return b.s - a.s; });
            var minSep = Math.max(radius * 0.06, h * 40);
            for (var q = 0; q < scored.length && found.length < TABLE_SIZE; q++) {
                var ok = true;
                for (var f = 0; f < found.length; f++) {
                    var dx = found[f][0] - scored[q].x, dy = found[f][1] - scored[q].y;
                    if (dx * dx + dy * dy < minSep * minSep) { ok = false; break; }
                }
                if (ok) found.push([scored[q].x, scored[q].y]);
            }
            ri++;
            phase = 'radius';
        }

        function run(deadline) {
            var timed = deadline !== Infinity;
            while (!done) {
                if (phase === 'radius') startRadius();
                else if (phase === 'sample') sampleSome();
                else scoreOne();
                if (timed && nowMs() >= deadline) break;
            }
            return done;
        }

        return {
            run: run,
            result: function() { return done ? found : null; }
        };
    }

    function search(opts) {
        var job = createSearch(opts);
        job.run(Infinity);
        return job.result();
    }

    function stateFor(name) {
        if (!states[name]) states[name] = { key: '', table: null, count: 0, pendingKey: '', timer: null, job: null, jobKey: '' };
        return states[name];
    }

    function optionsFor(def, params) {
        var cfg = def.diveTargets;
        var opts = typeof cfg.resolve === 'function' ? cfg.resolve(params) : null;
        if (!opts) return null;
        var depth = Number(params.zoom_depth) || 9;
        // Search with the iteration budget the shader uses at full depth.
        var baseIter = Number(params.max_iter) || 200;
        opts.maxIter = Math.min(500, baseIter * (1 + 0.09 * depth));
        opts.depth = depth;
        opts.seed = typeof Renderer !== 'undefined' && Renderer.getSeed ? Renderer.getSeed() : 1;
        return opts;
    }

    function keyOf(opts) {
        return [opts.kind, opts.power.toFixed(2), opts.centerX.toFixed(4), opts.centerY.toFixed(4),
            opts.depth, Math.round(opts.maxIter), opts.seed.toFixed(3), opts.offsetX || 0, opts.offsetY || 0].join('|');
    }

    // Table, count and key are replaced together, so a reader never sees a
    // mix of two searches.
    function finish(state, opts, key, targets) {
        var table = new Float32Array(TABLE_SIZE * 2);
        for (var i = 0; i < TABLE_SIZE; i++) {
            var t = targets.length ? targets[i % targets.length] : [opts.centerX, opts.centerY];
            table[i * 2] = t[0] - (opts.offsetX || 0);
            table[i * 2 + 1] = t[1] - (opts.offsetY || 0);
        }
        state.table = table;
        state.count = targets.length ? Math.min(TABLE_SIZE, Math.max(targets.length, 1)) : 0;
        state.key = key;
    }

    function compute(state, opts, key) {
        cancelJob(state);
        finish(state, opts, key, search(opts));
    }

    function cancelJob(state) {
        state.job = null;
        state.jobKey = '';
    }

    // MessageChannel tasks are not clamped to 4 ms like nested timers, so a
    // sliced search takes about its CPU time while frames and input events
    // still run between slices.
    var channel = null;
    var channelQueue = [];
    function schedule(fn) {
        if (typeof MessageChannel === 'undefined') {
            setTimeout(fn, 0);
            return;
        }
        if (!channel) {
            channel = new MessageChannel();
            channel.port1.onmessage = function() {
                var next = channelQueue.shift();
                if (next) next();
            };
            // Node only (tools): an open port would keep the process alive.
            if (channel.port1.unref) channel.port1.unref();
        }
        channelQueue.push(fn);
        channel.port2.postMessage(0);
    }

    // Search in slices of SLICE_MS. A newer key or a synchronous compute
    // replaces state.job, which stops this one at its next slice; so does
    // leaving the effect (the next apply() for it starts again).
    function startJob(state, def, opts, key) {
        var job = createSearch(opts);
        state.job = job;
        state.jobKey = key;
        function slice() {
            if (state.job !== job) return;
            if (typeof EffectRegistry !== 'undefined' && EffectRegistry.getCurrent && EffectRegistry.getCurrent() !== def) {
                cancelJob(state);
                return;
            }
            var ready = false;
            try {
                ready = job.run(nowMs() + SLICE_MS);
            } catch (err) {
                cancelJob(state);
                console.error(err);
                return;
            }
            if (!ready) {
                schedule(slice);
                return;
            }
            cancelJob(state);
            finish(state, opts, key, job.result());
        }
        schedule(slice);
    }

    // Frame export and automation need the table for the current settings on
    // the frame they ask for it, as before.
    function isSync(hint) {
        return !!hint || (typeof window !== 'undefined' && !!window.__psySyncSwitch) ||
            (typeof VideoExport !== 'undefined' && !!VideoExport.isFrameExport && !!VideoExport.isFrameExport());
    }

    // Upload the target table; recompute (debounced) when inputs change.
    // `sync` (frame export) computes on this frame instead of in slices.
    function apply(gl, program, def, params, getLocation, sync) {
        if (!def || !def.diveTargets || !params) return;
        var countLoc = getLocation(program, 'u_dive_count');
        if (countLoc === null) return;
        var state = stateFor(def.name);
        // Search on the user's own settings: Beat Reactor links modulate the
        // render values every frame, which would change the key constantly
        // and keep the debounced refresh from ever running.
        var base = typeof Controls !== 'undefined' && Controls.getBaseValues && typeof EffectRegistry !== 'undefined' &&
            EffectRegistry.getCurrent && EffectRegistry.getCurrent() === def ? Controls.getBaseValues() : null;
        var opts = optionsFor(def, base || params);
        if (!opts) {
            gl.uniform1f(countLoc, 0);
            return;
        }
        var key = keyOf(opts);
        lastSyncHint = !!sync;
        var now, rapid;
        if (isSync(sync)) {
            // Export / automation must be deterministic: no debounce, and no
            // sliced job or timer from the preview may swap a table in later.
            // Every frame uses the table for exactly its own settings.
            if (state.job) cancelJob(state);
            if (state.timer) clearTimeout(state.timer);
            state.timer = null;
            state.pendingKey = '';
            if (key !== state.key) compute(state, opts, key);
        } else if (key === state.key) {
            // Back on the settings the shown table belongs to: drop any work
            // for settings that were passed through.
            if (state.job || state.timer) {
                cancelJob(state);
                if (state.timer) clearTimeout(state.timer);
                state.timer = null;
                state.pendingKey = '';
            }
        } else if (key !== state.jobKey) {
            // New settings: the old table (or, for the first search, the
            // shader's own drift path) is served until the new one is ready.
            if (state.job) cancelJob(state);
            now = nowMs();
            rapid = now - (state.lastChangeMs || 0) < 300;
            if (state.pendingKey !== key) state.lastChangeMs = now;
            if (!rapid && !state.timer) {
                startJob(state, def, opts, key);
            } else if (state.pendingKey !== key) {
                debounce(state, def, opts, key);
            }
        }
        var tableLoc = getLocation(program, 'u_dive_targets[0]');
        if (tableLoc === null) tableLoc = getLocation(program, 'u_dive_targets');
        if (tableLoc !== null && state.table) gl.uniform2fv(tableLoc, state.table);
        gl.uniform1f(countLoc, state.table ? state.count : 0);
    }

    // Rapid changes in the preview (slider drags): search once the value has
    // settled. If export or automation started meanwhile, do nothing: the
    // next synchronous apply() computes the key it actually needs.
    function debounce(state, def, opts, key) {
        state.pendingKey = key;
        if (state.timer) clearTimeout(state.timer);
        state.timer = setTimeout(function() {
            state.timer = null;
            state.pendingKey = '';
            if (isSync(lastSyncHint)) return;
            startJob(state, def, opts, key);
        }, 160);
    }

    function getTable(name) {
        var state = states[name];
        return state && state.table ? Array.prototype.slice.call(state.table, 0, state.count * 2) : [];
    }

    return {
        TABLE_SIZE: TABLE_SIZE,
        apply: apply,
        search: search,
        createSearch: createSearch,
        escapeCount: escapeCount,
        getTable: getTable
    };
})();
