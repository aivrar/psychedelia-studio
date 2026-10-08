import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const artifactDir = new URL('./endless-artifacts/', import.meta.url);
const names = ['menger_citadel', 'recursive_cathedral', 'fractal_canyon', 'infinite_lattice', 'crystal_geode', 'golden_hour_clouds', 'planet_sunrise'];
const diff = (a, b) => a.samples.reduce((sum, v, i) => sum + Math.abs(v - b.samples[i]), 0) / a.samples.length / 255;
// Fixed-time frames must be visually stable. Permit only sparse GPU numeric
// differences: average <0.003 of one 8-bit level, affecting <0.1% of channels.
const repeatable = (a, b, size = 960 * 540 * 3) => a.rawHash === b.rawHash ||
    (diff(a, b) < 0.00001 && b.rawDifference && b.rawDifference.mean < 0.00001 && b.rawDifference.changedChannels / size < 0.001);
const CAMERA_PROBE = [
    'void main() {',
    'float z = (u_time + floor(gl_FragCoord.x) * 21.731) * u_speed * ES_SPEED + seedPhase() * 4.0;',
    'float d = esMap(esPath(z)).x;',
    'FRAG_OUT = vec4(d > 0.08 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), 1.0);',
    '}'
].join('\n');

export async function auditEndlessScenes(cdp, evaluate) {
    await mkdir(artifactDir, { recursive: true });
    const results = [], failures = [];
    const filterArg = process.argv.find(arg => arg.startsWith('--scene-effects='));
    const selectedNames = filterArg ? names.filter(n => filterArg.split('=')[1].split(',').includes(n)) : names;
    if (!selectedNames.length) throw new Error('No matching endless scenes');
    const sizeArg = process.argv.find(arg => arg.startsWith('--scene-recording-size='));
    const recordingSize = sizeArg ? sizeArg.split('=')[1].split('x').map(Number) : [640, 360];
    if (recordingSize.length !== 2 || recordingSize.some(v => !Number.isInteger(v) || v < 16 || v > 3840)) throw new Error('Invalid scene recording size');
    const category = await evaluate(cdp, `(() => {
        const filter = document.getElementById('effectCategoryFilter');
        const previous = filter.value; filter.value = 'Endless Scenes';
        filter.dispatchEvent(new Event('change', {bubbles: true}));
        const options = Array.from(document.getElementById('effectSelect').options).map(o => o.value);
        filter.value = previous; filter.dispatchEvent(new Event('change', {bubbles: true}));
        return {ok: options.length === EndlessScenes.names.length && ${JSON.stringify(names)}.every(name => options.includes(name)), options};
    })()`);
    results.push({test: 'Endless Scenes category filter', ...category});
    if (!category.ok) failures.push('Category filter does not expose all endless scenes');
    await evaluate(cdp, `(() => {
        Renderer.setResolution(960, 540); Renderer.setQualityMode('full');
        Renderer.setLoopEnabled(false); Renderer.setAnimSpeed(0);
        Renderer.setRotationSpeed(0); Renderer.setRotation(0);
        Renderer.setViewZoom(1); Renderer.setViewZoomDepth(0);
        Renderer.setMaxPreviewFps(0); Renderer.clearInputPriority();
        Renderer.setSeed(0.137, [0.31, 0.61, 0.83, 0.21]);
        // Driver dithering may change an 8-bit rounding decision between
        // frames; disable it when checking shader repeatability byte for byte.
        Renderer.getGL().disable(Renderer.getGL().DITHER);
        Object.keys(Overlays.getEnabled()).forEach(k => Overlays.setEnabled(k, false));
        PostProcess.getEffects().forEach(fx => PostProcess.setEnabled(fx.name, false));
        Renderer.play();
    })()`);
    const webgl1 = await evaluate(cdp, `(() => {
        const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl');
        if (!gl) return {ok: false, failures: ['WebGL 1 context unavailable']};
        gl.getExtension('OES_standard_derivatives');
        const failures = [], variants = [];
        const vertex = 'attribute vec2 a_position; varying vec2 v_uv; void main(){v_uv=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}';
        const nl = String.fromCharCode(10);
        const prefix = ['#extension GL_OES_standard_derivatives : enable', 'precision highp float;',
            '#define PSY_TEX2D texture2D', 'varying vec2 v_uv;'].join(nl) + nl;
        for (const name of ${JSON.stringify(selectedNames)}) {
            const def = EffectRegistry.getDefinition(name);
            const modeParam = (def.specialize || [])[0];
            const param = def.params.find(p => p.name === modeParam);
            const modes = param ? param.options.map((_, i) => i) : [0];
            for (const mode of modes) {
                let source = def.shader.replace(/FRAG_OUT/g, 'gl_FragColor');
                if (modeParam) source = source.replace('uniform float u_' + modeParam + ';', 'const float u_' + modeParam + ' = ' + mode + '.0;');
                const shaders = [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, prefix + ShaderManager.COMMON_GLSL + source]].map(([type, text]) => {
                    const shader = gl.createShader(type); gl.shaderSource(shader, text); gl.compileShader(shader);
                    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) failures.push(name + '/' + mode + ': ' + gl.getShaderInfoLog(shader));
                    return shader;
                });
                const program = gl.createProgram(); shaders.forEach(s => gl.attachShader(program, s)); gl.linkProgram(program);
                const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
                if (!linked) failures.push(name + '/' + mode + ': ' + gl.getProgramInfoLog(program));
                variants.push({name, mode, linked}); gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s));
            }
        }
        const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
        return {ok: !failures.length, variants, failures};
    })()`);
    results.push({test: 'WebGL 1 shader compatibility', ...webgl1});
    if (!webgl1.ok) failures.push('WebGL 1 shaders did not compile');
    if (process.argv.includes('--scene-compatibility-only')) return {ok: !failures.length, results, failures};
    async function image(time, output) {
        const stats = await evaluate(cdp, `(async () => {
            // Wait for this time to be submitted, rather than assuming that
            // two browser callbacks always include a draw after a resize.
            const def = EffectRegistry.getCurrent(), previous = def.setUniforms;
            let presented = false;
            def.setUniforms = function(gl, program, params, loc, time) {
                if (previous) previous.apply(this, arguments);
                if (Math.abs(time - ${time}) < 0.000001) presented = true;
            };
            Renderer.setAnimSpeed(0); Renderer.setTime(${time}); Renderer.clearInputPriority(); Renderer.play();
            await new Promise((resolve, reject) => {
                let attempts = 0;
                function check() {
                    if (presented) return resolve();
                    if (++attempts > 90) return reject(new Error('Requested frame was not rendered'));
                    requestAnimationFrame(check);
                }
                requestAnimationFrame(check);
            });
            def.setUniforms = previous;
            const gl = Renderer.getGL(); gl.finish();
            const source = Renderer.getCanvas(), copy = document.createElement('canvas');
            // GPU bytes avoid compositor/downsampling rounding when deciding
            // whether seeking to the same time reproduces the same frame.
            const pixels = new Uint8Array(source.width * source.height * 4);
            gl.readPixels(0, 0, source.width, source.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            const prior = window.__endlessAuditPixels;
            let rawHash = 2166136261, rawDelta = 0, rawMaxDelta = 0, rawChanged = 0;
            for (let i = 0; i < pixels.length; i++) {
                rawHash = Math.imul(rawHash ^ pixels[i], 16777619);
                if (prior && prior.length === pixels.length && i % 4 !== 3) {
                    const d = Math.abs(pixels[i] - prior[i]); rawDelta += d;
                    rawMaxDelta = Math.max(rawMaxDelta, d); if (d) rawChanged++;
                }
            }
            window.__endlessAuditPixels = pixels;
            const rawDifference = prior && prior.length === pixels.length ?
                {mean: rawDelta / (pixels.length * 0.75) / 255, max: rawMaxDelta, changedChannels: rawChanged} : null;
            copy.width = 96; copy.height = 54;
            const ctx = copy.getContext('2d'); ctx.drawImage(source, 0, 0, copy.width, copy.height);
            const rgb = Array.from(ctx.getImageData(0, 0, copy.width, copy.height).data).filter((v, i) => i % 4 !== 3);
            const mean = rgb.reduce((a, v) => a + v, 0) / rgb.length / 255;
            const variance = rgb.reduce((a, v) => a + (v / 255 - mean) ** 2, 0) / rgb.length;
            const black = rgb.filter(v => v < 2).length / rgb.length;
            const errors = []; let err;
            while ((err = gl.getError()) !== gl.NO_ERROR && errors.length < 16) errors.push(err);
            return {mean, variance, black, samples: rgb, rawHash: rawHash >>> 0, rawDifference, errors, png: ${!!output} ? source.toDataURL('image/png').split(',')[1] : null};
        })()`);
        if (output && stats.png) await writeFile(new URL(output, artifactDir), Buffer.from(stats.png, 'base64'));
        delete stats.png;
        return stats;
    }
    for (const name of selectedNames) {
        console.error('Endless scene audit: ' + name);
        const meta = await evaluate(cdp, `(() => {
            const def = EffectRegistry.getDefinition(${JSON.stringify(name)});
            const palette = def && def.params.find(p => p.name === 'palette');
            return def ? {label: def.label, presets: def.fractalFlight.smokePresets, contract: FractalFlight.validateEffect(def),
                nativePalettes: palette.paletteNative, paletteCount: palette.options.length, cameraProbe: !def.endlessScene || def.endlessScene.cameraProbe !== false} : null;
        })()`);
        if (!meta) { failures.push(name + ': missing effect'); continue; }
        if (!meta.contract.ok) failures.push(name + ': ' + meta.contract.errors.join(', '));
        for (let index = 0; index < meta.presets.length; index++) {
            const setup = await evaluate(cdp, `(() => {
                const switched = EffectRegistry.switchTo(${JSON.stringify(name)});
                Controls.applyPreset(${index}); Controls.setValues({audio_react: 0});
                Renderer.setSeed(0.137, [0.31, 0.61, 0.83, 0.21]);
                Renderer.setAnimSpeed(0); Renderer.clearInputPriority();
                const select = document.getElementById('fractalPresetSelect');
                return {switched, name: EffectRegistry.getCurrent().name, presetUi: select && select.value === '${index}'};
            })()`);
            const early = await image(8), nearby = await image(8.1);
            const later = await image(180, name + '-preset-' + (index + 1) + '.png'), repeat = await image(180);
            const changed = diff(early, nearby), traveled = diff(early, later), deterministic = repeatable(later, repeat);
            const errors = early.errors.concat(nearby.errors, later.errors, repeat.errors);
            const ok = setup.switched && setup.name === name && setup.presetUi && early.variance > 0.001 &&
                later.variance > 0.001 && early.black < 0.5 && later.black < 0.5 &&
                changed > 0.0001 && traveled > 0.01 && deterministic && !errors.length;
            const result = {name, preset: meta.presets[index].name, ok, setup, changed, traveled, deterministic, repeatDifference: diff(later, repeat), rawHashes: [later.rawHash, repeat.rawHash], rawDifference: repeat.rawDifference,
                mean: early.mean, variance: early.variance, laterMean: later.mean, laterVariance: later.variance, errors};
            results.push(result);
            if (!ok) failures.push(name + ' / ' + result.preset + ': render, motion or deterministic-frame check failed');
        }
        await evaluate(cdp, `Controls.setValues({speed: 0, audio_react: 0, color_drift: 0})`);
        const stationaryA = await image(15), stationaryB = await image(40);
        const stopped = repeatable(stationaryA, stationaryB);
        if (!stopped) failures.push(name + ': speed zero still moves the scene');
        await evaluate(cdp, `Controls.applyPreset(0); Controls.setValues({palette: ${meta.nativePalettes}, audio_react: 0});`);
        const sharedPalette = await image(15);
        const paletteOk = sharedPalette.variance > 0.001 && !sharedPalette.errors.length;
        if (!paletteOk) failures.push(name + ': shared palette is blank or failed');
        results.push({name, test: 'shared palette', ok: paletteOk, mean: sharedPalette.mean, variance: sharedPalette.variance});
        // Verify every original palette is selectable and actually changes
        // the image; also exercise the additional color controls together.
        const paletteImages = [];
        for (let index = 0; index < meta.nativePalettes; index++) {
            await evaluate(cdp, `Controls.setValues({palette: ${index}, color_phase: 0, hue_shift: 0, saturation: 1, color_spread: 1, color_drift: 0});`);
            const sample = await image(15);
            paletteImages.push(sample);
            if (sample.variance < 0.0005 || sample.errors.length) failures.push(name + ': palette ' + index + ' is flat or failed');
        }
        const paletteDifferences = paletteImages.slice(1).map(sample => diff(paletteImages[0], sample));
        if (paletteDifferences.some(d => d < 0.005)) failures.push(name + ': native palettes are indistinguishable');
        await evaluate(cdp, `Controls.setValues({palette: 0, color_phase: 0.23, hue_shift: 0.2, saturation: 1.3, color_spread: 1.6});`);
        const tinted = await image(15);
        const colorChanged = diff(paletteImages[0], tinted);
        if (colorChanged < 0.01 || tinted.errors.length) failures.push(name + ': color controls did not change the render');
        results.push({name, test: 'native palettes and color controls', ok: paletteDifferences.every(d => d >= 0.005) && colorChanged >= 0.01,
            nativePalettes: meta.nativePalettes, paletteCount: meta.paletteCount, paletteDifferences, colorChanged});

        const colorChanges = [];
        for (const [param, value] of [['color_phase', 0.25], ['hue_shift', 0.2], ['saturation', 0], ['color_spread', 1.8]]) {
            await evaluate(cdp, `Controls.setValues({palette: 0, color_phase: 0, hue_shift: 0, saturation: 1, color_spread: 1, color_drift: 0, ${param}: ${value}});`);
            const sample = await image(15), changed = diff(paletteImages[0], sample);
            const ok = changed >= 0.005 && !sample.errors.length;
            colorChanges.push({param, ok, changed});
            if (!ok) failures.push(name + ': ' + param + ' did not change the colors');
        }
        await evaluate(cdp, `Controls.setValues({palette: 0, speed: 0, color_phase: 0, hue_shift: 0, saturation: 1, color_spread: 1, color_drift: 0.7});`);
        const driftA = await image(15), driftB = await image(40), driftChanged = diff(driftA, driftB);
        const driftOk = driftChanged >= 0.005 && !driftA.errors.length && !driftB.errors.length;
        if (!driftOk) failures.push(name + ': Color Drift did not animate stationary geometry');
        results.push({name, test: 'individual color controls', ok: colorChanges.every(c => c.ok) && driftOk, colorChanges, driftChanged});

        if (['crystal_geode', 'golden_hour_clouds', 'planet_sunrise'].includes(name)) {
            const extremes = await evaluate(cdp, `(() => {
                const def = EffectRegistry.getDefinition(${JSON.stringify(name)}), modeParam = (def.specialize || [])[0];
                const mode = def.params.find(p => p.name === modeParam);
                return (mode ? mode.options : ['Default']).flatMap((label, index) => [0, 1].map(extreme => {
                    const values = {audio_react: 0};
                    def.params.forEach(p => {if (p.group === 'Structure' && p.min !== undefined) values[p.name] = extreme ? p.max : p.min;});
                    if (modeParam) values[modeParam] = index;
                    return {label, extreme, values};
                }));
            })()`);
            const checks = [];
            for (const extreme of extremes) {
                await evaluate(cdp, `Controls.applyPreset(0); Controls.setValues(${JSON.stringify(extreme.values)});`);
                const sample = await image(45), ok = sample.variance > 0.0005 && sample.black < 0.5 && !sample.errors.length;
                checks.push({mode: extreme.label, extreme: extreme.extreme, ok, variance: sample.variance, black: sample.black});
                if (!ok) failures.push(name + ': ' + extreme.label + ' structural limits rendered blank or failed');
            }
            results.push({name, test: 'structural limits', ok: checks.every(c => c.ok), checks});
        }

        // Probe the actual GPU distance field at the camera across hours of
        // travel. This catches collisions a nonblank screenshot would miss.
        const clearance = meta.cameraProbe ? await evaluate(cdp, `(async () => {
            const name = ${JSON.stringify(name)}, def = EffectRegistry.getDefinition(name);
            const prefix = def.shader.slice(0, def.shader.lastIndexOf('void main()'));
            const probeName = name + '_camera_probe';
            EffectRegistry.register({name: probeName, label: 'Camera probe', params: def.params.map(p => Object.assign({}, p, {palette: false})),
                specialize: def.specialize, shader: prefix + ${JSON.stringify(CAMERA_PROBE)}
            });
            Renderer.setResolution(256, 16); EffectRegistry.switchTo(probeName);
            const modeParam = (def.specialize || [])[0], param = def.params.find(p => p.name === modeParam);
            const probes = [], modes = param ? param.options.map((_, i) => i) : [0];
            for (const mode of modes) for (const seed of [0.137, 0.729, 17.25]) for (const extreme of [0, 1]) {
                const values = {};
                def.params.forEach(p => { if (p.min !== undefined) values[p.name] = extreme ? p.max : p.min; });
                Object.assign(values, {speed: 1.7, audio_react: 0, sway: 1, detail: 80});
                if (modeParam) values[modeParam] = mode;
                Controls.setValues(values); Renderer.setSeed(seed, [0.31, 0.61, 0.83, 0.21]); Renderer.setTime(0); Renderer.clearInputPriority();
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
                const c = document.createElement('canvas'); c.width = 256; c.height = 1;
                const ctx = c.getContext('2d'); ctx.drawImage(Renderer.getCanvas(), 0, 0, 256, 1, 0, 0, 256, 1);
                const pixels = ctx.getImageData(0, 0, 256, 1).data; let collisions = 0;
                for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 128 || pixels[i + 1] < 128) collisions++;
                probes.push({mode, seed, extreme, collisions});
            }
            Renderer.setResolution(960, 540); Renderer.setSeed(0.137, [0.31, 0.61, 0.83, 0.21]);
            return {ok: probes.every(p => !p.collisions), sampledPositions: probes.length * 256, probes};
        })()`) : {ok: true, sampledPositions: 0, reason: 'Volumetric clouds have no solid collision surface'};
        if (!clearance.ok) failures.push(name + ': camera enters geometry at supported settings');
        results.push({name, test: 'stationary and camera clearance', ok: stopped && clearance.ok, stopped, clearance});

        if (!process.argv.includes('--skip-scene-recording')) {
            console.error('Smooth MP4: ' + name);
            const recording = await evaluate(cdp, `(async () => {
                EffectRegistry.switchTo(${JSON.stringify(name)}); Controls.applyPreset(0);
                Renderer.setSeed(0.137, [0.31, 0.61, 0.83, 0.21]);
                Renderer.setResolution(${recordingSize[0]}, ${recordingSize[1]}); Renderer.setAnimSpeed(1); Renderer.setTime(8);
                Renderer.clearInputPriority(); Renderer.play();
                VideoExport.setOptions({format: 'mp4', quality: 'standard', audio: 'none', mode: 'smooth'});
                const started = performance.now();
                const blob = await new Promise((resolve, reject) => {
                    const timer = setTimeout(() => reject(new Error('Export timed out')), 90000);
                    const ok = VideoExport.timedRecording(Renderer.getCanvas(), 1, 60, b => {clearTimeout(timer); resolve(b);});
                    if (!ok) {clearTimeout(timer); reject(new Error('Export did not start: ' + VideoExport.getLastError()));}
                });
                if (!blob || !blob.size) throw new Error('Export returned no video');
                return {wallSeconds: (performance.now() - started) / 1000, bytes: Array.from(new Uint8Array(await blob.arrayBuffer()))};
            })()`);
            const file = new URL(name + '-60fps.mp4', artifactDir);
            await writeFile(file, Buffer.from(recording.bytes));
            const video = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
                '-show_entries', 'stream=width,height,nb_read_frames,avg_frame_rate,duration', '-of', 'json', fileURLToPath(file)], {encoding: 'utf8'})).streams[0];
            const hashes = execFileSync('ffmpeg', ['-v', 'error', '-i', fileURLToPath(file), '-f', 'framemd5', '-'], {encoding: 'utf8'}).split('\n')
                .filter(line => line && !line.startsWith('#')).map(line => line.split(',').at(-1).trim());
            const uniqueFrames = new Set(hashes).size;
            const ok = Number(video.nb_read_frames) === 60 && video.avg_frame_rate === '60/1' && Number(video.duration) === 1 &&
                video.width === recordingSize[0] && video.height === recordingSize[1] && uniqueFrames === 60;
            results.push({name, test: 'smooth MP4', ok, uniqueFrames, resolution: recordingSize, video, wallSeconds: recording.wallSeconds});
            if (!ok) failures.push(name + ': smooth export lost frames or timing');
            await evaluate(cdp, `Renderer.setResolution(960, 540); Renderer.setAnimSpeed(0); Renderer.play();`);
        }
    }
    const report = {ok: !failures.length, results, failures};
    await writeFile(new URL('results.json', artifactDir), JSON.stringify(report, null, 2));
    return report;
}
