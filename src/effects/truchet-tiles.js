/* Psychedelia - Truchet Tiles
 * Randomly oriented tiles that join into endless paths: quarter arcs,
 * the "10 PRINT" diagonal maze, woven over/under ribbons and flowing dashed
 * rings. Tiles flip over time with a smooth rotation.
 */
EffectRegistry.register({
    name: 'truchet',
    label: 'Truchet Tiles',
    category: 'Patterns',
    description: 'Endless Truchet paths: quarter arcs, diagonal maze, woven ribbons and flowing dashed rings with smooth tile flips',
    specialize: ['style'],
    params: [
        { name: 'style', label: 'Tile Style', type: 'select', options: ['Quarter Arcs', 'Diagonal Maze', 'Woven Ribbons', 'Flowing Rings'], default: 0 },
        { name: 'tiles', label: 'Tile Count', min: 3, max: 30, default: 9, step: 1 },
        { name: 'width', label: 'Path Width', min: 0.02, max: 0.4, default: 0.14, step: 0.01 },
        { name: 'flip_rate', label: 'Flip Rate', min: 0, max: 2, default: 0.18, step: 0.02 },
        { name: 'scroll', label: 'Scroll', min: -1, max: 1, default: 0.15, step: 0.02 },
        { name: 'color_speed', label: 'Color Speed', min: 0, max: 3, default: 0.3, step: 0.05 },
        { name: 'glow', label: 'Glow', min: 0, max: 2, default: 0.8, step: 0.05 },
        { name: 'palette', label: 'Palette', type: 'select', palette: true, options: ['Rainbow', 'Neon'], default: 0 }
    ],
    shader: `
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_style;
uniform float u_tiles;
uniform float u_width;
uniform float u_flip_rate;
uniform float u_scroll;
uniform float u_color_speed;
uniform float u_glow;
uniform float u_palette;

vec3 tilePalette(float t) {
    t = fract(t);
    if (u_palette > 1.5) return psyLut(t);
    if (u_palette > 0.5) return neon(t);
    return rainbow(t);
}

// Distance to the quarter arc around corner c (c = (+-0.5, +-0.5)), only
// the part inside the tile; beyond its ends, distance to the nearest end.
float arcDist(vec2 f, vec2 c) {
    vec2 a = f - c;
    if (a.x * c.x <= 0.0 && a.y * c.y <= 0.0) return abs(length(a) - 0.5);
    return min(length(f - vec2(c.x, 0.0)), length(f - vec2(0.0, c.y)));
}

// Angle along that arc, continuous and clamped to its ends (same values as
// atan(a.y, a.x) on the arc itself, without the branch cut at an end).
float arcAlong(vec2 f, vec2 c) {
    vec2 a = (f - c) * sign(-c.x);
    float q = clamp(atan(a.y, a.x), 0.0, 1.5707963);
    return c.x > 0.0 ? q - 3.14159265 : q;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
    float t = u_time;
    vec2 p = uv * u_tiles + vec2(t * u_scroll, t * u_scroll * 0.6) + seedOffset();
    vec2 cell = floor(p);
    float style = floor(u_style + 0.5);

    // Paths are measured in this tile and its eight neighbours, so a tile
    // in mid-flip draws its path ends past its edge and the glow carries
    // across tile borders instead of being cut off at them.
    float d = 1e3;
    float along = 0.0;
    float over = 0.0;
    float dOver = 1e3;   // nearest "over" ribbon (Weave), drawn on top
    float dUnder = 1e3;  // nearest "under" ribbon
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 id = cell + vec2(float(i), float(j));
            float h = hash2(id);
            // Each tile flips on its own schedule with a smooth quarter turn.
            // Orientation = random base + completed quarter turns + the turn
            // in progress, so it is continuous across flip periods.
            float flipPhase = t * u_flip_rate + h * 10.0;
            float k = floor(flipPhase);
            float turning = smoothstep(0.0, 0.12, fract(flipPhase));
            float ang = (floor(h * 2.0) + k + turning) * 1.5707963;
            vec2 f = rot2(ang) * (p - id - 0.5);
            if (style < 0.5 || style > 1.5) {
                float d1 = arcDist(f, vec2(0.5));
                float d2 = arcDist(f, vec2(-0.5));
                dOver = min(dOver, d1);
                dUnder = min(dUnder, d2);
                if (d1 < d) { d = d1; along = arcAlong(f, vec2(0.5)); over = 1.0; }
                if (d2 < d) { d = d2; along = arcAlong(f, vec2(-0.5)); over = 0.0; }
            } else {
                // Diagonal segment from (-0.5, 0.5) to (0.5, -0.5).
                float s = clamp((f.x - f.y) * 0.5, -0.5, 0.5);
                float dd = length(f - vec2(s, -s));
                if (dd < d) { d = dd; along = f.x - f.y; }
            }
        }
    }

    float w = u_width;
    float aa = 1.5 * u_tiles / u_resolution.y;
    float path = 1.0 - smoothstep(w - aa, w + aa, d);
    // Hue from the position, not the tile index, so it has no steps at tile edges.
    float hue = (p.x + p.y) * 0.03 + t * u_color_speed * 0.05;
    vec3 bg = tilePalette(hue + 0.5) * 0.06 + vec3(0.01);
    vec3 col = bg;

    if (style < 1.5) {
        vec3 c = tilePalette(hue + d * 0.6);
        float shade = 0.65 + 0.35 * (1.0 - d / max(w, 0.001));
        col = mix(bg, c * shade, path);
    } else if (style < 2.5) {
        // Weave: the arc from one corner passes over the other. The under
        // ribbon is drawn first and the over ribbon on top, so where a
        // flipping tile's ribbon crosses a neighbour's, one stays in front.
        float pathU = 1.0 - smoothstep(w - aa, w + aa, dUnder);
        float pathO = 1.0 - smoothstep(w - aa, w + aa, dOver);
        vec3 cU = tilePalette(hue) * 0.62 * (1.0 - smoothstep(w - aa * 2.0, w, dUnder) * 0.6);
        vec3 cO = tilePalette(hue + 0.25) * (1.0 - smoothstep(w - aa * 2.0, w, dOver) * 0.6);
        col = mix(mix(bg, cU, pathU), cO, pathO);
    } else {
        float dash = smoothstep(0.2, 0.5, abs(fract(along * 2.0 / 3.14159 - t * u_flip_rate * 2.0) - 0.5) * 2.0);
        vec3 c = tilePalette(hue + along * 0.08);
        col = mix(bg, c * (0.35 + 0.65 * dash), path);
    }
    col += tilePalette(hue + 0.2) * exp(-max(d - w, 0.0) * 18.0) * 0.25 * u_glow;
    FRAG_OUT = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
});
