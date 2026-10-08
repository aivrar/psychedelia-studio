/* Shuffle bounds apply only to generated looks. Manual controls keep their
 * full ranges. A link's base AND full-strength endpoint must fit the bounds. */
var ShuffleProfiles = (function() {
    'use strict';
    var gentleFx = {
        color_grade: { brightness: [-0.025, 0.025], contrast: [0.94, 1.08], saturation: [0.9, 1.18], hue_shift: [0, 0.08], gamma: [0.95, 1.05], temperature: [-0.08, 0.08], tint: [-0.06, 0.06], vibrance: [0, 0.12], invert: [0, 0] },
        color_wash: { amount: [0.04, 0.16], saturation: [0.9, 1.2], scale: [1, 3], speed: [0.1, 0.4] },
        bloom: { intensity: [0.08, 0.28], threshold: [0.6, 0.85], radius: [1, 3], softness: [0.3, 0.6], blend: [1, 1], tint: [0, 0.1] },
        grain: { intensity: [0.015, 0.06], size: [1, 1.5], colored: [0, 0.25], shadows: [0, 0.4] },
        sharpen: { amount: [0.1, 0.4], radius: [0.5, 1] }
    };
    var gentleOverlays = {
        particles: { particle_count: [10, 45], particle_size: [0.5, 2.5], particle_brightness: [0.15, 0.4], particle_speed: [0.1, 0.5], particle_style: [0, 1], particle_burst: [0, 0], particle_twinkle: [0, 0.25] },
        rings: { ring_opacity: [0.1, 0.28], ring_thickness: [0.5, 2], ring_glow: [0, 6], ring_rotation: [0, 0], ring_speed: [0.15, 0.35], ring_life: [0.4, 1.2] },
        frame: { frame_opacity: [0.15, 0.4], frame_thickness: [1, 3], frame_glow: [0, 7] },
        vignette: { vignette_strength: [0.08, 0.2], vignette_size: [0.2, 0.4], vignette_softness: [0.7, 1.1] },
        bokeh: { bk_count: [5, 16], bk_size: [0.015, 0.055], bk_opacity: [0.08, 0.22], bk_speed: [0.1, 0.35], bk_motion: [0, 1], bk_twinkle: [0, 0.2] },
        spectrum: { spectrum_opacity: [0.2, 0.45], spectrum_height: [0.06, 0.18], spectrum_glow: [0, 5], spectrum_thickness: [1, 2], spectrum_style: [0, 1], spectrum_position: [0, 0] }
    };
    var wildFx = {
        color_grade: { brightness: [-0.1, 0.1], gamma: [0.8, 1.25], contrast: [0.8, 1.35], invert: [0, 0.15] },
        bloom: { intensity: [0.15, 0.8], threshold: [0.45, 0.8], blend: [1, 1] },
        god_rays: { intensity: [0.1, 0.55], threshold: [0.5, 0.85] },
        anamorphic: { intensity: [0.1, 0.7], threshold: [0.5, 0.85], ghosts: [0, 0.18] },
        edge_glow: { intensity: [0.15, 0.75], threshold: [0.08, 0.3], mode: [0, 0] },
        led_wall: { brightness: [0.8, 1.3], glow: [0.1, 0.4] },
        trails: { amount: [0.3, 0.8], blend: [2, 2] },
        tilt_shift: { width: [0.35, 0.7], blur: [1, 5] },
        posterize: { gamma: [0.8, 1.25], ink: [0.1, 0.5] },
        dither: { brightness: [-0.1, 0.1], contrast: [0.85, 1.3] },
        vision: { gain: [0.8, 1.4] },
        zoom_blur: { glow: [0, 0.3] }
    };
    var wildOverlays = {
        bokeh: { bk_count: [8, 35], bk_size: [0.025, 0.1], bk_opacity: [0.12, 0.4] },
        plexus: { px_count: [25, 85], px_distance: [0.04, 0.16], px_line_width: [0.2, 1.5], px_opacity: [0.2, 0.5] },
        figures: { figure_count: [1, 5], figure_fill: [0, 0.08], figure_size: [0.1, 0.4] },
        spotlights: { spot_count: [1, 3], spot_width: [0.03, 0.14], spot_intensity: [0.1, 0.32], spot_haze: [0.02, 0.15] },
        laser_room: { lr_count: [3, 12], lr_haze: [0.02, 0.15], lr_width: [0.5, 2.5] },
        particles: { particle_count: [15, 100], particle_size: [0.5, 4], particle_brightness: [0.2, 0.65] },
        lightning: { bolt_flash: [0, 0.08] },
        hexgrid: { hx_base: [0.1, 0.35], hx_flicker: [0, 0.3] },
        vignette: { vignette_strength: [0.1, 0.55], vignette_size: [0.1, 0.6], vignette_softness: [0.6, 1.2] }
    };
    function bounds(scope, name, key, def, style) {
        var ranges = scope === 'fx' ? wildFx : wildOverlays;
        var range = ranges[name] && ranges[name][key];
        if (style === 'gentle') {
            var gentle = scope === 'fx' ? gentleFx : gentleOverlays;
            range = gentle[name] && gentle[name][key] || range;
        }
        var low = Number(def.min), high = Number(def.max);
        if (range) { low = Math.max(low, range[0]); high = Math.min(high, range[1]); }
        if (scope === 'overlays' && !range) {
            if (/_opacity$/.test(key)) high = Math.min(high, style === 'gentle' ? 0.35 : 0.65);
            if (/_glow$/.test(key)) high = Math.min(high, style === 'gentle' ? 7 : 18);
            if (/_flash$/.test(key)) high = Math.min(high, 0.08);
        }
        if (scope === 'fx' && key === 'mix') high = Math.min(high, 0.8);
        var step = def.type === 'select' ? 1 : Number(def.step) || (def.type === 'int' ? 1 : 0);
        if (step) {
            low = def.min + Math.ceil((low - def.min) / step - 1e-8) * step;
            high = def.min + Math.floor((high - def.min) / step + 1e-8) * step;
        }
        return [low, Math.max(low, high)];
    }
    function value(scope, name, key, def, style, proposed) {
        var range = bounds(scope, name, key, def, style);
        var v = Math.max(range[0], Math.min(range[1], proposed));
        var step = def.type === 'select' ? 1 : Number(def.step) || (def.type === 'int' ? 1 : 0);
        if (step) v = def.min + Math.round((v - def.min) / step) * step;
        v = Math.round(v * 1e9) / 1e9;
        return Math.max(range[0], Math.min(range[1], v));
    }
    function amount(scope, name, key, def, style, base, proposed) {
        var range = bounds(scope, name, key, def, style), span = def.max - def.min;
        if (!(span > 0) || base < range[0] || base > range[1]) return 0;
        var max = style === 'gentle' ? 0.06 : 0.45;
        return Math.max(-max, (range[0] - base) / span, Math.min(max, proposed, (range[1] - base) / span));
    }
    function gentleKeys(scope, name) {
        var row = (scope === 'fx' ? gentleFx : gentleOverlays)[name];
        return row ? Object.keys(row) : [];
    }
    return { fx: gentleFx, overlays: gentleOverlays, bounds: bounds, value: value, amount: amount, gentleKeys: gentleKeys };
})();
