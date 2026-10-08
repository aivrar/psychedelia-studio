/* Psychedelia - Fire Effect */
EffectRegistry.register({
    name: 'fire',
    label: 'Fire',
    category: 'Demoscene',
    description: 'Realistic procedural flames with customizable palette',
    params: [
        { name: 'speed', label: 'Speed', min: 0.5, max: 5, default: 2, step: 0.1 },
        { name: 'intensity', label: 'Intensity', min: 0.5, max: 3, default: 1.5, step: 0.1 },
        { name: 'detail', label: 'Detail', min: 1, max: 8, default: 5, step: 1, type: 'int' },
        { name: 'wind', label: 'Wind', min: -2, max: 2, default: 0, step: 0.1 },
        { name: 'palette_mode', label: 'Palette', type: 'select', options: ['Classic Fire', 'Blue Fire', 'Green Toxic', 'Purple Magic', 'Rainbow'], default: 0 }
    ],
    shader: `
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_detail;
uniform float u_wind;
uniform float u_palette_mode;

vec3 fireColor(float t, int mode) {
    t = clamp(t, 0.0, 1.0);
    if (mode == 0) return mix(vec3(0.0), mix(vec3(0.8, 0.1, 0.0), mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 1.0, 0.6), t), t), t);
    if (mode == 1) return mix(vec3(0.0), mix(vec3(0.0, 0.1, 0.8), mix(vec3(0.0, 0.5, 1.0), vec3(0.7, 0.9, 1.0), t), t), t);
    if (mode == 2) return mix(vec3(0.0), mix(vec3(0.0, 0.5, 0.0), mix(vec3(0.2, 0.9, 0.1), vec3(0.8, 1.0, 0.5), t), t), t);
    if (mode == 3) return mix(vec3(0.0), mix(vec3(0.3, 0.0, 0.5), mix(vec3(0.7, 0.2, 1.0), vec3(1.0, 0.7, 1.0), t), t), t);
    return rainbow(t);
}

void main() {
    vec2 uv = v_uv;
    vec2 noiseUV = uv + seedOffset() * 0.01;
    float t = u_time * u_speed + seedPhase();

    // Fire noise
    vec2 p = noiseUV * vec2(3.0, 4.0);
    p.x += u_wind * sin(uv.y * 3.0 + t);
    p.y -= t * 0.5;

    float noise = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    for (float i = 0.0; i < 8.0; i++) {
        if (i >= u_detail) break;
        noise += amp * snoise(vec3(p * freq, t * 0.3 * freq));
        freq *= 2.0;
        amp *= 0.5;
    }

    // Shape fire - hotter at bottom
    float shape = 1.0 - uv.y;
    shape = pow(shape, 1.5);

    float fire = shape * u_intensity + noise * 0.5 * shape;
    fire = clamp(fire, 0.0, 1.0);

    vec3 col = fireColor(fire, int(u_palette_mode));
    col += vec3(0.02, 0.01, 0.0) * (1.0 - uv.y); // Ambient glow

    FRAG_OUT = vec4(col, 1.0);
}
`
});
