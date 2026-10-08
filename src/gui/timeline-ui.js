/* Psychedelia Studio - Timeline UI */
var TimelineUI = (function() {
    'use strict';

    var container = null;
    var trackEl = null;
    var playheadEl = null;
    var rulerEl = null;
    var visible = false;
    var pixelsPerSecond = 40;
    var scrollLeft = 0;
    var selectedClipId = null;
    var dragging = null; // { type: 'move'|'resize-left'|'resize-right', clipId, startX, startVal }

    // Color palette for clips
    var catColors = {
        'Demoscene': '#ff6644',
        'Fractals': '#8844ff',
        'Shadertoy': '#55ccff',
        'Noise': '#44cc88',
        'Distortion': '#ff44aa',
        'Math': '#44aaff',
        'Color': '#ffaa22',
        'Simulation': '#aa44ff'
    };

    function init() {
        // Create timeline panel
        container = document.createElement('div');
        container.id = 'timelinePanel';
        container.className = 'hidden';
        container.innerHTML = `
            <div class="tl-toolbar">
                <button id="tlToggle" class="tl-btn" title="Show/Hide Timeline">Timeline</button>
                <div class="tl-controls">
                    <button id="tlAddClip" class="tl-btn" title="Add current effect as clip">+ Add Clip</button>
                    <span class="tl-sep">|</span>
                    <button id="tlPlay" class="tl-btn" title="Play timeline">&#9654;</button>
                    <button id="tlPause" class="tl-btn" title="Pause">&#9646;&#9646;</button>
                    <button id="tlStop" class="tl-btn" title="Stop/Rewind">&#9632;</button>
                    <span class="tl-sep">|</span>
                    <label class="tl-loop-label"><input type="checkbox" id="tlLoop"> Loop</label>
                    <span class="tl-sep">|</span>
                    <span id="tlTime" class="tl-time">0:00.0 / 0:30.0</span>
                    <span class="tl-sep">|</span>
                    <button id="tlZoomIn" class="tl-btn" title="Zoom In">+</button>
                    <button id="tlZoomOut" class="tl-btn" title="Zoom Out">-</button>
                    <span class="tl-sep">|</span>
                    <button id="tlClear" class="tl-btn" title="Clear timeline">Clear</button>
                    <button id="tlSave" class="tl-btn" title="Save timeline">Save</button>
                    <button id="tlLoad" class="tl-btn" title="Load timeline">Load</button>
                </div>
            </div>
            <div class="tl-body">
                <div class="tl-ruler" id="tlRuler"></div>
                <div class="tl-track-area" id="tlTrackArea">
                    <div class="tl-track" id="tlTrack"></div>
                    <div class="tl-playhead" id="tlPlayhead"></div>
                </div>
            </div>
            <div class="tl-clip-editor hidden" id="tlClipEditor">
                <div class="tl-clip-editor-header">
                    <span id="tlClipName">Clip</span>
                    <div>
                        <button id="tlClipDuplicate" class="tl-btn-sm">Duplicate</button>
                        <button id="tlClipDelete" class="tl-btn-sm tl-btn-danger">Delete</button>
                        <button id="tlClipClose" class="tl-btn-sm">Close</button>
                    </div>
                </div>
                <div class="tl-clip-editor-body">
                    <div class="tl-clip-field">
                        <label>Effect</label>
                        <select id="tlClipEffect"></select>
                    </div>
                    <div class="tl-clip-field">
                        <label>Start (sec)</label>
                        <input type="number" id="tlClipStart" step="0.1" min="0">
                    </div>
                    <div class="tl-clip-field">
                        <label>Duration (sec)</label>
                        <input type="number" id="tlClipDuration" step="0.1" min="0.5">
                    </div>
                    <div class="tl-clip-field">
                        <label>Transition</label>
                        <select id="tlClipTransition">
                            <option value="cut">Cut</option>
                            <option value="flash">Flash Cut</option>
                        </select>
                    </div>
                    <div class="tl-clip-field">
                        <label>Capture Params</label>
                        <button id="tlClipCapture" class="tl-btn-sm">Snapshot Current</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app').appendChild(container);

        // Cache elements
        trackEl = document.getElementById('tlTrack');
        playheadEl = document.getElementById('tlPlayhead');
        rulerEl = document.getElementById('tlRuler');

        wireEvents();
        Timeline.setOnUpdate(render);

        // Populate clip effect dropdown
        var sel = document.getElementById('tlClipEffect');
        var effects = EffectRegistry.getList();
        effects.forEach(function(e) {
            var opt = document.createElement('option');
            opt.value = e.name;
            opt.textContent = e.label;
            sel.appendChild(opt);
        });
    }

    function wireEvents() {
        // Toggle visibility
        document.getElementById('tlToggle').addEventListener('click', function() {
            toggle();
        });

        // Add clip
        document.getElementById('tlAddClip').addEventListener('click', function() {
            Timeline.addCurrentAsClip();
        });

        // Transport
        document.getElementById('tlPlay').addEventListener('click', function() {
            Renderer.play();
            Timeline.play();
        });
        document.getElementById('tlPause').addEventListener('click', function() {
            Timeline.pause();
        });
        document.getElementById('tlStop').addEventListener('click', function() {
            Timeline.stop();
        });

        // Loop
        document.getElementById('tlLoop').addEventListener('change', function() {
            Timeline.setLoop(this.checked);
        });

        // Zoom
        document.getElementById('tlZoomIn').addEventListener('click', function() {
            pixelsPerSecond = Math.min(pixelsPerSecond * 1.5, 200);
            render();
        });
        document.getElementById('tlZoomOut').addEventListener('click', function() {
            pixelsPerSecond = Math.max(pixelsPerSecond / 1.5, 10);
            render();
        });

        // Clear
        document.getElementById('tlClear').addEventListener('click', function() {
            if (confirm('Clear entire timeline?')) Timeline.clear();
        });

        // Save/Load
        document.getElementById('tlSave').addEventListener('click', function() {
            var json = Timeline.toJSON();
            var blob = new Blob([json], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'psychedelia_timeline.json';
            a.click();
            setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
        });

        document.getElementById('tlLoad').addEventListener('click', function() {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', function() {
                if (!input.files || !input.files[0]) return;
                var reader = new FileReader();
                reader.onload = function() {
                    if (!Timeline.fromJSON(reader.result) && typeof UIShell !== 'undefined') UIShell.toast('Could not load this timeline file.', 'error');
                };
                reader.readAsText(input.files[0]);
            });
            input.click();
        });

        // Click on track to seek
        document.getElementById('tlTrackArea').addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('tl-clip') || e.target.closest('.tl-clip')) return;
            var rect = this.getBoundingClientRect();
            var x = e.clientX - rect.left + this.scrollLeft;
            var time = x / pixelsPerSecond;
            Timeline.seek(time);
        });

        // Clip editor events
        document.getElementById('tlClipClose').addEventListener('click', closeClipEditor);
        document.getElementById('tlClipDelete').addEventListener('click', function() {
            if (selectedClipId) {
                Timeline.removeClip(selectedClipId);
                closeClipEditor();
            }
        });
        document.getElementById('tlClipDuplicate').addEventListener('click', function() {
            if (selectedClipId) Timeline.duplicateClip(selectedClipId);
        });
        document.getElementById('tlClipCapture').addEventListener('click', function() {
            if (!selectedClipId) return;
            var params = {};
            var vals = (Controls.getBaseValues ? Controls.getBaseValues() : Controls.getValues());
            for (var k in vals) params[k] = vals[k];
            Timeline.updateClip(selectedClipId, { params: params });
        });

        document.getElementById('tlClipEffect').addEventListener('change', function() {
            if (selectedClipId) Timeline.updateClip(selectedClipId, { effectName: this.value });
        });
        document.getElementById('tlClipStart').addEventListener('change', function() {
            if (selectedClipId) Timeline.updateClip(selectedClipId, { start: parseFloat(this.value) });
        });
        document.getElementById('tlClipDuration').addEventListener('change', function() {
            if (selectedClipId) Timeline.updateClip(selectedClipId, { duration: parseFloat(this.value) });
        });
        document.getElementById('tlClipTransition').addEventListener('change', function() {
            if (selectedClipId) Timeline.updateClip(selectedClipId, { transition: this.value });
        });

        // Drag support
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
    }

    function toggle() {
        visible = !visible;
        container.classList.toggle('hidden', !visible);
        if (visible) render();
    }

    function show() {
        visible = true;
        container.classList.remove('hidden');
        render();
    }

    // --- Rendering ---
    function render(reason) {
        if (!visible) return;

        var clips = Timeline.getClips();
        var duration = Timeline.getDuration();
        var ph = Timeline.getPlayhead();
        if (reason === 'playhead') {
            playheadEl.style.left = (ph * pixelsPerSecond) + 'px';
            document.getElementById('tlTime').textContent = formatTime(ph) + ' / ' + formatTime(duration);
            return;
        }

        // Ruler
        renderRuler(duration);

        // Track width
        var totalWidth = duration * pixelsPerSecond;
        trackEl.style.width = totalWidth + 'px';

        // Clips
        trackEl.innerHTML = '';
        clips.forEach(function(clip) {
            var el = document.createElement('div');
            el.className = 'tl-clip' + (clip.id === selectedClipId ? ' selected' : '');
            el.style.left = (clip.start * pixelsPerSecond) + 'px';
            el.style.width = (clip.duration * pixelsPerSecond) + 'px';

            // Get effect info for color
            var effectList = EffectRegistry.getList();
            var effectInfo = effectList.find(function(e) { return e.name === clip.effectName; });
            var cat = effectInfo ? effectInfo.category : 'Other';
            var color = catColors[cat] || '#666';
            el.style.borderColor = color;
            el.style.background = color + '22';

            // Label
            var label = effectInfo ? effectInfo.label : clip.effectName;
            var labelEl = document.createElement('span');
            labelEl.className = 'tl-clip-label';
            labelEl.textContent = label;
            var durationEl = document.createElement('span');
            durationEl.className = 'tl-clip-dur';
            durationEl.textContent = clip.duration.toFixed(1) + 's';
            var leftHandle = document.createElement('div');
            leftHandle.className = 'tl-clip-handle tl-handle-left';
            var rightHandle = document.createElement('div');
            rightHandle.className = 'tl-clip-handle tl-handle-right';
            el.appendChild(labelEl);
            el.appendChild(durationEl);
            el.appendChild(leftHandle);
            el.appendChild(rightHandle);

            // Click to select
            el.addEventListener('mousedown', function(e) {
                if (e.target.classList.contains('tl-handle-left')) {
                    startDrag('resize-left', clip.id, e);
                } else if (e.target.classList.contains('tl-handle-right')) {
                    startDrag('resize-right', clip.id, e);
                } else {
                    selectClip(clip.id);
                    startDrag('move', clip.id, e);
                }
                e.stopPropagation();
            });

            // Double-click to seek
            el.addEventListener('dblclick', function(e) {
                Timeline.seek(clip.start);
                e.stopPropagation();
            });

            trackEl.appendChild(el);
        });

        // Playhead
        playheadEl.style.left = (ph * pixelsPerSecond) + 'px';

        // Time display
        var timeEl = document.getElementById('tlTime');
        timeEl.textContent = formatTime(ph) + ' / ' + formatTime(duration);
    }

    function renderRuler(duration) {
        rulerEl.innerHTML = '';
        rulerEl.style.width = (duration * pixelsPerSecond) + 'px';

        // Determine tick interval
        var interval = 1;
        if (pixelsPerSecond < 20) interval = 5;
        else if (pixelsPerSecond < 40) interval = 2;
        else if (pixelsPerSecond > 100) interval = 0.5;
        // Large imported timelines should not create millions of DOM nodes.
        if (duration / interval > 1000) interval = Math.ceil(duration / 1000);

        for (var t = 0; t <= duration; t += interval) {
            var tick = document.createElement('div');
            tick.className = 'tl-ruler-tick';
            tick.style.left = (t * pixelsPerSecond) + 'px';

            var isMajor = t % (interval >= 1 ? 5 : 1) === 0;
            if (isMajor) {
                tick.classList.add('major');
                var labelSpan = document.createElement('span');
                labelSpan.textContent = formatTime(t);
                tick.appendChild(labelSpan);
            }

            rulerEl.appendChild(tick);
        }
    }

    function formatTime(sec) {
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
    }

    // --- Clip Selection ---
    function selectClip(id) {
        selectedClipId = id;
        var clip = Timeline.getClip(id);
        if (!clip) return;

        document.getElementById('tlClipEditor').classList.remove('hidden');
        document.getElementById('tlClipName').textContent = clip.effectName;
        document.getElementById('tlClipEffect').value = clip.effectName;
        document.getElementById('tlClipStart').value = clip.start;
        document.getElementById('tlClipDuration').value = clip.duration;
        document.getElementById('tlClipTransition').value = clip.transition === 'flash' ? 'flash' : 'cut';

        render();
    }

    function closeClipEditor() {
        selectedClipId = null;
        document.getElementById('tlClipEditor').classList.add('hidden');
        render();
    }

    // --- Drag & Drop ---
    function startDrag(type, clipId, e) {
        var clip = Timeline.getClip(clipId);
        if (!clip) return;
        dragging = {
            type: type,
            clipId: clipId,
            startX: e.clientX,
            origStart: clip.start,
            origDuration: clip.duration
        };
    }

    function onDragMove(e) {
        if (!dragging) return;
        var dx = e.clientX - dragging.startX;
        var dt = dx / pixelsPerSecond;
        var clip = Timeline.getClip(dragging.clipId);
        if (!clip) return;

        if (dragging.type === 'move') {
            var newStart = Math.max(0, dragging.origStart + dt);
            Timeline.updateClip(dragging.clipId, { start: newStart });
        } else if (dragging.type === 'resize-left') {
            var newStart = Math.max(0, dragging.origStart + dt);
            var newDuration = dragging.origDuration - dt;
            if (newDuration >= 0.5) {
                Timeline.updateClip(dragging.clipId, { start: newStart, duration: newDuration });
            }
        } else if (dragging.type === 'resize-right') {
            var newDuration = Math.max(0.5, dragging.origDuration + dt);
            Timeline.updateClip(dragging.clipId, { duration: newDuration });
        }
    }

    function onDragEnd() {
        dragging = null;
    }

    return {
        init: init,
        toggle: toggle,
        show: show,
        render: render
    };
})();
