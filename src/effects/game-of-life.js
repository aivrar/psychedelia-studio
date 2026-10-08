/* Psychedelia - Game of Life (stateful Shadertoy pass graph) */
(function() {
    'use strict';

    var L = ShadertoyEffectRunner.lines;
    var pass = ShadertoyEffectRunner.pass;

    function project() {
        var common = L([
            'uniform float u_speed;',
            'uniform float u_scale;',
            'uniform float u_rule_variation;',
            'uniform float u_color_mode;',
            'uniform float u_seed;',
            'uniform vec4 u_seed_vec;',
            '',
            'float hash21(vec2 p) {',
            '    p += u_seed_vec.xy * 71.13 + u_seed;',
            '    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
            '}',
            '',
            'float isCount(float value, float target) {',
            '    return 1.0 - step(0.5, abs(value - target));',
            '}',
            '',
            'float lifeCellSize() {',
            '    return clamp(u_scale, 4.0, 160.0);',
            '}',
            '',
            'vec3 hsv2rgb(vec3 c) {',
            '    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);',
            '    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);',
            '    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);',
            '}',
            '',
            'vec3 neon(float t) {',
            '    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.12, 0.27)));',
            '}'
        ]);

        var bufferA = L([
            'float sampleAlive(vec2 cell, vec2 grid, float cellSize) {',
            '    vec2 wrapped = mod(cell + grid, grid);',
            '    vec2 uv = (wrapped + 0.5) * cellSize / iResolution.xy;',
            '    return step(0.5, texture(iChannel0, uv).r);',
            '}',
            '',
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    float cellSize = lifeCellSize();',
            '    vec2 grid = max(vec2(2.0), floor(iResolution.xy / cellSize));',
            '    vec2 cell = floor(fragCoord / cellSize);',
            '    vec2 stateUv = (cell + 0.5) * cellSize / iResolution.xy;',
            '    vec4 previous = texture(iChannel0, stateUv);',
            '    float alive = step(0.5, previous.r);',
            '    float age = previous.g;',
            '    float interval = max(1.0, floor(12.0 / max(0.1, u_speed)));',
            '    bool tick = iFrame < 2 || mod(float(iFrame), interval) < 0.5;',
            '',
            '    if (!tick) {',
            '        fragColor = previous;',
            '        return;',
            '    }',
            '',
            '    float nextAlive = 0.0;',
            '    if (iFrame < 2) {',
            '        float density = 0.68 - clamp(u_rule_variation, 0.0, 1.0) * 0.18;',
            '        nextAlive = step(density, hash21(cell));',
            '        age = nextAlive * hash21(cell + 19.0) * 0.25;',
            '    } else {',
            '        float n = 0.0;',
            '        n += sampleAlive(cell + vec2(-1.0, -1.0), grid, cellSize);',
            '        n += sampleAlive(cell + vec2( 0.0, -1.0), grid, cellSize);',
            '        n += sampleAlive(cell + vec2( 1.0, -1.0), grid, cellSize);',
            '        n += sampleAlive(cell + vec2(-1.0,  0.0), grid, cellSize);',
            '        n += sampleAlive(cell + vec2( 1.0,  0.0), grid, cellSize);',
            '        n += sampleAlive(cell + vec2(-1.0,  1.0), grid, cellSize);',
            '        n += sampleAlive(cell + vec2( 0.0,  1.0), grid, cellSize);',
            '        n += sampleAlive(cell + vec2( 1.0,  1.0), grid, cellSize);',
            '',
            '        float born = isCount(n, 3.0);',
            '        float highLife = isCount(n, 6.0) * step(0.55, u_rule_variation);',
            '        float survives = alive * max(isCount(n, 2.0), isCount(n, 3.0));',
            '        nextAlive = clamp((1.0 - alive) * max(born, highLife) + survives, 0.0, 1.0);',
            '',
            '        float sparseSpark = step(0.9985, hash21(cell + floor(iTime * max(1.0, u_speed))));',
            '        sparseSpark *= clamp(u_rule_variation, 0.0, 1.0) * (1.0 - alive);',
            '',
            '        float draw = 0.0;',
            '        if (iMouse.z > 0.0) {',
            '            vec2 mouseCell = floor(iMouse.xy / cellSize);',
            '            draw = smoothstep(2.8, 0.0, length(cell - mouseCell));',
            '        }',
            '        nextAlive = max(nextAlive, max(sparseSpark, draw));',
            '        age = nextAlive > 0.5 ? min(1.0, age + 0.055) : max(0.0, age * 0.88 - 0.015);',
            '    }',
            '',
            '    float bornNow = max(0.0, nextAlive - alive);',
            '    fragColor = vec4(nextAlive, age, bornNow, 1.0);',
            '}'
        ]);

        var image = L([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    vec4 state = texture(iChannel0, uv);',
            '    float alive = state.r;',
            '    float age = state.g;',
            '    float born = state.b;',
            '    vec2 gv = fract(fragCoord / lifeCellSize());',
            '    float interior = smoothstep(0.0, 0.08, gv.x) * smoothstep(0.0, 0.08, gv.y) *',
            '        smoothstep(0.0, 0.08, 1.0 - gv.x) * smoothstep(0.0, 0.08, 1.0 - gv.y);',
            '    float mode = floor(u_color_mode + 0.5);',
            '    vec3 color;',
            '    if (mode < 0.5) {',
            '        color = hsv2rgb(vec3(fract(age * 0.7 + iTime * 0.025), 0.78, 0.95)) * alive;',
            '        color += vec3(0.18, 0.02, 0.22) * age * (1.0 - alive);',
            '        color += vec3(1.0, 0.85, 0.35) * born;',
            '    } else if (mode < 1.5) {',
            '        color = vec3(0.0, 0.88, 0.28) * alive + vec3(0.0, 0.16, 0.05) * age;',
            '    } else if (mode < 2.5) {',
            '        color = neon(age + iTime * 0.03) * (0.18 * age + alive);',
            '        color += vec3(0.7, 0.95, 1.0) * born;',
            '    } else {',
            '        color = vec3(alive) + vec3(0.22) * age;',
            '    }',
            '    color *= mix(0.34, 1.0, interior);',
            '    fragColor = vec4(color, 1.0);',
            '}'
        ]);

        var p = ShadertoyPassGraph.makeDefaultProject(image);
        p.name = 'Game of Life';
        p.description = 'Stateful Conway B3/S23 cellular automaton with optional HighLife variation and mouse seeding.';
        p.common.source = common;
        pass(p, 'bufferA').enabled = true;
        pass(p, 'bufferA').source = bufferA;
        pass(p, 'bufferA').channels[0] = { slot: 0, kind: 'self', sourceId: 'bufferA', sampler: { filter: 'nearest', wrap: 'repeat' } };
        pass(p, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA', sampler: { filter: 'nearest', wrap: 'repeat' } };
        return p;
    }

    var runner = ShadertoyEffectRunner.make({
        project: project,
        resetKey: function(values) {
            return Math.round((Number(values.scale) || 40) * 100) / 100;
        }
    });

    EffectRegistry.register({
        name: 'game_of_life',
        label: 'Game of Life',
        category: 'Simulation',
        description: 'True stateful Conway cellular automata with ping-pong buffer history',
        params: [
            { name: 'speed', label: 'Speed', min: 0.1, max: 3, default: 0.8, step: 0.1 },
            { name: 'scale', label: 'Scale', min: 10, max: 100, default: 40, step: 5, type: 'int' },
            { name: 'rule_variation', label: 'Rule Variation', min: 0, max: 1, default: 0.3, step: 0.05 },
            { name: 'color_mode', label: 'Color', type: 'select', options: ['Rainbow Trail', 'Green Matrix', 'Neon', 'Classic'], default: 0 }
        ],
        _usesShadertoyGraph: true,
        init: runner.init,
        cleanup: runner.cleanup,
        render: runner.render,
        resetSimulation: runner.reset,
        getDiagnostics: runner.getDiagnostics
    });
})();
