/* Psychedelia Studio - Music Engine v5
 * Genre-driven generative sequencer on top of MusicSounds (instrument
 * designs) and MusicGenres (patterns, kits, scales). Every genre has its own
 * kit, grooves and progressions; songs move through sections (intro, build,
 * groove, drop, break) with fills, humanised timing and slowly mutating
 * melodies. Hits are queued as timed events so the Beat Reactor can sync
 * visuals sample-accurately to the studio music.
 */
var Music = (function createMusicEngine(offlineContext) {
    'use strict';

    var CHANNELS = ['kick', 'snare', 'hihat', 'perc', 'bass', 'pad', 'arp', 'lead'];
    var CHANNEL_LABELS = {
        kick: 'Kick', snare: 'Snare', hihat: 'Hi-Hat', perc: 'Perc',
        bass: 'Bass', pad: 'Chords', arp: 'Arpeggio', lead: 'Lead'
    };
    var DRUM_CHANNELS = ['kick', 'snare', 'hihat', 'perc'];
    // Per-channel [reverb, delay] send levels.
    var SENDS = {
        kick: [0, 0], snare: [0.22, 0.04], hihat: [0.08, 0.08], perc: [0.3, 0.18],
        bass: [0.02, 0], pad: [0.65, 0.12], arp: [0.38, 0.5], lead: [0.45, 0.38]
    };
    var CHANNEL_OCTAVE = { bass: 1, pad: 3, arp: 4, lead: 4 };
    var SOUND_OCTAVE = {
        upright: 2, fingerBass: 2, chipBass: 2, sitar: 4, oud: 3, stringPluck: 4,
        musicBox: 5, kalimba: 5, flute: 5, whistle: 5, skank: 4, tanpura: 2, bellChord: 4, nylonChord: 3
    };
    var VOICINGS = {
        triad: [0, 2, 4], seventh: [0, 2, 4, 6], ninth: [0, 2, 6, 8], sus: [0, 3, 4],
        power: [0, 4, 7], open: [0, 4, 9], drone: [0, 4, 7]
    };
    var SECTIONS = {
        intro:  { label: 'Intro',  bars: 4, mix: { kick: 0, snare: 0, hihat: 0.5, perc: 0, bass: 0.5, pad: 1, arp: 1, lead: 0 }, cutoff: [700, 4000] },
        build:  { label: 'Build',  bars: 4, mix: { kick: 1, snare: 1, hihat: 1, perc: 0.5, bass: 1, pad: 1, arp: 1, lead: 0 }, cutoff: [1400, 16000] },
        groove: { label: 'Groove', bars: 8, mix: { kick: 1, snare: 1, hihat: 1, perc: 1, bass: 1, pad: 1, arp: 0.5, lead: 0 } },
        drop:   { label: 'Drop',   bars: 8, mix: { kick: 1, snare: 1, hihat: 1, perc: 1, bass: 1, pad: 1, arp: 1, lead: 1 } },
        brk:    { label: 'Break',  bars: 4, mix: { kick: 0, snare: 0, hihat: 0.5, perc: 0, bass: 0, pad: 1, arp: 1, lead: 1 }, cutoff: [2600, 2600] }
    };
    var FORMS = {
        song: { order: ['intro', 'build', 'groove', 'drop', 'brk', 'build', 'drop', 'groove'], loopFrom: 2 },
        loop: { order: ['groove', 'drop'], loopFrom: 0 }
    };
    var NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var REF_MINOR = [0, 2, 3, 5, 7, 8, 10];
    var REF_MAJOR = [0, 2, 4, 5, 7, 9, 11];

    var GENRES = MusicGenres.genres;
    var SCALES = MusicGenres.scales;

    var ready = false;
    var playing = false;
    var starting = false;
    var playRequest = 0;
    var currentGenre = 'minimal';
    var currentKey = 'C';
    var currentScale = 'minor';
    var bpm = 124;
    var masterVol = -6;
    var energy = 0.65;
    var arrangement = 'song';
    var swing = 0;
    var fxReverb = 0.3;
    var fxDelay = 0.3;
    var instrumentOn = {};
    var instrumentVol = {};
    CHANNELS.forEach(function(c) { instrumentOn[c] = true; instrumentVol[c] = 0; });

    var master = null, compressor = null, limiter = null, duck = null, busFilter = null;
    var reverb = null, reverbReturn = null, delay = null, delayReturn = null;
    var waveformAnalyser = null, fftAnalyser = null;
    var channels = {};
    var kit = {};
    var seqLoop = null;
    var parsed = null;
    var song = null;
    var events = [];
    var listeners = [];
    var recordDest = null;
    var waveBuf = new Float32Array(512);
    var fftBuf = new Float32Array(512);
    var degreeCache = {};
    function transport() { return offlineContext ? offlineContext.transport : Tone.Transport; }
    function audioContext() { return offlineContext || Tone.getContext(); }

    // ------------------------------------------------------------ Patterns
    function parseDrum(str) {
        var out = [];
        for (var i = 0; i < 16; i++) {
            var c = str.charAt(i);
            var hit = null;
            if (c === 'x') hit = { v: 0.8 };
            else if (c === 'X') hit = { v: 1.0 };
            else if (c === 'o') hit = { v: 0.35, ghost: true };
            else if (c === 'r') hit = { v: 0.6, roll: true };
            else if (c === '2') hit = { v: 0.8, variant: 1 };
            out.push(hit);
        }
        return out;
    }

    function parseMelodic(str) {
        var toks = String(str).trim().split(/\s+/);
        var out = [];
        var last = null;
        for (var i = 0; i < 16; i++) {
            var t = toks[i] || '.';
            var slot = null;
            if (t === '-') {
                if (last) last.len++;
            } else if (t === '.') {
                last = null;
            } else {
                var d = parseInt(t, 10);
                if (isNaN(d)) last = null;
                else { slot = { deg: d, len: 1 }; last = slot; }
            }
            out.push(slot);
        }
        return out;
    }

    function parseChord(str) {
        var out = [];
        var last = null;
        for (var i = 0; i < 16; i++) {
            var c = str.charAt(i);
            var slot = null;
            if (c === '-') {
                if (last) last.len++;
            } else if (c === 'x' || c === 'X' || c === 'L') {
                slot = { v: c === 'X' ? 0.9 : (c === 'L' ? 0.6 : 0.7), len: 1, hold: c === 'L' };
                last = slot;
            } else {
                last = null;
            }
            out.push(slot);
        }
        return out;
    }

    function parseGenre(g) {
        var p = {};
        DRUM_CHANNELS.forEach(function(c) { p[c] = (g[c] || ['................']).map(parseDrum); });
        p.bass = (g.bass || []).map(parseMelodic);
        p.arp = (g.arp || []).map(parseMelodic);
        p.lead = (g.lead || []).map(parseMelodic);
        p.pad = (g.pad || []).map(parseChord);
        ['bass', 'arp', 'lead', 'pad'].forEach(function(c) { if (!p[c].length) p[c] = [new Array(16).fill(null)]; });
        return p;
    }

    // ------------------------------------------------------------ Pitch
    // Pattern degrees are diatonic (7 per octave). Scales with fewer or more
    // notes map each diatonic degree to the nearest scale tone, so every
    // pattern works in pentatonic, blues and gamelan scales too.
    function degreeTable(scaleName) {
        if (degreeCache[scaleName]) return degreeCache[scaleName];
        var steps = SCALES[scaleName] || SCALES.minor;
        var table = [];
        if (steps.length === 7) {
            table = steps.slice();
        } else {
            var ref = steps.indexOf(3) >= 0 && steps.indexOf(4) < 0 ? REF_MINOR : REF_MAJOR;
            for (var d = 0; d < 7; d++) {
                var best = 0, bestDist = 99;
                for (var o = 0; o <= 1; o++) {
                    for (var i = 0; i < steps.length; i++) {
                        var s = steps[i] + 12 * o;
                        var dist = Math.abs(s - ref[d]);
                        if (dist < bestDist) { best = s; bestDist = dist; }
                    }
                }
                table.push(best);
            }
        }
        degreeCache[scaleName] = table;
        return table;
    }

    // Chords use the 7-note parent of a 5/6-note scale (minor pentatonic and
    // blues -> natural minor, major pentatonic -> major), so they stay real
    // triads and sevenths while melodies keep the pentatonic or exotic colour.
    function parentTable(scaleName) {
        var steps = SCALES[scaleName] || SCALES.minor;
        if (steps.length === 7) return degreeTable(scaleName);
        return steps.indexOf(3) >= 0 && steps.indexOf(4) < 0 ? REF_MINOR : REF_MAJOR;
    }

    // Moves a chord root onto a degree the scale and its parent share, so the
    // bass, arps and chords agree on the root.
    function snapRoot(d) {
        var t = degreeTable(currentScale), p = parentTable(currentScale);
        if (t === p) return d;
        var oct = Math.floor(d / 7), r = d - oct * 7;
        if (t[r] === p[r]) return d;
        if (r > 0 && t[r - 1] === p[r - 1]) return d - 1;
        if (r < 6 && t[r + 1] === p[r + 1]) return d + 1;
        return oct * 7;
    }

    function noteHz(degree, octave, harmony) {
        var table = harmony ? parentTable(currentScale) : degreeTable(currentScale);
        var oct = Math.floor(degree / 7);
        var semis = oct * 12 + table[degree - oct * 7];
        var midi = 12 * (octave + 1) + NOTES.indexOf(currentKey) + semis;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function octaveFor(ch) {
        var s = kit[ch] && kit[ch].name;
        return SOUND_OCTAVE[s] !== undefined ? SOUND_OCTAVE[s] : CHANNEL_OCTAVE[ch];
    }

    // ------------------------------------------------------------ Audio graph
    function init(callback) {
        if (ready) { if (callback) callback(true); return; }
        if (typeof Tone === 'undefined' || typeof MusicSounds === 'undefined') { if (callback) callback(false); return; }
        // Notes are scheduled this far ahead, so a busy frame (heavy looks, recording)
        // cannot make them late. The beat clock reads the audio time, so visuals stay in sync.
        try { if (!offlineContext) Tone.getContext().lookAhead = 0.25; } catch (errLA) { /* noop */ }
        var initialSettings = getSettings();
        try {
            master = new Tone.Gain(Tone.dbToGain(masterVol));
            compressor = new Tone.Compressor({ threshold: -16, ratio: 3, attack: 0.008, release: 0.2, knee: 8 });
            limiter = new Tone.Limiter(-1);
            master.chain(compressor, limiter, offlineContext ? offlineContext.destination : Tone.Destination);
            try {
                waveformAnalyser = new Tone.Analyser('waveform', 512);
                // Beat Reactor owns time-based smoothing; analyser smoothing
                // would blur onsets differently at different display rates.
                fftAnalyser = new Tone.Analyser({ type: 'fft', size: 512, smoothing: 0 });
                limiter.connect(waveformAnalyser);
                limiter.connect(fftAnalyser);
            } catch (err) {
                waveformAnalyser = null;
                fftAnalyser = null;
            }
            busFilter = new Tone.Filter({ type: 'lowpass', frequency: 18000, rolloff: -12, Q: 0.9 });
            duck = new Tone.Gain(1);
            duck.chain(busFilter, master);
            reverb = new Tone.Reverb({ decay: 3.5, preDelay: 0.02, wet: 1 });
            reverbReturn = new Tone.Gain(fxReverb);
            reverb.chain(reverbReturn, duck);
            delay = new Tone.PingPongDelay({ delayTime: '8n.', feedback: 0.32, wet: 1 });
            delayReturn = new Tone.Gain(fxDelay * 0.6);
            delay.chain(delayReturn, duck);

            CHANNELS.forEach(function(c) {
                var ch = new Tone.Channel({ volume: -12 });
                ch.connect(c === 'kick' ? master : duck);
                var sends = {};
                if (SENDS[c][0] > 0) { sends.reverb = new Tone.Gain(SENDS[c][0]); ch.connect(sends.reverb); sends.reverb.connect(reverb); }
                if (SENDS[c][1] > 0) { sends.delay = new Tone.Gain(SENDS[c][1]); ch.connect(sends.delay); sends.delay.connect(delay); }
                ch.mute = !instrumentOn[c];
                channels[c] = { node: ch, sends: sends };
            });

            seqLoop = new Tone.Loop(onStep, '16n');
            ready = true;
            applyGenre(currentGenre, false);
            setSettings(initialSettings);
        } catch (err) {
            console.error('Music init failed:', err);
            ready = false;
            if (callback) callback(false);
            return;
        }
        if (callback) callback(true);
    }

    function buildKit() {
        var g = GENRES[currentGenre];
        var old = kit;
        kit = {};
        CHANNELS.forEach(function(c) {
            var name = g.kit[c];
            var sound = null;
            try { sound = MusicSounds.create(name, channels[c].node); } catch (err) { console.warn('Music sound failed:', name, err); }
            kit[c] = { name: name, sound: sound };
            applyChannelVolume(c);
        });
        // Let the old kit ring out before it is released.
        window.setTimeout(function() {
            for (var k in old) { try { if (old[k].sound) old[k].sound.dispose(); } catch (err) { /* noop */ } }
        }, 4000);
    }

    function applyChannelVolume(c) {
        var ch = channels[c];
        if (!ch) return;
        var base = kit[c] && kit[c].sound ? kit[c].sound.level : -12;
        ch.node.volume.value = base + (instrumentVol[c] || 0);
        ch.node.mute = !instrumentOn[c];
    }

    function applyFx() {
        if (!ready) return;
        reverbReturn.gain.rampTo(fxReverb * 1.1, 0.2);
        delayReturn.gain.rampTo(fxDelay * 0.65, 0.2);
    }

    function syncTempo() {
        if (!ready) return;
        transport().bpm.value = bpm;
        try { delay.delayTime.value = 45 / bpm; } catch (err) { /* noop */ }
        for (var c in kit) { if (kit[c].sound && kit[c].sound.sync) kit[c].sound.sync(bpm); }
    }

    function applySwing() {
        if (!ready) return;
        var g = GENRES[currentGenre];
        transport().swingSubdivision = g.swingSub || '16n';
        transport().swing = swing;
    }

    // ------------------------------------------------------------ Song state
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function cloneSlots(slots) { return slots.map(function(s) { return s ? { deg: s.deg, len: s.len } : null; }); }

    function newSong() {
        var g = GENRES[currentGenre];
        song = {
            step: 0, bar: 0, formIdx: 0, sectionBar: -1, section: FORMS[arrangement].order[0],
            prog: pick(g.progressions), progBar: 0, chordDeg: 0, fill: null, pat: {}
        };
        repick(true);
    }

    function repick(all) {
        var p = parsed;
        CHANNELS.forEach(function(c) {
            if (!all && c === 'kick' && Math.random() < 0.7) return;
            if (!all && Math.random() < 0.45) return;
            var pat = pick(p[c]);
            song.pat[c] = (c === 'lead' || c === 'arp') ? cloneSlots(pat) : pat;
        });
    }

    function mutate(slots) {
        var idx = [];
        for (var i = 0; i < 16; i++) if (slots[i]) idx.push(i);
        if (!idx.length) return;
        var s = slots[pick(idx)];
        s.deg = Math.max(-3, Math.min(11, s.deg + pick([-2, -1, 1, 1, 2])));
    }

    function currentSection() { return SECTIONS[song.section] || SECTIONS.groove; }

    function buildStyle() {
        var g = GENRES[currentGenre];
        if (g.build) return g.build;
        if (g.group === 'Electronic' || currentGenre === 'trap') return 'edm';
        if (g.group === 'Chill') return 'none';
        if (currentGenre === 'space_drone' || currentGenre === 'dark_ambient' || currentGenre === 'music_box') return 'none';
        return 'fill';
    }

    function beginBar(time) {
        var g = GENRES[currentGenre];
        var form = FORMS[arrangement] || FORMS.song;
        if (song.reset) {
            var keepPat = song.keepPatterns ? song.pat : null;
            newSong();
            if (keepPat) song.pat = keepPat;
        }
        song.sectionBar++;
        var sec = currentSection();
        if (song.sectionBar >= sec.bars) {
            song.formIdx++;
            if (song.formIdx >= form.order.length) song.formIdx = form.loopFrom;
            song.section = form.order[song.formIdx];
            song.sectionBar = 0;
            sec = currentSection();
            repick(false);
            if (Math.random() < 0.3) song.prog = pick(g.progressions);
            pushEvent(time, song.section === 'drop' ? 'drop' : 'section', 1);
            notify();
        }
        if (song.sectionBar === 0) scheduleFilter(time, sec);

        song.chordDeg = snapRoot(song.prog[song.progBar % song.prog.length]);
        song.progBar++;

        if (song.sectionBar > 0 && song.sectionBar % 4 === 0) {
            if (Math.random() < 0.5) mutate(song.pat.lead);
            if (Math.random() < 0.35) mutate(song.pat.arp);
            if (Math.random() < 0.35) song.pat.hihat = pick(parsed.hihat);
            if (Math.random() < 0.3) song.pat.perc = pick(parsed.perc);
        }

        var style = buildStyle();
        song.fill = null;
        if (style !== 'none') {
            if (song.sectionBar === sec.bars - 1) song.fill = 'end';
            else if (song.sectionBar % 4 === 3 && Math.random() < energy * 0.6) song.fill = 'small';
        }
        pushEvent(time, 'bar', 1);
    }

    function scheduleFilter(time, sec) {
        var f = busFilter.frequency;
        var top = 1200 + 16800 * (0.35 + 0.65 * energy);
        var from = sec.cutoff ? Math.min(sec.cutoff[0], top) : top;
        var to = sec.cutoff ? Math.min(sec.cutoff[1], top) : top;
        f.cancelScheduledValues(time);
        f.setValueAtTime(from, time);
        if (Math.abs(to - from) > 1) {
            var barSec = 240 / bpm;
            f.exponentialRampToValueAtTime(to, time + sec.bars * barSec * 0.98);
        }
    }

    // ------------------------------------------------------------ Sequencer
    function mixAllows(mix, step, grid) {
        if (mix <= 0) return false;
        if (mix >= 0.99) return true;
        return step % (grid || 4) === 0;
    }

    function play(ch, note, dur, time, vel, variant) {
        var k = kit[ch];
        if (!k || !k.sound) return;
        if (Array.isArray(note) && !k.sound.poly) note = note[0];
        try { k.sound.play(note, dur, time, Math.max(0.02, Math.min(1, vel)), variant); } catch (err) { /* noop */ }
    }

    function drumFill(ch, step, hit, style) {
        var sec = song.section;
        if (style === 'edm' && sec === 'build') {
            if (ch === 'snare') {
                var b = song.sectionBar;
                var grid = b === 0 ? 4 : (b === 1 ? 2 : 1);
                var prog = (b * 16 + step) / (SECTIONS.build.bars * 16);
                return step % grid === 0 ? { v: 0.3 + 0.7 * prog, roll: b === SECTIONS.build.bars - 1 && step >= 8 } : null;
            }
            if (ch === 'kick' && song.sectionBar === SECTIONS.build.bars - 1 && step >= 8) return null;
            return hit;
        }
        if (!song.fill) return hit;
        if (song.fill === 'small') {
            if (ch === 'snare' && step >= 14) return { v: step === 15 ? 0.9 : 0.55 };
            return hit;
        }
        if (step < 12) return hit;
        if (style === 'edm') {
            if (ch === 'snare') return { v: 0.5 + (step - 12) * 0.15, roll: step === 15 };
            return hit;
        }
        // Band / world fill: perc (toms, congas, tabla) leads into the snare.
        if (ch === 'perc') return step < 14 ? { v: 0.85, variant: step & 1 } : null;
        if (ch === 'snare') return step >= 14 ? { v: 0.75 + (step - 14) * 0.2 } : null;
        return hit;
    }

    function onStep(time) {
        if (!song || !parsed) return;
        try { stepBody(time); } catch (err) { console.warn('Music step failed:', err); }
        song.step++;
        if (song.step >= 16) { song.step = 0; song.bar++; }
    }

    function stepBody(time) {
        var g = GENRES[currentGenre];
        if (song.step === 0) beginBar(time);
        var step = song.step;
        var sec = currentSection();
        var stepSec = 15 / bpm;
        var e = energy;
        var velScale = 0.78 + 0.3 * e;
        var hum = g.humanize || 0.002;
        var style = buildStyle();

        // ---- drums
        for (var i = 0; i < DRUM_CHANNELS.length; i++) {
            var ch = DRUM_CHANNELS[i];
            var mix = sec.mix[ch];
            var orig = song.pat[ch][step];
            var hit = drumFill(ch, step, orig, style);
            var fillHit = !!hit && hit !== orig;
            if (!hit && ch === 'hihat' && e > 0.8 && (step & 1) && Math.random() < (e - 0.8) * 2.5) hit = { v: 0.3, ghost: true };
            if (!hit) continue;
            if (!fillHit && !mixAllows(mix, step, 4)) continue;
            if (hit.ghost && e < 0.35) continue;
            if (ch === 'perc' && e < 0.2 && !fillHit) continue;
            var v = hit.v * velScale * (mix < 0.99 && !fillHit ? 0.8 : 1) * (0.94 + Math.random() * 0.12);
            var t = ch === 'kick' ? time : time + (Math.random() * 2 - 1) * hum;
            play(ch, hit.variant || 0, stepSec, t, v, hit.variant || 0);
            if (hit.roll) play(ch, 0, stepSec * 0.5, t + stepSec * 0.5, v * 0.8, 0);
            if (ch === 'kick') {
                pumpSidechain(time, g.sidechain || 0);
                pushEvent(time, 'kick', v);
            } else if (ch === 'snare') {
                pushEvent(t, 'snare', v);
            } else if (ch === 'hihat') {
                pushEvent(t, 'hat', v);
            } else {
                pushEvent(t, 'perc', v);
            }
            if (hit.roll) pushEvent(t + stepSec * 0.5, ch === 'hihat' ? 'hat' : ch, v * 0.8);
        }

        // ---- bass
        var bs = song.pat.bass[step];
        if (bs && mixAllows(sec.mix.bass, step, 8)) {
            var bv = 0.75 * velScale * (0.95 + Math.random() * 0.1);
            play('bass', noteHz(song.chordDeg + bs.deg, octaveFor('bass')), bs.len * stepSec * 0.92, time + (Math.random() * 2 - 1) * hum * 0.5, bv);
            pushEvent(time, 'bass', bv);
        }

        // ---- chords
        var ps = song.pat.pad[step];
        if (ps && mixAllows(sec.mix.pad, step, 8)) {
            var voicing = VOICINGS[g.voicing] || VOICINGS.triad;
            var root = g.voicing === 'drone' ? 0 : song.chordDeg;
            var oct = octaveFor('pad');
            var notes = voicing.map(function(d) { return noteHz(root + d, oct, true); });
            var dur = ps.hold ? ps.len * stepSec : Math.max(1.5, ps.len) * stepSec * 0.7;
            play('pad', notes, dur, time + Math.random() * hum, ps.v * velScale);
            pushEvent(time, 'chord', ps.v);
        }

        // ---- arpeggio
        var as = song.pat.arp[step];
        if (as && mixAllows(sec.mix.arp, step, 2) && !(e < 0.3 && (step & 2))) {
            var av = 0.55 * velScale * (step % 4 === 0 ? 1 : 0.8);
            play('arp', noteHz(song.chordDeg + as.deg, octaveFor('arp')), Math.max(1, as.len) * stepSec * 0.85, time + (Math.random() * 2 - 1) * hum, av);
        }

        // ---- lead
        var ls = song.pat.lead[step];
        var leadOn = sec.mix.lead > 0 || (e > 0.7 && song.section === 'groove' && (song.sectionBar & 4));
        if (ls && leadOn && (e >= 0.25 || song.section === 'brk')) {
            var lv = 0.62 * velScale * (0.93 + Math.random() * 0.14);
            play('lead', noteHz(song.chordDeg + ls.deg, octaveFor('lead')), ls.len * stepSec * 0.95, time + (Math.random() * 2 - 1) * hum, lv);
            pushEvent(time, 'lead', lv);
        }

        if (step % 4 === 0) pushEvent(time, 'beat', step === 0 ? 1 : 0.7);
    }

    function pumpSidechain(time, amount) {
        if (amount <= 0 || !instrumentOn.kick) return;
        var gn = duck.gain;
        gn.cancelScheduledValues(time);
        gn.setValueAtTime(1 - amount * 0.85, time);
        gn.linearRampToValueAtTime(1.0, time + Math.min(0.22, 30 / bpm));
    }

    // ------------------------------------------------------------ Events (Beat Reactor sync)
    var EVENT_CHANNEL = { kick: 'kick', snare: 'snare', hat: 'hihat', perc: 'perc', bass: 'bass', lead: 'lead', chord: 'pad' };
    function pushEvent(time, type, value) {
        var channel = EVENT_CHANNEL[type];
        if (channel && !instrumentOn[channel]) return;
        if (!offlineContext && events.length > 256) events.splice(0, 64);
        events.push({ time: time, type: type, value: value });
    }

    function outputLatency() {
        try {
            var raw = audioContext().rawContext;
            return (raw.outputLatency || 0) + (raw.baseLatency || 0);
        } catch (err) { return 0; }
    }

    // Calls fn(event) for every queued event that is now audible.
    function pollEvents(fn) {
        if (!ready || !events.length) return 0;
        var now = audioContext().currentTime - outputLatency();
        var n = 0;
        for (var i = 0; i < events.length; ) {
            if (events[i].time <= now) {
                var ev = events.splice(i, 1)[0];
                var channel = EVENT_CHANNEL[ev.type];
                // A mixer mute can happen after a note was scheduled.
                if (now - ev.time < 0.25 && (!channel || instrumentOn[channel])) {
                    var gain = channel ? Math.pow(10, Math.min(0, instrumentVol[channel]) / 20) : 1;
                    fn({ time: ev.time, type: ev.type, value: ev.value * gain, age: Math.max(0, now - ev.time) });
                    n++;
                }
            } else {
                i++;
            }
        }
        return n;
    }

    function getBeatInfo() {
        if (!ready || !playing) return null;
        var beats = 0;
        try {
            var t = Math.max(0, audioContext().currentTime - outputLatency());
            beats = Math.max(0, transport().getTicksAtTime(t) / transport().PPQ);
        } catch (err) { /* noop */ }
        var sec = song ? currentSection() : SECTIONS.groove;
        return {
            bpm: bpm,
            beats: beats,
            phase: beats - Math.floor(beats),
            barPhase: (beats % 4) / 4,
            section: song ? song.section : 'groove',
            sectionLabel: sec.label,
            sectionBar: song ? Math.max(0, song.sectionBar) : 0,
            sectionBars: sec.bars
        };
    }

    // ------------------------------------------------------------ Genre handling
    function applyGenre(name, randomKey) {
        var g = GENRES[name];
        if (!g) return false;
        currentGenre = name;
        parsed = parseGenre(g);
        bpm = Math.round(g.bpm[0] + Math.random() * (g.bpm[1] - g.bpm[0]));
        currentScale = pick(g.scales);
        if (randomKey) currentKey = NOTES[Math.floor(Math.random() * 12)];
        swing = g.swing || 0;
        fxReverb = g.fx ? g.fx.reverb : 0.3;
        fxDelay = g.fx ? g.fx.delay : 0.3;
        if (ready) {
            syncTempo();
            buildKit();
            syncTempo();
            applySwing();
            applyFx();
            applyMasterGain();
            try { reverb.decay = 1.6 + fxReverb * 5; } catch (err) { /* noop */ }
        }
        if (song && playing) { song.reset = true; } else if (ready) { newSong(); }
        notify();
        return true;
    }

    // ------------------------------------------------------------ Public API
    function start() {
        if (playing) return;
        starting = true;
        var request = ++playRequest;
        notify();
        if (!ready) { init(function(ok) { if (request !== playRequest) return; if (ok) startPlay(request); else { starting = false; notify(); } }); return; }
        startPlay(request);
    }

    function startPlay(request) {
        if (playing) return;
        Tone.start().then(function() {
            if (playing || request !== playRequest) return;
            starting = false;
            syncTempo();
            applySwing();
            newSong();
            events = [];
            busFilter.frequency.cancelScheduledValues(0);
            seqLoop.start(0);
            transport().position = 0;
            transport().start('+0.05');
            playing = true;
            notify();
        }).catch(function(error) {
            if (request !== playRequest) return;
            starting = false;
            notify();
            console.warn('Music could not start:', error);
        });
    }

    function stop() {
        playRequest++;
        if (!playing) { if (starting) { starting = false; notify(); } return; }
        starting = false;
        transport().stop();
        transport().position = 0;
        if (seqLoop) seqLoop.stop();
        for (var c in kit) {
            var s = kit[c].sound;
            if (!s) continue;
            try { if (s.release) s.release(); } catch (err) { /* noop */ }
        }
        try { duck.gain.cancelScheduledValues(0); duck.gain.value = 1; } catch (err2) { /* noop */ }
        events = [];
        playing = false;
        notify();
    }

    function setGenre(n) { if (!GENRES[n]) return; applyGenre(n, false); }
    function setKey(k) { if (NOTES.indexOf(k) >= 0) currentKey = k; }
    function setScale(s) { if (SCALES[s]) currentScale = s; }
    function setBPM(v) {
        v = Math.max(40, Math.min(220, Math.round(Number(v) || bpm)));
        bpm = v;
        if (ready) syncTempo();
    }
    function applyMasterGain() {
        if (!master) return;
        var trim = GENRES[currentGenre] && GENRES[currentGenre].gain || 0;
        master.gain.rampTo(Tone.dbToGain(masterVol + trim), 0.08);
    }
    function setMasterVolume(db) { masterVol = db; applyMasterGain(); }
    function setInstrumentOn(name, on) {
        if (!(name in instrumentOn)) return;
        instrumentOn[name] = !!on;
        applyChannelVolume(name);
    }
    function setInstrumentVolume(name, db) {
        if (!(name in instrumentVol)) return;
        instrumentVol[name] = Math.max(-30, Math.min(12, Number(db) || 0));
        applyChannelVolume(name);
    }
    function setEnergy(v) {
        energy = Math.max(0, Math.min(1, Number(v)));
        if (ready && song && !currentSection().cutoff) busFilter.frequency.rampTo(1200 + 16800 * (0.35 + 0.65 * energy), 0.3);
    }
    function setArrangement(mode) {
        if (!FORMS[mode]) return;
        arrangement = mode;
        if (song) { song.reset = true; song.keepPatterns = true; }
    }
    function setSwing(v) { swing = Math.max(0, Math.min(1, Number(v) || 0)); applySwing(); }
    function setReverb(v) { fxReverb = Math.max(0, Math.min(1, Number(v) || 0)); applyFx(); }
    function setDelay(v) { fxDelay = Math.max(0, Math.min(1, Number(v) || 0)); applyFx(); }

    function randomize() {
        applyGenre(currentGenre, true);
        if (song) { song.reset = true; song.keepPatterns = false; }
    }

    function onChange(fn) {
        if (typeof fn !== 'function') return function() {};
        listeners.push(fn);
        return function() { listeners = listeners.filter(function(l) { return l !== fn; }); };
    }

    function notify() {
        listeners.slice().forEach(function(fn) { try { fn(); } catch (err) { /* noop */ } });
    }

    function soundLabel(name) {
        var special = { kick808: '808 Kick', bass808: '808 Bass', acid303: 'Acid 303', padSine: 'Sine Pad' };
        if (special[name]) return special[name];
        var s = String(name || '').replace(/([A-Z])/g, ' $1');
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function getInstrumentList() {
        var g = GENRES[currentGenre];
        return CHANNELS.map(function(c) {
            return {
                key: c, label: CHANNEL_LABELS[c], sound: g.kit[c], soundLabel: soundLabel(g.kit[c]),
                on: instrumentOn[c], volume: instrumentVol[c]
            };
        });
    }

    function getGenreGroups() {
        return MusicGenres.groups.map(function(group) {
            return {
                group: group,
                genres: Object.keys(GENRES).filter(function(k) { return GENRES[k].group === group; })
                    .map(function(k) { return { id: k, label: GENRES[k].label }; })
            };
        });
    }

    function getSection() {
        if (!song) return null;
        var sec = currentSection();
        return { name: song.section, label: sec.label, bar: Math.max(0, song.sectionBar), bars: sec.bars };
    }

    // Tap of the final mix for video recording.
    function getRecordStream() {
        if (!ready || !limiter) return null;
        try {
            if (!recordDest) {
                recordDest = Tone.getContext().rawContext.createMediaStreamDestination();
                limiter.connect(recordDest);
            }
            return recordDest.stream;
        } catch (err) {
            console.warn('Music recording tap failed:', err);
            return null;
        }
    }

    function getAnalysis() {
        if (!ready || !waveformAnalyser || !fftAnalyser) {
            return { available: false, playing: playing, waveform: new Float32Array(512), fft: new Float32Array(512) };
        }
        try {
            var w = waveformAnalyser.getValue();
            var f = fftAnalyser.getValue();
            for (var i = 0; i < 512; i++) {
                waveBuf[i] = w[i] !== undefined ? (Number(w[i]) * 0.5 + 0.5) : 0.5;
                var db = f[i] !== undefined ? Number(f[i]) : -100;
                // Match the file/capture analyser's -100..-30 dB byte range.
                fftBuf[i] = Math.max(0, Math.min(1, (db + 100) / 70));
            }
            return { available: true, playing: playing, waveform: waveBuf, fft: fftBuf,
                byteData: false, fftSize: 1024, sampleRate: Tone.getContext().rawContext.sampleRate,
                fftScale: 'normalized-db', fftMinDecibels: -100, fftMaxDecibels: -30 };
        } catch (err) {
            return { available: false, playing: playing, waveform: waveBuf, fft: fftBuf };
        }
    }

    function getSettings() {
        var mixer = {};
        CHANNELS.forEach(function(c) { mixer[c] = { on: instrumentOn[c], volume: instrumentVol[c] }; });
        return { genre: currentGenre, key: currentKey, scale: currentScale, bpm: bpm,
            volume: masterVol, energy: energy, arrangement: arrangement, swing: swing,
            reverb: fxReverb, delay: fxDelay, mixer: mixer };
    }
    function setSettings(state) {
        if (!state || typeof state !== 'object') return false;
        if (state.genre !== currentGenre && Object.prototype.hasOwnProperty.call(GENRES, state.genre)) setGenre(state.genre);
        if (typeof state.key === 'string') setKey(state.key);
        if (typeof state.scale === 'string' && Object.prototype.hasOwnProperty.call(SCALES, state.scale)) setScale(state.scale);
        if (state.arrangement === 'song' || state.arrangement === 'loop') setArrangement(state.arrangement);
        var fields = { bpm: [40, 220, setBPM], volume: [-30, 0, setMasterVolume], energy: [0, 1, setEnergy],
            swing: [0, 1, setSwing], reverb: [0, 1, setReverb], delay: [0, 1, setDelay] };
        Object.keys(fields).forEach(function(k) {
            if (typeof state[k] === 'number' && isFinite(state[k])) fields[k][2](Math.max(fields[k][0], Math.min(fields[k][1], state[k])));
        });
        CHANNELS.forEach(function(c) {
            var row = state.mixer && state.mixer[c];
            if (!row) return;
            if (typeof row.on === 'boolean') setInstrumentOn(c, row.on);
            if (typeof row.volume === 'number' && isFinite(row.volume)) setInstrumentVolume(c, row.volume);
        });
        notify(); return true;
    }

    async function prepareOffline() {
        if (!offlineContext || !ready) throw new Error('Studio offline engine is unavailable.');
        await reverb.ready;
        syncTempo(); applySwing(); newSong(); events = [];
        seqLoop.start(0); transport().start(0.02); playing = true;
    }
    function disposeOffline() {
        if (seqLoop) seqLoop.dispose();
        Object.keys(kit).forEach(function(k) { if (kit[k].sound) kit[k].sound.dispose(); });
        Object.keys(channels).forEach(function(k) {
            channels[k].node.dispose(); Object.keys(channels[k].sends).forEach(function(s) { channels[k].sends[s].dispose(); });
        });
        [master, compressor, limiter, duck, busFilter, reverb, reverbReturn, delay, delayReturn, waveformAnalyser, fftAnalyser].forEach(function(n) { if (n) n.dispose(); });
    }
    async function renderOffline(duration, sampleRate) {
        var state = getSettings(), original = Tone.getContext();
        var context = new Tone.OfflineContext(2, duration, sampleRate || 48000), engine;
        try {
            // Construct a separate graph, then restore the live context before
            // awaiting or rendering. Live controls never point at offline nodes.
            Tone.setContext(context);
            try { engine = createMusicEngine(context); engine.setSettings(state); engine.init(); }
            finally { Tone.setContext(original); }
            await engine.prepareOffline();
            var result = await context.render();
            return { buffer: result.get ? result.get() : result, events: engine.getOfflineEvents(), bpm: state.bpm };
        } finally {
            if (Tone.getContext() !== original) Tone.setContext(original);
            if (engine) engine.disposeOffline(); context.dispose();
        }
    }

    return {
        init: init, start: start, stop: stop,
        setGenre: setGenre, setKey: setKey, setScale: setScale,
        setBPM: setBPM, setMasterVolume: setMasterVolume,
        setInstrumentOn: setInstrumentOn, setInstrumentVolume: setInstrumentVolume,
        setEnergy: setEnergy, setArrangement: setArrangement, setSwing: setSwing,
        setReverb: setReverb, setDelay: setDelay,
        randomize: randomize,
        isReady: isReady, isPlaying: isPlaying,
        isStarting: function() { return starting; },
        getBPM: function() { return bpm; },
        getKey: function() { return currentKey; },
        getScale: function() { return currentScale; },
        getGenre: function() { return currentGenre; },
        getGenreList: function() { return Object.keys(GENRES); },
        getGenreDef: function(name) { return GENRES[name]; },
        getGenreLabel: function(name) { return GENRES[name] ? GENRES[name].label : name; },
        getGenreGroups: getGenreGroups,
        getScaleList: function() { return Object.keys(SCALES); },
        getEnergy: function() { return energy; },
        getMasterVolume: function() { return masterVol; },
        getSettings: getSettings,
        setSettings: setSettings,
        renderOffline: renderOffline,
        prepareOffline: prepareOffline,
        disposeOffline: disposeOffline,
        getOfflineEvents: function() {
            return events.map(function(e) {
                var channel = EVENT_CHANNEL[e.type];
                return { time: e.time, type: e.type, value: e.value * (channel ? Math.pow(10, Math.min(0, instrumentVol[channel]) / 20) : 1) };
            }).sort(function(a, b) { return a.time - b.time; });
        },
        getArrangement: function() { return arrangement; },
        getSwing: function() { return swing; },
        getReverb: function() { return fxReverb; },
        getDelay: function() { return fxDelay; },
        getInstrumentList: getInstrumentList,
        getSection: getSection,
        getBeatInfo: getBeatInfo,
        pollEvents: pollEvents,
        onChange: onChange,
        getRecordStream: getRecordStream,
        getAnalysis: getAnalysis
    };

    function isReady() { return ready; }
    function isPlaying() { return playing; }
})();

if (typeof AudioAnalysis !== 'undefined' && AudioAnalysis.setStudioProvider) {
    AudioAnalysis.setStudioProvider({
        getAnalysis: Music.getAnalysis,
        isReady: Music.isReady,
        isPlaying: Music.isPlaying
    });
}
