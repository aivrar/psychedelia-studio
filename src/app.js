/* Psychedelia Studio - Main Application */
(function() {
    'use strict';

    var effectFilterState = {
        query: '',
        category: 'all'
    };
    var noticeTimer = null;
    var globalErrorHandlersReady = false;

    function showNotice(message, type, durationMs) {
        var body = document.body;
        if (!body) return;
        var notice = document.getElementById('appNotice');
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'appNotice';
            notice.setAttribute('role', 'status');
            notice.setAttribute('aria-live', 'polite');
            body.appendChild(notice);
        }
        notice.className = 'app-notice ' + (type || 'info');
        notice.textContent = String(message || '');
        notice.classList.remove('hidden');
        if (noticeTimer) clearTimeout(noticeTimer);
        noticeTimer = setTimeout(function() {
            notice.classList.add('hidden');
        }, durationMs || 4200);
    }

    function installGlobalErrorHandlers() {
        if (globalErrorHandlersReady) return;
        globalErrorHandlersReady = true;
        window.PsychedeliaNotify = showNotice;
        window.addEventListener('error', function(event) {
            var message = event && event.message || 'Unexpected app error.';
            console.error('Psychedelia runtime error:', event && (event.error || event.message) || event);
            showNotice(message, 'error', 8000);
        });
        window.addEventListener('unhandledrejection', function(event) {
            var reason = event && event.reason;
            var message = reason && reason.message || String(reason || 'Unhandled async error.');
            console.error('Psychedelia async error:', reason || event);
            showNotice(message, 'error', 8000);
        });
    }

    function init() {
        // Initialize renderer
        Renderer.init();
        if (Renderer.getMode && Renderer.getMode() === 'cpu') {
            showNotice('WebGL is unavailable. CPU mode is limited to CPU-capable effects.', 'error', 9000);
        }

        // Initialize controls
        Controls.init();

        // Initialize overlays
        Overlays.init();
        var res = Renderer.getResolution();
        Overlays.resize(res.width, res.height);

        // Initialize overlay controls UI
        OverlayControls.init();

        // Initialize post-processing
        if (Renderer.getMode() !== 'cpu') {
            PostProcess.init();
            PostProcessControls.init();
        }

        // Initialize timeline
        TimelineUI.init();

        // Initialize music controls UI (engine inits on first play click)
        MusicControls.init();


        // Populate effect selector
        populateEffectCategories();
        populateEffects();

        // Wire up UI events
        wireEvents();

        if (typeof UIShell !== 'undefined') UIShell.init();
        if (typeof RenderControls !== 'undefined') RenderControls.init();
        window.PsychedeliaRefreshEffects = populateEffects;

        // Load first effect, then the last one used (compiled in the background).
        var list = EffectRegistry.getList();
        if (list.length > 0) {
            EffectRegistry.switchTo(list[0].name);
            document.getElementById('effectSelect').value = list[0].name;
        }
        var last = typeof UIShell !== 'undefined' ? UIShell.lastEffect() : '';
        if (last && last !== list[0].name && EffectRegistry.getDefinition(last)) {
            document.getElementById('effectSelect').value = last;
            EffectRegistry.switchToAsync(last);
        }
        if (typeof Setups !== 'undefined') Setups.init().then(function() { EditHistory.init(); });
    }

    function populateEffects() {
        var select = document.getElementById('effectSelect');
        var list = EffectRegistry.getList();
        var catOrder = ['Demoscene', 'Psychedelic', 'Fractals', 'Endless Scenes', 'Geometry', 'Patterns', 'Shadertoy', 'Noise', 'Distortion', 'Math', 'Color', 'Retro', 'Simulation'];
        var current = EffectRegistry.getCurrent();
        var currentName = current && current.name || select.value || '';
        var query = effectFilterState.query.trim().toLowerCase();
        var category = effectFilterState.category;
        var cats = {};

        select.innerHTML = '';

        var favoritesOnly = category === 'favorites';
        list.forEach(function(effect) {
            var effectCategory = effect.category || 'Other';
            if (favoritesOnly) {
                if (!isFavorite(effect.name)) return;
            } else if (category !== 'all' && effectCategory !== category) return;
            if (query && !effectMatchesQuery(effect, query)) return;
            if (!cats[effectCategory]) cats[effectCategory] = [];
            cats[effectCategory].push(effect);
        });

        catOrder.forEach(function(cat) {
            if (!cats[cat]) return;
            var group = document.createElement('optgroup');
            group.label = cat;

            cats[cat].forEach(function(effect) {
                var opt = document.createElement('option');
                opt.value = effect.name;
                opt.textContent = (isFavorite(effect.name) ? '★ ' : '') + effect.label;
                decorateEffectOption(opt, effect);
                group.appendChild(opt);
            });

            select.appendChild(group);
        });

        // Any remaining categories
        for (var cat in cats) {
            if (catOrder.indexOf(cat) >= 0) continue;
            var group = document.createElement('optgroup');
            group.label = cat;
            cats[cat].forEach(function(effect) {
                var opt = document.createElement('option');
                opt.value = effect.name;
                opt.textContent = (isFavorite(effect.name) ? '★ ' : '') + effect.label;
                decorateEffectOption(opt, effect);
                group.appendChild(opt);
            });
            select.appendChild(group);
        }

        var countEl = document.getElementById('effectCount');
        if (countEl) countEl.textContent = select.options.length + ' / ' + list.length;

        if (select.options.length === 0) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = favoritesOnly ? 'No favorites yet (press S)' : 'No effects match';
            empty.disabled = true;
            select.appendChild(empty);
            return;
        }

        if (currentName && hasOption(select, currentName)) {
            select.value = currentName;
        }
    }

    function isFavorite(name) {
        return typeof UIShell !== 'undefined' && UIShell.isFavorite(name);
    }

    function populateEffectCategories() {
        var filter = document.getElementById('effectCategoryFilter');
        if (!filter) return;
        var list = EffectRegistry.getList();
        var seen = {};
        var catOrder = ['all', 'Demoscene', 'Psychedelic', 'Fractals', 'Geometry', 'Patterns', 'Shadertoy', 'Noise', 'Distortion', 'Math', 'Color', 'Retro', 'Simulation'];
        list.forEach(function(effect) {
            seen[effect.category || 'Other'] = true;
        });
        filter.innerHTML = '';
        catOrder.forEach(function(cat) {
            if (cat !== 'all' && !seen[cat]) return;
            appendCategoryOption(filter, cat);
            if (cat === 'all') appendCategoryOption(filter, 'favorites');
        });
        Object.keys(seen).sort().forEach(function(cat) {
            if (catOrder.indexOf(cat) >= 0) return;
            appendCategoryOption(filter, cat);
        });
        filter.value = 'all';
    }

    function appendCategoryOption(select, cat) {
        var opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat === 'all' ? 'All Categories' : (cat === 'favorites' ? '★ Favorites' : cat);
        select.appendChild(opt);
    }

    function hasOption(select, value) {
        for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].value === value) return true;
        }
        return false;
    }

    function effectMatchesQuery(effect, query) {
        var meta = effect.fractalFlight || null;
        var haystack = [
            effect.name,
            effect.label,
            effect.category,
            meta && meta.family,
            meta && meta.familyKey,
            meta && meta.modeParam,
            meta && meta.renderCost,
            meta && Array.isArray(meta.modes) ? meta.modes.join(' ') : '',
            meta && Array.isArray(meta.modeTokens) ? meta.modeTokens.join(' ') : '',
            meta && Array.isArray(meta.animationParams) ? meta.animationParams.join(' ') : '',
            meta && Array.isArray(meta.structuralParams) ? meta.structuralParams.join(' ') : '',
            meta && Array.isArray(meta.smokePresets) ? meta.smokePresets.map(function(preset) {
                return preset && preset.name || '';
            }).join(' ') : ''
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.indexOf(query) >= 0;
    }

    function decorateEffectOption(option, effect) {
        var meta = effect.fractalFlight || null;
        if (!meta) return;
        if (meta.renderCost) option.dataset.renderCost = meta.renderCost;
        if (meta.familyKey) option.dataset.familyKey = meta.familyKey;
        if (meta.modeParam) option.dataset.modeParam = meta.modeParam;
        var title = [
            meta.family || effect.label,
            meta.renderCost ? 'Cost: ' + meta.renderCost : '',
            meta.modeParam ? 'Mode: ' + meta.modeParam : '',
            Array.isArray(meta.modes) && meta.modes.length ? 'Modes: ' + meta.modes.join(', ') : ''
        ].filter(Boolean).join(' | ');
        if (title) option.title = title;
    }

    function wireEvents() {
        var effectSearch = document.getElementById('effectSearch');
        if (effectSearch) {
            effectSearch.addEventListener('input', function() {
                effectFilterState.query = this.value || '';
                populateEffects();
            });
        }

        var effectCategoryFilter = document.getElementById('effectCategoryFilter');
        if (effectCategoryFilter) {
            effectCategoryFilter.addEventListener('change', function() {
                effectFilterState.category = this.value || 'all';
                populateEffects();
            });
        }

        // Effect selector
        document.getElementById('effectSelect').addEventListener('change', function() {
            if (!this.value) return;
            // Background compile keeps the UI live while big shaders build.
            // Automated tools set window.__psySyncSwitch to get the old
            // immediate switch so they can assert on the result right away.
            if (window.__psySyncSwitch) EffectRegistry.switchTo(this.value);
            else EffectRegistry.switchToAsync(this.value);
        });

        // Randomize
        document.getElementById('btnRandomize').addEventListener('click', function() {
            Controls.randomize();
        });

        // Play/Pause
        document.getElementById('btnPlay').addEventListener('click', function() {
            Renderer.play();
            this.classList.add('active');
            document.getElementById('btnPause').classList.remove('active');
        });

        document.getElementById('btnPause').addEventListener('click', function() {
            Renderer.pause();
            this.classList.add('active');
            document.getElementById('btnPlay').classList.remove('active');
        });

        var uiPriorityMode = document.getElementById('uiPriorityMode');
        if (uiPriorityMode) {
            Renderer.setInputPriorityMode(uiPriorityMode.value);
            uiPriorityMode.addEventListener('change', function() {
                Renderer.setInputPriorityMode(this.value);
                Renderer.prioritizeInput(420);
            });
        }

        var qualitySelect = document.getElementById('qualitySelect');
        if (qualitySelect && Renderer.setQualityMode) {
            Renderer.setQualityMode(qualitySelect.value);
            qualitySelect.addEventListener('change', function() {
                Renderer.setQualityMode(this.value);
            });
        }
        var previewFpsSelect = document.getElementById('previewFpsSelect');
        if (previewFpsSelect && Renderer.setMaxPreviewFps) {
            Renderer.setMaxPreviewFps(previewFpsSelect.value);
            previewFpsSelect.addEventListener('change', function() {
                Renderer.setMaxPreviewFps(this.value);
            });
        }
        if (EffectRegistry.onSwitch && Renderer.resetAutoQuality) {
            EffectRegistry.onSwitch(function() { Renderer.resetAutoQuality(); });
        }

        var durationInput = document.getElementById('durationInput');
        function syncPreviewDuration() {
            if (!durationInput || !Renderer.setPreviewDuration) return;
            var value = parseFloat(durationInput.value);
            if (!isFinite(value)) value = 10;
            value = Math.max(1, Math.min(300, value));
            Renderer.setPreviewDuration(value);
        }
        // Animation: continuous (default) or looping every Loop Length seconds.
        var loopMode = document.getElementById('loopMode');
        if (loopMode && Renderer.setLoopEnabled) {
            Renderer.setLoopEnabled(loopMode.value === 'loop');
            loopMode.addEventListener('change', function() { Renderer.setLoopEnabled(this.value === 'loop'); });
        }
        if (durationInput) {
            syncPreviewDuration();
            durationInput.addEventListener('input', syncPreviewDuration);
            durationInput.addEventListener('change', function() {
                syncPreviewDuration();
                var value = Renderer.getPreviewDuration ? Renderer.getPreviewDuration() : parseFloat(durationInput.value);
                durationInput.value = String(Math.round(value * 100) / 100);
            });
        }

        // Recording format, quality and sound
        var liveRecordChoices = null;
        function syncRecordOptions() {
            if (!VideoExport.setOptions) return;
            var fmt = document.getElementById('recFormat');
            var quality = document.getElementById('recQuality');
            var audio = document.getElementById('recAudio');
            var detail = document.getElementById('recDetail');
            var captureMode = document.getElementById('recMode');
            var smooth = captureMode && captureMode.value === 'smooth';
            if (!VideoExport.isRecording() && !VideoExport.isSaving()) {
                if (smooth) {
                    if (!liveRecordChoices) liveRecordChoices = { format: fmt.value, audio: audio.value, detail: detail.value };
                    fmt.value = 'mp4'; detail.value = 'full';
                } else if (liveRecordChoices) {
                    fmt.value = liveRecordChoices.format; audio.value = liveRecordChoices.audio; detail.value = liveRecordChoices.detail;
                    liveRecordChoices = null;
                }
                [fmt, detail].forEach(function(el) { if (el) el.disabled = !!smooth; });
                var soundOption = audio.querySelector('option[value="all"]');
                if (soundOption) soundOption.textContent = smooth ? 'Soundtrack + reactions' : 'Record app audio';
                audio.title = smooth ? 'Uses Studio Music or the loaded Audio File selected in the Audio tab' : 'Records the studio music, the audio file and captured playback';
                var length = document.getElementById('recLength');
                if (smooth && length.value === 'manual') length.value = 'preview';
                var manual = length.querySelector('option[value="manual"]');
                if (manual) manual.disabled = !!smooth;
                var fullDetail = detail.querySelector('option[value="full"]');
                if (fullDetail) fullDetail.textContent = smooth ? 'Full detail' : 'Full detail (live recording may stutter)';
            }
            VideoExport.setOptions({ format: fmt && fmt.value, quality: quality && quality.value, audio: audio && audio.value, detail: detail && detail.value, mode: captureMode && captureMode.value });
            var info = document.getElementById('recInfo');
            if (info && VideoExport.describe) {
                var res = Renderer.getResolution();
                var len = document.getElementById('recLength');
                var loopOn = !!(Renderer.isLoopEnabled && Renderer.isLoopEnabled());
                var loopLen = loopLengthSec();
                var lenSec = recordLengthSec();
                var lenText = !lenSec ? 'records until you press stop' :
                    (len && len.value === 'preview' && loopOn ? 'records one loop (' + formatSeconds(loopLen) + ')' : 'stops after ' + formatSeconds(lenSec));
                if (loopOn && (!lenSec || lenSec > loopLen + 0.01)) {
                    lenText += '. Animation is set to Loop, so the visuals repeat every ' + formatSeconds(loopLen);
                }
                var recFps = parseInt(document.getElementById('fpsSelect').value, 10) || 30;
                info.textContent = VideoExport.describe(res.width, res.height, recFps, lenText);
                // Ask once per setting whether the hardware encoder covers it; refresh when known.
                if (VideoExport.checkHardware) {
                    VideoExport.checkHardware(res.width, res.height, recFps).then(function(fresh) { if (fresh) syncRecordOptions(); });
                }
            }
        }
        function loopLengthSec() {
            var v = parseFloat(document.getElementById('durationInput').value);
            return isFinite(v) ? Math.max(1, Math.min(300, v)) : 10;
        }
        // Recording Length in seconds; 0 = until stopped.
        function recordLengthSec() {
            var len = document.getElementById('recLength');
            var mode = len ? len.value : 'manual';
            if (mode === 'manual') return 0;
            if (mode === 'preview') return loopLengthSec();
            var v = parseFloat(mode);
            return isFinite(v) && v > 0 ? v : 0;
        }
        function formatSeconds(sec) {
            if (sec < 60) return (Math.round(sec * 10) / 10) + ' s';
            var m = Math.floor(sec / 60), s = Math.round(sec % 60);
            return m + ' min' + (s ? ' ' + s + ' s' : '');
        }
        (function initRecordOptions() {
            var fmt = document.getElementById('recFormat');
            function labelFormats() {
                if (!fmt || !VideoExport.getFormats) return;
                VideoExport.getFormats().forEach(function(f) {
                    var opt = fmt.querySelector('option[value="' + f.id + '"]');
                    if (opt) opt.textContent = f.label + (f.supported ? '' : ' (not supported here)');
                });
            }
            labelFormats();
            ['recMode', 'recFormat', 'recQuality', 'recAudio', 'recLength', 'recDetail', 'resSelect', 'fpsSelect', 'durationInput', 'loopMode'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.addEventListener('change', function() { setTimeout(syncRecordOptions, 0); });
            });
            syncRecordOptions();
            // Refresh once the encoder check is done (it settles the real audio bitrate).
            if (VideoExport.ready) VideoExport.ready().then(function() { labelFormats(); syncRecordOptions(); });
        })();

        // Record
        document.getElementById('btnRecord').addEventListener('click', function() {
            if (VideoExport.isRecording()) {
                VideoExport.stopRecording();
            } else {
                syncRecordOptions();
                if (!VideoExport.isSupported()) {
                    showNotice('Recording is not supported in this browser.', 'error');
                    return;
                }
                var canvas = Renderer.getCanvas();
                var fps = parseInt(document.getElementById('fpsSelect').value, 10) || 30;
                // Recording Length: until stopped, the Loop Length, or a number of seconds.
                var lengthSel = document.getElementById('recLength');
                var oneLoop = !!(lengthSel && lengthSel.value === 'preview' && Renderer.isLoopEnabled && Renderer.isLoopEnabled());
                var duration = recordLengthSec();
                var started = false;

                // One loop: start at the top of the animation clock.
                if (oneLoop) Renderer.resetTime();
                if (duration > 0) {
                    started = VideoExport.timedRecording(canvas, duration, fps);
                } else {
                    started = VideoExport.startRecording(canvas, fps);
                }
                if (!started) {
                    showNotice(VideoExport.getLastError ? VideoExport.getLastError() : 'Recording failed.', 'error');
                } else {
                    var info = VideoExport.getLastInfo ? VideoExport.getLastInfo() : '';
                    var stopHint = duration > 0 ? 'Stops after ' + formatSeconds(duration) + ', or press R to stop early.' : 'Press R or click REC to stop.';
                    if (VideoExport.getOptions().mode === 'smooth') stopHint = 'Rendering every frame. This can take longer than ' + formatSeconds(duration) + '. Press R to save early.';
                    showNotice('Recording ' + (info || 'started') + '. ' + stopHint, 'success', 5000);
                }
            }
        });

        // After a recording is saved: say so, and explain if frames were dropped.
        window.addEventListener('psychedelia:recording-error', function(e) {
            showNotice(e.detail && e.detail.message || 'Recording failed.', 'error', 12000);
        });
        window.addEventListener('psychedelia:recording-saved', function(e) {
            var d = e.detail || {};
            var msg = 'Saved ' + formatSeconds(d.seconds || 0) + ' of video (' + Math.round(d.megabytes || 0) + ' MB' + (d.audio ? ', with sound' : '') + ').';
            if (d.avgFps && d.fps && d.avgFps < d.fps * 0.85) {
                msg += ' It averaged ' + Math.round(d.avgFps) + ' of ' + d.fps + ' fps because the computer could not keep up, so motion may look jumpy.' +
                    ' Use Smooth MP4 for video with every frame, or reduce resolution and FX for live recording with audio.';
                showNotice(msg, 'info', 12000);
            } else {
                showNotice(msg, 'success', 4000);
            }
        });

        // Reset all looks: FX, overlays, beat reactions and links.
        var resetLooksBtn = document.getElementById('btnResetLooks');
        if (resetLooksBtn) resetLooksBtn.addEventListener('click', function() {
            if (typeof Looks === 'undefined') return;
            Looks.reset('all');
            showNotice('FX, overlays and links reset. Global beat reactions back to the Club style.', 'success', 2200);
        });

        // Fullscreen
        document.getElementById('btnFullscreen').addEventListener('click', function() {
            var wrap = document.getElementById('canvasWrap');
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                wrap.requestFullscreen();
            }
        });

        // Timeline
        document.getElementById('btnTimeline').addEventListener('click', function() {
            TimelineUI.toggle();
        });

        // Gallery
        document.getElementById('btnGallery').addEventListener('click', function() {
            Gallery.show();
        });
        document.getElementById('galleryClose').addEventListener('click', function() {
            Gallery.hide();
        });

        // Settings
        document.getElementById('btnSettings').addEventListener('click', function() {
            document.getElementById('settingsModal').classList.remove('hidden');
        });
        document.getElementById('settingsClose').addEventListener('click', function() {
            document.getElementById('settingsModal').classList.add('hidden');
        });

        // Animation Speed
        document.getElementById('animSpeed').addEventListener('input', function() {
            var v = parseFloat(this.value);
            Renderer.setAnimSpeed(v);
            document.getElementById('animSpeedVal').textContent = v.toFixed(1) + 'x';
        });

        // Global motion reset and effect parameter defaults
        var motionReset = document.getElementById('motionReset');
        if (motionReset) motionReset.addEventListener('click', function(e) {
            e.stopPropagation();
            [['animSpeed', '1'], ['rotSpeed', '0'], ['viewZoom', '1'], ['viewZoomDepth', '0'], ['viewZoomSpeed', '0.7']].forEach(function(pair) {
                var el = document.getElementById(pair[0]);
                if (!el) return;
                el.value = pair[1];
                el.dispatchEvent(new Event('input', { bubbles: true }));
            });
            if (Renderer.setRotation) Renderer.setRotation(0);
        });
        var paramsReset = document.getElementById('paramsReset');
        if (paramsReset) paramsReset.addEventListener('click', function(e) {
            e.stopPropagation();
            if (Controls.resetToDefaults) Controls.resetToDefaults();
            showNotice('Parameters back to defaults.', 'success', 1400);
        });

        // Rotation Speed
        document.getElementById('rotSpeed').addEventListener('input', function() {
            var v = parseFloat(this.value);
            Renderer.setRotationSpeed(v);
            document.getElementById('rotSpeedVal').textContent = v === 0 ? '0' : (v > 0 ? '+' : '') + v.toFixed(1);
        });

        // Global view zoom
        document.getElementById('viewZoom').addEventListener('input', function() {
            var v = parseFloat(this.value);
            Renderer.setViewZoom(v);
            document.getElementById('viewZoomVal').textContent = v.toFixed(2) + 'x';
        });

        document.getElementById('viewZoomDepth').addEventListener('input', function() {
            var v = parseFloat(this.value);
            Renderer.setViewZoomDepth(v);
            document.getElementById('viewZoomDepthVal').textContent = Math.round(v * 100) + '%';
        });

        document.getElementById('viewZoomSpeed').addEventListener('input', function() {
            var v = Math.max(0, parseFloat(this.value) || 0);
            this.value = String(v);
            Renderer.setViewZoomSpeed(v);
            document.getElementById('viewZoomSpeedVal').textContent = v.toFixed(2);
        });

        // Keep the final native range position reliable in embedded browsers
        // that only commit a drag on change rather than continuously on input.
        ['animSpeed', 'rotSpeed', 'viewZoom', 'viewZoomDepth', 'viewZoomSpeed'].forEach(function(id) {
            var range = document.getElementById(id);
            if (!range) return;
            range.addEventListener('change', function() {
                range.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });

        // Resolution
        document.getElementById('resSelect').addEventListener('change', function() {
            var parts = this.value.split('x');
            var width = parseInt(parts[0]);
            var height = parseInt(parts[1]);
            Renderer.setResolution(width, height);
            Overlays.resize(width, height);
            if (width * height >= 2560 * 1440) {
                showNotice('High output resolution can heavily load the GPU on raymarched and density effects.', 'info', 5200);
            }
            // Re-init current effect to update framebuffers (without resetting seed/time)
            var current = EffectRegistry.getCurrent();
            if (current && current.init) {
                current.init(Renderer.getGL());
            }
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(function(modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    if (modal.id === 'galleryModal') Gallery.hide();
                    else modal.classList.add('hidden');
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (VideoExport.isEditingLocked() && e.key.toLowerCase() !== 'r' && e.key !== 'Escape') return;
            var shell = typeof UIShell !== 'undefined' ? UIShell : null;
            if (shell && /^[1-5]$/.test(e.key)) {
                var names = shell.tabNames();
                var tab = names[parseInt(e.key, 10) - 1];
                if (tab) shell.setTab(tab);
                return;
            }
            switch(e.key) {
                case '[':
                case 'ArrowLeft':
                    if (shell) { e.preventDefault(); shell.stepEffect(-1); }
                    break;
                case ']':
                case 'ArrowRight':
                    if (shell) { e.preventDefault(); shell.stepEffect(1); }
                    break;
                case 's':
                    if (shell) shell.toggleFavorite();
                    break;
                case 'p':
                    if (shell) shell.snapshot();
                    break;
                case 'h':
                    if (shell) shell.toggleUI();
                    break;
                case '?':
                    if (shell) shell.showHelp();
                    break;
                case 'Escape':
                    document.querySelectorAll('.modal').forEach(function(m) {
                        if (m.id === 'galleryModal') Gallery.hide();
                        else m.classList.add('hidden');
                    });
                    if (shell && document.body.classList.contains('ui-hidden')) shell.toggleUI(false);
                    break;
                case ' ':
                    e.preventDefault();
                    if (Renderer.isRunning()) {
                        Renderer.pause();
                        document.getElementById('btnPause').classList.add('active');
                        document.getElementById('btnPlay').classList.remove('active');
                    } else {
                        Renderer.play();
                        document.getElementById('btnPlay').classList.add('active');
                        document.getElementById('btnPause').classList.remove('active');
                    }
                    break;
                case 'f':
                    document.getElementById('btnFullscreen').click();
                    break;
                case 'r':
                    document.getElementById('btnRecord').click();
                    break;
                case 'n':
                    Controls.randomize();
                    break;
                case 'x':
                    if (resetLooksBtn) resetLooksBtn.click();
                    break;
                case 'v':
                    if (typeof Looks !== 'undefined') {
                        var globalNow = Looks.toggleGlobal();
                        showNotice('Global beat reactions ' + (globalNow ? 'on' : 'off') + '.', 'success', 1400);
                    }
                    break;
                case 'b':
                    if (typeof Looks !== 'undefined') {
                        var openTab = shell && shell.getTab ? shell.getTab() : '';
                        Looks.shuffle(openTab === 'fx' ? 'fx' : openTab === 'overlay' ? 'overlays' : openTab === 'audio' ? 'reactor' : 'both');
                    }
                    break;
                case 't':
                    TimelineUI.toggle();
                    break;
                case 'm':
                    var musicToggle = document.getElementById('musicToggle');
                    if (musicToggle) musicToggle.click();
                    break;
                case 'g':
                    document.getElementById('btnGallery').click();
                    break;
            }
        });
    }

    // Start when DOM is ready
    function safeInit() {
        installGlobalErrorHandlers();
        try {
            init();
        } catch (err) {
            console.error('Psychedelia failed to initialize:', err);
            showNotice(err && err.message || 'Psychedelia failed to initialize.', 'error', 10000);
        }
    }

    installGlobalErrorHandlers();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInit);
    } else {
        safeInit();
    }
})();
