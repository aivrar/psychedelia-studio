/* Psychedelia Studio - Shadertoy Lab host effect */
var ShadertoyHost = (function() {
    'use strict';

    var STORAGE_KEY = 'psychedelia.shadertoyLab.v2';
    var LIBRARY_KEY = 'psychedelia.shadertoyLibrary.v1';
    var API_KEY_STORAGE = 'psychedelia.shadertoyApiKey.v1';
    var API_CACHE_KEY = 'psychedelia.shadertoyApiCache.v1';
    var SAFE_MODE_STORAGE = 'psychedelia.shadertoySafeMode.v1';
    var SHADERTOY_ORIGIN = 'https://www.shadertoy.com';
    var glRef = null;
    var graph = null;
    var active = false;
    var paused = false;
    var pausedUniformState = null;
    var compileResult = null;

    function lines(arr) { return arr.join('\n'); }

    var examples = [
        {
            id: 'starter_uv_gradient',
            name: 'Starter - UV Gradient',
            source: lines([
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    vec3 color = vec3(uv.x, uv.y, 0.5 + 0.5 * sin(iTime));',
                '    fragColor = vec4(color, 1.0);',
                '}'
            ])
        },
        {
            id: 'starter_blank',
            name: 'Starter - Blank Template',
            source: lines([
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    fragColor = vec4(vec3(0.0), 1.0);',
                '}'
            ])
        },
        {
            id: 'starter_texture_channel',
            name: 'Starter - Texture Channel',
            project: function() {
                var project = ShadertoyPassGraph.makeDefaultProject(lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    vec3 tex = texture(iChannel0, uv * 2.0).rgb;',
                    '    vec3 tint = 0.5 + 0.5 * cos(iTime + uv.xyx * 6.28318 + vec3(0.0, 2.0, 4.0));',
                    '    fragColor = vec4(tex * tint, 1.0);',
                    '}'
                ]));
                project.name = 'Starter - Texture Channel';
                project.description = 'Single-pass starter that samples a procedural texture through iChannel0.';
                pass(project, 'image').channels[0] = {
                    slot: 0,
                    kind: 'procedural',
                    sourceId: 'checker',
                    sampler: { filter: 'nearest', wrap: 'repeat' }
                };
                return project;
            }
        },
        {
            id: 'time_color',
            name: 'Time Color',
            source: lines([
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    vec3 color = 0.5 + 0.5 * cos(iTime + uv.xyx * 6.28318 + vec3(0.0, 2.0, 4.0));',
                '    fragColor = vec4(color, 1.0);',
                '}'
            ])
        },
        {
            id: 'mouse_orbit',
            name: 'Mouse Orbit',
            source: lines([
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;',
                '    vec2 m = (iMouse.xy - 0.5 * iResolution.xy) / iResolution.y;',
                '    if (iMouse.z == 0.0 && iMouse.w == 0.0) m = 0.35 * vec2(cos(iTime), sin(iTime));',
                '    float d = length(uv - m);',
                '    float ring = smoothstep(0.09, 0.085, abs(d - 0.22));',
                '    float glow = 0.012 / max(d, 0.012);',
                '    vec3 color = vec3(glow * 0.35) + ring * vec3(0.2, 0.9, 1.0);',
                '    fragColor = vec4(color, 1.0);',
                '}'
            ])
        },
        {
            id: 'fractal_field',
            name: 'Fractal Field',
            source: lines([
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                '    p *= 1.15;',
                '    vec2 c = vec2(-0.72 + 0.08 * cos(iTime * 0.23), 0.24 + 0.08 * sin(iTime * 0.19));',
                '    vec2 z = p;',
                '    float shade = 0.0;',
                '    for (int i = 0; i < 80; i++) {',
                '        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;',
                '        if (dot(z, z) > 16.0) { shade = float(i) / 80.0; break; }',
                '    }',
                '    vec3 color = 0.5 + 0.5 * cos(6.28318 * (shade + vec3(0.02, 0.22, 0.48)));',
                '    fragColor = vec4(color * smoothstep(0.0, 0.05, shade), 1.0);',
                '}'
            ])
        },
        {
            id: 'buffer_blue',
            name: 'Buffer A Blue',
            project: function() {
                var project = ShadertoyPassGraph.makeDefaultProject(lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    fragColor = texture(iChannel0, uv);',
                    '}'
                ]));
                pass(project, 'bufferA').enabled = true;
                pass(project, 'bufferA').source = lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    fragColor = vec4(uv.x * 0.1, uv.y * 0.2, 1.0, 1.0);',
                    '}'
                ]);
                pass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA' };
                project.name = 'Buffer A Blue';
                return project;
            }
        },
        {
            id: 'self_feedback',
            name: 'Self Feedback',
            project: function() {
                var project = ShadertoyPassGraph.makeDefaultProject(lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    fragColor = texture(iChannel0, uv);',
                    '}'
                ]));
                pass(project, 'bufferA').enabled = true;
                pass(project, 'bufferA').source = lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    vec4 prev = texture(iChannel0, uv) * 0.965;',
                    '    vec2 p = 0.5 + 0.32 * vec2(cos(iTime * 1.4), sin(iTime * 1.7));',
                    '    float dotGlow = smoothstep(0.04, 0.0, length(uv - p));',
                    '    fragColor = max(prev, vec4(dotGlow, dotGlow * 0.25, 0.9 * dotGlow, 1.0));',
                    '}'
                ]);
                pass(project, 'bufferA').channels[0] = { slot: 0, kind: 'self', sourceId: 'bufferA' };
                pass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA' };
                project.name = 'Self Feedback';
                return project;
            }
        },
        {
            id: 'multi_buffer',
            name: 'A to B to Image',
            project: function() {
                var project = ShadertoyPassGraph.makeDefaultProject(lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    fragColor = texture(iChannel0, fragCoord / iResolution.xy);',
                    '}'
                ]));
                pass(project, 'bufferA').enabled = true;
                pass(project, 'bufferA').source = lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    fragColor = vec4(uv.x, 0.0, 0.15 + 0.15 * sin(iTime), 1.0);',
                    '}'
                ]);
                pass(project, 'bufferB').enabled = true;
                pass(project, 'bufferB').source = lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    vec4 a = texture(iChannel0, uv);',
                    '    fragColor = vec4(a.r * 0.2, uv.y, a.b + 0.35, 1.0);',
                    '}'
                ]);
                pass(project, 'bufferB').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA' };
                pass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferB' };
                project.name = 'A to B to Image';
                return project;
            }
        },
        {
            id: 'particle_feedback',
            name: 'Particle Feedback',
            project: function() {
                var project = ShadertoyPassGraph.makeDefaultProject(lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec3 color = texture(iChannel0, fragCoord / iResolution.xy).rgb;',
                    '    fragColor = vec4(pow(color, vec3(0.82)), 1.0);',
                    '}'
                ]));
                project.name = 'Particle Feedback';
                project.description = 'Buffer A feedback trails with curl-like advection and moving particles.';
                project.common.source = lines([
                    'float hash21(vec2 p) {',
                    '    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
                    '}',
                    'vec3 palette(float t) {',
                    '    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.21, 0.53)));',
                    '}'
                ]);
                pass(project, 'bufferA').enabled = true;
                pass(project, 'bufferA').source = lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    vec2 p = uv - 0.5;',
                    '    float a = atan(p.y, p.x) + sin(iTime * 0.37 + length(p) * 9.0) * 0.65;',
                    '    vec2 flow = vec2(cos(a), sin(a)) * (0.0015 + 0.0035 * length(p));',
                    '    vec3 prev = texture(iChannel0, uv - flow).rgb * 0.962;',
                    '    vec3 color = prev;',
                    '    for (int i = 0; i < 6; i++) {',
                    '        float fi = float(i);',
                    '        vec2 seed = vec2(hash21(vec2(fi, 2.0)), hash21(vec2(fi, 7.0)));',
                    '        vec2 pos = 0.5 + 0.34 * vec2(cos(iTime * (0.31 + seed.x) + fi * 1.7), sin(iTime * (0.27 + seed.y) + fi * 2.1));',
                    '        float d = length((uv - pos) * vec2(iResolution.x / iResolution.y, 1.0));',
                    '        float glow = exp(-d * 44.0);',
                    '        color += palette(seed.x + iTime * 0.035) * glow * 0.18;',
                    '    }',
                    '    if (iMouse.z > 0.0) {',
                    '        vec2 m = iMouse.xy / iResolution.xy;',
                    '        float d = length((uv - m) * vec2(iResolution.x / iResolution.y, 1.0));',
                    '        color += vec3(0.5, 0.9, 1.0) * exp(-d * 34.0) * 0.22;',
                    '    }',
                    '    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
                    '}'
                ]);
                pass(project, 'bufferA').channels[0] = { slot: 0, kind: 'self', sourceId: 'bufferA', sampler: { filter: 'linear', wrap: 'clamp' } };
                pass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA', sampler: { filter: 'linear', wrap: 'clamp' } };
                return project;
            }
        },
        {
            id: 'audio_feedback_nebula',
            name: 'Audio Feedback Nebula',
            project: function() {
                var project = ShadertoyPassGraph.makeDefaultProject(lines([
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec3 color = texture(iChannel0, fragCoord / iResolution.xy).rgb;',
                    '    fragColor = vec4(pow(color, vec3(0.86)), 1.0);',
                    '}'
                ]));
                project.name = 'Audio Feedback Nebula';
                project.description = 'Buffer A audio feedback: iChannel0 is analyser audio and iChannel1 is previous-frame state.';
                pass(project, 'bufferA').enabled = true;
                pass(project, 'bufferA').source = lines([
                    'float hash21(vec2 p) {',
                    '    p = fract(p * vec2(123.34, 345.45));',
                    '    p += dot(p, p + 34.345);',
                    '    return fract(p.x * p.y);',
                    '}',
                    'float noise21(vec2 p) {',
                    '    vec2 i = floor(p);',
                    '    vec2 f = fract(p);',
                    '    f = f * f * (3.0 - 2.0 * f);',
                    '    float a = hash21(i);',
                    '    float b = hash21(i + vec2(1.0, 0.0));',
                    '    float c = hash21(i + vec2(0.0, 1.0));',
                    '    float d = hash21(i + vec2(1.0, 1.0));',
                    '    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
                    '}',
                    'vec3 palette(float t) {',
                    '    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.24, 0.58)));',
                    '}',
                    'float audioWave(float x) { return texture(iChannel0, vec2(fract(x), 0.25)).r; }',
                    'float audioFft(float x) { return texture(iChannel0, vec2(clamp(x, 0.0, 1.0), 0.75)).r; }',
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    vec2 p = uv - 0.5;',
                    '    float bass = audioFft(0.05);',
                    '    float mid = audioFft(0.32);',
                    '    float wave = audioWave(uv.x + iTime * 0.04);',
                    '    vec2 curl = vec2(noise21(p * 3.0 + vec2(iTime * 0.35, -iTime * 0.24)), noise21(p * 3.0 + vec2(-iTime * 0.19, iTime * 0.31))) - 0.5;',
                    '    vec3 prev = texture(iChannel1, uv - curl * (0.006 + bass * 0.018)).rgb * (0.948 + mid * 0.034);',
                    '    float plume = 1.0 - smoothstep(0.02, 0.36 + bass * 0.1, length(p + vec2((wave - 0.5) * 0.28, 0.0)));',
                    '    vec3 color = prev + palette(length(p) + iTime * 0.05 + bass * 0.3) * plume * (0.08 + bass * 0.35);',
                    '    color += palette(wave + iTime * 0.03) * max(wave - 0.48, 0.0) * 0.12;',
                    '    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
                    '}'
                ]);
                pass(project, 'bufferA').channels[0] = { slot: 0, kind: 'audio', sampler: { filter: 'linear', wrap: 'clamp' } };
                pass(project, 'bufferA').channels[1] = { slot: 1, kind: 'self', sourceId: 'bufferA', sampler: { filter: 'linear', wrap: 'clamp' } };
                pass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA', sampler: { filter: 'linear', wrap: 'clamp' } };
                return project;
            }
        },
        {
            id: 'audio_raymarch_tunnel',
            name: 'Audio Raymarch Tunnel',
            project: function() {
                var project = ShadertoyPassGraph.makeDefaultProject(lines([
                    'vec2 rot(vec2 p, float a) {',
                    '    float c = cos(a);',
                    '    float s = sin(a);',
                    '    return mat2(c, -s, s, c) * p;',
                    '}',
                    'vec3 palette(float t) {',
                    '    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.02, 0.28, 0.62)));',
                    '}',
                    'float audioFft(float x) { return texture(iChannel0, vec2(clamp(x, 0.0, 1.0), 0.75)).r; }',
                    'float tunnelMap(vec3 p, float t, float bass) {',
                    '    p.xy = rot(p.xy, p.z * 0.17 + t * 0.34);',
                    '    float a = atan(p.y, p.x);',
                    '    float radius = 0.58 + 0.12 * sin(p.z * 1.7 + t * 1.4) + bass * 0.18;',
                    '    float ribs = sin(a * 8.0 + p.z * 2.2 + t * 3.0) * 0.024;',
                    '    return abs(length(p.xy) - radius) - 0.044 + ribs;',
                    '}',
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                    '    float t = iTime * 0.74;',
                    '    float bass = audioFft(0.05);',
                    '    float mid = audioFft(0.34);',
                    '    float high = audioFft(0.78);',
                    '    vec3 ro = vec3(0.0, 0.0, t * 1.55);',
                    '    vec3 rd = normalize(vec3(uv, 1.35));',
                    '    float dist = 0.08;',
                    '    float glow = 0.0;',
                    '    float hit = 0.0;',
                    '    vec3 pos = ro;',
                    '    for (int i = 0; i < 46; i++) {',
                    '        pos = ro + rd * dist;',
                    '        float d = tunnelMap(pos, t, bass);',
                    '        glow += 0.012 / (0.024 + abs(d)) * (0.35 + mid);',
                    '        if (abs(d) < 0.004) { hit = 1.0; break; }',
                    '        dist += clamp(d * 0.62, 0.018, 0.22);',
                    '        if (dist > 8.0) break;',
                    '    }',
                    '    float stripe = 0.5 + 0.5 * sin(pos.z * 3.0 + atan(pos.y, pos.x) * 10.0 + t * 2.0);',
                    '    vec3 color = palette(pos.z * 0.045 + t * 0.04 + high * 0.35);',
                    '    color *= glow * 0.05 + hit * (0.35 + stripe * 0.45 + bass * 0.55);',
                    '    color += palette(t * 0.08 + length(uv)) * high * 0.12;',
                    '    fragColor = vec4(clamp(pow(color, vec3(0.86)), 0.0, 1.0), 1.0);',
                    '}'
                ]));
                project.name = 'Audio Raymarch Tunnel';
                project.description = 'Single-pass raymarch-style tunnel that samples FFT bands from the Shadertoy audio channel.';
                pass(project, 'image').channels[0] = { slot: 0, kind: 'audio', sampler: { filter: 'linear', wrap: 'clamp' } };
                return project;
            }
        },
        {
            id: 'audio_reactive_bars',
            name: 'Audio Reactive Bars',
            project: function() {
                var project = ShadertoyPassGraph.makeDefaultProject(lines([
                    'vec3 palette(float t) {',
                    '    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.28, 0.58)));',
                    '}',
                    '',
                    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                    '    vec2 uv = fragCoord / iResolution.xy;',
                    '    float band = floor(uv.x * 64.0) / 64.0;',
                    '    float fft = texture(iChannel0, vec2(band, 0.75)).r;',
                    '    float wave = texture(iChannel0, vec2(fract(uv.x * 0.5 + iTime * 0.03), 0.25)).r;',
                    '    float bar = smoothstep(uv.y - 0.025, uv.y + 0.025, fft * 0.92);',
                    '    float scan = 0.12 / max(0.02, abs(uv.y - (0.5 + (wave - 0.5) * 0.42)));',
                    '    vec3 color = palette(band + iTime * 0.045) * bar;',
                    '    color += vec3(0.2, 0.8, 1.0) * scan * 0.08;',
                    '    color *= 0.35 + fft * 1.7;',
                    '    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
                    '}'
                ]));
                project.name = 'Audio Reactive Bars';
                project.description = 'Samples the Shadertoy audio channel; uses analyser data or deterministic fallback before music starts.';
                pass(project, 'image').channels[0] = { slot: 0, kind: 'audio', sampler: { filter: 'linear', wrap: 'clamp' } };
                return project;
            }
        }
    ];

    function pass(project, id) {
        return project.passes.filter(function(p) { return p.id === id; })[0];
    }

    function defaultProject() {
        return ShadertoyPassGraph.makeDefaultProject(examples[0].source);
    }

    function ensureGraph(gl) {
        glRef = gl || glRef || (typeof Renderer !== 'undefined' ? Renderer.getGL() : null);
        if (!graph && glRef && typeof ShadertoyPassGraph !== 'undefined') {
            graph = ShadertoyPassGraph.create(glRef, loadSavedProject());
        }
        return graph;
    }

    function loadSavedProject() {
        try {
            var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (saved && (saved.passes || saved.image || saved.source)) return projectFromParsed(saved);
            var legacy = JSON.parse(localStorage.getItem('psychedelia.shadertoyLab.v1') || 'null');
            if (legacy && typeof legacy.source === 'string') return projectFromParsed(legacy);
        } catch (err) {
            // Fall through to default.
        }
        return defaultProject();
    }

    function save() {
        if (!graph) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(graph.getProject()));
        } catch (err) {
            // Storage can fail in private browsing or quota-limited sessions.
        }
    }

    function getApiKey() {
        try {
            return localStorage.getItem(API_KEY_STORAGE) || '';
        } catch (err) {
            return '';
        }
    }

    function setApiKey(key) {
        try {
            localStorage.setItem(API_KEY_STORAGE, String(key || '').trim());
        } catch (err) {
            // Storage can fail in private browsing or quota-limited sessions.
        }
    }

    function getSafeMode() {
        try {
            return localStorage.getItem(SAFE_MODE_STORAGE) === 'true';
        } catch (err) {
            return false;
        }
    }

    function setSafeMode(value) {
        try {
            localStorage.setItem(SAFE_MODE_STORAGE, value ? 'true' : 'false');
        } catch (err) {
            // Storage can fail in private browsing or quota-limited sessions.
        }
    }

    function readApiCache() {
        try {
            var parsed = JSON.parse(localStorage.getItem(API_CACHE_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function writeApiCache(cache) {
        try {
            localStorage.setItem(API_CACHE_KEY, JSON.stringify(cache || {}));
        } catch (err) {
            // Storage can fail in private browsing or quota-limited sessions.
        }
    }

    function cacheImportedProject(shaderId, project) {
        var cache = readApiCache();
        cache[shaderId] = {
            id: shaderId,
            updatedAt: new Date().toISOString(),
            project: project
        };
        writeApiCache(cache);
    }

    function getCachedImport(shaderId) {
        return readApiCache()[shaderId] || null;
    }

    function compile(nextSource) {
        var g = ensureGraph();
        if (nextSource !== undefined) setSource(nextSource);
        if (!g || typeof ShadertoyCompiler === 'undefined') {
            compileResult = {
                success: false,
                shaderLog: 'Shadertoy compiler requires a WebGL renderer.',
                warnings: []
            };
            notifyStatus();
            return compileResult;
        }
        compileResult = g.compileAll();
        setPaused(false);
        save();
        notifyStatus();
        return compileResult;
    }

    function compilePass(id) {
        var g = ensureGraph();
        if (!g || typeof ShadertoyCompiler === 'undefined') return compile();
        compileResult = g.compilePass(id || 'image');
        setPaused(false);
        save();
        notifyStatus();
        return compileResult;
    }

    function shaderIdIsValid(shaderId) {
        return /^[A-Za-z0-9_]+$/.test(String(shaderId || '').trim());
    }

    function importFromApi(shaderId) {
        shaderId = String(shaderId || '').trim();
        var key = getApiKey();
        if (!shaderIdIsValid(shaderId)) {
            return Promise.resolve({ success: false, error: 'Enter a valid Shadertoy shader ID.' });
        }
        if (!key) {
            return Promise.resolve({ success: false, error: 'Shadertoy API key is required.' });
        }

        var url = SHADERTOY_ORIGIN + '/api/v1/shaders/' + encodeURIComponent(shaderId) + '?key=' + encodeURIComponent(key);
        return fetch(url).then(function(response) {
            if (!response.ok) throw new Error('Shadertoy API request failed: HTTP ' + response.status);
            return response.json();
        }).then(function(payload) {
            if (payload.Error || payload.error) throw new Error(payload.Error || payload.error);
            var shader = payload.Shader || payload.shader || payload;
            if (!shader || !shader.renderpass) throw new Error('Shadertoy API response did not include render passes.');
            var project = projectFromRenderpass(shader);
            project.id = 'shadertoy-' + (shader.info && shader.info.id || shaderId);
            setProject(project);
            var status = getSafeMode()
                ? {
                    success: false,
                    shaderLog: 'Safe Mode: imported shader loaded but not compiled.',
                    warnings: ['Safe Mode is on; review the shader and press Compile All or Run when ready.'],
                    passResults: {}
                }
                : compile();
            if (getSafeMode()) {
                compileResult = status;
                notifyStatus();
                save();
            }
            cacheImportedProject(shaderId, serialize());
            saveToLibrary();
            return {
                success: true,
                status: status,
                project: serialize(),
                cached: false,
                safeMode: getSafeMode(),
                url: url
            };
        }).catch(function(err) {
            var cached = getCachedImport(shaderId);
            if (cached && cached.project) {
                setProject(cached.project);
                var status = compile();
                return {
                    success: status.success,
                    status: status,
                    project: serialize(),
                    cached: true,
                    error: err.message || String(err)
                };
            }
            return { success: false, error: err.message || String(err), url: url };
        });
    }

    function notifyStatus() {
        if (typeof ShadertoyEditor !== 'undefined') {
            ShadertoyEditor.updateStatus(compileResult);
        }
    }

    function init(gl) {
        active = true;
        ensureGraph(gl);
        if (graph && !compileResult) compile();
        if (typeof ShadertoyChannels !== 'undefined') {
            ShadertoyChannels.setPaused(paused, pausedUniformState);
        }
        if (typeof ShadertoyEditor !== 'undefined') {
            ShadertoyEditor.show();
            ShadertoyEditor.syncFromHost();
        }
    }

    function cleanup() {
        active = false;
        if (typeof ShadertoyChannels !== 'undefined') {
            ShadertoyChannels.setPaused(true, ShadertoyUniforms.getState(Renderer.getCanvas()));
            ShadertoyChannels.releaseUserMedia();
        }
        if (typeof ShadertoyEditor !== 'undefined') ShadertoyEditor.hide();
    }

    function handleContextRestored(gl) {
        glRef = gl || Renderer.getGL();
        if (graph && graph.dispose) {
            try { graph.dispose(); } catch (err) { /* context resources were already lost */ }
        }
        graph = null;
        compileResult = null;
        pausedUniformState = null;
    }

    function clearTarget(gl) {
        Renderer.bindFramebuffer(-1);
        gl.viewport(0, 0, Renderer.getCanvas().width, Renderer.getCanvas().height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function render(gl) {
        var g = ensureGraph(gl);
        if (!active) return;
        if (!g || !compileResult || !compileResult.success) {
            clearTarget(gl);
            return;
        }
        if (!g.render({ uniformState: paused ? pausedUniformState : null })) {
            compileResult = g.getStatus();
            notifyStatus();
            clearTarget(gl);
        }
    }

    function reset() {
        Renderer.resetTime();
        ShadertoyUniforms.resetFrameState();
        if (graph) graph.reset();
        if (paused) {
            pausedUniformState = ShadertoyUniforms.getState(Renderer.getCanvas());
            if (typeof ShadertoyChannels !== 'undefined') ShadertoyChannels.setPaused(true, pausedUniformState);
        }
        if (!compileResult || !compileResult.success) compile();
    }

    function setPaused(value) {
        paused = !!value;
        pausedUniformState = paused ? ShadertoyUniforms.getState(Renderer.getCanvas()) : null;
        if (typeof ShadertoyChannels !== 'undefined') {
            ShadertoyChannels.setPaused(paused, pausedUniformState);
        }
    }

    function getExamples() {
        return examples.map(function(example) {
            return { id: example.id, name: example.name, source: example.source || '' };
        });
    }

    function loadExample(id) {
        var match = examples.filter(function(example) { return example.id === id; })[0] || examples[0];
        if (match.project) {
            setProject(match.project());
        } else {
            setProject(ShadertoyPassGraph.makeDefaultProject(match.source));
            var project = graph.getProject();
            project.name = match.name;
            graph.setProject(project);
        }
        return compile();
    }

    function projectFromParsed(parsed) {
        var project;
        if (parsed.passes) {
            return ShadertoyPassGraph.normalizeProject(parsed);
        }
        if (parsed.image && typeof parsed.image.source === 'string') {
            project = ShadertoyPassGraph.makeDefaultProject(parsed.image.source);
            project.id = parsed.id || project.id;
            project.name = parsed.name || project.name;
            project.description = parsed.description || '';
            project.license = parsed.license || '';
            project.attribution = parsed.attribution || null;
            return project;
        }
        if (typeof parsed.source === 'string') {
            project = ShadertoyPassGraph.makeDefaultProject(parsed.source);
            project.id = parsed.id || project.id;
            project.name = parsed.name || project.name;
            project.description = parsed.description || '';
            project.license = parsed.license || '';
            project.attribution = parsed.attribution || null;
            return project;
        }
        if (parsed.renderpass && parsed.renderpass.length) {
            return projectFromRenderpass(parsed);
        }
        project = ShadertoyPassGraph.makeDefaultProject(typeof parsed === 'string' ? parsed : '');
        project.id = parsed && parsed.id || project.id;
        project.name = parsed && parsed.name || project.name;
        project.description = parsed && parsed.description || '';
        project.license = parsed && parsed.license || '';
        project.attribution = parsed && parsed.attribution || null;
        return project;
    }

    function projectFromRenderpass(parsed) {
        var project = ShadertoyPassGraph.makeDefaultProject('');
        var info = parsed.info || {};
        project.id = parsed.id || info.id || project.id;
        project.name = info.name || parsed.name || project.name;
        project.description = info.description || parsed.description || '';
        project.license = info.license || parsed.license || '';
        project.attribution = {
            source: 'Shadertoy',
            id: info.id || parsed.id || '',
            url: info.id ? SHADERTOY_ORIGIN + '/view/' + info.id : '',
            name: info.name || parsed.name || '',
            author: info.username || info.user || '',
            description: info.description || parsed.description || '',
            license: info.license || parsed.license || ''
        };
        var skippedPasses = [];
        parsed.renderpass.forEach(function(renderPass) {
            var id = idFromRenderpass(renderPass);
            if (!id) {
                skippedPasses.push(renderPass.name || renderPass.type || 'unsupported pass');
                return;
            }
            if (id === 'common') {
                project.common.source = renderPass.code || renderPass.source || '';
                return;
            }
            var target = pass(project, id);
            if (!target) return;
            target.enabled = true;
            target.source = renderPass.code || renderPass.source || '';
            if (renderPass.inputs) {
                renderPass.inputs.slice(0, 4).forEach(function(input, index) {
                    var slot = input && input.channel !== undefined ? Number(input.channel) : index;
                    if (slot < 0 || slot > 3) return;
                    var channel = channelFromRenderpassInput(input);
                    channel.slot = slot;
                    target.channels[slot] = channel;
                });
            }
        });
        if (skippedPasses.length) {
            project.description += (project.description ? '\n\n' : '') +
                'Skipped unsupported Shadertoy passes: ' + skippedPasses.join(', ') + '.';
        }
        return project;
    }

    function idFromRenderpass(renderPass) {
        var type = String(renderPass.type || '').toLowerCase();
        var name = String(renderPass.name || '').toLowerCase();
        var text = (name + ' ' + type).trim();
        if (text.indexOf('common') >= 0) return 'common';
        if (text.indexOf('buffer a') >= 0 || text.indexOf('buffera') >= 0) return 'bufferA';
        if (text.indexOf('buffer b') >= 0 || text.indexOf('bufferb') >= 0) return 'bufferB';
        if (text.indexOf('buffer c') >= 0 || text.indexOf('bufferc') >= 0) return 'bufferC';
        if (text.indexOf('buffer d') >= 0 || text.indexOf('bufferd') >= 0) return 'bufferD';
        if (type === 'sound' || text.indexOf('sound') >= 0) return null;
        if (type === 'cubemap' || text.indexOf('cubemap') >= 0 || text.indexOf('cube map') >= 0) return null;
        if (type === 'vr' || text.indexOf('vr') >= 0) return null;
        return 'image';
    }

    function channelFromRenderpassInput(input) {
        input = input || {};
        var ctype = String(input.ctype || input.type || '').toLowerCase();
        var src = input.id || input.src || input.source || input.name || '';
        var sampler = samplerFromRenderpassInput(input);
        var bufferId = bufferIdFromInput(input);

        if (ctype === 'buffer' || bufferId) {
            return { kind: 'buffer', sourceId: bufferId || 'bufferA', sampler: sampler };
        }
        if (ctype === 'texture' || ctype === 'image') {
            return { kind: 'image', url: shadertoyMediaUrl(src), sampler: sampler };
        }
        if (ctype === 'video') {
            return { kind: 'video', url: shadertoyMediaUrl(src), sampler: sampler };
        }
        if (ctype === 'keyboard') return { kind: 'keyboard', sampler: sampler };
        if (ctype === 'webcam') return { kind: 'webcam', sampler: sampler };
        if (ctype === 'mic' || ctype === 'microphone') return { kind: 'microphone', sampler: sampler };
        if (ctype === 'music' || ctype === 'musicstream' || ctype === 'soundcloud') return { kind: 'audio', sampler: sampler };
        if (!ctype && !src) return { kind: 'none', sampler: sampler };

        return {
            kind: 'unsupported',
            sampler: sampler,
            message: 'Unsupported Shadertoy input: ' + (ctype || src || 'unknown')
        };
    }

    function samplerFromRenderpassInput(input) {
        var sampler = input && input.sampler || {};
        var filter = String(sampler.filter || '').toLowerCase();
        var wrap = String(sampler.wrap || '').toLowerCase();
        return {
            filter: filter === 'nearest' ? 'nearest' : 'linear',
            wrap: wrap === 'repeat' || wrap === 'mirror' ? wrap : 'clamp',
            vflip: sampler.vflip === true || sampler.vflip === 'true',
            mipmap: filter === 'mipmap' || sampler.mipmap === true || sampler.mipmap === 'true'
        };
    }

    function bufferIdFromInput(input) {
        var text = String((input && (input.src || input.id || input.source || input.name || input.channel)) || '').toLowerCase();
        if (/buffer\s*a|buffera|buffer0|buffer00/.test(text)) return 'bufferA';
        if (/buffer\s*b|bufferb|buffer1|buffer01/.test(text)) return 'bufferB';
        if (/buffer\s*c|bufferc|buffer2|buffer02/.test(text)) return 'bufferC';
        if (/buffer\s*d|bufferd|buffer3|buffer03/.test(text)) return 'bufferD';
        return null;
    }

    function shadertoyMediaUrl(src) {
        src = String(src || '');
        if (!src) return null;
        if (/^(https?:|data:|blob:)/.test(src)) return src;
        if (src.charAt(0) === '/') return SHADERTOY_ORIGIN + src;
        return SHADERTOY_ORIGIN + '/' + src.replace(/^\/+/, '');
    }

    function loadProject(input) {
        var text = String(input || '');
        var parsed = null;
        try { parsed = JSON.parse(text); } catch (err) { parsed = null; }
        setProject(parsed ? projectFromParsed(parsed) : ShadertoyPassGraph.makeDefaultProject(text));
        return compile();
    }

    function setProject(project) {
        var gl = glRef || Renderer.getGL();
        if (!graph && gl) graph = ShadertoyPassGraph.create(gl, project);
        else if (graph) graph.setProject(project);
        compileResult = null;
        save();
    }

    function setMetadata(metadata) {
        ensureGraph();
        if (!graph) return serialize();
        graph.setMetadata(metadata || {});
        save();
        return graph.getProject();
    }

    function setRenderTargetFormat(format) {
        ensureGraph();
        if (!graph || !graph.setRenderTargetFormat) return null;
        graph.setRenderTargetFormat(format);
        compileResult = graph.getStatus();
        save();
        notifyStatus();
        return graph.getDiagnostics ? graph.getDiagnostics().renderTargetFormat : null;
    }

    function serialize() {
        return graph ? graph.getProject() : defaultProject();
    }

    function setSource(nextSource) {
        ensureGraph();
        if (graph) {
            graph.setPassSource('image', String(nextSource || ''));
            save();
        }
    }

    function getSource() {
        var image = graph && graph.getPass('image');
        return image ? image.source : examples[0].source;
    }

    function getPassSource(id) {
        if (!graph) return '';
        if (id === 'common') return graph.getProject().common.source;
        var p = graph.getPass(id);
        return p ? p.source : '';
    }

    function setPassSource(id, src) {
        ensureGraph();
        if (!graph) return;
        if (id === 'common') graph.setCommonSource(src);
        else graph.setPassSource(id, src);
        save();
    }

    function setPassEnabled(id, enabled) {
        ensureGraph();
        if (!graph) return;
        graph.setPassEnabled(id, enabled);
        save();
    }

    function setBufferResolutionScale(id, scale) {
        ensureGraph();
        if (!graph || !graph.setPassResolutionScale) return;
        graph.setPassResolutionScale(id, scale);
        save();
    }

    function setChannel(passId, slot, channel) {
        ensureGraph();
        if (!graph) return;
        graph.setChannel(passId, slot, channel);
        save();
    }

    function copyBufferPass(fromId, toId) {
        ensureGraph();
        if (!graph) return false;
        var ok = graph.copyBufferPass(fromId, toId);
        if (ok) {
            compileResult = graph.getStatus();
            save();
            notifyStatus();
        }
        return ok;
    }

    function clearBufferPass(id) {
        ensureGraph();
        if (!graph) return false;
        var ok = graph.clearBufferPass(id);
        if (ok) {
            compileResult = graph.getStatus();
            save();
            notifyStatus();
        }
        return ok;
    }

    function readLibrary() {
        try {
            var parsed = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function writeLibrary(items) {
        try {
            localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
        } catch (err) {
            // Storage can fail in private browsing or quota-limited sessions.
        }
    }

    function listLibrary() {
        return readLibrary().map(function(item) {
            return {
                id: item.id,
                name: item.name || 'Untitled Shadertoy',
                description: item.description || '',
                updatedAt: item.updatedAt || ''
            };
        }).sort(function(a, b) {
            return String(b.updatedAt).localeCompare(String(a.updatedAt));
        });
    }

    function saveToLibrary() {
        ensureGraph();
        var project = serialize();
        var now = new Date().toISOString();
        var items = readLibrary();
        var item = {
            id: project.id,
            name: project.name || 'Untitled Shadertoy',
            description: project.description || '',
            updatedAt: now,
            project: project
        };
        var replaced = false;
        items = items.map(function(existing) {
            if (existing.id === item.id) {
                replaced = true;
                return item;
            }
            return existing;
        });
        if (!replaced) items.unshift(item);
        writeLibrary(items);
        return item;
    }

    function loadFromLibrary(id) {
        var item = readLibrary().filter(function(entry) { return entry.id === id; })[0];
        if (!item || !item.project) return false;
        setProject(item.project);
        compile();
        return true;
    }

    function deleteFromLibrary(id) {
        var before = readLibrary();
        var after = before.filter(function(entry) { return entry.id !== id; });
        writeLibrary(after);
        return after.length !== before.length;
    }

    function getDiagnostics() {
        ensureGraph();
        var diagnostics = graph && graph.getDiagnostics ? graph.getDiagnostics() : {};
        diagnostics.safeMode = getSafeMode();
        diagnostics.compiled = !!(compileResult && compileResult.success);
        diagnostics.active = active;
        return diagnostics;
    }

    EffectRegistry.register({
        name: 'shadertoy_lab',
        label: 'Shadertoy Lab',
        category: 'Shadertoy',
        description: 'Paste and run Shadertoy-style mainImage shaders.',
        params: [],
        init: init,
        cleanup: cleanup,
        render: render
    });

    return {
        compile: compile,
        compilePass: compilePass,
        reset: reset,
        setSource: setSource,
        getSource: getSource,
        getPassSource: getPassSource,
        setPassSource: setPassSource,
        setPassEnabled: setPassEnabled,
        setBufferResolutionScale: setBufferResolutionScale,
        setChannel: setChannel,
        setMetadata: setMetadata,
        setRenderTargetFormat: setRenderTargetFormat,
        copyBufferPass: copyBufferPass,
        clearBufferPass: clearBufferPass,
        getStatus: function() { return compileResult; },
        getExamples: getExamples,
        loadExample: loadExample,
        serialize: serialize,
        loadProject: loadProject,
        setProject: setProject,
        setPaused: setPaused,
        isPaused: function() { return paused; },
        isActive: function() { return active; },
        getProjectName: function() { return serialize().name; },
        getProject: serialize,
        getGraph: function() { return graph; },
        listLibrary: listLibrary,
        saveToLibrary: saveToLibrary,
        loadFromLibrary: loadFromLibrary,
        deleteFromLibrary: deleteFromLibrary,
        getApiKey: getApiKey,
        setApiKey: setApiKey,
        getSafeMode: getSafeMode,
        setSafeMode: setSafeMode,
        importFromApi: importFromApi,
        getCachedImport: getCachedImport,
        getDiagnostics: getDiagnostics,
        handleContextRestored: handleContextRestored
    };
})();
