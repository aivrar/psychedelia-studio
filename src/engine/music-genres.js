/* Psychedelia Studio - Music genre library
 *
 * Pattern notation (16 steps = one bar of 16th notes):
 *   drums:   '.' rest  'x' hit  'X' accent  'o' ghost  'r' 32nd roll  '2' variant hit
 *            (variant = low tabla, open hat, low conga ...)
 *   melodic: space separated tokens: '.' rest, '-' hold previous note,
 *            a number = scale degree above the current chord root
 *            (7 = one octave up, negative = below)
 *   chords:  '.' rest  'x' stab  'X' accent stab  'L' held chord  '-' hold
 *
 * kit maps the eight mixer channels to sounds from MusicSounds.
 */
var MusicGenres = (function() {
    'use strict';

    var R = '................';            // 16-step rest
    var M = '. . . . . . . . . . . . . . . .'; // silent melodic bar

    var G = {
        // =============================================================== Electronic
        minimal: {
            label: 'Minimal Techno', group: 'Electronic', bpm: [120, 126], scales: ['minor', 'dorian', 'minor pentatonic'],
            swing: 0, sidechain: 0.55, voicing: 'triad', fx: { reverb: 0.25, delay: 0.3 },
            kit: { kick: 'kickPunch', snare: 'rim', hihat: 'hatClosed', perc: 'shaker', bass: 'sawBass', pad: 'padSine', arp: 'pluck', lead: 'leadSine' },
            progressions: [[0, 0, 0, 0], [0, 0, 3, 3], [0, 5, 3, 5]],
            kick: ['x...x...x...x...'], snare: ['.......x.......x', '...x.....x......', R],
            hihat: ['..x...x...x...x.', '..x...x...x..xx.'], perc: ['x.x.x.x.x.x.x.x.', R],
            bass: ['0 . . . . . . . 0 . . . . . . .', '0 . . . . . 0 . . . . . . . . .', '0 . 0 . . . . . 0 . . . . . 0 .'],
            pad: ['L---------------'], arp: ['0 . 2 . 4 . 2 . 0 . 2 . 4 . 7 .', '0 . . 2 . . 4 . . 2 . . 0 . . .', M],
            lead: [M, '0 . . . 2 . . . 4 . . . 2 . . .']
        },
        deep_house: {
            label: 'Deep House', group: 'Electronic', bpm: [118, 124], scales: ['minor', 'dorian', 'mixolydian'],
            swing: 0.12, swingSub: '16n', sidechain: 0.45, voicing: 'seventh', fx: { reverb: 0.35, delay: 0.25 },
            kit: { kick: 'kickPunch', snare: 'clap', hihat: 'hatOpen', perc: 'shaker', bass: 'subBass', pad: 'rhodes', arp: 'pluck', lead: 'leadSine' },
            progressions: [[0, 3, 5, 4], [0, 5, 3, 4], [1, 4, 0, 0]],
            kick: ['x...x...x...x...'], snare: ['....x.......x...'],
            hihat: ['..2...2...2...2.', 'x.2.x.2.x.2.x.2.'], perc: ['.xx..xx..xx..xx.', 'x.x.x.x.x.x.x.x.'],
            bass: ['0 . . 0 . . 0 . . . . . 0 . . .', '0 . . . . . . . 0 . . . . . 4 .', '0 . . 4 . . 0 . . 2 . . 0 . . .'],
            pad: ['X..x..x.........', 'x.....x...x.....', 'L---------------'],
            arp: ['0 . 4 . 2 . 4 . 0 . 4 . 2 . 0 .', M],
            lead: [M, '4 . . 2 . . 0 . . . 2 . . . . .', '0 . 2 . 4 - - . 2 . 0 . . . . .']
        },
        techno: {
            label: 'Techno', group: 'Electronic', bpm: [128, 134], scales: ['minor', 'phrygian'],
            swing: 0, sidechain: 0.55, voicing: 'power', fx: { reverb: 0.3, delay: 0.25 },
            kit: { kick: 'kickPunch', snare: 'clap', hihat: 'hatClosed', perc: 'rim', bass: 'reese', pad: 'padDark', arp: 'pluck', lead: 'leadSaw' },
            progressions: [[0, 0, 0, 0], [0, 3, 0, 3], [0, 0, 5, 3]],
            kick: ['x...x...x...x...'], snare: ['....x.......x...', R],
            hihat: ['..x...x...x...x.', 'xxXxxxXxxxXxxxXx'], perc: ['...x..x....x..x.', '.x..x..x.x..x...'],
            bass: ['0 . 0 . . . 0 . 0 . 0 . . . 0 .', '0 0 . 0 . 0 . . 0 0 . 0 . . 0 .'],
            pad: ['L---------------'], arp: ['0 . 4 . 2 . 4 . 0 . 4 . 2 . 7 .', M],
            lead: [M, '0 . . . . . 2 . . . . . 4 . . .']
        },
        psytrance: {
            label: 'Psytrance', group: 'Electronic', bpm: [140, 146], scales: ['phrygian', 'harmonic minor', 'minor'],
            swing: 0, sidechain: 0.35, voicing: 'triad', fx: { reverb: 0.3, delay: 0.45 },
            kit: { kick: 'kickPunch', snare: 'clap', hihat: 'hatClosed', perc: 'hatOpen', bass: 'acid303', pad: 'padStrings', arp: 'pluck', lead: 'supersaw' },
            progressions: [[0, 6, 5, 6], [0, 3, 5, 6], [0, 0, 1, 0]],
            kick: ['x...x...x...x...'], snare: [R, '............x...'],
            hihat: ['..x...x...x...x.'], perc: ['..2...2...2...2.', R],
            bass: ['. 0 0 0 . 0 0 0 . 0 0 0 . 0 0 0', '. 0 0 7 . 0 0 0 . 0 1 0 . 0 0 0'],
            pad: ['L---------------', R], arp: ['0 2 4 2 0 2 4 7 0 2 4 2 0 4 2 0', '0 . 4 . 2 . 0 . 4 . 2 . 0 . 4 .'],
            lead: [M, '7 . . 4 . . 2 . . . 0 . . . . .', '0 1 0 . 3 . 4 . 3 1 0 . . . . .']
        },
        trance: {
            label: 'Trance', group: 'Electronic', bpm: [134, 140], scales: ['minor', 'harmonic minor'],
            swing: 0, sidechain: 0.6, voicing: 'triad', fx: { reverb: 0.45, delay: 0.4 },
            kit: { kick: 'kickPunch', snare: 'clap', hihat: 'hatOpen', perc: 'hatClosed', bass: 'sawBass', pad: 'supersaw', arp: 'pluck', lead: 'supersaw' },
            progressions: [[0, 5, 2, 6], [5, 3, 0, 4], [0, 3, 5, 4]],
            kick: ['x...x...x...x...'], snare: ['....x.......x...'],
            hihat: ['..2...2...2...2.'], perc: ['xxxxxxxxxxxxxxxx', 'x.x.x.x.x.x.x.x.'],
            bass: ['. . 0 . . . 0 . . . 0 . . . 0 .', '. . 0 0 . . 0 0 . . 0 0 . . 0 0'],
            pad: ['x..x..x..x..x.x.', 'L---------------'], arp: ['0 2 4 7 4 2 0 2 4 7 4 2 0 2 4 2', '0 4 7 4 0 4 7 9 0 4 7 4 0 4 7 4'],
            lead: [M, '7 . . . 6 . . . 4 - - - 2 . . .', '4 . 4 . 2 . 4 - - . 7 . 6 . 4 .']
        },
        acid_house: {
            label: 'Acid House', group: 'Electronic', bpm: [122, 128], scales: ['minor', 'phrygian', 'blues'],
            swing: 0.1, swingSub: '16n', sidechain: 0.3, voicing: 'triad', fx: { reverb: 0.2, delay: 0.35 },
            kit: { kick: 'kickPunch', snare: 'clap', hihat: 'hatClosed', perc: 'hatOpen', bass: 'acid303', pad: 'padSine', arp: 'acid303', lead: 'leadSaw' },
            progressions: [[0, 0, 0, 0], [0, 0, 3, 0]],
            kick: ['x...x...x...x...'], snare: ['....x.......x...'],
            hihat: ['x.x.x.x.x.x.x.x.'], perc: ['..2...2...2...2.'],
            bass: ['0 0 7 0 . 0 3 0 0 . 5 0 7 . 0 3', '0 . 0 7 0 . 3 . 0 0 . 5 . 7 0 .', '0 7 0 . 0 0 6 . 0 . 3 0 . 7 . 0'],
            pad: [R, 'L---------------'], arp: [M], lead: [M, '7 . . . . . 5 . . . . . 3 . . .']
        },
        dnb: {
            label: 'Drum & Bass', group: 'Electronic', bpm: [172, 176], scales: ['minor', 'dorian'],
            swing: 0, sidechain: 0.25, voicing: 'seventh', fx: { reverb: 0.4, delay: 0.3 },
            kit: { kick: 'kickPunch', snare: 'snareTight', hihat: 'hatClosed', perc: 'shaker', bass: 'reese', pad: 'padStrings', arp: 'pluck', lead: 'leadSine' },
            progressions: [[0, 6, 5, 6], [0, 3, 5, 0], [0, 5, 3, 4]],
            kick: ['x.........x.....', 'x.........x..x..'], snare: ['....X.......X...', '....X..o....X.o.'],
            hihat: ['x.x.x.x.x.x.x.x.', 'xxx.xxx.xxx.xxxx'], perc: ['.x.x.x.x.x.x.x.x'],
            bass: ['0 - - - . . 0 . . . . . 0 - . .', '0 - . . . . . . -1 - . . 0 . . .'],
            pad: ['L---------------'], arp: ['0 . . 4 . . 2 . . . . . 0 . . .', M],
            lead: [M, '0 . . . 2 . . . 4 - - . 2 . . .']
        },
        dubstep: {
            label: 'Dubstep', group: 'Electronic', bpm: [138, 142], scales: ['minor', 'phrygian'],
            swing: 0, sidechain: 0.2, voicing: 'power', fx: { reverb: 0.3, delay: 0.2 },
            kit: { kick: 'kick808', snare: 'snareTight', hihat: 'hatClosed', perc: 'clap', bass: 'wobble', pad: 'padDark', arp: 'pluck', lead: 'leadSaw' },
            progressions: [[0, 0, 5, 6], [0, 3, 0, 1]],
            kick: ['x.........x.....', 'x......x..x.....'], snare: ['........X.......'],
            hihat: ['x.x.x.x.x.x.x.x.', 'x.xxx.x.x.xxx.x.'], perc: [R, '........x.......'],
            bass: ['0 - - - - - - - 0 - - - 3 - - -', '0 - - - 0 - 0 - - - 6 - 5 - - -', '0 - 0 - - - 0 0 - - 1 - 0 - - -'],
            pad: ['L---------------'], arp: [M], lead: [M, '0 . . . . . . . 7 . . 6 . . . .']
        },
        synthwave: {
            label: 'Synthwave', group: 'Electronic', bpm: [100, 116], scales: ['minor', 'dorian'],
            swing: 0, sidechain: 0.3, voicing: 'triad', fx: { reverb: 0.5, delay: 0.35 },
            kit: { kick: 'kickRock', snare: 'snareTight', hihat: 'hatClosed', perc: 'tom', bass: 'sawBass', pad: 'padStrings', arp: 'pluck', lead: 'leadSaw' },
            progressions: [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4]],
            kick: ['x.......x.......', 'x.......x..x....'], snare: ['....X.......X...'],
            hihat: ['x.x.x.x.x.x.x.x.'], perc: [R],
            bass: ['0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0', '0 . 0 . 0 . 0 . 0 . 0 . 0 . 7 .'],
            pad: ['L---------------'], arp: ['0 . 2 . 4 . 2 . 0 . 2 . 4 . 7 .', '0 4 2 4 0 4 2 4 0 4 2 4 0 4 7 4'],
            lead: ['4 . . 2 . . 0 . . . 2 . 4 . . .', '0 . 2 . 4 - - . 7 . 4 . 2 . . .']
        },
        chiptune: {
            label: 'Chiptune', group: 'Electronic', bpm: [135, 155], scales: ['major', 'minor', 'minor pentatonic'],
            swing: 0, sidechain: 0, voicing: 'triad', fx: { reverb: 0.05, delay: 0.1 },
            kit: { kick: 'kickPunch', snare: 'bitNoise', hihat: 'bitNoise', perc: 'bitNoise', bass: 'chipBass', pad: 'chipChord', arp: 'chipArp', lead: 'squareLead' },
            progressions: [[0, 4, 5, 3], [0, 3, 4, 0], [5, 3, 0, 4]],
            kick: ['x.....x.x.......'], snare: ['....2.......2...'],
            hihat: ['x.x.x.x.x.x.x.x.'], perc: [R, '..............xx'],
            bass: ['0 . 0 . 7 . 0 . 0 . 0 . 7 . 4 .', '0 . 7 . 0 . 7 . 0 . 7 . 4 . 2 .'],
            pad: [R, 'x...x...x...x...'], arp: ['0 2 4 2 0 2 4 7 0 2 4 2 7 4 2 0'],
            lead: ['0 . 2 . 4 . 7 . 4 . 2 . 0 . . .', '4 . . 2 . . 0 . 2 . . 4 . . . .', '7 . 7 . 6 . 4 . 2 . 4 . 2 . 0 .']
        },
        disco: {
            label: 'Nu-Disco', group: 'Electronic', bpm: [116, 124], scales: ['minor', 'dorian', 'mixolydian'],
            swing: 0.06, swingSub: '16n', sidechain: 0.4, voicing: 'seventh', fx: { reverb: 0.3, delay: 0.2 },
            kit: { kick: 'kickPunch', snare: 'clap', hihat: 'hatOpen', perc: 'shaker', bass: 'fingerBass', pad: 'funkGuitar', arp: 'pluck', lead: 'brass' },
            progressions: [[0, 3, 4, 3], [0, 5, 3, 4]],
            kick: ['x...x...x...x...'], snare: ['....x.......x...'],
            hihat: ['..2...2...2...2.'], perc: ['xxxxxxxxxxxxxxxx'],
            bass: ['0 . 7 . 0 . 7 . 0 . 7 . 0 . 7 .', '0 . 7 0 . 0 7 . 0 . 7 0 . 0 7 .'],
            pad: ['.x.x.x.x.x.x.x.x', 'x..x..x...x..x..'], arp: [M], lead: [M, '7 . 7 . 4 . . 5 - - 4 . 2 . . .']
        },

        // =============================================================== Chill
        ambient: {
            label: 'Ambient', group: 'Chill', bpm: [65, 78], scales: ['major', 'dorian', 'lydian'],
            swing: 0, sidechain: 0, voicing: 'open', fx: { reverb: 0.75, delay: 0.45 },
            kit: { kick: 'kickSoft', snare: 'rim', hihat: 'shaker', perc: 'woodblock', bass: 'subBass', pad: 'padWarm', arp: 'kalimba', lead: 'flute' },
            progressions: [[0, 5, 3, 4], [0, 3, 5, 0], [0, 4, 5, 3]],
            kick: [R], snare: [R], hihat: [R, '..o...o...o...o.'], perc: [R],
            bass: ['0 - - - - - - - - - - - - - - -'],
            pad: ['L---------------'], arp: ['0 . . . 4 . . . 2 . . . 0 . . .', '0 . . 2 . . . 4 . . . 2 . . . .', '7 . . . . . 4 . . . . . 2 . . .'],
            lead: ['4 - - - . . . . 2 - - - . . . .', '0 - - - . . 2 - . . . . 4 - - -', M]
        },
        lofi: {
            label: 'Lo-Fi Hip Hop', group: 'Chill', bpm: [72, 86], scales: ['dorian', 'minor pentatonic', 'major'],
            swing: 0.3, swingSub: '16n', sidechain: 0.15, voicing: 'seventh', humanize: 0.012, fx: { reverb: 0.35, delay: 0.25 },
            kit: { kick: 'kickSoft', snare: 'snareTight', hihat: 'hatClosed', perc: 'shaker', bass: 'subBass', pad: 'rhodes', arp: 'vibes', lead: 'leadSine' },
            progressions: [[1, 4, 0, 5], [0, 5, 3, 4], [3, 2, 1, 4]],
            kick: ['x.....x...x.....', 'x.......x.x.....'], snare: ['....x.......x...', '....x..o....x...'],
            hihat: ['x.x.x.x.x.x.x.x.', 'x.x.x.xxx.x.x.x.'], perc: [R],
            bass: ['0 . . . . . . 0 - . . . 4 . . .', '0 - . . . . . . 0 . . 2 . . . .'],
            pad: ['L---------------', 'X.......x.......'], arp: [M, '7 . . . 4 . . . 2 . . . . . . .'],
            lead: [M, '4 . . 2 . . 0 . . . . . 2 . . .', '0 . 2 . . 4 . . 2 . . . . . . .']
        },
        downtempo: {
            label: 'Trip-Hop', group: 'Chill', bpm: [84, 96], scales: ['minor', 'harmonic minor', 'dorian'],
            swing: 0.18, swingSub: '16n', sidechain: 0.1, voicing: 'seventh', humanize: 0.008, fx: { reverb: 0.5, delay: 0.4 },
            kit: { kick: 'kick808', snare: 'snareTight', hihat: 'hatClosed', perc: 'rim', bass: 'dubBass', pad: 'padStrings', arp: 'piano', lead: 'flute' },
            progressions: [[0, 5, 3, 4], [0, 0, 5, 4]],
            kick: ['x......x..x.....', 'x.........x..x..'], snare: ['....X.......X...'],
            hihat: ['x.xxx.xxx.xxx.xx'], perc: ['.......x......x.'],
            bass: ['0 - - - . . . . -2 - - - . . . .', '0 - . . . . 0 . 2 - . . . . . .'],
            pad: ['L---------------'], arp: ['0 . . 2 . . 4 . . 2 . . 0 . . .', M],
            lead: [M, '4 - - - 2 . 0 . . . . . -1 - - -']
        },
        space_drone: {
            label: 'Space Drone', group: 'Chill', bpm: [56, 66], scales: ['lydian', 'whole tone', 'minor'],
            swing: 0, sidechain: 0, voicing: 'drone', fx: { reverb: 0.9, delay: 0.6 },
            kit: { kick: 'kickSoft', snare: 'rim', hihat: 'shaker', perc: 'gong', bass: 'droneBass', pad: 'padDark', arp: 'bellChord', lead: 'leadSine' },
            progressions: [[0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 6, 0]],
            kick: [R], snare: [R], hihat: [R], perc: ['x...............', R, R, R],
            bass: ['0 - - - - - - - - - - - - - - -'],
            pad: ['L---------------'], arp: ['0 . . . . . . . . . . . . . . .', '4 . . . . . . . 7 . . . . . . .', M],
            lead: [M, M, '7 - - - - - - - 6 - - - - - - -']
        },

        // =============================================================== Grooves & Bands
        jazz: {
            label: 'Jazz Swing', group: 'Grooves & Bands', bpm: [118, 150], scales: ['dorian', 'mixolydian', 'major'],
            swing: 0.55, swingSub: '8n', sidechain: 0, voicing: 'seventh', humanize: 0.014, fx: { reverb: 0.3, delay: 0.05 },
            kit: { kick: 'kickSoft', snare: 'brush', hihat: 'ride', perc: 'hatClosed', bass: 'upright', pad: 'rhodes', arp: 'vibes', lead: 'brass' },
            progressions: [[1, 4, 0, 0], [0, 5, 1, 4], [2, 5, 1, 4]],
            kick: ['x.......x.......', R], snare: ['....o.......o...', 'o...o...o...o..o'],
            hihat: ['x...x.x.x...x.x.'], perc: ['....x.......x...'],
            bass: ['0 . 2 . 4 . 5 . 7 . 5 . 4 . 2 .', '0 . 4 . 7 . 4 . 0 . 2 . 4 . 6 .', '0 . 1 . 2 . 4 . 5 . 4 . 2 . 1 .'],
            pad: ['x.....x.........', '....x.......x...', 'x.......x.x.....'],
            arp: [M, '7 . . . 6 . 4 . . . 2 . 4 . . .'],
            lead: [M, '4 . 6 . 7 - . . 9 . 7 . 6 . 4 .', '2 . 4 . 6 - - . 4 . . . 1 . . .']
        },
        bossa: {
            label: 'Bossa Nova', group: 'Grooves & Bands', bpm: [126, 140], scales: ['major', 'dorian', 'lydian'],
            swing: 0.08, swingSub: '16n', sidechain: 0, voicing: 'ninth', humanize: 0.01, fx: { reverb: 0.3, delay: 0.1 },
            kit: { kick: 'kickSoft', snare: 'rim', hihat: 'shaker', perc: 'woodblock', bass: 'upright', pad: 'nylonChord', arp: 'vibes', lead: 'flute' },
            progressions: [[0, 0, 1, 4], [0, 3, 1, 4], [0, 5, 1, 4]],
            kick: ['x..x....x..x....'], snare: ['x..x..x...x..x..'],
            hihat: ['xxxxxxxxxxxxxxxx'], perc: [R, '..x.....x.......'],
            bass: ['0 . . 4 - . . . 0 . . 4 - . . .', '0 . . 4 - . . . 7 . . 4 - . . .'],
            pad: ['x..x..x...x..x..', 'x.x..x.x..x..x.x'], arp: [M],
            lead: ['4 - - . 2 . . . 4 - - . 2 . . .', '7 - . 6 . 4 . . 2 - - - . . . .', M]
        },
        funk: {
            label: 'Funk', group: 'Grooves & Bands', bpm: [100, 112], scales: ['mixolydian', 'dorian', 'blues'],
            swing: 0.12, swingSub: '16n', sidechain: 0, voicing: 'ninth', humanize: 0.006, fx: { reverb: 0.15, delay: 0.1 },
            kit: { kick: 'kickRock', snare: 'snareTight', hihat: 'hatClosed', perc: 'hatOpen', bass: 'fingerBass', pad: 'funkGuitar', arp: 'organ', lead: 'brass' },
            progressions: [[0, 0, 0, 0], [0, 0, 3, 3], [0, 3, 0, 4]],
            kick: ['x.x....x..x.....', 'x......x.xx.....'], snare: ['....X..o.o..X..o', '....X.o.....X.o.'],
            hihat: ['xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xx'], perc: ['..............2.', R],
            bass: ['0 . . 0 7 . . 0 . . 3 . 4 . 7 .', '0 . 7 . . 0 . 6 . 0 . . 3 4 . .'],
            pad: ['.x.x..x..x.x..x.', 'x..x.x...x..x.x.'], arp: [M],
            lead: [M, '7 . . . 6 . 4 . . . 3 . 4 . . .', '0 . 3 . 4 . . 6 - . 7 . . . . .']
        },
        reggae: {
            label: 'Reggae Dub', group: 'Grooves & Bands', bpm: [70, 80], scales: ['major', 'minor', 'dorian'],
            swing: 0.15, swingSub: '16n', sidechain: 0, voicing: 'triad', humanize: 0.006, fx: { reverb: 0.4, delay: 0.6 },
            kit: { kick: 'kickSoft', snare: 'rim', hihat: 'hatClosed', perc: 'snareTight', bass: 'dubBass', pad: 'skank', arp: 'organ', lead: 'leadSine' },
            progressions: [[0, 3, 0, 4], [0, 5, 3, 4], [0, 0, 3, 3]],
            kick: ['........x.......'], snare: ['........x.......'],
            hihat: ['x.x.x.x.x.x.x.x.', 'x.xxx.xxx.xxx.xx'], perc: [R, '...............x'],
            bass: ['0 - . . . . 2 . 4 - - . . 2 0 .', '0 . . 4 - . . . 7 - . . 4 . 2 .'],
            pad: ['....x.......x...', '....x.x.....x.x.'], arp: [M, '. . . . 0 . . . . . . . 0 . . .'],
            lead: [M, '4 . . . 2 . . . 0 - - - . . . .']
        },
        hiphop: {
            label: 'Boom Bap', group: 'Grooves & Bands', bpm: [86, 96], scales: ['minor', 'dorian', 'minor pentatonic'],
            swing: 0.28, swingSub: '16n', sidechain: 0.1, voicing: 'seventh', humanize: 0.008, fx: { reverb: 0.2, delay: 0.15 },
            kit: { kick: 'kickRock', snare: 'snareTight', hihat: 'hatClosed', perc: 'shaker', bass: 'subBass', pad: 'piano', arp: 'vibes', lead: 'leadSine' },
            progressions: [[0, 5, 3, 4], [0, 0, 5, 5]],
            kick: ['x......x.x......', 'x.........x..x..'], snare: ['....X.......X...'],
            hihat: ['x.x.x.x.x.x.x.x.'], perc: [R],
            bass: ['0 - . . . . . 0 - . . . . . . .', '0 . . . . . . 0 2 . . . . . . .'],
            pad: ['x.......x...x...', 'X.....x.........'], arp: [M], lead: [M, '7 . . 4 . . 2 . . . . . . . . .']
        },
        trap: {
            label: 'Trap', group: 'Grooves & Bands', bpm: [136, 150], scales: ['minor', 'phrygian', 'harmonic minor'],
            swing: 0, sidechain: 0, voicing: 'triad', fx: { reverb: 0.3, delay: 0.25 },
            kit: { kick: 'kick808', snare: 'clap', hihat: 'hatClosed', perc: 'hatOpen', bass: 'bass808', pad: 'padDark', arp: 'bellChord', lead: 'leadSine' },
            progressions: [[0, 0, 5, 6], [0, 3, 5, 4]],
            kick: ['x.........x.....', 'x......x..x.....'], snare: ['........X.......'],
            hihat: ['x.x.x.x.x.x.xrxr', 'x.xrx.x.x.xrx.rr', 'xrx.x.xrx.x.xrrr'], perc: [R, '..............2.'],
            bass: ['0 - - - - - - - . . 0 - - - - -', '0 - - - - - - 0 - - 3 - - - 2 -'],
            pad: ['L---------------'], arp: ['0 . . . 4 . . . 2 . . . 7 . . .', M],
            lead: [M, '7 . . . 6 . . . 4 . . . 3 . . .']
        },
        psych_rock: {
            label: 'Psychedelic Rock', group: 'Grooves & Bands', bpm: [96, 118], scales: ['mixolydian', 'dorian', 'blues'],
            swing: 0.05, swingSub: '16n', sidechain: 0, voicing: 'power', humanize: 0.01, fx: { reverb: 0.45, delay: 0.3 },
            kit: { kick: 'kickRock', snare: 'snareTight', hihat: 'ride', perc: 'tom', bass: 'fingerBass', pad: 'organ', arp: 'stringPluck', lead: 'fuzzLead' },
            progressions: [[0, 6, 3, 0], [0, 3, 6, 3], [0, 0, 6, 6]],
            kick: ['x.......x.x.....', 'x..x....x.......'], snare: ['....X.......X...'],
            hihat: ['x.x.x.x.x.x.x.x.'], perc: [R, '............xx22'],
            bass: ['0 . . 0 . . 0 . 7 . . 6 . . 4 .', '0 . 0 . 7 . 6 . 0 . 0 . 3 . 4 .'],
            pad: ['L---------------', 'X.......X...x...'], arp: [M, '0 . 4 . 7 . 4 . 0 . 4 . 7 . 4 .'],
            lead: [M, '7 - - . 6 . 4 . 3 - - - 4 . . .', '0 . 3 . 4 . 6 7 - - - . 6 . 4 .']
        },
        blues: {
            label: 'Blues Shuffle', group: 'Grooves & Bands', bpm: [88, 108], scales: ['blues', 'mixolydian'],
            swing: 0.6, swingSub: '8n', sidechain: 0, voicing: 'seventh', humanize: 0.012, fx: { reverb: 0.3, delay: 0.1 },
            kit: { kick: 'kickSoft', snare: 'snareTight', hihat: 'ride', perc: 'hatClosed', bass: 'upright', pad: 'organ', arp: 'piano', lead: 'fuzzLead' },
            progressions: [[0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4]],
            kick: ['x.......x.......'], snare: ['....x.......x...'],
            hihat: ['x.x.x.x.x.x.x.x.'], perc: ['....x.......x...'],
            bass: ['0 . 2 . 4 . 5 . 6 . 5 . 4 . 2 .'],
            pad: ['..x...x...x...x.', 'x.......x.......'], arp: [M],
            lead: [M, '4 . 5 . 6 - - . 4 . 2 . 0 . . .', '7 . . 6 . 4 . 3 - - . 2 . 0 . .']
        },

        // =============================================================== World
        raga: {
            label: 'Indian Raga', group: 'World', bpm: [76, 92], scales: ['bhairav', 'phrygian dominant', 'kafi'],
            swing: 0.05, swingSub: '16n', sidechain: 0, voicing: 'drone', humanize: 0.012, fx: { reverb: 0.45, delay: 0.25 },
            kit: { kick: 'kickSoft', snare: 'rim', hihat: 'shaker', perc: 'tabla', bass: 'droneBass', pad: 'tanpura', arp: 'sitar', lead: 'flute' },
            progressions: [[0, 0, 0, 0]],
            kick: [R], snare: [R], hihat: [R],
            perc: ['x.2.x.x.2.x.2.x.', 'x.xx2.x.x.x2..x.', '2.x.x2x.x.2.x.xx'],
            bass: ['0 - - - - - - - - - - - - - - -'],
            pad: ['L---------------'],
            arp: ['0 . 1 . 3 - . 4 . 3 . 1 . 0 . .', '4 . . 5 4 . 3 . 1 . . 0 - - . .', '7 . . 6 . 5 . 4 - - 3 . 1 . 0 .', M],
            lead: [M, '0 - - - 1 - 3 - - - 4 - - - - -']
        },
        gamelan: {
            label: 'Gamelan', group: 'World', bpm: [80, 100], scales: ['pelog', 'slendro'],
            swing: 0, sidechain: 0, voicing: 'open', fx: { reverb: 0.55, delay: 0.2 },
            kit: { kick: 'kickSoft', snare: 'rim', hihat: 'woodblock', perc: 'gong', bass: 'droneBass', pad: 'bellChord', arp: 'gamelanBells', lead: 'gamelanBells' },
            progressions: [[0, 0, 2, 0], [0, 3, 1, 0]],
            kick: ['x.......x.......', R], snare: [R], hihat: ['x.x.x.x.x.x.x.x.', '..x...x...x...x.'],
            perc: ['x...............', R],
            bass: ['0 - - - - - - - 2 - - - - - - -'],
            pad: [R, 'x.......x.......'],
            arp: ['0 2 3 2 0 2 3 4 3 2 0 2 3 2 0 .', '4 3 2 3 4 3 2 0 2 3 4 3 2 3 4 .'],
            lead: ['0 . . . 3 . . . 2 . . . 4 . . .', '7 . . . 5 . . . 4 . . . 2 . . .']
        },
        celtic: {
            label: 'Celtic Folk', group: 'World', bpm: [104, 124], scales: ['dorian', 'mixolydian', 'major'],
            swing: 0.18, swingSub: '16n', sidechain: 0, voicing: 'open', humanize: 0.01, fx: { reverb: 0.4, delay: 0.1 },
            kit: { kick: 'tom', snare: 'brush', hihat: 'shaker', perc: 'woodblock', bass: 'droneBass', pad: 'nylonChord', arp: 'stringPluck', lead: 'whistle' },
            progressions: [[0, 0, 6, 6], [0, 3, 0, 4], [0, 6, 3, 4]],
            kick: ['x.....x...x.....'], snare: ['..x...x...x...x.'],
            hihat: ['x.xx.xx.xx.xx.x.'], perc: [R],
            bass: ['0 - - - - - - - - - - - - - - -'],
            pad: ['x..x..x.x..x..x.'], arp: [M, '0 . 2 4 . 2 0 . 4 . 2 . 0 . . .'],
            lead: ['4 . 2 . 0 . 2 4 . 7 . 4 . 2 . .', '0 2 4 . 2 . 0 . -1 . 0 2 4 - - .', '7 . 6 4 . 2 . 4 6 . 4 . 2 . 0 .']
        },
        desert: {
            label: 'Arabian Nights', group: 'World', bpm: [90, 108], scales: ['phrygian dominant', 'hijaz kar', 'harmonic minor'],
            swing: 0.08, swingSub: '16n', sidechain: 0, voicing: 'drone', humanize: 0.01, fx: { reverb: 0.45, delay: 0.3 },
            kit: { kick: 'kickSoft', snare: 'rim', hihat: 'shaker', perc: 'conga', bass: 'dubBass', pad: 'tanpura', arp: 'oud', lead: 'flute' },
            progressions: [[0, 0, 1, 0], [0, 6, 1, 0]],
            kick: ['x.....x.....x...', 'x.....x...x.....'], snare: ['...x.....x....x.'],
            hihat: ['x.x.x.x.x.x.x.x.'], perc: ['2..x.x2..x.x2.x.', '2.x..x2.x..x.x.x'],
            bass: ['0 - - - . . . . 0 - - - . . 1 .'],
            pad: ['L---------------'], arp: ['0 1 2 . 1 0 . . 4 . 3 2 1 . 0 .', '4 3 4 . 5 4 3 . 2 1 2 . 1 0 . .'],
            lead: [M, '7 - - . 6 . 5 . 4 - - - 3 . 1 .']
        },
        afrobeat: {
            label: 'Afrobeat', group: 'World', bpm: [100, 116], scales: ['dorian', 'mixolydian', 'minor pentatonic'],
            swing: 0.1, swingSub: '16n', sidechain: 0, voicing: 'seventh', humanize: 0.008, fx: { reverb: 0.25, delay: 0.15 },
            kit: { kick: 'kickRock', snare: 'snareTight', hihat: 'shaker', perc: 'conga', bass: 'fingerBass', pad: 'organ', arp: 'marimba', lead: 'brass' },
            progressions: [[0, 0, 0, 0], [0, 0, 3, 3]],
            kick: ['x.....x...x...x.', 'x...x.....x.x...'], snare: ['....x..o....x..o'],
            hihat: ['xxxxxxxxxxxxxxxx'], perc: ['x.2..x.2x.2..x.2', '..x.2.x...x.2.x.'],
            bass: ['0 . . 3 . 4 . . 0 . 6 . 7 . . .', '0 . 0 . . 3 . 4 . . 0 . . 6 . .'],
            pad: ['.x..x..x.x..x..x'], arp: ['0 . 2 . 4 . 2 . 0 . 2 . 4 . 7 .', M],
            lead: [M, '7 . 7 . 6 . 4 . . . 3 . 4 . . .']
        },

        // =============================================================== Cinematic
        cinematic: {
            label: 'Epic Cinematic', group: 'Cinematic', bpm: [80, 96], scales: ['minor', 'harmonic minor', 'dorian'],
            swing: 0, sidechain: 0, voicing: 'open', fx: { reverb: 0.7, delay: 0.2 },
            kit: { kick: 'timpani', snare: 'snareTight', hihat: 'shaker', perc: 'tom', bass: 'droneBass', pad: 'padStrings', arp: 'piano', lead: 'brassSection' },
            progressions: [[0, 5, 2, 6], [0, 3, 5, 4], [5, 3, 0, 4]],
            kick: ['x.......x.......', 'x...........x...', 'x..x..x.x..x..x.'], snare: [R, '............xxxx'],
            hihat: [R, 'x.x.x.x.x.x.x.x.'], perc: [R, '..x...x...x.2.2.'],
            bass: ['0 - - - - - - - 0 - - - - - - -'],
            pad: ['L---------------'], arp: ['0 . 2 . 4 . 7 . 4 . 2 . 0 . 2 .', M],
            lead: [M, '4 - - - 2 - - - 0 - - - -1 - - -', '7 - - - 6 - 4 - 5 - - - 4 - - -']
        },
        music_box: {
            label: 'Music Box Dream', group: 'Cinematic', bpm: [70, 88], scales: ['major', 'lydian', 'major pentatonic'],
            swing: 0.1, swingSub: '16n', sidechain: 0, voicing: 'triad', fx: { reverb: 0.6, delay: 0.35 },
            kit: { kick: 'kickSoft', snare: 'rim', hihat: 'shaker', perc: 'woodblock', bass: 'subBass', pad: 'padWarm', arp: 'musicBox', lead: 'musicBox' },
            progressions: [[0, 5, 3, 4], [0, 3, 4, 0], [0, 4, 5, 3]],
            kick: [R], snare: [R], hihat: [R], perc: [R],
            bass: ['0 - - - - - - - 4 - - - - - - -'],
            pad: ['L---------------'], arp: ['0 . 4 . 7 . 4 . 2 . 4 . 7 . 4 .', '0 4 7 4 0 4 7 9 7 4 0 4 7 4 0 .'],
            lead: ['7 - . 9 . . 7 . 4 - - . 2 . . .', '4 . 5 . 7 - - . 9 . 7 . 4 - . .', M]
        },
        dark_ambient: {
            label: 'Dark Ambient', group: 'Cinematic', bpm: [54, 66], scales: ['locrian', 'phrygian', 'harmonic minor'],
            swing: 0, sidechain: 0, voicing: 'drone', fx: { reverb: 0.9, delay: 0.5 },
            kit: { kick: 'timpani', snare: 'rim', hihat: 'shaker', perc: 'gong', bass: 'droneBass', pad: 'padDark', arp: 'bellChord', lead: 'leadSine' },
            progressions: [[0, 0, 1, 0], [0, 0, 6, 5]],
            kick: ['x...............', R, R], snare: [R], hihat: [R, '.o.....o.....o..'], perc: [R, 'x...............', R],
            bass: ['0 - - - - - - - - - - - - - - -'],
            pad: ['L---------------'], arp: [M, '0 . . . . . . . 1 . . . . . . .', '4 . . . . . . . . . . . . . . .'],
            lead: [M, M, '0 - - - - - - - 1 - - - - - - -']
        }
    };

    // Scales as semitone steps. Raga and maqam scales are 12-TET
    // approximations; pelog/slendro approximate the gamelan tunings.
    var SCALES = {
        'minor': [0, 2, 3, 5, 7, 8, 10],
        'major': [0, 2, 4, 5, 7, 9, 11],
        'dorian': [0, 2, 3, 5, 7, 9, 10],
        'phrygian': [0, 1, 3, 5, 7, 8, 10],
        'lydian': [0, 2, 4, 6, 7, 9, 11],
        'mixolydian': [0, 2, 4, 5, 7, 9, 10],
        'locrian': [0, 1, 3, 5, 6, 8, 10],
        'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
        'minor pentatonic': [0, 3, 5, 7, 10],
        'major pentatonic': [0, 2, 4, 7, 9],
        'blues': [0, 3, 5, 6, 7, 10],
        'whole tone': [0, 2, 4, 6, 8, 10],
        'phrygian dominant': [0, 1, 4, 5, 7, 8, 10],
        'hijaz kar': [0, 1, 4, 5, 7, 8, 11],
        'bhairav': [0, 1, 4, 5, 7, 8, 11],
        'kafi': [0, 2, 3, 5, 7, 9, 10],
        'pelog': [0, 1, 3, 7, 8],
        'slendro': [0, 2, 5, 7, 9]
    };

    // Loudness trims (dB) measured as RMS of the mixed output, so switching
    // genres keeps a similar level.
    var GAIN = {
        minimal: 1, techno: 1, psytrance: 1, trance: 1, acid_house: 0.5, dnb: 3, dubstep: 2.5, synthwave: 6, disco: 1,
        ambient: -3, lofi: 2.5, downtempo: -2.5, space_drone: 4, jazz: 8, bossa: 5, funk: 5, reggae: -3.5,
        hiphop: 3.5, trap: 1, psych_rock: 2.5, blues: 7, raga: 3, gamelan: 4, celtic: 3, desert: -3.5,
        afrobeat: 4, cinematic: -2, music_box: -2.5, dark_ambient: 4.5
    };
    for (var gk in GAIN) if (G[gk]) G[gk].gain = GAIN[gk];

    var GROUPS = ['Electronic', 'Chill', 'Grooves & Bands', 'World', 'Cinematic'];

    return {
        genres: G,
        scales: SCALES,
        groups: GROUPS
    };
})();
