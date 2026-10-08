/* Psychedelia Studio - Music sound library
 * Synthesised instrument designs for the studio music engine. Every sound
 * is built from Tone.js synths and effects (no samples), so the app keeps
 * working offline and from file://.
 *
 *   var s = MusicSounds.create('rhodes', destinationNode);
 *   s.play(['C4', 'E4', 'G4'], '8n', time, 0.6);   // chords: array of notes
 *   s.play('C2', '16n', time, 0.8);                // melodic
 *   s.play(null, '16n', time, 0.9, variant);       // drums (variant 0/1 = pitch/accent)
 *   s.dispose();
 *
 * level: suggested channel level in dB.
 */
var MusicSounds = (function() {
    'use strict';

    // Wraps a synth (+ optional insert effects) into a playable sound.
    function wrap(synth, chain, out, play, level, kind) {
        var nodes = [synth].concat(chain || []);
        for (var i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
        nodes[nodes.length - 1].connect(out);
        return {
            kind: kind || 'melodic',
            poly: synth.maxPolyphony !== undefined,
            level: level,
            play: play,
            release: function() {
                nodes.forEach(function(n) {
                    try { if (n.releaseAll) n.releaseAll(); else if (n.triggerRelease) n.triggerRelease(); } catch (e) { /* noop */ }
                });
            },
            dispose: function() {
                nodes.forEach(function(n) {
                    try { if (n.releaseAll) n.releaseAll(); } catch (e) { /* noop */ }
                    try { n.dispose(); } catch (e2) { /* noop */ }
                });
            }
        };
    }

    function mono(synth) {
        return function(note, dur, time, vel) { synth.triggerAttackRelease(note, dur, time, vel); };
    }

    function poly(synth) {
        return function(notes, dur, time, vel) { synth.triggerAttackRelease(notes, dur, time, vel); };
    }

    var DEFS = {
        // ---------------------------------------------------------- Drums
        kickPunch: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 6, envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.05 } });
            return wrap(s, [], out, function(n, d, t, v) { s.triggerAttackRelease('C1', '8n', t, v); }, -5, 'drum');
        },
        kick808: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.07, octaves: 4, envelope: { attack: 0.001, decay: 0.9, sustain: 0, release: 0.2 } });
            var sat = new Tone.Distortion(0.12);
            return wrap(s, [sat], out, function(n, d, t, v) { s.triggerAttackRelease('A0', '4n', t, v); }, -6, 'drum');
        },
        kickSoft: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 3, envelope: { attack: 0.002, decay: 0.22, sustain: 0, release: 0.05 } });
            return wrap(s, [], out, function(n, d, t, v) { s.triggerAttackRelease('D1', '8n', t, v * 0.8); }, -9, 'drum');
        },
        kickRock: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.025, octaves: 5, envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.05 } });
            var comp = new Tone.Distortion(0.05);
            return wrap(s, [comp], out, function(n, d, t, v) { s.triggerAttackRelease('B0', '8n', t, v); }, -6, 'drum');
        },
        snareTight: function(out) {
            var noise = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.03 } });
            var hp = new Tone.Filter(1400, 'highpass');
            var body = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.02 }, volume: -8 });
            noise.connect(hp);
            body.connect(out);
            var w = wrap(hp, [], out, function(n, d, t, v) {
                noise.triggerAttackRelease('16n', t, v);
                body.triggerAttackRelease('E3', '32n', t, v * 0.8);
            }, -14, 'drum');
            var baseDispose = w.dispose;
            w.dispose = function() { baseDispose(); noise.dispose(); body.dispose(); };
            return w;
        },
        clap: function(out) {
            var noise = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.11, sustain: 0, release: 0.04 } });
            var bp = new Tone.Filter({ frequency: 1250, type: 'bandpass', Q: 1.2 });
            return wrap(noise, [bp], out, function(n, d, t, v) {
                noise.triggerAttackRelease(0.02, t, v * 0.6);
                noise.triggerAttackRelease(0.02, t + 0.011, v * 0.7);
                noise.triggerAttackRelease(0.12, t + 0.022, v);
            }, -12, 'drum');
        },
        brush: function(out) {
            var noise = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.012, decay: 0.22, sustain: 0, release: 0.05 } });
            var bp = new Tone.Filter({ frequency: 3200, type: 'bandpass', Q: 0.7 });
            return wrap(noise, [bp], out, function(n, d, t, v) { noise.triggerAttackRelease('8n', t, v * 0.7); }, -14, 'drum');
        },
        rim: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.006, octaves: 2, envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.01 } });
            return wrap(s, [], out, function(n, d, t, v) { s.triggerAttackRelease('A5', '32n', t, v * 0.7); }, -16, 'drum');
        },
        hatClosed: function(out) {
            var s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.045, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 7000, octaves: 1.5 });
            var hp = new Tone.Filter(7000, 'highpass');
            return wrap(s, [hp], out, function(n, d, t, v) { s.triggerAttackRelease(300, 0.03, t, v); }, -24, 'drum');
        },
        hatOpen: function(out) {
            var s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.28, release: 0.05 }, harmonicity: 5.1, modulationIndex: 32, resonance: 6500, octaves: 1.5 });
            var hp = new Tone.Filter(6500, 'highpass');
            return wrap(s, [hp], out, function(n, d, t, v) { s.triggerAttackRelease(300, n === 1 ? 0.2 : 0.04, t, v); }, -27, 'drum');
        },
        ride: function(out) {
            var s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.9, release: 0.3 }, harmonicity: 3.1, modulationIndex: 14, resonance: 3800, octaves: 1.2 });
            var hp = new Tone.Filter(2500, 'highpass');
            return wrap(s, [hp], out, function(n, d, t, v) { s.triggerAttackRelease(220, 0.2, t, v * 0.55); }, -26, 'drum');
        },
        shaker: function(out) {
            var noise = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.004, decay: 0.05, sustain: 0, release: 0.01 } });
            var hp = new Tone.Filter(6500, 'highpass');
            return wrap(noise, [hp], out, function(n, d, t, v) { noise.triggerAttackRelease(0.04, t, v * 0.6); }, -22, 'drum');
        },
        tabla: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.025, octaves: 1.6, envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.05 } });
            return wrap(s, [], out, function(n, d, t, v) { s.triggerAttackRelease(n === 1 ? 'G2' : 'D4', '16n', t, v); }, -12, 'drum');
        },
        conga: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.018, octaves: 1.3, envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.04 } });
            return wrap(s, [], out, function(n, d, t, v) { s.triggerAttackRelease(n === 1 ? 'G3' : 'C4', '16n', t, v); }, -13, 'drum');
        },
        tom: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 2, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.05 } });
            return wrap(s, [], out, function(n, d, t, v) { s.triggerAttackRelease(n === 1 ? 'A1' : 'E2', '8n', t, v); }, -10, 'drum');
        },
        timpani: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.06, octaves: 1.4, envelope: { attack: 0.002, decay: 1.4, sustain: 0, release: 0.4 } });
            var lp = new Tone.Filter(900, 'lowpass');
            return wrap(s, [lp], out, function(n, d, t, v) { s.triggerAttackRelease(n === 1 ? 'G1' : 'D2', '2n', t, v); }, -6, 'drum');
        },
        gong: function(out) {
            var s = new Tone.FMSynth({ harmonicity: 1.41, modulationIndex: 12, envelope: { attack: 0.005, decay: 3, sustain: 0, release: 2 }, modulationEnvelope: { attack: 0.002, decay: 2, sustain: 0 } });
            return wrap(s, [], out, function(n, d, t, v) { s.triggerAttackRelease(n === 1 ? 'A1' : 'D2', '1m', t, v * 0.6); }, -12, 'drum');
        },
        woodblock: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.004, octaves: 1, envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.01 } });
            return wrap(s, [], out, function(n, d, t, v) { s.triggerAttackRelease(n === 1 ? 'E5' : 'B5', '32n', t, v); }, -15, 'drum');
        },
        bitNoise: function(out) {
            var noise = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.01 } });
            var crush = new Tone.BitCrusher(4);
            return wrap(noise, [crush], out, function(n, d, t, v) { noise.triggerAttackRelease(n === 1 ? 0.12 : 0.03, t, v); }, -18, 'drum');
        },

        // ---------------------------------------------------------- Bass
        subBass: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'sine' }, filter: { type: 'lowpass', frequency: 400 }, envelope: { attack: 0.005, decay: 0.25, sustain: 0.7, release: 0.15 }, filterEnvelope: { baseFrequency: 200, octaves: 1, attack: 0.01, decay: 0.2, sustain: 0.5 } });
            return wrap(s, [], out, mono(s), -8);
        },
        sawBass: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { Q: 2, type: 'lowpass', rolloff: -24 }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.35, release: 0.1 }, filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1, baseFrequency: 60, octaves: 2.6 }, portamento: 0.04 });
            return wrap(s, [], out, mono(s), -12);
        },
        acid303: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'square' }, filter: { Q: 9, type: 'lowpass', rolloff: -24 }, envelope: { attack: 0.002, decay: 0.2, sustain: 0.2, release: 0.05 }, filterEnvelope: { attack: 0.002, decay: 0.16, sustain: 0.08, release: 0.1, baseFrequency: 110, octaves: 4.2 }, portamento: 0.05 });
            var dist = new Tone.Distortion(0.25);
            return wrap(s, [dist], out, mono(s), -16);
        },
        reese: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'fatsawtooth', count: 3, spread: 28 }, filter: { Q: 1, type: 'lowpass', rolloff: -24 }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.8, release: 0.2 }, filterEnvelope: { attack: 0.05, decay: 0.4, sustain: 0.5, baseFrequency: 180, octaves: 2 } });
            return wrap(s, [], out, mono(s), -15);
        },
        wobble: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'fatsawtooth', count: 2, spread: 18 }, filter: { type: 'lowpass', frequency: 20000 }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1 }, filterEnvelope: { baseFrequency: 20000, octaves: 0 } });
            var wob = new Tone.AutoFilter({ frequency: '8n', baseFrequency: 90, octaves: 4.5, depth: 1, filter: { Q: 6, type: 'lowpass', rolloff: -24 } }).start();
            var dist = new Tone.Distortion(0.35);
            var w = wrap(s, [wob, dist], out, mono(s), -15);
            w.sync = function(bpm) { try { wob.frequency.value = bpm ? bpm / 30 : Tone.Time('8n').toFrequency(); } catch (e) { /* noop */ } };
            return w;
        },
        upright: function(out) {
            var s = new Tone.PluckSynth({ attackNoise: 0.8, dampening: 1300, resonance: 0.92 });
            var lp = new Tone.Filter(1400, 'lowpass');
            return wrap(s, [lp], out, function(n, d, t, v) { s.triggerAttack(n, t); }, -6);
        },
        fingerBass: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { Q: 3, type: 'lowpass', rolloff: -24 }, envelope: { attack: 0.003, decay: 0.12, sustain: 0.45, release: 0.08 }, filterEnvelope: { attack: 0.003, decay: 0.09, sustain: 0.2, baseFrequency: 160, octaves: 2.8 } });
            return wrap(s, [], out, mono(s), -12);
        },
        bass808: function(out) {
            var s = new Tone.MembraneSynth({ pitchDecay: 0.09, octaves: 1.4, envelope: { attack: 0.002, decay: 1.1, sustain: 0.3, release: 0.4 } });
            var sat = new Tone.Distortion(0.2);
            return wrap(s, [sat], out, mono(s), -7);
        },
        dubBass: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'sine' }, filter: { type: 'lowpass', frequency: 300 }, envelope: { attack: 0.01, decay: 0.4, sustain: 0.8, release: 0.3 }, filterEnvelope: { baseFrequency: 150, octaves: 1.4 } });
            var sat = new Tone.Chebyshev(2);
            return wrap(s, [sat], out, mono(s), -7);
        },
        chipBass: function(out) {
            var s = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.6, release: 0.05 } });
            return wrap(s, [], out, mono(s), -8);
        },
        droneBass: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'fatsawtooth', count: 3, spread: 12 }, filter: { type: 'lowpass', frequency: 260, Q: 2 }, envelope: { attack: 1.2, decay: 2, sustain: 0.8, release: 3 }, filterEnvelope: { baseFrequency: 140, octaves: 1.2, attack: 2, decay: 3, sustain: 0.6 } });
            return wrap(s, [], out, mono(s), -12);
        },

        // ---------------------------------------------------------- Chords / pads / keys
        padWarm: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fattriangle', count: 3, spread: 22 }, envelope: { attack: 1.4, decay: 1.2, sustain: 0.7, release: 3 } });
            var ch = new Tone.Chorus(0.6, 3.5, 0.5).start();
            return wrap(s, [ch], out, poly(s), -22, 'chord');
        },
        padSine: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 2.5, decay: 3, sustain: 0.5, release: 4 } });
            return wrap(s, [], out, poly(s), -22, 'chord');
        },
        padStrings: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 26 }, envelope: { attack: 0.7, decay: 1, sustain: 0.8, release: 2.2 } });
            var lp = new Tone.Filter(1700, 'lowpass');
            var ch = new Tone.Chorus(0.4, 2.5, 0.35).start();
            return wrap(s, [lp, ch], out, poly(s), -24, 'chord');
        },
        padDark: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 2, spread: 40 }, envelope: { attack: 3, decay: 2, sustain: 0.7, release: 5 } });
            var lp = new Tone.AutoFilter({ frequency: 0.07, baseFrequency: 180, octaves: 3 }).start();
            return wrap(s, [lp], out, poly(s), -22, 'chord');
        },
        rhodes: function(out) {
            var s = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3, modulationIndex: 2.2, oscillator: { type: 'sine' }, envelope: { attack: 0.004, decay: 1.6, sustain: 0.25, release: 1.2 }, modulation: { type: 'sine' }, modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.15, release: 0.5 } });
            var trem = new Tone.Tremolo(4.5, 0.25).start();
            return wrap(s, [trem], out, poly(s), -16, 'chord');
        },
        piano: function(out) {
            var s = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 2, modulationIndex: 1.4, oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 1.4, sustain: 0.08, release: 0.9 }, modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0.05, release: 0.3 } });
            return wrap(s, [], out, poly(s), -14, 'chord');
        },
        organ: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'custom', partials: [1, 0.8, 0.45, 0, 0.3, 0, 0.2, 0.1] }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.12 } });
            var vib = new Tone.Vibrato(5.8, 0.08);
            var ch = new Tone.Chorus(1.5, 2, 0.4).start();
            return wrap(s, [vib, ch], out, poly(s), -22, 'chord');
        },
        skank: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' }, envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.05 } });
            var hp = new Tone.Filter(700, 'highpass');
            var lp = new Tone.Filter(3200, 'lowpass');
            return wrap(s, [hp, lp], out, poly(s), -22, 'chord');
        },
        funkGuitar: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.002, decay: 0.07, sustain: 0.05, release: 0.04 } });
            var wah = new Tone.AutoFilter({ frequency: '4n', baseFrequency: 500, octaves: 2.5, filter: { Q: 4, type: 'bandpass' } }).start();
            var w = wrap(s, [wah], out, poly(s), -18, 'chord');
            w.sync = function(bpm) { try { wah.frequency.value = bpm ? bpm / 60 : Tone.Time('4n').toFrequency(); } catch (e) { /* noop */ } };
            return w;
        },
        powerChord: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.004, decay: 0.3, sustain: 0.6, release: 0.3 } });
            var dist = new Tone.Distortion(0.7);
            var lp = new Tone.Filter(2600, 'lowpass');
            return wrap(s, [dist, lp], out, poly(s), -24, 'chord');
        },
        bellChord: function(out) {
            var s = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3.01, modulationIndex: 9, envelope: { attack: 0.002, decay: 2.2, sustain: 0, release: 2 }, modulationEnvelope: { attack: 0.002, decay: 1.5, sustain: 0, release: 1 } });
            return wrap(s, [], out, poly(s), -22, 'chord');
        },
        tanpura: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 2, spread: 8 }, envelope: { attack: 0.6, decay: 2.5, sustain: 0.5, release: 3 } });
            var lp = new Tone.Filter(1100, 'lowpass');
            var ch = new Tone.Chorus(0.25, 4, 0.6).start();
            return wrap(s, [lp, ch], out, poly(s), -24, 'chord');
        },
        chipChord: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'pulse', width: 0.25 }, envelope: { attack: 0.001, decay: 0.12, sustain: 0.2, release: 0.05 } });
            return wrap(s, [], out, poly(s), -24, 'chord');
        },
        // Five Karplus-Strong voices strummed low to high (PluckSynth is single-voice).
        nylonChord: function(out) {
            var lp = new Tone.Filter(3200, 'lowpass');
            lp.connect(out);
            var voices = [0, 1, 2, 3, 4].map(function() {
                var p = new Tone.PluckSynth({ attackNoise: 1.1, dampening: 2600, resonance: 0.965 });
                p.connect(lp);
                return p;
            });
            return {
                kind: 'chord', poly: true, level: -12,
                play: function(notes, d, t, v) {
                    notes = Array.isArray(notes) ? notes : [notes];
                    for (var i = 0; i < notes.length && i < voices.length; i++) voices[i].triggerAttack(notes[i], t + i * 0.016);
                },
                dispose: function() {
                    voices.forEach(function(p) { try { p.dispose(); } catch (e) { /* noop */ } });
                    try { lp.dispose(); } catch (e2) { /* noop */ }
                }
            };
        },
        brassSection: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 2, spread: 12 }, envelope: { attack: 0.04, decay: 0.25, sustain: 0.6, release: 0.2 } });
            var lp = new Tone.AutoFilter({ frequency: 0.1, baseFrequency: 900, octaves: 1.5 }).start();
            return wrap(s, [lp], out, poly(s), -24, 'chord');
        },

        // ---------------------------------------------------------- Arps / leads
        pluck: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.003, decay: 0.12, sustain: 0.05, release: 0.15 } });
            return wrap(s, [], out, poly(s), -18);
        },
        stringPluck: function(out) {
            var s = new Tone.PluckSynth({ attackNoise: 1.4, dampening: 3200, resonance: 0.95 });
            return wrap(s, [], out, function(n, d, t, v) { s.triggerAttack(n, t); }, -10);
        },
        sitar: function(out) {
            var s = new Tone.PluckSynth({ attackNoise: 2, dampening: 5200, resonance: 0.985 });
            var cheb = new Tone.Chebyshev(5);
            var bp = new Tone.Filter({ frequency: 2400, type: 'peaking', gain: 6, Q: 2 });
            return wrap(s, [cheb, bp], out, function(n, d, t, v) { s.triggerAttack(n, t); }, -16);
        },
        leadSaw: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { Q: 1, type: 'lowpass', rolloff: -12 }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.3 }, filterEnvelope: { attack: 0.03, decay: 0.25, sustain: 0.35, baseFrequency: 600, octaves: 2.5 }, portamento: 0.03 });
            return wrap(s, [], out, mono(s), -20);
        },
        leadSine: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'sine' }, filter: { Q: 1, type: 'lowpass', rolloff: -12 }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.3, release: 0.4 }, filterEnvelope: { baseFrequency: 600, octaves: 2 }, portamento: 0.05 });
            return wrap(s, [], out, mono(s), -16);
        },
        supersaw: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 5, spread: 38 }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.35 } });
            var lp = new Tone.Filter(5200, 'lowpass');
            return wrap(s, [lp], out, poly(s), -26);
        },
        squareLead: function(out) {
            var s = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.002, decay: 0.1, sustain: 0.45, release: 0.08 } });
            return wrap(s, [], out, mono(s), -22);
        },
        chipArp: function(out) {
            var s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'pulse', width: 0.125 }, envelope: { attack: 0.001, decay: 0.07, sustain: 0.1, release: 0.03 } });
            return wrap(s, [], out, poly(s), -24);
        },
        flute: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'sine' }, filter: { type: 'lowpass', frequency: 3000 }, envelope: { attack: 0.08, decay: 0.2, sustain: 0.7, release: 0.25 }, filterEnvelope: { baseFrequency: 2000, octaves: 0.5 }, portamento: 0.02 });
            var vib = new Tone.Vibrato(5.2, 0.12);
            return wrap(s, [vib], out, mono(s), -14);
        },
        whistle: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'triangle' }, filter: { type: 'lowpass', frequency: 4000 }, envelope: { attack: 0.04, decay: 0.15, sustain: 0.6, release: 0.15 }, filterEnvelope: { baseFrequency: 3000, octaves: 0.3 }, portamento: 0.025 });
            var vib = new Tone.Vibrato(6, 0.06);
            return wrap(s, [vib], out, mono(s), -16);
        },
        brass: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { Q: 2, type: 'lowpass', rolloff: -24 }, envelope: { attack: 0.03, decay: 0.2, sustain: 0.55, release: 0.15 }, filterEnvelope: { attack: 0.05, decay: 0.3, sustain: 0.4, baseFrequency: 400, octaves: 3 } });
            return wrap(s, [], out, mono(s), -18);
        },
        kalimba: function(out) {
            var s = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 5.07, modulationIndex: 3, envelope: { attack: 0.001, decay: 0.7, sustain: 0, release: 0.6 }, modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0 } });
            return wrap(s, [], out, poly(s), -14);
        },
        marimba: function(out) {
            var s = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 4, modulationIndex: 1.6, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.4 }, modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0 } });
            return wrap(s, [], out, poly(s), -12);
        },
        gamelanBells: function(out) {
            var s = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 2.76, modulationIndex: 6, envelope: { attack: 0.001, decay: 1.6, sustain: 0, release: 1.4 }, modulationEnvelope: { attack: 0.001, decay: 0.8, sustain: 0 } });
            var trem = new Tone.Tremolo(6.5, 0.3).start();
            return wrap(s, [trem], out, poly(s), -16);
        },
        musicBox: function(out) {
            var s = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 7.1, modulationIndex: 2.2, envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1 }, modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0 } });
            return wrap(s, [], out, poly(s), -16);
        },
        vibes: function(out) {
            var s = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 4, modulationIndex: 0.8, envelope: { attack: 0.002, decay: 1.4, sustain: 0.1, release: 1.2 }, modulationEnvelope: { attack: 0.002, decay: 0.6, sustain: 0 } });
            var trem = new Tone.Tremolo(5, 0.35).start();
            return wrap(s, [trem], out, poly(s), -16);
        },
        fuzzLead: function(out) {
            var s = new Tone.MonoSynth({ oscillator: { type: 'square' }, filter: { Q: 1, type: 'lowpass', rolloff: -12 }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3 }, filterEnvelope: { baseFrequency: 900, octaves: 2 }, portamento: 0.04 });
            var fuzz = new Tone.Distortion(0.85);
            var ph = new Tone.Phaser({ frequency: 0.4, octaves: 3, baseFrequency: 600 });
            return wrap(s, [fuzz, ph], out, mono(s), -26);
        },
        oud: function(out) {
            var s = new Tone.PluckSynth({ attackNoise: 1.6, dampening: 2600, resonance: 0.97 });
            var bp = new Tone.Filter({ frequency: 1200, type: 'peaking', gain: 5, Q: 1.5 });
            return wrap(s, [bp], out, function(n, d, t, v) { s.triggerAttack(n, t); }, -11);
        }
    };

    function create(name, out) {
        var def = DEFS[name] || DEFS.pluck;
        return def(out);
    }

    return {
        create: create,
        names: function() { return Object.keys(DEFS); }
    };
})();
