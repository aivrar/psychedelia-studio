/* Shared physical audio measurements for the router, reactor and export. */
var AudioSignal = (function() {
    'use strict';
    var bands = { kick: [30, 150], bass: [30, 300], snare: [450, 2800], mid: [300, 4000], high: [4000, 20000], hat: [6000, 20000] };
    function clamp(v) { return !isFinite(v) ? 0 : Math.max(0, Math.min(1, v)); }
    function linear(analysis, buffer) {
        var fft = analysis.spectrum || analysis.fft || [], byte = !!analysis.byteData;
        if (!buffer || buffer.length !== fft.length) buffer = new Float32Array(fft.length);
        var range = Number(analysis.fftMaxDecibels) - Number(analysis.fftMinDecibels);
        if (!isFinite(range) || range <= 0) range = 70;
        for (var i = 0; i < fft.length; i++) {
            var v = clamp(Number(fft[i]) / (byte ? 255 : 1));
            buffer[i] = analysis.fftScale === 'normalized-db' && v ? Math.pow(10, (v - 1) * range / 20) : v;
        }
        return buffer;
    }
    function rms(wave, byte) {
        var power = 0;
        for (var i = 0; i < wave.length; i++) {
            var n = Number(wave[i]);
            var v = !isFinite(n) ? 0 : byte ? (Math.max(0, Math.min(255, n)) - 128) / 128 : (clamp(n) - 0.5) * 2;
            power += v * v;
        }
        return Math.sqrt(power / Math.max(1, wave.length));
    }
    function range(analysis, hz) {
        var length = (analysis.spectrum || analysis.fft || []).length;
        var rate = Number(analysis.sampleRate), size = Number(analysis.fftSize);
        if (!isFinite(rate) || rate <= 0) rate = 44100;
        if (!isFinite(size) || size <= 0) size = Math.max(2, length * 2);
        var binHz = rate / size;
        return [Math.max(1, Math.ceil(hz[0] / binHz)), Math.min(length - 1, Math.floor(hz[1] / binHz))];
    }
    function mean(fft, bins) {
        var sum = 0;
        for (var i = bins[0]; i <= bins[1]; i++) sum += fft[i];
        return sum / Math.max(1, bins[1] - bins[0] + 1);
    }
    function measure(analysis, buffer) {
        var fft = analysis.linearSpectrum || linear(analysis, buffer);
        return { level: clamp(rms(analysis.waveform || [], analysis.byteData) * 1.4),
            bass: mean(fft, range(analysis, bands.bass)), mid: mean(fft, range(analysis, bands.mid)),
            treble: mean(fft, range(analysis, bands.high)) };
    }
    return { bands: bands, linear: linear, rms: rms, range: range, mean: mean, measure: measure };
})();
