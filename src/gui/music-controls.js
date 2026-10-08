/* Psychedelia Studio - Music, Audio Source and Beat Reactor UI */
var MusicControls = (function() {
    'use strict';

    var SCALE_LABELS = {
        'minor': 'Minor', 'major': 'Major', 'dorian': 'Dorian', 'phrygian': 'Phrygian', 'lydian': 'Lydian',
        'mixolydian': 'Mixolydian', 'locrian': 'Locrian', 'harmonic minor': 'Harmonic Minor',
        'minor pentatonic': 'Minor Pentatonic', 'major pentatonic': 'Major Pentatonic', 'blues': 'Blues',
        'whole tone': 'Whole Tone', 'phrygian dominant': 'Phrygian Dominant', 'hijaz kar': 'Hijaz Kar (maqam)',
        'bhairav': 'Bhairav (raga)', 'kafi': 'Kafi (raga)', 'pelog': 'Pelog (gamelan)', 'slendro': 'Slendro (gamelan)'
    };
    var REACTIONS = [
        { key: 'zoom', label: 'Zoom Punch', title: 'Zooms in on every kick' },
        { key: 'rotate', label: 'Rotation Kick', title: 'Twists the image left and right on kicks' },
        { key: 'speed', label: 'Time Surge', title: 'Speeds the animation up with the bass and on beats' },
        { key: 'flash', label: 'Flash', title: 'Brightness flash on kicks, snares and drops' },
        { key: 'hue', label: 'Hue Shift', title: 'Steps the colours around the wheel on beats and new sections' },
        { key: 'chroma', label: 'RGB Split', title: 'Chromatic split on snares, hats and percussion' },
        { key: 'pump', label: 'Colour Pump', title: 'Saturation and glow pumping with the bass' },
        { key: 'shake', label: 'Shake', title: 'Camera shake on hits' }
    ];
    var lastEffectName = null;

    function el(id) { return document.getElementById(id); }

    function sliderRow(id, label, min, max, value, step, display, title) {
        return '<div class="param-row"' + (title ? ' title="' + title + '"' : '') + '>' +
            '<label for="' + id + '">' + label + '</label>' +
            '<div class="slider-wrap">' +
            '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + value + '" step="' + step + '">' +
            '<span class="val-display" id="' + id + 'Val">' + display + '</span>' +
            '</div></div>';
    }

    function meterRow(id, label) {
        return '<div class="audio-meter-row"><span>' + label + '</span>' +
            '<div id="' + id + '" class="audio-meter-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></div>';
    }

    function init() {
        var sidebar = document.getElementById('sidebar');
        if (typeof AudioAnalysis !== 'undefined' && AudioAnalysis.init) AudioAnalysis.init();

        var panel = document.createElement('section');
        panel.className = 'panel';
        panel.id = 'musicPanel';

        var reactionRows = REACTIONS.map(function(r) {
            return sliderRow('react_' + r.key, r.label, 0, 100, 0, 1, '0%', r.title + '. 0% disables this reaction; 100% is the maximum');
        }).join('');
        var linkRows = [0, 1, 2].map(function(i) {
            return '<div class="reactor-link-row">' +
                '<select id="reactLinkParam' + i + '" title="Effect parameter to move with the music"></select>' +
                '<select id="reactLinkSource' + i + '" title="What drives it"></select>' +
                '<div class="slider-wrap reactor-link-amount"><input type="range" class="psy-range" id="reactLinkAmount' + i + '" min="-100" max="100" value="50" step="1" aria-label="Parameter link ' + (i + 1) + ' amount" title="Amount (negative pushes the other way)">' +
                    '<span class="val-display" id="reactLinkAmount' + i + 'Val">+50%</span></div>' +
                '</div>';
        }).join('');

        panel.innerHTML =
            '<div class="collapsible" data-section="music">' +
            '<h2 class="panel-title section-head">Music</h2>' +
            '<div class="music-main-row">' +
                '<button id="musicToggle" class="sm-btn music-play-btn">&#9654; Play</button>' +
                '<button id="musicRandomize" class="sm-btn" title="New take: key, tempo, scale and patterns">&#127922; New</button>' +
            '</div>' +
            '<div class="music-now"><span id="musicBeatLed" class="beat-led"></span><span id="musicSection">Stopped</span></div>' +
            '<div id="musicControls" class="music-controls">' +
                '<div class="param-row"><label for="musicGenre">Genre</label><select id="musicGenre"></select></div>' +
                sliderRow('musicBPM', 'BPM', 40, 220, 128, 1, '128') +
                '<div class="param-row"><label for="musicKey">Key</label><select id="musicKey">' +
                    ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(function(k) { return '<option>' + k + '</option>'; }).join('') +
                '</select></div>' +
                '<div class="param-row"><label for="musicScale">Scale</label><select id="musicScale"></select></div>' +
                sliderRow('musicEnergy', 'Energy', 0, 100, 65, 1, '65%', 'Low: sparse and dark. High: busier drums, more fills, brighter filter') +
                '<div class="param-row" title="Song moves through intro, build, groove, drop and break sections"><label for="musicArrangement">Form</label>' +
                    '<select id="musicArrangement"><option value="song">Song (sections)</option><option value="loop">Loop (no intro/break)</option></select></div>' +
                sliderRow('musicSwing', 'Swing', 0, 100, 0, 1, '0%') +
                sliderRow('musicReverb', 'Reverb', 0, 100, 30, 1, '30%') +
                sliderRow('musicDelay', 'Echo', 0, 100, 30, 1, '30%') +
                sliderRow('musicVolume', 'Volume', -30, 0, -6, 1, '-6dB') +
            '</div>' +
            '</div>' +
            '<div class="music-instruments collapsible" data-section="mixer" data-collapsed-default="1">' +
                '<label class="panel-title section-head" style="margin-top:8px">Mixer</label>' +
                '<div id="musicInstruments"></div>' +
            '</div>' +

            '<div class="audio-source-controls collapsible" data-section="audio-source">' +
                '<label class="panel-title section-head">Audio Source</label>' +
                '<div class="param-row"><label for="audioSourceSelect">Source</label>' +
                    '<select id="audioSourceSelect">' +
                        '<option value="studio">Studio Music</option>' +
                        '<option value="file">Audio File</option>' +
                        '<option value="capture">Capture Playback</option>' +
                    '</select></div>' +
                '<input type="file" id="audioFileInput" class="hidden" accept="audio/*">' +
                '<div class="audio-file-row">' +
                    '<button id="audioFileChoose" class="sm-btn" title="Choose audio file">Choose</button>' +
                    '<button id="audioFilePlay" class="sm-btn" title="Play or pause selected audio file">&#9654;</button>' +
                    '<button id="audioFileClear" class="sm-btn" title="Clear selected audio file">Clear</button>' +
                '</div>' +
                '<div id="audioFileName" class="audio-file-name">No file selected</div>' +
                '<div class="param-row"><label>Position</label><div class="slider-wrap">' +
                    '<input type="range" id="audioFileSeek" min="0" max="0" value="0" step="0.01">' +
                    '<span class="val-display" id="audioFileTime">0:00</span></div></div>' +
                '<div class="param-row"><label>File Gain</label><div class="slider-wrap">' +
                    '<input type="range" id="audioFileGain" min="0" max="2" value="1" step="0.01">' +
                    '<span class="val-display" id="audioFileGainVal">1.00</span></div></div>' +
                '<div class="overlay-toggle-row audio-loop-row">' +
                    '<input type="checkbox" id="audioFileLoop"><label for="audioFileLoop">Loop file</label></div>' +
                '<div class="audio-capture-row">' +
                    '<button id="audioCaptureStart" class="sm-btn" title="Capture playback audio from a selected tab, window, or screen">Capture</button>' +
                    '<button id="audioCaptureStop" class="sm-btn" title="Stop capture playback">Stop</button>' +
                '</div>' +
                '<div id="audioCaptureStatus" class="audio-source-status">Capture Playback idle.</div>' +
                '<div id="audioSourceStatus" class="audio-source-status">Studio Music selected.</div>' +
            '</div>' +

            '<div class="audio-source-controls reactor-controls collapsible" data-section="reactor">' +
                '<label class="panel-title section-head">Beat Reactor</label>' +
                '<div class="overlay-toggle-row"><input type="checkbox" id="reactorEnabled" checked>' +
                    '<label for="reactorEnabled">Global reactions on</label></div>' +
                '<div class="reactor-status"><span id="reactorBeatLed" class="beat-led"></span><span id="reactorStatus">Waiting for audio</span></div>' +
                '<div class="param-row"><label for="reactorTempoMode">Tempo</label><select id="reactorTempoMode"><option value="auto">Auto detect</option><option value="manual">Lock BPM</option></select></div>' +
                '<div class="param-row" id="reactorManualTempoRow"><label for="reactorManualBpm">Locked BPM</label><input id="reactorManualBpm" type="number" min="40" max="240" step="1" value="120"><button id="reactorTapTempo" class="sm-btn" type="button" title="Tap several beats to lock the external tempo">Tap</button></div>' +
                '<div class="reactor-link-help">Studio uses its sequencer tempo. Lock BPM or tap for audio files and capture.</div>' +
                '<div class="audio-meter-grid" aria-label="Audio analysis meters">' +
                    meterRow('audioMeterLevel', 'Level') + meterRow('audioMeterBass', 'Bass') +
                    meterRow('audioMeterMid', 'Mid') + meterRow('audioMeterTreble', 'Treble') +
                    meterRow('audioMeterBeat', 'Beat') + meterRow('audioMeterKick', 'Kick') +
                    meterRow('audioMeterSnare', 'Snare') + meterRow('audioMeterHat', 'Hats/Perc') +
                '</div>' +
                '<div id="reactorLooks"></div>' +
                '<div class="param-row" style="margin-top:10px" title="Global reactions apply to every effect. Off keeps effect beat controls and your own links active"><label for="reactorPreset">Global Style</label>' +
                    '<select id="reactorPreset"><option value="off">Off</option><option value="subtle">Subtle</option>' +
                    '<option value="club">Club</option><option value="psychedelic">Psychedelic</option>' +
                    '<option value="wild">Wild</option><option value="custom">Custom</option></select></div>' +
                '<div class="collapsible reactor-fine-tune" data-section="reactor-fine-tune">' +
                    '<label class="panel-title section-head">Fine Tune</label>' +
                    '<div class="reactor-link-help">Reaction amounts affect the global style. Effect beat controls and parameter, FX and overlay links work independently. Double-click a slider to restore its default.</div>' +
                    sliderRow('reactorSensitivity', 'Sensitivity', 25, 300, 100, 5, '100%', 'Lower ignores softer hits; higher catches quieter hits and lifts quiet bands without flattening their dynamics') +
                    reactionRows +
                    sliderRow('reactorAttack', 'Band Attack', 5, 250, 25, 5, '25 ms', 'How quickly bass, mids, highs and loudness rise; drum hits stay immediate') +
                    sliderRow('reactorRelease', 'Band Release', 40, 1500, 200, 10, '200 ms', 'How slowly continuous levels fade after the sound falls') +
                    sliderRow('reactorHitDecay', 'Hit Decay', 25, 400, 100, 5, '100%', 'Shorter gives crisp punches; longer lets drum and section pulses linger') +
                    sliderRow('reactorSmoothing', 'Motion Smoothing', 10, 500, 80, 5, '80 ms', 'Easing for Time Surge and Hue Shift; lower is snappier, higher is gentler') +
                '</div>' +
            '</div>' +
            '<div class="audio-source-controls reactor-links collapsible" data-section="links" data-collapsed-default="1">' +
                '<label class="panel-title section-head">Parameter Links <button type="button" class="panel-action" id="reactLinkSuggest" title="Restore gentle beat links for this effect">Suggested</button></label>' +
                '<div class="reactor-link-help" id="reactLinkHelp">Gentle beat links are chosen for each effect. Your changes are remembered. Use Time Surge for smooth changes in speed.</div>' +
                linkRows +
            '</div>';

        sidebar.appendChild(panel);

        var looksSlot = el('reactorLooks');
        if (looksSlot && typeof Looks !== 'undefined') looksSlot.appendChild(Looks.toolbar('reactor'));
        populateGenres();
        populateScales();
        populateInstruments();
        populateLinkSources();
        wireEvents();
        wireReactor();
        // Genre-dependent sliders have no fixed default to snap back to.
        ['musicBPM', 'musicSwing', 'musicReverb', 'musicDelay'].forEach(function(id) { if (el(id)) el(id).dataset.noReset = '1'; });
        if (typeof AudioReactor !== 'undefined' && AudioReactor.getDefaults) {
            var defs = AudioReactor.getDefaults();
            REACTIONS.forEach(function(r) { var s = el('react_' + r.key); if (s) s.dataset.default = String(Math.round((defs[r.key] || 0) * 100)); });
            [['Attack', defs.attack * 1000], ['Release', defs.release * 1000], ['HitDecay', defs.hitDecay * 100], ['Smoothing', defs.smoothing * 1000]].forEach(function(row) {
                el('reactor' + row[0]).dataset.default = String(Math.round(row[1]));
            });
        }
        wireAudioEvents();
        syncFromMusic();
        syncReactor();
        refreshAudioUi();
        window.setInterval(refreshAudioUi, 500);
        if (typeof Music !== 'undefined' && Music.onChange) Music.onChange(syncFromMusic);
        startMeterLoop();
    }

    // ------------------------------------------------------------ Music
    function populateGenres() {
        var sel = el('musicGenre');
        var groups = Music.getGenreGroups ? Music.getGenreGroups() : [{ group: 'Genres', genres: Music.getGenreList().map(function(g) { return { id: g, label: g }; }) }];
        groups.forEach(function(gr) {
            if (!gr.genres.length) return;
            var og = document.createElement('optgroup');
            og.label = gr.group;
            gr.genres.forEach(function(g) {
                var opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = g.label;
                og.appendChild(opt);
            });
            sel.appendChild(og);
        });
        sel.value = Music.getGenre();
    }

    function populateScales() {
        var sel = el('musicScale');
        var list = Music.getScaleList ? Music.getScaleList() : Object.keys(SCALE_LABELS);
        list.forEach(function(s) {
            var opt = document.createElement('option');
            opt.value = s;
            opt.textContent = SCALE_LABELS[s] || s;
            sel.appendChild(opt);
        });
    }

    function populateInstruments() {
        var container = el('musicInstruments');
        container.innerHTML = '';
        var list = Music.getInstrumentList ? Music.getInstrumentList() : [];
        list.forEach(function(inst) {
            var row = document.createElement('div');
            row.className = 'overlay-toggle-row mixer-row';

            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = 'inst_' + inst.key;
            cb.checked = inst.on;
            cb.dataset.inst = inst.key;
            cb.addEventListener('change', function() { Music.setInstrumentOn(this.dataset.inst, this.checked); });

            var lbl = document.createElement('label');
            lbl.htmlFor = 'inst_' + inst.key;
            lbl.innerHTML = '<span class="mixer-name"></span><span class="mixer-sound" id="instsound_' + inst.key + '"></span>';
            lbl.firstChild.textContent = inst.label;
            lbl.lastChild.textContent = inst.soundLabel;

            var vol = document.createElement('input');
            vol.type = 'range';
            vol.className = 'psy-range';
            vol.id = 'instvol_' + inst.key;
            vol.min = '-30';
            vol.max = '12';
            vol.step = '1';
            vol.value = String(inst.volume || 0);
            vol.dataset.noReset = '1';
            vol.dataset.inst = inst.key;
            vol.title = inst.label + ' level (dB)';
            vol.addEventListener('input', function() {
                Music.setInstrumentVolume(this.dataset.inst, parseFloat(this.value));
                this.title = this.dataset.inst + ' level ' + (this.value > 0 ? '+' : '') + this.value + ' dB';
            });
            vol.addEventListener('dblclick', function() {
                this.value = '0';
                Music.setInstrumentVolume(this.dataset.inst, 0);
            });

            row.appendChild(cb);
            row.appendChild(lbl);
            row.appendChild(vol);
            container.appendChild(row);
        });
    }

    function refreshInstrumentSounds() {
        if (!Music.getInstrumentList) return;
        Music.getInstrumentList().forEach(function(inst) {
            var s = el('instsound_' + inst.key);
            if (s) s.textContent = inst.soundLabel;
        });
    }

    function pct(v) { return Math.round(v * 100); }

    function setSlider(id, value, text) {
        var s = el(id);
        if (!s) return;
        s.value = String(value);
        var v = el(id + 'Val');
        if (v) v.textContent = text;
        if (window.UIShell && UIShell.paintRange) UIShell.paintRange(s);
    }

    function syncFromMusic() {
        el('musicGenre').value = Music.getGenre();
        setSlider('musicBPM', Music.getBPM(), String(Music.getBPM()));
        el('musicKey').value = Music.getKey();
        el('musicScale').value = Music.getScale();
        if (Music.getEnergy) setSlider('musicEnergy', pct(Music.getEnergy()), pct(Music.getEnergy()) + '%');
        if (Music.getSwing) setSlider('musicSwing', pct(Music.getSwing()), pct(Music.getSwing()) + '%');
        if (Music.getReverb) setSlider('musicReverb', pct(Music.getReverb()), pct(Music.getReverb()) + '%');
        if (Music.getDelay) setSlider('musicDelay', pct(Music.getDelay()), pct(Music.getDelay()) + '%');
        if (Music.getArrangement) el('musicArrangement').value = Music.getArrangement();
        if (Music.getMasterVolume) setSlider('musicVolume', Music.getMasterVolume(), Music.getMasterVolume() + 'dB');
        Music.getInstrumentList().forEach(function(row) {
            var cb = el('inst_' + row.key), volume = el('instvol_' + row.key);
            if (cb) cb.checked = row.on;
            if (volume) setSlider(volume.id, row.volume, row.volume + 'dB');
        });
        refreshInstrumentSounds();
        syncNowPlaying();
    }

    function syncNowPlaying() {
        var btn = el('musicToggle');
        if (btn) btn.innerHTML = Music.isPlaying() ? '&#9632; Stop' : '&#9654; Play';
        var sec = el('musicSection');
        if (!sec) return;
        var label = Music.getGenreLabel ? Music.getGenreLabel(Music.getGenre()) : Music.getGenre();
        if (!Music.isPlaying()) {
            sec.textContent = label + ' - stopped';
            return;
        }
        var s = Music.getSection ? Music.getSection() : null;
        sec.textContent = label + ' - ' + Music.getKey() + ' ' + (SCALE_LABELS[Music.getScale()] || Music.getScale()) +
            (s ? ' - ' + s.label + ' ' + (s.bar + 1) + '/' + s.bars : '');
    }

    function wireEvents() {
        el('musicToggle').addEventListener('click', function() {
            if (Music.isPlaying()) Music.stop();
            else Music.start();
            syncFromMusic();
        });

        el('musicRandomize').addEventListener('click', function() {
            Music.randomize();
            syncFromMusic();
        });

        el('musicGenre').addEventListener('change', function() {
            Music.setGenre(this.value);
            syncFromMusic();
        });

        el('musicBPM').addEventListener('input', function() {
            Music.setBPM(parseInt(this.value, 10));
            el('musicBPMVal').textContent = this.value;
        });

        el('musicKey').addEventListener('change', function() { Music.setKey(this.value); syncNowPlaying(); });
        el('musicScale').addEventListener('change', function() { Music.setScale(this.value); syncNowPlaying(); });

        el('musicEnergy').addEventListener('input', function() {
            Music.setEnergy(this.value / 100);
            el('musicEnergyVal').textContent = this.value + '%';
        });
        el('musicArrangement').addEventListener('change', function() { Music.setArrangement(this.value); });
        el('musicSwing').addEventListener('input', function() {
            Music.setSwing(this.value / 100);
            el('musicSwingVal').textContent = this.value + '%';
        });
        el('musicReverb').addEventListener('input', function() {
            Music.setReverb(this.value / 100);
            el('musicReverbVal').textContent = this.value + '%';
        });
        el('musicDelay').addEventListener('input', function() {
            Music.setDelay(this.value / 100);
            el('musicDelayVal').textContent = this.value + '%';
        });

        el('musicVolume').addEventListener('input', function() {
            Music.setMasterVolume(parseInt(this.value, 10));
            el('musicVolumeVal').textContent = this.value + 'dB';
        });
    }

    // ------------------------------------------------------------ Beat Reactor
    function populateLinkSources() {
        if (typeof AudioReactor === 'undefined') return;
        var sources = AudioReactor.getSources();
        [0, 1, 2].forEach(function(i) {
            var sel = el('reactLinkSource' + i);
            sources.forEach(function(s) {
                var opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.label;
                sel.appendChild(opt);
            });
        });
        refreshLinkParams(true);
    }

    function refreshLinkParams(force) {
        if (typeof AudioReactor === 'undefined') return;
        var effect = typeof EffectRegistry !== 'undefined' && EffectRegistry.getCurrent ? EffectRegistry.getCurrent() : null;
        var name = effect ? effect.name : '';
        if (!force && name === lastEffectName) return;
        lastEffectName = name;
        var params = AudioReactor.getLinkableParams();
        var links = AudioReactor.getLinks();
        [0, 1, 2].forEach(function(i) {
            var sel = el('reactLinkParam' + i);
            if (!sel) return;
            sel.innerHTML = '';
            var none = document.createElement('option');
            none.value = '';
            none.textContent = params.length ? '- parameter -' : '(not for this effect)';
            sel.appendChild(none);
            params.forEach(function(p) {
                var opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = p.label;
                sel.appendChild(opt);
            });
            var keep = params.some(function(p) { return p.name === links[i].param; });
            if (!keep && links[i].param) AudioReactor.setLink(i, { param: '' });
            sel.value = keep ? links[i].param : '';
        });
        syncReactor();
        var suggested = AudioReactor.getLinks().some(function(link) { return !!link.param; });
        el('reactLinkHelp').textContent = suggested ? 'Gentle beat links are chosen for each effect. Your changes are remembered. Use Time Surge for smooth changes in speed.' :
            'Choose your own links, or try Suggested. Effects without suitable parameters still react through the global Beat Reactor.';
    }

    function syncReactor() {
        if (typeof AudioReactor === 'undefined') return;
        var s = AudioReactor.getSettings();
        el('reactorEnabled').checked = s.enabled;
        setSlider('reactorSensitivity', Math.round(s.sensitivity * 100), Math.round(s.sensitivity * 100) + '%');
        REACTIONS.forEach(function(r) { setSlider('react_' + r.key, pct(s[r.key]), pct(s[r.key]) + '%'); });
        el('reactorPreset').value = AudioReactor.presetName ? AudioReactor.presetName() : (el('reactorPreset').dataset.current || 'club');
        [['Attack', 'attack', 1000, ' ms'], ['Release', 'release', 1000, ' ms'], ['HitDecay', 'hitDecay', 100, '%'], ['Smoothing', 'smoothing', 1000, ' ms']].forEach(function(row) {
            var value = Math.round(s[row[1]] * row[2]); setSlider('reactor' + row[0], value, value + row[3]);
        });
        el('reactorTempoMode').value = s.tempoMode;
        el('reactorManualBpm').value = Math.round(s.manualBpm);
        el('reactorManualBpm').disabled = s.tempoMode !== 'manual';
        var links = AudioReactor.getLinks();
        [0, 1, 2].forEach(function(i) {
            el('reactLinkSource' + i).value = links[i].source;
            var amount = Math.round(links[i].amount * 100);
            setSlider('reactLinkAmount' + i, amount, (amount > 0 ? '+' : '') + amount + '%');
        });
    }

    function wireReactor() {
        el('reactLinkSuggest').addEventListener('click', function() { AudioReactor.suggestLinks(); refreshReactor(); });
        if (typeof AudioReactor === 'undefined') return;
        el('reactorEnabled').addEventListener('change', function() { AudioReactor.set('enabled', this.checked); });
        el('reactorSensitivity').addEventListener('input', function() {
            AudioReactor.set('sensitivity', this.value / 100);
            el('reactorSensitivityVal').textContent = this.value + '%';
        });
        [['Attack', 'attack', 1000, ' ms'], ['Release', 'release', 1000, ' ms'], ['HitDecay', 'hitDecay', 100, '%'], ['Smoothing', 'smoothing', 1000, ' ms']].forEach(function(row) {
            el('reactor' + row[0]).addEventListener('input', function() {
                AudioReactor.set(row[1], Number(this.value) / row[2]);
                el(this.id + 'Val').textContent = this.value + row[3];
            });
        });
        el('reactorTempoMode').addEventListener('change', function() { AudioReactor.set('tempoMode', this.value); syncReactor(); });
        el('reactorManualBpm').addEventListener('change', function() { AudioReactor.set('manualBpm', Number(this.value)); syncReactor(); });
        var taps = [];
        el('reactorTapTempo').addEventListener('click', function() {
            var now = performance.now();
            if (taps.length && now - taps[taps.length - 1] > 2500) taps = [];
            taps.push(now); if (taps.length > 9) taps.shift();
            if (taps.length >= 3) {
                var gaps = taps.slice(1).map(function(t, i) { return t - taps[i]; }).sort(function(a, b) { return a - b; });
                AudioReactor.set('manualBpm', Math.round(60000 / gaps[Math.floor(gaps.length / 2)]));
                AudioReactor.set('tempoMode', 'manual'); syncReactor();
            }
            this.textContent = taps.length < 3 ? 'Tap ' + taps.length : 'Tap';
        });
        el('reactorPreset').addEventListener('change', function() {
            if (this.value === 'custom') return;
            AudioReactor.applyPreset(this.value);
            this.dataset.current = this.value;
            syncReactor();
        });
        REACTIONS.forEach(function(r) {
            el('react_' + r.key).addEventListener('input', function() {
                AudioReactor.set(r.key, this.value / 100);
                el('react_' + r.key + 'Val').textContent = this.value + '%';
                el('reactorPreset').value = AudioReactor.presetName();
                el('reactorPreset').dataset.current = el('reactorPreset').value;
            });
        });
        [0, 1, 2].forEach(function(i) {
            el('reactLinkParam' + i).addEventListener('change', function() { AudioReactor.setLink(i, { param: this.value }); });
            el('reactLinkSource' + i).addEventListener('change', function() { AudioReactor.setLink(i, { source: this.value }); });
            el('reactLinkAmount' + i).addEventListener('input', function() {
                AudioReactor.setLink(i, { amount: this.value / 100 });
                el('reactLinkAmount' + i + 'Val').textContent = (Number(this.value) > 0 ? '+' : '') + this.value + '%';
                this.title = 'Amount ' + this.value + '%';
            });
        });
    }

    // Meters and beat LEDs follow the reactor every animation frame while the
    // Audio tab is visible.
    function startMeterLoop() {
        var panel = el('musicPanel');
        var leds = [el('musicBeatLed'), el('reactorBeatLed')];
        function loop() {
            window.requestAnimationFrame(loop);
            if (!panel || panel.offsetParent === null || typeof AudioReactor === 'undefined') return;
            var s = AudioReactor.getState();
            updateMeter('audioMeterLevel', s.level);
            updateMeter('audioMeterBass', s.bass);
            updateMeter('audioMeterMid', s.mid);
            updateMeter('audioMeterTreble', s.high);
            updateMeter('audioMeterBeat', s.beat);
            updateMeter('audioMeterKick', s.kick);
            updateMeter('audioMeterSnare', s.snare);
            updateMeter('audioMeterHat', s.hat);
            var glow = Math.max(s.kick, s.beat * 0.8);
            leds.forEach(function(led) {
                if (led) led.style.opacity = (0.18 + 0.82 * Math.min(1, glow)).toFixed(3);
            });
        }
        window.requestAnimationFrame(loop);
    }

    function refreshReactorStatus() {
        var out = el('reactorStatus');
        if (!out || typeof AudioReactor === 'undefined') return;
        var s = AudioReactor.getState();
        if (!s.active) {
            out.textContent = 'Waiting for audio (play music, a file or capture)';
            return;
        }
        var src = s.source === 'studio' ? (s.studioSync ? 'Studio sync' : 'Studio') : (s.source === 'file' ? 'Audio file' : 'Capture');
        var locked = !s.studioSync && AudioReactor.getSettings().tempoMode === 'manual';
        var confidence = s.tempoConfidence >= 0.55 ? 'steady' : s.tempoConfidence >= 0.25 ? 'building confidence' : 'low confidence';
        var bpm = s.bpm ? Math.round(s.bpm) + ' BPM' + (s.studioSync ? '' : locked ? ' (locked)' : ' (' + confidence + ')') : 'finding tempo...';
        out.textContent = src + ' - ' + bpm + (s.section ? ' - ' + s.section : '');
    }

    // ------------------------------------------------------------ Audio source
    function wireAudioEvents() {
        if (typeof AudioAnalysis === 'undefined') return;

        var sourceSelect = el('audioSourceSelect');
        var fileInput = el('audioFileInput');

        sourceSelect.addEventListener('change', function() {
            AudioAnalysis.setSource(this.value);
            refreshAudioUi();
        });
        el('audioFileChoose').addEventListener('click', function() { fileInput.click(); });
        fileInput.addEventListener('change', function() {
            var file = this.files && this.files[0];
            if (!file) return;
            AudioAnalysis.loadFile(file).then(refreshAudioUi);
        });
        el('audioFilePlay').addEventListener('click', function() {
            var status = AudioAnalysis.getFileStatus();
            if (status.playing) {
                AudioAnalysis.pauseFile();
                refreshAudioUi();
            } else {
                AudioAnalysis.playFile().then(refreshAudioUi);
            }
        });
        el('audioFileClear').addEventListener('click', function() {
            AudioAnalysis.clearFile();
            fileInput.value = '';
            refreshAudioUi();
        });
        el('audioFileSeek').addEventListener('input', function() {
            AudioAnalysis.seekFile(parseFloat(this.value));
            refreshAudioUi();
        });
        el('audioFileGain').addEventListener('input', function() {
            var value = AudioAnalysis.setFileGain(parseFloat(this.value));
            el('audioFileGainVal').textContent = value.toFixed(2);
            refreshAudioUi();
        });
        el('audioFileLoop').addEventListener('change', function() {
            AudioAnalysis.setFileLoop(this.checked);
            refreshAudioUi();
        });
        el('audioCaptureStart').addEventListener('click', function() {
            AudioAnalysis.startCapture().then(refreshAudioUi);
        });
        el('audioCaptureStop').addEventListener('click', function() {
            AudioAnalysis.stopCapture();
            refreshAudioUi();
        });

        AudioAnalysis.onStatusChange(refreshAudioUi);
    }

    function refreshAudioUi() {
        if (typeof AudioAnalysis === 'undefined') return;
        var sourceSelect = el('audioSourceSelect');
        if (!sourceSelect) return;
        // The Beat Reactor reads the analyser every frame; only poll it here
        // when the reactor is missing.
        var analysis = typeof AudioReactor === 'undefined' ?
            AudioAnalysis.getAnalysis({ time: typeof performance !== 'undefined' && performance.now ? performance.now() / 1000 : Date.now() / 1000 }) : null;
        var currentSource = AudioAnalysis.getSource();
        var fileStatus = AudioAnalysis.getFileStatus();
        var captureStatus = AudioAnalysis.getCaptureStatus ? AudioAnalysis.getCaptureStatus() : { active: false, audioTrackCount: 0, message: '' };
        var routerStatus = AudioAnalysis.getStatus();
        var status = currentSource === 'file' ? fileStatus : (currentSource === 'capture' ? captureStatus : routerStatus);
        var fileActive = currentSource === 'file';
        var hasFile = !!fileStatus.hasFile;
        var captureSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

        sourceSelect.value = currentSource === 'file' || currentSource === 'capture' ? currentSource : 'studio';
        el('audioFileName').textContent = fileStatus.fileName || 'No file selected';
        el('audioFilePlay').innerHTML = fileStatus.playing ? '&#10074;&#10074;' : '&#9654;';
        el('audioFilePlay').disabled = !hasFile;
        el('audioFileClear').disabled = !hasFile;

        var seek = el('audioFileSeek');
        var duration = Math.max(0, fileStatus.duration || 0);
        var time = Math.max(0, fileStatus.currentTime || 0);
        seek.max = duration ? String(duration) : '0';
        seek.value = String(Math.min(time, duration || time));
        seek.disabled = !hasFile;
        el('audioFileTime').textContent = formatTime(time) + (duration ? ' / ' + formatTime(duration) : '');

        var gain = el('audioFileGain');
        gain.value = String(fileStatus.gain);
        gain.disabled = !hasFile;
        el('audioFileGainVal').textContent = (isFinite(Number(fileStatus.gain)) ? Number(fileStatus.gain) : 1).toFixed(2);
        var loop = el('audioFileLoop');
        loop.checked = !!fileStatus.loop;
        loop.disabled = !hasFile;

        el('audioCaptureStart').disabled = !!captureStatus.active || captureStatus.state === 'permission' || !captureSupported;
        el('audioCaptureStop').disabled = !captureStatus.hasCapture && captureStatus.state !== 'permission';
        el('audioCaptureStatus').textContent = captureStatus.active ?
            'Capture active: ' + captureStatus.audioTrackCount + ' audio track' + (captureStatus.audioTrackCount === 1 ? '' : 's') + '.' :
            (captureStatus.message || (captureSupported ? 'Capture Playback idle.' : 'Capture Playback is not available in this browser.'));

        var message = status.message || (fileActive ? 'Audio File selected.' : (currentSource === 'capture' ? 'Capture Playback selected.' : 'Studio Music selected.'));
        el('audioSourceStatus').textContent = message;
        if (analysis) {
            updateMeter('audioMeterLevel', analysis.level);
            updateMeter('audioMeterBass', analysis.bass);
            updateMeter('audioMeterMid', analysis.mid);
            updateMeter('audioMeterTreble', analysis.treble);
            updateMeter('audioMeterBeat', analysis.beat);
        }
        refreshReactorStatus();
        refreshLinkParams(false);
        if (typeof Music !== 'undefined' && Music.isPlaying && Music.isPlaying()) syncNowPlaying();
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Number(seconds) || 0);
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function updateMeter(id, value) {
        var meter = el(id);
        if (!meter) return;
        var clamped = Math.max(0, Math.min(1, Number(value) || 0));
        var now = String(Math.round(clamped * 100));
        if (meter.getAttribute('aria-valuenow') !== now) meter.setAttribute('aria-valuenow', now);
        if (meter.firstElementChild) meter.firstElementChild.style.transform = 'scaleX(' + clamped.toFixed(3) + ')';
    }

    function refreshReactor() {
        syncReactor();
        refreshLinkParams(true);
        el('reactorPreset').dataset.current = el('reactorPreset').value;
    }

    return { init: init, refreshReactor: refreshReactor, refresh: function() { syncFromMusic(); syncReactor(); refreshLinkParams(true); refreshAudioUi(); } };
})();
