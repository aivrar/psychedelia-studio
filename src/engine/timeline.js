/* Psychedelia Studio - Timeline Engine
 * Manages sequencing of effects over time with transitions.
 */
var Timeline = (function() {
    'use strict';

    var clips = [];        // Array of { id, effectName, start, duration, params, overlays, transition }
    var playhead = 0;      // Current time in seconds
    var totalDuration = 30; // Default timeline length
    var playing = false;
    var playStartWall = 0; // Wall clock at play start
    var playStartHead = 0; // Playhead position at play start
    var loop = false;
    var nextClipId = 1;
    var activeClipId = null;
    var mode = 'live';     // 'live' or 'timeline'
    var onUpdate = null;   // Callback when timeline state changes
    var onClipChange = null; // Callback when active clip changes
    var tickId = null;

    function supportedTransition(value) {
        return value === 'flash' ? 'flash' : 'cut';
    }

    function normalizeClip(clip) {
        if (!clip) return clip;
        clip.transition = supportedTransition(clip.transition);
        clip.duration = Number(clip.duration);
        clip.start = Number(clip.start);
        if (!isFinite(clip.duration) || clip.duration <= 0) clip.duration = 5;
        if (!isFinite(clip.start) || clip.start < 0) clip.start = 0;
        return clip;
    }

    function createClip(effectName, start, duration, params, overlays) {
        var clip = normalizeClip({
            id: nextClipId++,
            effectName: effectName,
            start: start,
            duration: duration || 5,
            params: params || null,     // null = use effect defaults
            overlays: overlays || null, // null = current overlay state
            transition: 'cut',          // 'cut', 'flash'
            transitionDuration: 0.5
        });
        clips.push(clip);
        clips.sort(function(a, b) { return a.start - b.start; });
        recalcDuration();
        if (onUpdate) onUpdate();
        return clip;
    }

    function addCurrentAsClip() {
        var effect = EffectRegistry.getCurrent();
        if (!effect) return null;

        // Find the end of the last clip, or 0
        var lastEnd = 0;
        clips.forEach(function(c) {
            var end = c.start + c.duration;
            if (end > lastEnd) lastEnd = end;
        });

        var params = {};
        var vals = (Controls.getBaseValues ? Controls.getBaseValues() : Controls.getValues());
        for (var k in vals) params[k] = vals[k];

        var overlayState = {
            enabled: JSON.parse(JSON.stringify(Overlays.getEnabled())),
            params: JSON.parse(JSON.stringify(Overlays.getParams()))
        };

        var clip = createClip(effect.name, lastEnd, 5, params, overlayState);
        if (typeof Renderer !== 'undefined' && Renderer.getSeed) {
            clip.seed = Renderer.getSeed();
            clip.seedVec = Renderer.getSeedVec ? Renderer.getSeedVec().slice() : null;
        }
        return clip;
    }

    function removeClip(id) {
        clips = clips.filter(function(c) { return c.id !== id; });
        if (activeClipId === id) activeClipId = null;
        recalcDuration();
        if (onUpdate) onUpdate();
    }

    function updateClip(id, changes) {
        var clip = getClip(id);
        if (!clip) return;
        for (var k in changes) {
            clip[k] = changes[k];
        }
        normalizeClip(clip);
        if (activeClipId === id) activeClipId = null;
        clips.sort(function(a, b) { return a.start - b.start; });
        recalcDuration();
        if (onUpdate) onUpdate();
    }

    function duplicateClip(id) {
        var clip = getClip(id);
        if (!clip) return;
        var newClip = createClip(
            clip.effectName,
            clip.start + clip.duration,
            clip.duration,
            clip.params ? JSON.parse(JSON.stringify(clip.params)) : null,
            clip.overlays ? JSON.parse(JSON.stringify(clip.overlays)) : null
        );
        newClip.transition = clip.transition;
        newClip.transitionDuration = clip.transitionDuration;
        newClip.seed = clip.seed;
        newClip.seedVec = clip.seedVec ? clip.seedVec.slice() : null;
        return newClip;
    }

    function getClip(id) {
        for (var i = 0; i < clips.length; i++) {
            if (clips[i].id === id) return clips[i];
        }
        return null;
    }

    function getClipAt(time) {
        for (var i = clips.length - 1; i >= 0; i--) {
            var c = clips[i];
            if (time >= c.start && time < c.start + c.duration) return c;
        }
        return null;
    }

    function getClips() { return clips; }

    function recalcDuration() {
        var maxEnd = 30;
        clips.forEach(function(c) {
            var end = c.start + c.duration;
            if (end > maxEnd) maxEnd = end;
        });
        totalDuration = Math.max(maxEnd + 5, 30);
    }

    // --- Playback ---
    function play() {
        if (clips.length === 0 || playing) return;
        if (playhead >= totalDuration) playhead = 0;
        playing = true;
        playStartWall = performance.now() / 1000;
        playStartHead = playhead;
        mode = 'timeline';
        tick();
    }

    function pause() {
        playing = false;
        if (tickId !== null) cancelAnimationFrame(tickId);
        tickId = null;
    }

    function stop() {
        pause();
        playhead = 0;
        applyClipAtPlayhead();
        if (onUpdate) onUpdate();
    }

    function seek(time) {
        time = Number(time);
        if (!isFinite(time)) return;
        playhead = Math.max(0, Math.min(time, totalDuration));
        if (playing) {
            playStartWall = performance.now() / 1000;
            playStartHead = playhead;
        }
        applyClipAtPlayhead();
        if (onUpdate) onUpdate();
    }

    function tick() {
        tickId = null;
        if (!playing) return;

        var now = performance.now() / 1000;
        playhead = playStartHead + (now - playStartWall);

        if (playhead >= totalDuration) {
            if (loop) {
                playhead = 0;
                playStartWall = now;
                playStartHead = 0;
            } else {
                playhead = totalDuration;
                playing = false;
            }
        }

        applyClipAtPlayhead();
        if (onUpdate) onUpdate('playhead');

        if (playing) tickId = requestAnimationFrame(tick);
    }

    function applyClipAtPlayhead() {
        var clip = getClipAt(playhead);
        if (!clip) return;

        if (activeClipId !== clip.id) {
            var previousClipId = activeClipId;

            // Switch effect
            if (!EffectRegistry.switchTo(clip.effectName)) return;
            activeClipId = clip.id;
            if (clip.seed !== undefined && typeof Renderer !== 'undefined' && Renderer.setSeed) {
                Renderer.setSeed(clip.seed, clip.seedVec);
            }

            // Apply clip params
            if (clip.params) {
                Controls.setValues(clip.params);
                // Rebuild sliders with stored values
                var effect = EffectRegistry.getCurrent();
                if (effect && effect.params) {
                    var paramDefs = effect.params.map(function(p) {
                        var newP = {};
                        for (var k in p) newP[k] = p[k];
                        if (clip.params[p.name] !== undefined) {
                            newP.default = clip.params[p.name];
                        }
                        return newP;
                    });
                    Controls.buildParams(paramDefs, effect.fractalFlight || null);
                }
            }

            // Apply overlay state
            if (clip.overlays) {
                var en = clip.overlays.enabled;
                for (var k in en) Overlays.setEnabled(k, en[k]);
                var pr = clip.overlays.params;
                for (var k in pr) Overlays.setParam(k, pr[k]);
            }

            // Update effect selector
            var sel = document.getElementById('effectSelect');
            var activeEffect = EffectRegistry.getCurrent ? EffectRegistry.getCurrent() : null;
            if (sel && activeEffect) sel.value = activeEffect.name;

            if (previousClipId !== null && supportedTransition(clip.transition) === 'flash' &&
                    typeof Overlays !== 'undefined' && Overlays.triggerFlash &&
                    typeof Renderer !== 'undefined' && Renderer.getTime) {
                Overlays.triggerFlash(Renderer.getTime());
            }

            if (onClipChange) onClipChange(clip);
        }
    }

    function isPlaying() { return playing; }
    function getPlayhead() { return playhead; }
    function getDuration() { return totalDuration; }
    function setDuration(d) { if (isFinite(Number(d))) totalDuration = Math.max(Number(d), 5); }
    function getMode() { return mode; }
    function setMode(m) { mode = m; }
    function setLoop(l) { loop = l; }
    function isLoop() { return loop; }
    function setOnUpdate(fn) { onUpdate = fn; }
    function setOnClipChange(fn) { onClipChange = fn; }

    function clear() {
        pause();
        clips = [];
        playhead = 0;
        playing = false;
        activeClipId = null;
        totalDuration = 30;
        if (onUpdate) onUpdate();
    }

    // --- Serialization ---
    function toJSON() {
        return JSON.stringify({
            clips: clips,
            totalDuration: totalDuration,
            loop: loop
        });
    }

    function fromJSON(json) {
        try {
            var data = JSON.parse(json);
            if (!data || !Array.isArray(data.clips)) throw new Error('Expected a clips array.');
            var ids = {};
            var imported = data.clips.map(function(c, index) {
                if (!c || typeof c !== 'object' || typeof c.effectName !== 'string' ||
                        !isFinite(Number(c.start)) || Number(c.start) < 0 ||
                        !isFinite(Number(c.duration)) || Number(c.duration) <= 0 ||
                        !Number.isSafeInteger(Math.ceil(Number(c.start) + Number(c.duration)))) throw new Error('Invalid timeline clip.');
                if (c.params && (typeof c.params !== 'object' || Array.isArray(c.params))) throw new Error('Invalid clip parameters.');
                if (c.overlays && (typeof c.overlays !== 'object' || !c.overlays.enabled || !c.overlays.params)) throw new Error('Invalid clip overlays.');
                var id = Number(c.id);
                if (!Number.isSafeInteger(id) || id < 1 || ids[id]) id = index + 1;
                while (ids[id]) id++;
                ids[id] = true;
                return normalizeClip({ id: id, effectName: c.effectName, start: Number(c.start), duration: Number(c.duration),
                    params: c.params || null, overlays: c.overlays || null, transition: c.transition,
                    transitionDuration: c.transitionDuration, seed: c.seed,
                    seedVec: Array.isArray(c.seedVec) ? c.seedVec.slice(0, 4) : null });
            });
            var duration = data.totalDuration === undefined ? 30 : Number(data.totalDuration);
            if (!isFinite(duration) || duration < 5 || !Number.isSafeInteger(Math.ceil(duration))) throw new Error('Invalid timeline duration.');
            // Commit only after validating everything; a bad file cannot erase the timeline.
            pause();
            clips = imported.sort(function(a, b) { return a.start - b.start; });
            totalDuration = duration;
            loop = data.loop === true;
            nextClipId = clips.reduce(function(max, c) { return Math.max(max, c.id + 1); }, 1);
            playhead = 0;
            activeClipId = null;
            if (onUpdate) onUpdate();
            return true;
        } catch(e) {
            console.error('Failed to load timeline:', e);
            return false;
        }
    }

    return {
        createClip: createClip,
        addCurrentAsClip: addCurrentAsClip,
        removeClip: removeClip,
        updateClip: updateClip,
        duplicateClip: duplicateClip,
        getClip: getClip,
        getClipAt: getClipAt,
        getClips: getClips,
        play: play,
        pause: pause,
        stop: stop,
        seek: seek,
        isPlaying: isPlaying,
        getPlayhead: getPlayhead,
        getDuration: getDuration,
        setDuration: setDuration,
        getMode: getMode,
        setMode: setMode,
        setLoop: setLoop,
        isLoop: isLoop,
        setOnUpdate: setOnUpdate,
        setOnClipChange: setOnClipChange,
        clear: clear,
        toJSON: toJSON,
        fromJSON: fromJSON
    };
})();
