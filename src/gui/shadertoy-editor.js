/* Psychedelia Studio - Shadertoy Lab editor UI */
var ShadertoyEditor = (function() {
    'use strict';

    var panel = null;
    var sourceEl = null;
    var statusEl = null;
    var errorEl = null;
    var pauseBtn = null;
    var exampleSelect = null;
    var importInput = null;
    var inputTimer = null;
    var currentPassId = 'image';
    var channelContainer = null;
    var nameEl = null;
    var descriptionEl = null;
    var dirtyEl = null;
    var librarySelect = null;
    var pasteMode = null;
    var pasteText = null;
    var bufferTools = null;
    var copyTarget = null;
    var apiKeyEl = null;
    var apiShaderIdEl = null;
    var apiStatusEl = null;
    var formatSelect = null;
    var safeModeInput = null;
    var diagnosticsEl = null;
    var scaleSelect = null;
    var beginnerModeInput = null;
    var creatorStatusEl = null;
    var quickExportEl = null;
    var dirty = false;
    var syncing = false;

    function init() {
        if (panel) return;
        var sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        panel = document.createElement('section');
        panel.className = 'panel shadertoy-panel hidden';
        panel.id = 'shadertoyPanel';
        panel.innerHTML = [
            '<h2 class="panel-title">Shadertoy Lab <span id="shadertoyDirty" class="shadertoy-dirty">Saved</span></h2>',
            '<div class="shadertoy-mode-row">',
            '    <label><input type="checkbox" id="shadertoyBeginnerMode" checked> Beginner Mode</label>',
            '</div>',
            '<div class="shadertoy-quick-create">',
            '    <div class="shadertoy-subhead">Quick Create</div>',
            '    <div class="shadertoy-quick-grid">',
            '        <div class="param-row">',
            '            <label>Pattern</label>',
            '            <select id="shadertoyQuickKind">',
            '                <option value="plasma">Plasma Field</option>',
            '                <option value="rings">Signal Rings</option>',
            '                <option value="tunnel">Light Tunnel</option>',
            '                <option value="kaleidoscope">Kaleidoscope</option>',
            '                <option value="raymarch_orb">Raymarch Orb</option>',
            '                <option value="feedback_trails">Feedback Trails</option>',
            '                <option value="mouse_paint">Mouse Paint</option>',
            '                <option value="audio_pulse">Audio Pulse</option>',
            '                <option value="audio_feedback_trails">Audio Feedback Trails</option>',
            '                <option value="audio_fluid_ink">Audio Fluid Ink</option>',
            '                <option value="audio_particles">Audio Particles</option>',
            '                <option value="audio_raymarch_tunnel">Audio Raymarch Tunnel</option>',
            '                <option value="audio_spectrum_field">Audio Spectrum Field</option>',
            '                <option value="audio_beat_strobe">Audio Beat Strobe</option>',
            '                <option value="audio_slitscan">Audio Slitscan</option>',
            '                <option value="texture_warp">Texture Warp</option>',
            '            </select>',
            '        </div>',
            '        <div class="param-row">',
            '            <label>Motion</label>',
            '            <select id="shadertoyQuickMotion">',
            '                <option value="drift">Drift</option>',
            '                <option value="pulse">Pulse</option>',
            '                <option value="orbit">Orbit</option>',
            '                <option value="spin">Spin</option>',
            '                <option value="rush">Rush</option>',
            '            </select>',
            '        </div>',
            '        <div class="param-row">',
            '            <label>Palette</label>',
            '            <select id="shadertoyQuickPalette">',
            '                <option value="neon">Neon</option>',
            '                <option value="aurora">Aurora</option>',
            '                <option value="sunset">Sunset</option>',
            '                <option value="ocean">Ocean</option>',
            '                <option value="matrix">Matrix</option>',
            '                <option value="candy">Candy</option>',
            '            </select>',
            '        </div>',
            '        <div class="param-row">',
            '            <label>Detail</label>',
            '            <select id="shadertoyQuickDetail">',
            '                <option value="simple">Simple</option>',
            '                <option value="rich">Rich</option>',
            '                <option value="dense">Dense</option>',
            '            </select>',
            '        </div>',
            '    </div>',
            '    <div class="shadertoy-actions">',
            '        <button class="sm-btn" id="shadertoyQuickGenerate">Generate</button>',
            '        <button class="sm-btn" id="shadertoyQuickRandom">Random Idea</button>',
            '        <button class="sm-btn" id="shadertoyCopyForShadertoy">Copy For Shadertoy</button>',
            '        <button class="sm-btn" id="shadertoyQuickAdvanced">Advanced</button>',
            '    </div>',
            '    <textarea id="shadertoyQuickExport" class="shadertoy-quick-export hidden" readonly spellcheck="false"></textarea>',
            '    <div id="shadertoyCreatorStatus" class="shadertoy-creator-status">Pick a pattern, generate, then edit the code below.</div>',
            '</div>',
            '<div class="shadertoy-actions">',
            '    <button class="sm-btn" id="shadertoyRun">Run</button>',
            '    <button class="sm-btn" id="shadertoyCompile">Compile All</button>',
            '    <button class="sm-btn" id="shadertoyCompilePass">Compile Pass</button>',
            '    <button class="sm-btn" id="shadertoyFormat">Format</button>',
            '    <button class="sm-btn" id="shadertoyReset">Reset</button>',
            '    <button class="sm-btn" id="shadertoyPause">Pause</button>',
            '</div>',
            '<div class="param-row">',
            '    <label>Name</label>',
            '    <input type="text" id="shadertoyProjectName" maxlength="80">',
            '</div>',
            '<div class="param-row shadertoy-advanced">',
            '    <label>Description</label>',
            '    <textarea id="shadertoyProjectDescription" class="shadertoy-description" spellcheck="true"></textarea>',
            '</div>',
            '<div class="param-row shadertoy-advanced">',
            '    <label>Library</label>',
            '    <select id="shadertoyLibrary"></select>',
            '</div>',
            '<div class="shadertoy-actions shadertoy-advanced">',
            '    <button class="sm-btn" id="shadertoySaveLibrary">Save Library</button>',
            '    <button class="sm-btn" id="shadertoyLoadLibrary">Load</button>',
            '    <button class="sm-btn" id="shadertoyDeleteLibrary">Delete</button>',
            '</div>',
            '<div class="shadertoy-subhead shadertoy-advanced">Optional Shadertoy Import</div>',
            '<div class="param-row shadertoy-advanced">',
            '    <label>API Key</label>',
            '    <input type="password" id="shadertoyApiKey" autocomplete="off" placeholder="Only needed for Import ID" title="Optional. Used only to import public Shadertoy.com shaders by ID. Starter presets do not need a key.">',
            '</div>',
            '<div class="param-row shadertoy-advanced">',
            '    <label>Shader ID</label>',
            '    <input type="text" id="shadertoyApiShaderId" maxlength="16" autocomplete="off" placeholder="Example: XyZ123" title="The ID from a Shadertoy URL, used with an API key for optional external import.">',
            '</div>',
            '<div class="param-row shadertoy-advanced">',
            '    <label>Target Format</label>',
            '    <select id="shadertoyTargetFormat">',
            '        <option value="rgba8">RGBA8</option>',
            '        <option value="rgba16f">RGBA16F</option>',
            '        <option value="rgba32f">RGBA32F</option>',
            '    </select>',
            '</div>',
            '<div class="shadertoy-safe-row shadertoy-advanced">',
            '    <label><input type="checkbox" id="shadertoySafeMode"> Safe Mode</label>',
            '</div>',
            '<div id="shadertoyDiagnostics" class="shadertoy-diagnostics shadertoy-advanced"></div>',
            '<div class="shadertoy-actions shadertoy-advanced">',
            '    <button class="sm-btn" id="shadertoyImportApi" title="Optional: import a public Shadertoy shader by ID when an API key is saved.">Import ID</button>',
            '    <button class="sm-btn" id="shadertoyClearApi">Clear ID</button>',
            '</div>',
            '<div id="shadertoyApiStatus" class="shadertoy-api-status shadertoy-advanced"></div>',
            '<div class="param-row">',
            '    <label>Starter Preset</label>',
            '    <select id="shadertoyExample"></select>',
            '</div>',
            '<div class="shadertoy-pass-tabs" id="shadertoyPassTabs">',
            '    <button class="sm-btn active" data-pass="image">Image</button>',
            '    <button class="sm-btn" data-pass="common">Common</button>',
            '    <button class="sm-btn" data-pass="bufferA">A</button>',
            '    <button class="sm-btn" data-pass="bufferB">B</button>',
            '    <button class="sm-btn" data-pass="bufferC">C</button>',
            '    <button class="sm-btn" data-pass="bufferD">D</button>',
            '</div>',
            '<div class="shadertoy-buffer-toggles" id="shadertoyBufferToggles">',
            '    <label><input type="checkbox" data-buffer="bufferA"> A</label>',
            '    <label><input type="checkbox" data-buffer="bufferB"> B</label>',
            '    <label><input type="checkbox" data-buffer="bufferC"> C</label>',
            '    <label><input type="checkbox" data-buffer="bufferD"> D</label>',
            '</div>',
            '<div class="shadertoy-buffer-tools hidden" id="shadertoyBufferTools">',
            '    <select id="shadertoyCopyTarget"></select>',
            '    <select id="shadertoyBufferScale">',
            '        <option value="1">100%</option>',
            '        <option value="0.75">75%</option>',
            '        <option value="0.5">50%</option>',
            '        <option value="0.25">25%</option>',
            '        <option value="0.125">12.5%</option>',
            '    </select>',
            '    <button class="sm-btn" id="shadertoyCopyBuffer">Copy Buffer</button>',
            '    <button class="sm-btn" id="shadertoyClearBuffer">Clear Buffer</button>',
            '</div>',
            '<div id="shadertoyChannels" class="shadertoy-channels"></div>',
            '<div class="param-row">',
            '    <label id="shadertoySourceLabel">Image Pass</label>',
            '    <textarea id="shadertoySource" spellcheck="false"></textarea>',
            '</div>',
            '<div class="shadertoy-paste shadertoy-advanced">',
            '    <div class="param-row">',
            '        <label>Paste Mode</label>',
            '        <select id="shadertoyPasteMode">',
            '            <option value="auto">Auto</option>',
            '            <option value="current">Current Pass</option>',
            '            <option value="image">Image Source</option>',
            '            <option value="project">Project JSON</option>',
            '        </select>',
            '    </div>',
            '    <textarea id="shadertoyPasteText" class="shadertoy-paste-text" spellcheck="false" placeholder="Paste Shadertoy source or project JSON"></textarea>',
            '    <div class="shadertoy-actions">',
            '        <button class="sm-btn" id="shadertoyApplyPaste">Apply Paste</button>',
            '        <button class="sm-btn" id="shadertoyClearPaste">Clear Paste</button>',
            '    </div>',
            '</div>',
            '<div class="shadertoy-actions shadertoy-advanced">',
            '    <button class="sm-btn" id="shadertoyImport">Import</button>',
            '    <button class="sm-btn" id="shadertoyExport">Export</button>',
            '</div>',
            '<input type="file" id="shadertoyImportFile" accept=".json,.txt,.glsl" class="hidden">',
            '<div id="shadertoyStatus" class="shadertoy-status">Not compiled</div>',
            '<pre id="shadertoyErrors" class="shadertoy-errors hidden"></pre>'
        ].join('');
        var paramsPanel = document.getElementById('paramsPanel');
        var host = paramsPanel && paramsPanel.parentNode ? paramsPanel.parentNode : sidebar;
        host.insertBefore(panel, paramsPanel ? paramsPanel.nextSibling : null);

        sourceEl = document.getElementById('shadertoySource');
        statusEl = document.getElementById('shadertoyStatus');
        errorEl = document.getElementById('shadertoyErrors');
        pauseBtn = document.getElementById('shadertoyPause');
        exampleSelect = document.getElementById('shadertoyExample');
        importInput = document.getElementById('shadertoyImportFile');
        channelContainer = document.getElementById('shadertoyChannels');
        nameEl = document.getElementById('shadertoyProjectName');
        descriptionEl = document.getElementById('shadertoyProjectDescription');
        dirtyEl = document.getElementById('shadertoyDirty');
        librarySelect = document.getElementById('shadertoyLibrary');
        pasteMode = document.getElementById('shadertoyPasteMode');
        pasteText = document.getElementById('shadertoyPasteText');
        bufferTools = document.getElementById('shadertoyBufferTools');
        copyTarget = document.getElementById('shadertoyCopyTarget');
        apiKeyEl = document.getElementById('shadertoyApiKey');
        apiShaderIdEl = document.getElementById('shadertoyApiShaderId');
        apiStatusEl = document.getElementById('shadertoyApiStatus');
        formatSelect = document.getElementById('shadertoyTargetFormat');
        safeModeInput = document.getElementById('shadertoySafeMode');
        diagnosticsEl = document.getElementById('shadertoyDiagnostics');
        scaleSelect = document.getElementById('shadertoyBufferScale');
        beginnerModeInput = document.getElementById('shadertoyBeginnerMode');
        creatorStatusEl = document.getElementById('shadertoyCreatorStatus');
        quickExportEl = document.getElementById('shadertoyQuickExport');

        populateExamples();
        wireEvents();
        setBeginnerMode(true);
        if (typeof ShadertoyChannels !== 'undefined') {
            ShadertoyChannels.onStatusChange(refreshChannels);
        }
    }

    function populateExamples() {
        if (!exampleSelect || typeof ShadertoyHost === 'undefined') return;
        exampleSelect.innerHTML = '';
        ShadertoyHost.getExamples().forEach(function(example) {
            var opt = document.createElement('option');
            opt.value = example.id;
            opt.textContent = example.name;
            exampleSelect.appendChild(opt);
        });
    }

    function wireEvents() {
        beginnerModeInput.addEventListener('change', function() {
            setBeginnerMode(beginnerModeInput.checked);
        });
        document.getElementById('shadertoyQuickAdvanced').addEventListener('click', function() {
            setBeginnerMode(false);
        });
        document.getElementById('shadertoyQuickGenerate').addEventListener('click', generateQuickProject);
        document.getElementById('shadertoyQuickRandom').addEventListener('click', randomizeQuickIdea);
        document.getElementById('shadertoyCopyForShadertoy').addEventListener('click', copyForShadertoy);
        document.getElementById('shadertoyRun').addEventListener('click', function() {
            runCompile(true, 'all');
        });
        document.getElementById('shadertoyCompile').addEventListener('click', function() {
            runCompile(false, 'all');
        });
        document.getElementById('shadertoyCompilePass').addEventListener('click', function() {
            runCompile(false, 'pass');
        });
        document.getElementById('shadertoyFormat').addEventListener('click', formatCurrentSource);
        nameEl.addEventListener('input', function() {
            if (syncing) return;
            ShadertoyHost.setMetadata({ name: nameEl.value });
            markDirty();
        });
        descriptionEl.addEventListener('input', function() {
            if (syncing) return;
            ShadertoyHost.setMetadata({ description: descriptionEl.value });
            markDirty();
        });
        document.getElementById('shadertoySaveLibrary').addEventListener('click', saveLibraryProject);
        document.getElementById('shadertoyLoadLibrary').addEventListener('click', loadLibraryProject);
        document.getElementById('shadertoyDeleteLibrary').addEventListener('click', deleteLibraryProject);
        apiKeyEl.addEventListener('input', function() {
            ShadertoyHost.setApiKey(apiKeyEl.value);
        });
        formatSelect.addEventListener('change', function() {
            ShadertoyHost.setRenderTargetFormat(formatSelect.value);
            markDirty();
            updateDiagnostics();
            updateStatus(ShadertoyHost.getStatus());
        });
        safeModeInput.addEventListener('change', function() {
            ShadertoyHost.setSafeMode(safeModeInput.checked);
            updateDiagnostics();
        });
        scaleSelect.addEventListener('change', function() {
            ShadertoyHost.setBufferResolutionScale(currentPassId, Number(scaleSelect.value));
            markDirty();
            updateDiagnostics();
        });
        document.getElementById('shadertoyImportApi').addEventListener('click', importApiShader);
        document.getElementById('shadertoyClearApi').addEventListener('click', function() {
            apiShaderIdEl.value = '';
            setApiStatus('');
        });
        document.getElementById('shadertoyApplyPaste').addEventListener('click', applyPaste);
        document.getElementById('shadertoyClearPaste').addEventListener('click', function() {
            pasteText.value = '';
        });
        document.getElementById('shadertoyCopyBuffer').addEventListener('click', function() {
            if (ShadertoyHost.copyBufferPass(currentPassId, copyTarget.value)) {
                currentPassId = copyTarget.value;
                markDirty();
                syncFromHost();
            }
        });
        document.getElementById('shadertoyClearBuffer').addEventListener('click', function() {
            if (ShadertoyHost.clearBufferPass(currentPassId)) {
                markDirty();
                syncFromHost();
            }
        });
        document.getElementById('shadertoyReset').addEventListener('click', function() {
            ShadertoyHost.reset();
            updateStatus(ShadertoyHost.getStatus());
        });
        pauseBtn.addEventListener('click', function() {
            ShadertoyHost.setPaused(!ShadertoyHost.isPaused());
            refreshPause();
        });
        exampleSelect.addEventListener('change', function() {
            ShadertoyHost.loadExample(exampleSelect.value);
            currentPassId = 'image';
            clearDirty();
            syncFromHost();
        });
        sourceEl.addEventListener('input', function() {
            if (!syncing) markDirty();
            clearTimeout(inputTimer);
            inputTimer = setTimeout(function() {
                ShadertoyHost.setPassSource(currentPassId, sourceEl.value);
            }, 120);
        });
        document.querySelectorAll('#shadertoyPassTabs button').forEach(function(button) {
            button.addEventListener('click', function() {
                flushSource();
                currentPassId = button.dataset.pass;
                syncFromHost();
            });
        });
        document.querySelectorAll('#shadertoyBufferToggles input').forEach(function(input) {
            input.addEventListener('change', function() {
                ShadertoyHost.setPassEnabled(input.dataset.buffer, input.checked);
                markDirty();
                ShadertoyHost.compile();
                syncFromHost();
            });
        });
        document.getElementById('shadertoyImport').addEventListener('click', function() {
            importInput.value = '';
            importInput.click();
        });
        importInput.addEventListener('change', function() {
            var file = importInput.files && importInput.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function() {
                ShadertoyHost.loadProject(String(reader.result || ''));
                currentPassId = 'image';
                markDirty();
                syncFromHost();
            };
            reader.onerror = function() {
                showError('Import failed: unable to read file.');
            };
            reader.readAsText(file);
        });
        document.getElementById('shadertoyExport').addEventListener('click', exportProject);
    }

    function lines(arr) {
        return arr.join('\n');
    }

    function quickValue(id, fallback) {
        var el = document.getElementById(id);
        return el && el.value ? el.value : fallback;
    }

    function setCreatorStatus(text, isError) {
        if (!creatorStatusEl) return;
        creatorStatusEl.textContent = text || '';
        creatorStatusEl.classList.toggle('error', !!isError);
    }

    function setBeginnerMode(enabled) {
        if (!panel || !beginnerModeInput) return;
        beginnerModeInput.checked = !!enabled;
        panel.classList.toggle('beginner-mode', !!enabled);
    }

    function paletteFunction(palette) {
        var variants = {
            neon: 'return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.00, 0.22, 0.58)));',
            aurora: 'return 0.45 + 0.55 * cos(6.28318 * (t + vec3(0.08, 0.34, 0.68))) * vec3(0.75, 1.0, 0.95);',
            sunset: 'return 0.52 + 0.48 * cos(6.28318 * (t + vec3(0.98, 0.16, 0.32))) * vec3(1.05, 0.82, 0.62);',
            ocean: 'return 0.42 + 0.58 * cos(6.28318 * (t + vec3(0.55, 0.72, 0.92))) * vec3(0.55, 0.86, 1.15);',
            matrix: 'return vec3(0.08, 0.45 + 0.55 * sin(6.28318 * t), 0.16 + 0.22 * cos(6.28318 * t));',
            candy: 'return 0.55 + 0.45 * cos(6.28318 * (t + vec3(0.86, 0.02, 0.26))) * vec3(1.0, 0.72, 1.05);'
        };
        return lines([
            'vec3 quickPalette(float t) {',
            '    ' + (variants[palette] || variants.neon),
            '}'
        ]);
    }

    function shaderPrelude(palette) {
        return lines([
            '#define PI 3.14159265359',
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
            'vec2 rot(vec2 p, float a) {',
            '    float c = cos(a);',
            '    float s = sin(a);',
            '    return mat2(c, -s, s, c) * p;',
            '}',
            paletteFunction(palette)
        ]);
    }

    function motionSpeed(motion) {
        if (motion === 'pulse') return '0.85';
        if (motion === 'orbit') return '0.72';
        if (motion === 'spin') return '1.15';
        if (motion === 'rush') return '1.45';
        return '0.55';
    }

    function detailLoop(detail, simpleCount, richCount, denseCount) {
        if (detail === 'dense') return denseCount;
        if (detail === 'rich') return richCount;
        return simpleCount;
    }

    function motionLines(motion) {
        if (motion === 'pulse') {
            return [
                '    p *= 0.86 + 0.16 * sin(t * 1.7);',
                '    p += 0.04 * vec2(sin(t), cos(t * 1.3));'
            ];
        }
        if (motion === 'orbit') {
            return [
                '    p += 0.18 * vec2(cos(t * 0.9), sin(t * 1.1));'
            ];
        }
        if (motion === 'spin') {
            return [
                '    p = rot(p, t * 0.42);'
            ];
        }
        if (motion === 'rush') {
            return [
                '    p *= 1.0 + 0.18 * sin(t * 0.8 + length(p) * 8.0);'
            ];
        }
        return [
            '    p += 0.12 * vec2(sin(t * 0.37), cos(t * 0.29));'
        ];
    }

    function singlePassSource(kind, motion, palette, detail) {
        var speed = motionSpeed(motion);
        var motionCode = motionLines(motion);
        var loop = detailLoop(detail, 3, 5, 7);
        var march = detailLoop(detail, 34, 48, 64);
        var segments = detail === 'dense' ? '10.0' : (detail === 'rich' ? '8.0' : '6.0');

        if (kind === 'rings') {
            return lines([shaderPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                '    float t = iTime * ' + speed + ';'
            ].concat(motionCode).concat([
                '    float r = length(p);',
                '    float a = atan(p.y, p.x);',
                '    float wave = sin(r * 34.0 - t * 5.0 + sin(a * 8.0 + t) * 1.3);',
                '    float ring = smoothstep(0.62, 1.0, wave);',
                '    float grid = smoothstep(0.96, 1.0, sin(a * ' + (Number(segments) * 2).toFixed(1) + ' + t));',
                '    float glow = 0.018 / max(abs(wave) + r * 0.08, 0.018);',
                '    vec3 color = quickPalette(r * 0.55 - t * 0.08 + ring * 0.16);',
                '    color *= 0.18 + ring * 0.9 + grid * 0.25;',
                '    color += glow * quickPalette(a / PI + t * 0.05);',
                '    color *= smoothstep(1.35, 0.08, r);',
                '    fragColor = vec4(pow(color, vec3(0.88)), 1.0);',
                '}'
            ]));
        }

        if (kind === 'tunnel') {
            return lines([shaderPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                '    float t = iTime * ' + speed + ';'
            ].concat(motionCode).concat([
                '    float r = max(length(p), 0.025);',
                '    float a = atan(p.y, p.x);',
                '    vec2 tuv = vec2(0.38 / r + t * 0.42, a / (2.0 * PI));',
                '    float ribs = sin(tuv.x * 10.0 + sin(tuv.y * ' + segments + ' * PI + t) * 1.2);',
                '    float sparks = smoothstep(0.90, 1.0, noise21(vec2(tuv.x * 2.0, tuv.y * 32.0)));',
                '    vec3 color = quickPalette(tuv.x * 0.08 + ribs * 0.08);',
                '    color *= 0.26 + 0.74 * smoothstep(-0.25, 1.0, ribs);',
                '    color += sparks * quickPalette(tuv.y + t * 0.1) * 0.8;',
                '    color *= smoothstep(1.4, 0.12, r);',
                '    fragColor = vec4(pow(color, vec3(0.82)), 1.0);',
                '}'
            ]));
        }

        if (kind === 'kaleidoscope') {
            return lines([shaderPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                '    float t = iTime * ' + speed + ';'
            ].concat(motionCode).concat([
                '    float r = length(p);',
                '    float a = atan(p.y, p.x) + t * 0.22;',
                '    float seg = 2.0 * PI / ' + segments + ';',
                '    a = abs(mod(a + seg * 0.5, seg) - seg * 0.5);',
                '    p = vec2(cos(a), sin(a)) * r;',
                '    float field = 0.0;',
                '    for (int i = 0; i < ' + loop + '; i++) {',
                '        p = abs(p) / max(dot(p, p), 0.18) - 0.72;',
                '        p = rot(p, 0.18 + t * 0.025);',
                '        field += exp(-abs(length(p) - 0.55) * 3.0);',
                '    }',
                '    field /= ' + loop + '.0;',
                '    vec3 color = quickPalette(field * 0.5 + r * 0.25 - t * 0.04) * field;',
                '    fragColor = vec4(pow(color, vec3(0.86)), 1.0);',
                '}'
            ]));
        }

        if (kind === 'raymarch_orb') {
            return lines([shaderPrelude(palette),
                'float scene(vec3 p, float t) {',
                '    p.xy = rot(p.xy, t * 0.35);',
                '    p.yz = rot(p.yz, t * 0.22);',
                '    float orb = length(p) - 0.68;',
                '    float ripple = sin(p.x * 7.0 + t) * sin(p.y * 6.0 - t * 1.2) * sin(p.z * 5.0 + t * 0.7);',
                '    return orb + ripple * 0.055;',
                '}',
                'vec3 normalAt(vec3 p, float t) {',
                '    vec2 e = vec2(0.002, 0.0);',
                '    return normalize(vec3(scene(p + e.xyy, t) - scene(p - e.xyy, t), scene(p + e.yxy, t) - scene(p - e.yxy, t), scene(p + e.yyx, t) - scene(p - e.yyx, t)));',
                '}',
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                '    float t = iTime * ' + speed + ';',
                '    vec3 ro = vec3(0.0, 0.0, 2.65);',
                '    ro.xz = rot(ro.xz, sin(t * 0.35) * 0.28);',
                '    vec3 rd = normalize(vec3(uv, -1.65));',
                '    float dist = 0.0;',
                '    float glow = 0.0;',
                '    for (int i = 0; i < ' + march + '; i++) {',
                '        vec3 pos = ro + rd * dist;',
                '        float d = scene(pos, t);',
                '        glow += 0.018 / (0.035 + abs(d));',
                '        if (abs(d) < 0.002 || dist > 5.0) break;',
                '        dist += d * 0.72;',
                '    }',
                '    vec3 color = vec3(0.0);',
                '    if (dist < 5.0) {',
                '        vec3 pos = ro + rd * dist;',
                '        vec3 n = normalAt(pos, t);',
                '        float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);',
                '        float light = max(dot(n, normalize(vec3(0.4, 0.7, 0.6))), 0.0);',
                '        color = quickPalette(length(pos) + t * 0.08) * (0.22 + light * 0.95) + fres * quickPalette(t * 0.12 + 0.4);',
                '    }',
                '    color += glow * 0.045 * quickPalette(t * 0.05);',
                '    fragColor = vec4(pow(color, vec3(0.9)), 1.0);',
                '}'
            ]);
        }

        return lines([shaderPrelude(palette),
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
            '    float t = iTime * ' + speed + ';'
        ].concat(motionCode).concat([
            '    float field = 0.0;',
            '    vec2 q = p;',
            '    for (int i = 0; i < ' + loop + '; i++) {',
            '        float fi = float(i);',
            '        q = rot(q, 0.45 + fi * 0.18 + sin(t * 0.2) * 0.05);',
            '        field += sin(q.x * (2.0 + fi * 0.7) + t * (0.8 + fi * 0.11));',
            '        field += cos(q.y * (2.4 + fi * 0.5) - t * (0.7 + fi * 0.09));',
            '        q += 0.18 * vec2(sin(q.y * 1.7 + t), cos(q.x * 1.5 - t));',
            '    }',
            '    field /= ' + (loop * 2) + '.0;',
            '    float vignette = smoothstep(1.45, 0.1, length(p));',
            '    vec3 color = quickPalette(field * 0.32 + uv.x * 0.18 + t * 0.04);',
            '    color *= 0.62 + 0.38 * sin(field * PI + t);',
            '    color += 0.10 * noise21(uv * 220.0 + t);',
            '    fragColor = vec4(pow(color * vignette, vec3(0.88)), 1.0);',
            '}'
        ]));
    }

    function feedbackProject(kind, motion, palette, detail) {
        var project = ShadertoyPassGraph.makeDefaultProject(lines([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec3 color = texture(iChannel0, fragCoord / iResolution.xy).rgb;',
            '    fragColor = vec4(pow(color, vec3(0.84)), 1.0);',
            '}'
        ]));
        var points = detailLoop(detail, 4, 7, 10);
        var speed = motionSpeed(motion);
        var buffer = lines([shaderPrelude(palette),
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    vec2 p = uv - 0.5;',
            '    float t = iTime * ' + speed + ';',
            '    float a = atan(p.y, p.x) + sin(length(p) * 10.0 - t) * 0.55;',
            '    vec2 flow = vec2(cos(a), sin(a)) * (0.0015 + 0.004 * length(p));',
            '    vec3 prev = texture(iChannel0, uv - flow).rgb * 0.962;',
            '    vec3 color = prev;',
            '    for (int i = 0; i < ' + points + '; i++) {',
            '        float fi = float(i);',
            '        vec2 seed = vec2(hash21(vec2(fi, 2.0)), hash21(vec2(fi, 7.0)));',
            '        vec2 pos = 0.5 + 0.34 * vec2(cos(t * (0.55 + seed.x) + fi), sin(t * (0.65 + seed.y) + fi * 2.1));',
            '        float dotGlow = smoothstep(0.045, 0.0, length(uv - pos));',
            '        color = max(color, quickPalette(fi * 0.12 + t * 0.06) * dotGlow);',
            '    }'
        ]);

        if (kind === 'mouse_paint') {
            buffer = lines([shaderPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    vec2 p = uv - 0.5;',
                '    float t = iTime * ' + speed + ';',
                '    float angle = atan(p.y, p.x) + 0.25 * sin(t + length(p) * 9.0);',
                '    vec2 flow = vec2(cos(angle), sin(angle)) * 0.0025;',
                '    vec3 color = texture(iChannel0, uv - flow).rgb * 0.972;',
                '    vec2 m = iMouse.z > 0.0 ? iMouse.xy / iResolution.xy : 0.5 + 0.28 * vec2(cos(t), sin(t * 1.17));',
                '    float brush = smoothstep(0.075, 0.0, length(uv - m));',
                '    float halo = 0.012 / max(length(uv - m), 0.012);',
                '    color = max(color, quickPalette(t * 0.07 + length(uv - m)) * brush);',
                '    color += quickPalette(t * 0.05 + 0.35) * halo * 0.08;'
            ]);
        }

        buffer += lines([
            '    color += quickPalette(length(p) - t * 0.05) * noise21(uv * 90.0 + t) * 0.015;',
            '    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
            '}'
        ]);

        project.name = kind === 'mouse_paint' ? 'Quick Create - Mouse Paint' : 'Quick Create - Feedback Trails';
        project.description = kind === 'mouse_paint' ? 'Generated feedback brush. Drag on the canvas to paint trails.' : 'Generated Buffer A self-feedback trail system.';
        passById(project, 'bufferA').enabled = true;
        passById(project, 'bufferA').source = buffer;
        passById(project, 'bufferA').channels[0] = { slot: 0, kind: 'self', sourceId: 'bufferA', sampler: { filter: 'linear', wrap: 'clamp' } };
        passById(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA', sampler: { filter: 'linear', wrap: 'clamp' } };
        return project;
    }

    function audioPrelude(palette) {
        return lines([
            shaderPrelude(palette),
            'float audioWave(float x) {',
            '    return texture(iChannel0, vec2(fract(x), 0.25)).r;',
            '}',
            'float audioFft(float x) {',
            '    return texture(iChannel0, vec2(clamp(x, 0.0, 1.0), 0.75)).r;',
            '}',
            'float audioLevel() {',
            '    float sum = 0.0;',
            '    for (int i = 0; i < 8; i++) {',
            '        sum += audioFft((float(i) + 0.5) / 8.0);',
            '    }',
            '    return sum / 8.0;',
            '}'
        ]);
    }

    function audioQuickLabel(kind) {
        var labels = {
            audio_feedback_trails: 'Audio Feedback Trails',
            audio_fluid_ink: 'Audio Fluid Ink',
            audio_particles: 'Audio Particles',
            audio_raymarch_tunnel: 'Audio Raymarch Tunnel',
            audio_spectrum_field: 'Audio Spectrum Field',
            audio_beat_strobe: 'Audio Beat Strobe',
            audio_slitscan: 'Audio Slitscan'
        };
        return labels[kind] || 'Audio Reactive';
    }

    function audioProject(motion, palette, detail) {
        var speed = motionSpeed(motion);
        var bars = detailLoop(detail, 24, 38, 54);
        var project = ShadertoyPassGraph.makeDefaultProject(lines([shaderPrelude(palette),
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    float t = iTime * ' + speed + ';',
            '    float bar = floor(uv.x * ' + bars + '.0) / ' + bars + '.0;',
            '    float spectrum = texture(iChannel0, vec2(bar, 0.75)).r;',
            '    float wave = texture(iChannel0, vec2(uv.x, 0.25)).r;',
            '    float level = max(spectrum, abs(wave - 0.5) * 1.35);',
            '    float shape = 1.0 - smoothstep(level, level + 0.04, abs(uv.y - 0.5) * 1.6);',
            '    float glow = 0.010 / max(abs(abs(uv.y - 0.5) - level * 0.62), 0.010);',
            '    vec3 color = quickPalette(bar + t * 0.05 + level * 0.35) * (shape + glow * 0.045);',
            '    color += quickPalette(t * 0.09 + uv.y) * pow(level, 2.0) * 0.55;',
            '    fragColor = vec4(pow(color, vec3(0.86)), 1.0);',
            '}'
        ]));
        project.name = 'Quick Create - Audio Pulse';
        project.description = 'Generated audio-reactive bars using iChannel0 analyser texture.';
        passById(project, 'image').channels[0] = { slot: 0, kind: 'audio', sampler: { filter: 'linear', wrap: 'clamp' } };
        return project;
    }

    function audioFeedbackProject(kind, motion, palette, detail) {
        var speed = motionSpeed(motion);
        var label = audioQuickLabel(kind);
        var project = ShadertoyPassGraph.makeDefaultProject(lines([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec3 color = texture(iChannel0, fragCoord / iResolution.xy).rgb;',
            '    fragColor = vec4(pow(color, vec3(0.86)), 1.0);',
            '}'
        ]));
        var buffer = '';

        if (kind === 'audio_fluid_ink') {
            var bands = detailLoop(detail, 5, 7, 9);
            buffer = lines([audioPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    vec2 p = uv - 0.5;',
                '    float t = iTime * ' + speed + ';',
                '    float bass = audioFft(0.05);',
                '    float mid = audioFft(0.32);',
                '    float wave = audioWave(uv.x + t * 0.035);',
                '    vec2 curl = vec2(noise21(p * 2.8 + vec2(t, -t)), noise21(p * 2.8 + vec2(-t * 0.7, t * 0.9))) - 0.5;',
                '    vec2 radial = normalize(p + vec2(0.0001)) * (wave - 0.5) * 0.004;',
                '    vec3 prev = texture(iChannel1, uv - curl * (0.006 + bass * 0.018) - radial).rgb * (0.948 + mid * 0.035);',
                '    float ink = 0.0;',
                '    for (int i = 0; i < ' + bands + '; i++) {',
                '        float fi = float(i);',
                '        float band = (fi + 0.5) / ' + bands + '.0;',
                '        float amp = audioFft(band);',
                '        float curve = 0.5 + 0.24 * sin(uv.x * (4.0 + fi) + t * (1.1 + band) + fi);',
                '        ink += (1.0 - smoothstep(0.0, 0.075 + amp * 0.05, abs(uv.y - curve))) * amp;',
                '    }',
                '    ink /= ' + bands + '.0;',
                '    float wash = 0.10 + 0.10 * sin(t * 1.4 + noise21(uv * 4.0 + t) * 6.28318);',
                '    vec3 color = prev + quickPalette(length(p) * 0.45 + bass * 0.4 + t * 0.04) * wash * (0.10 + bass * 0.20);',
                '    color += quickPalette(ink + bass * 0.4 + t * 0.04) * ink * (0.85 + bass);',
                '    color += quickPalette(wave + t * 0.03) * pow(max(wave - 0.48, 0.0), 2.0) * 0.34;',
                '    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
                '}'
            ]);
        } else if (kind === 'audio_slitscan') {
            buffer = lines([audioPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    float t = iTime * ' + speed + ';',
                '    float bass = audioFft(0.06);',
                '    float mid = audioFft(0.35);',
                '    float band = audioFft(uv.y);',
                '    float wave = audioWave(uv.y + t * 0.05);',
                '    float shift = 0.0035 + bass * 0.013 + band * 0.006;',
                '    vec3 scan = texture(iChannel1, vec2(fract(uv.x - shift), uv.y)).rgb * (0.956 + mid * 0.028);',
                '    float strip = 1.0 - smoothstep(0.0, 0.09, uv.x);',
                '    float trace = 1.0 - smoothstep(0.0, 0.04, abs(uv.y - wave));',
                '    vec3 injected = quickPalette(uv.y * 0.7 + t * 0.04 + band * 0.25) * (0.20 + band * 1.25);',
                '    injected += quickPalette(wave + t * 0.08) * trace * (0.28 + bass);',
                '    vec3 color = mix(scan, injected, strip);',
                '    color += quickPalette(t * 0.03 + uv.x) * band * 0.035;',
                '    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
                '}'
            ]);
        } else {
            var emitters = detailLoop(detail, 4, 7, 10);
            buffer = lines([audioPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    vec2 p = uv - 0.5;',
                '    vec2 aspect = vec2(iResolution.x / iResolution.y, 1.0);',
                '    float t = iTime * ' + speed + ';',
                '    float bass = audioFft(0.05);',
                '    float mid = audioFft(0.28);',
                '    float wave = audioWave(uv.x + t * 0.025);',
                '    float a = atan(p.y, p.x) + sin(length(p) * 10.0 - t * (1.2 + bass)) * (0.35 + bass * 0.6);',
                '    vec2 flow = vec2(cos(a), sin(a)) * (0.0015 + 0.0055 * length(p) + bass * 0.003);',
                '    vec3 prev = texture(iChannel1, uv - flow).rgb * (0.93 + 0.045 * mid);',
                '    vec3 color = prev;',
                '    for (int i = 0; i < ' + emitters + '; i++) {',
                '        float fi = float(i);',
                '        float band = (fi + 0.5) / ' + emitters + '.0;',
                '        float amp = audioFft(band);',
                '        vec2 seed = vec2(hash21(vec2(fi, 2.0)), hash21(vec2(fi, 7.0)));',
                '        vec2 pos = 0.5 + 0.34 * vec2(cos(t * (0.45 + seed.x + amp * 0.6) + fi), sin(t * (0.52 + seed.y) + fi * 2.1));',
                '        pos += (audioWave(band + t * 0.04) - 0.5) * vec2(0.12, -0.08);',
                '        float d = length((uv - pos) * aspect);',
                '        float glow = exp(-d * (30.0 - amp * 10.0));',
                '        color = max(color, quickPalette(band + t * 0.05 + amp * 0.2) * glow * (0.28 + amp * 1.2));',
                '    }',
                '    color += quickPalette(wave + t * 0.04) * smoothstep(0.57, 0.9, wave + bass * 0.3) * 0.18;',
                '    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
                '}'
            ]);
        }

        project.name = 'Quick Create - ' + label;
        project.description = 'Generated audio-reactive Buffer A feedback family. Buffer A reads audio on iChannel0 and previous frame state on iChannel1.';
        passById(project, 'bufferA').enabled = true;
        passById(project, 'bufferA').source = buffer;
        passById(project, 'bufferA').channels[0] = { slot: 0, kind: 'audio', sampler: { filter: 'linear', wrap: 'clamp' } };
        passById(project, 'bufferA').channels[1] = { slot: 1, kind: 'self', sourceId: 'bufferA', sampler: { filter: 'linear', wrap: 'clamp' } };
        passById(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA', sampler: { filter: 'linear', wrap: 'clamp' } };
        return project;
    }

    function audioSingleProject(kind, motion, palette, detail) {
        var speed = motionSpeed(motion);
        var label = audioQuickLabel(kind);
        var source = '';

        if (kind === 'audio_particles') {
            var particles = detailLoop(detail, 18, 30, 42);
            source = lines([audioPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                '    vec2 aspect = vec2(iResolution.x / iResolution.y, 1.0);',
                '    float t = iTime * ' + speed + ';',
                '    float bass = audioFft(0.05);',
                '    float level = audioLevel();',
                '    vec3 color = quickPalette(length(p) * 0.2 + t * 0.03) * 0.03;',
                '    for (int i = 0; i < ' + particles + '; i++) {',
                '        float fi = float(i);',
                '        float band = (fi + 0.5) / ' + particles + '.0;',
                '        float amp = audioFft(band);',
                '        vec2 seed = vec2(hash21(vec2(fi, 11.0)), hash21(vec2(fi, 19.0)));',
                '        float orbit = t * (0.22 + seed.x * 0.5 + amp * 0.42) + fi * 2.399;',
                '        vec2 pos = 0.5 + (0.18 + 0.32 * seed.y + amp * 0.12) * vec2(cos(orbit), sin(orbit * (0.78 + seed.x)));',
                '        pos += (audioWave(band + t * 0.03) - 0.5) * vec2(0.16, -0.10);',
                '        float d = length((uv - pos) * aspect);',
                '        float size = 0.018 + amp * 0.048 + bass * 0.014;',
                '        float glow = exp(-(d * d) / max(size * size, 0.0002));',
                '        color += quickPalette(band + amp * 0.28 + t * 0.045) * glow * (0.16 + amp * 0.85 + level * 0.24);',
                '    }',
                '    color *= 1.0 - smoothstep(0.05, 1.4, length(p));',
                '    fragColor = vec4(clamp(pow(color, vec3(0.82)), 0.0, 1.0), 1.0);',
                '}'
            ]);
        } else if (kind === 'audio_raymarch_tunnel') {
            var steps = detailLoop(detail, 34, 46, 58);
            source = lines([audioPrelude(palette),
                'float audioTunnelMap(vec3 p, float t, float bass) {',
                '    p.xy = rot(p.xy, p.z * 0.18 + t * 0.33);',
                '    float a = atan(p.y, p.x);',
                '    float radius = 0.58 + 0.12 * sin(p.z * 1.7 + t * 1.4) + bass * 0.18;',
                '    float ribs = sin(a * 8.0 + p.z * 2.2 + t * 3.0) * 0.024;',
                '    return abs(length(p.xy) - radius) - 0.044 + ribs;',
                '}',
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                '    float t = iTime * ' + speed + ';',
                '    float bass = audioFft(0.05);',
                '    float mid = audioFft(0.34);',
                '    float high = audioFft(0.78);',
                '    vec3 ro = vec3(0.0, 0.0, t * 1.55);',
                '    ro.xy += 0.14 * vec2(sin(t * 0.7), cos(t * 0.53)) * (0.4 + bass);',
                '    vec3 rd = normalize(vec3(uv, 1.35));',
                '    float dist = 0.08;',
                '    float glow = 0.0;',
                '    float hit = 0.0;',
                '    vec3 pos = ro;',
                '    for (int i = 0; i < ' + steps + '; i++) {',
                '        pos = ro + rd * dist;',
                '        float d = audioTunnelMap(pos, t, bass);',
                '        glow += 0.012 / (0.024 + abs(d)) * (0.35 + mid);',
                '        if (abs(d) < 0.004) { hit = 1.0; break; }',
                '        dist += clamp(d * 0.62, 0.018, 0.22);',
                '        if (dist > 8.0) break;',
                '    }',
                '    float stripe = 0.5 + 0.5 * sin(pos.z * 3.0 + atan(pos.y, pos.x) * 10.0 + t * 2.0);',
                '    vec3 color = quickPalette(pos.z * 0.045 + t * 0.04 + high * 0.35);',
                '    color *= glow * 0.05 + hit * (0.35 + stripe * 0.45 + bass * 0.55);',
                '    color += quickPalette(t * 0.08 + length(uv)) * high * 0.12;',
                '    fragColor = vec4(clamp(pow(color, vec3(0.86)), 0.0, 1.0), 1.0);',
                '}'
            ]);
        } else if (kind === 'audio_spectrum_field') {
            var bands = detailLoop(detail, 12, 18, 28);
            source = lines([audioPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                '    float t = iTime * ' + speed + ';',
                '    float level = audioLevel();',
                '    vec3 color = quickPalette(uv.x * 0.25 + t * 0.03) * 0.045;',
                '    float field = 0.0;',
                '    for (int i = 0; i < ' + bands + '; i++) {',
                '        float fi = float(i);',
                '        float band = (fi + 0.5) / ' + bands + '.0;',
                '        float amp = audioFft(band);',
                '        float y = 0.12 + 0.76 * band + 0.055 * sin(t * (0.7 + band) + fi);',
                '        float ridge = 1.0 - smoothstep(0.0, 0.055 + amp * 0.08, abs(uv.y - y - (audioWave(band + t * 0.04) - 0.5) * 0.10));',
                '        float lattice = 0.5 + 0.5 * sin((p.x + band) * (7.0 + amp * 18.0) + t * (1.0 + band));',
                '        field += ridge * (0.2 + amp);',
                '        color += quickPalette(band + amp * 0.25 + t * 0.05) * ridge * (0.28 + amp * 1.1) * (0.55 + lattice * 0.45);',
                '    }',
                '    color += quickPalette(field * 0.18 + t * 0.04) * field * 0.10;',
                '    color *= (1.0 - smoothstep(0.05, 1.45, length(p))) * (0.75 + level * 0.65);',
                '    fragColor = vec4(clamp(pow(color, vec3(0.88)), 0.0, 1.0), 1.0);',
                '}'
            ]);
        } else {
            source = lines([audioPrelude(palette),
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    vec2 uv = fragCoord / iResolution.xy;',
                '    vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
                '    float t = iTime * ' + speed + ';',
                '    float bass = audioFft(0.06);',
                '    float mid = audioFft(0.32);',
                '    float high = audioFft(0.75);',
                '    float level = audioLevel();',
                '    float wave = audioWave(fract(uv.x + t * 0.04));',
                '    float beat = smoothstep(0.56, 1.0, bass + level * 0.48 + 0.14 * sin(t * 4.0));',
                '    float flash = step(0.62, fract(t * (2.3 + bass * 2.0))) * beat;',
                '    float r = length(p);',
                '    float ringBand = abs(fract(r * (5.0 + bass * 7.0) - t * (0.65 + mid)) - 0.5);',
                '    float rings = 1.0 - smoothstep(0.42, 0.465, ringBand);',
                '    float waveform = 1.0 - smoothstep(0.0, 0.035, abs(uv.y - wave));',
                '    vec3 color = quickPalette(r * 0.35 - t * 0.08 + bass * 0.2) * (rings * (0.22 + bass) + waveform * (0.18 + high));',
                '    color += quickPalette(t * 0.1 + uv.y + level) * flash * (0.45 + bass * 0.9);',
                '    color += quickPalette(uv.x + t * 0.05) * high * pow(1.0 - smoothstep(0.0, 1.2, r), 2.0) * 0.18;',
                '    fragColor = vec4(clamp(pow(color, vec3(0.84)), 0.0, 1.0), 1.0);',
                '}'
            ]);
        }

        var project = ShadertoyPassGraph.makeDefaultProject(source);
        project.name = 'Quick Create - ' + label;
        project.description = 'Generated single-pass audio-reactive family using iChannel0 analyser waveform and FFT rows.';
        passById(project, 'image').channels[0] = { slot: 0, kind: 'audio', sampler: { filter: 'linear', wrap: 'clamp' } };
        return project;
    }

    function textureProject(motion, palette, detail) {
        var speed = motionSpeed(motion);
        var loop = detailLoop(detail, 2, 4, 5);
        var project = ShadertoyPassGraph.makeDefaultProject(lines([shaderPrelude(palette),
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;',
            '    float t = iTime * ' + speed + ';',
            '    vec2 warp = uv;',
            '    for (int i = 0; i < ' + loop + '; i++) {',
            '        float fi = float(i);',
            '        warp += 0.035 * vec2(sin((warp.y + fi) * 8.0 + t), cos((warp.x - fi) * 7.0 - t));',
            '        warp = fract(warp * 1.08);',
            '    }',
            '    vec3 tex = texture(iChannel0, warp * 2.0).rgb;',
            '    float edge = smoothstep(0.72, 1.0, max(max(tex.r, tex.g), tex.b));',
            '    vec3 color = mix(quickPalette(tex.r + t * 0.04), tex * quickPalette(length(p) + t * 0.08), 0.55);',
            '    color += edge * 0.18;',
            '    color *= smoothstep(1.35, 0.05, length(p));',
            '    fragColor = vec4(pow(color, vec3(0.9)), 1.0);',
            '}'
        ]));
        project.name = 'Quick Create - Texture Warp';
        project.description = 'Generated shader that warps a procedural texture through iChannel0.';
        passById(project, 'image').channels[0] = { slot: 0, kind: 'procedural', sourceId: 'noise', sampler: { filter: 'linear', wrap: 'repeat' } };
        return project;
    }

    function passById(project, id) {
        var passes = project && project.passes || [];
        for (var i = 0; i < passes.length; i++) {
            if (passes[i].id === id) return passes[i];
        }
        return null;
    }

    function makeQuickProject(kind, motion, palette, detail) {
        if (kind === 'feedback_trails' || kind === 'mouse_paint') return feedbackProject(kind, motion, palette, detail);
        if (kind === 'audio_pulse') return audioProject(motion, palette, detail);
        if (kind === 'audio_feedback_trails' || kind === 'audio_fluid_ink' || kind === 'audio_slitscan') return audioFeedbackProject(kind, motion, palette, detail);
        if (kind === 'audio_particles' || kind === 'audio_raymarch_tunnel' || kind === 'audio_spectrum_field' || kind === 'audio_beat_strobe') return audioSingleProject(kind, motion, palette, detail);
        if (kind === 'texture_warp') return textureProject(motion, palette, detail);
        var source = singlePassSource(kind, motion, palette, detail);
        var project = ShadertoyPassGraph.makeDefaultProject(source);
        var labels = {
            plasma: 'Plasma Field',
            rings: 'Signal Rings',
            tunnel: 'Light Tunnel',
            kaleidoscope: 'Kaleidoscope',
            raymarch_orb: 'Raymarch Orb'
        };
        project.name = 'Quick Create - ' + (labels[kind] || 'Plasma Field');
        project.description = 'Generated ' + (labels[kind] || 'shader') + ' with ' + motion.replace('_', ' ') + ' motion, ' + palette + ' palette, and ' + detail + ' detail.';
        return project;
    }

    function generateQuickProject() {
        if (typeof ShadertoyHost === 'undefined' || typeof ShadertoyPassGraph === 'undefined') return;
        var kind = quickValue('shadertoyQuickKind', 'plasma');
        var motion = quickValue('shadertoyQuickMotion', 'drift');
        var palette = quickValue('shadertoyQuickPalette', 'neon');
        var detail = quickValue('shadertoyQuickDetail', 'simple');
        var project = makeQuickProject(kind, motion, palette, detail);
        ShadertoyHost.setProject(project);
        currentPassId = 'image';
        ShadertoyHost.setPaused(false);
        var result = ShadertoyHost.compile();
        markDirty();
        syncFromHost();
        updateStatus(result);
        if (result && result.success) {
            setCreatorStatus('Generated "' + project.name.replace(/^Quick Create - /, '') + '". Edit the Image or Buffer tabs, then copy for Shadertoy.');
        } else {
            setCreatorStatus('Generated code needs review before it can run.', true);
        }
    }

    function randomizeQuickIdea() {
        var ids = ['shadertoyQuickKind', 'shadertoyQuickMotion', 'shadertoyQuickPalette', 'shadertoyQuickDetail'];
        ids.forEach(function(id) {
            var select = document.getElementById(id);
            if (!select || !select.options.length) return;
            select.selectedIndex = Math.floor(Math.random() * select.options.length);
        });
        generateQuickProject();
    }

    function passLabel(id) {
        var labels = {
            common: 'Common',
            image: 'Image',
            bufferA: 'Buffer A',
            bufferB: 'Buffer B',
            bufferC: 'Buffer C',
            bufferD: 'Buffer D'
        };
        return labels[id] || id;
    }

    function channelNote(pass, channel) {
        var label = passLabel(pass.id) + ' iChannel' + channel.slot + ': ' + (channel.kind || 'none');
        if (channel.sourceId) label += ' ' + channel.sourceId;
        if (channel.url) label += ' ' + channel.url;
        if (channel.kind === 'procedural') label += ' (Psychedelia procedural; replace with a Shadertoy texture if posting on shadertoy.com)';
        if (channel.kind === 'audio') label += ' (Shadertoy sound input channel)';
        if (channel.kind === 'self') label += ' (same buffer previous frame)';
        return label;
    }

    function buildShadertoyBundle(project) {
        project = project || (ShadertoyHost.getProject && ShadertoyHost.getProject());
        if (!project) return '';
        var out = [
            '// Psychedelia Shadertoy export',
            '// Paste each section into the matching Shadertoy tab.',
            '// Generated: ' + new Date().toISOString(),
            '// Name: ' + (project.name || 'Untitled Shadertoy')
        ];
        if (project.description) out.push('// Description: ' + project.description.replace(/\r?\n/g, ' '));
        out.push('// Posting still happens manually on shadertoy.com.');
        out.push('');

        if (project.common && project.common.source && project.common.source.trim()) {
            out.push('=== Common ===');
            out.push(project.common.source.trim());
            out.push('');
        }

        var passIds = ['bufferA', 'bufferB', 'bufferC', 'bufferD', 'image'];
        var notes = [];
        for (var i = 0; i < passIds.length; i++) {
            var pass = passById(project, passIds[i]);
            if (!pass) continue;
            var hasSource = !!(pass.source && pass.source.trim());
            var hasChannels = (pass.channels || []).some(function(channel) { return channel && channel.kind && channel.kind !== 'none'; });
            if (pass.id !== 'image' && !pass.enabled && !hasSource && !hasChannels) continue;
            out.push('=== ' + passLabel(pass.id) + ' ===');
            out.push(hasSource ? pass.source.trim() : '// Empty pass');
            out.push('');
            (pass.channels || []).forEach(function(channel) {
                if (channel && channel.kind && channel.kind !== 'none') notes.push(channelNote(pass, channel));
            });
        }

        if (notes.length) {
            out.push('=== Channel Notes ===');
            notes.forEach(function(note) { out.push('// ' + note); });
            out.push('');
        }

        return out.join('\n');
    }

    function copyForShadertoy() {
        flushSource();
        var bundle = buildShadertoyBundle();
        if (quickExportEl) {
            quickExportEl.value = bundle;
            quickExportEl.classList.remove('hidden');
            quickExportEl.focus();
            quickExportEl.select();
        }
        function copied() {
            setCreatorStatus('Copied Shadertoy-ready sections. Paste each section into the matching Shadertoy tab.');
        }
        function fallback() {
            if (quickExportEl) quickExportEl.select();
            setCreatorStatus('Copy text is selected below. Paste each section into the matching Shadertoy tab.');
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(bundle).then(copied).catch(fallback);
        } else {
            fallback();
        }
    }

    function flushSource() {
        clearTimeout(inputTimer);
        ShadertoyHost.setPassSource(currentPassId, sourceEl.value);
    }

    function runCompile(shouldRun, scope) {
        flushSource();
        var result = scope === 'pass' ? ShadertoyHost.compilePass(currentPassId) : ShadertoyHost.compile();
        if (shouldRun && result.success) ShadertoyHost.setPaused(false);
        refreshPause();
        updateStatus(result);
    }

    function markDirty() {
        dirty = true;
        refreshDirty();
    }

    function clearDirty() {
        dirty = false;
        refreshDirty();
    }

    function refreshDirty() {
        if (!dirtyEl) return;
        dirtyEl.textContent = dirty ? 'Modified' : 'Saved';
        dirtyEl.classList.toggle('dirty', dirty);
    }

    function refreshLibrary(selectedId) {
        if (!librarySelect || !ShadertoyHost.listLibrary) return;
        var current = selectedId || (ShadertoyHost.getProject && ShadertoyHost.getProject().id);
        var items = ShadertoyHost.listLibrary();
        librarySelect.innerHTML = '';
        var empty = document.createElement('option');
        empty.value = '';
        empty.textContent = items.length ? 'Select saved project' : 'No saved projects';
        librarySelect.appendChild(empty);
        items.forEach(function(item) {
            var opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.name;
            librarySelect.appendChild(opt);
        });
        if (current) librarySelect.value = current;
    }

    function saveLibraryProject() {
        flushSource();
        ShadertoyHost.setMetadata({
            name: nameEl.value,
            description: descriptionEl.value
        });
        var item = ShadertoyHost.saveToLibrary();
        clearDirty();
        refreshLibrary(item.id);
    }

    function loadLibraryProject() {
        if (!librarySelect.value) return;
        if (ShadertoyHost.loadFromLibrary(librarySelect.value)) {
            currentPassId = 'image';
            clearDirty();
            syncFromHost();
        }
    }

    function deleteLibraryProject() {
        if (!librarySelect.value) return;
        ShadertoyHost.deleteFromLibrary(librarySelect.value);
        refreshLibrary();
    }

    function setApiStatus(text, isError) {
        if (!apiStatusEl) return;
        apiStatusEl.textContent = text || '';
        apiStatusEl.classList.toggle('error', !!isError);
    }

    function importApiShader() {
        var shaderId = apiShaderIdEl.value.trim();
        setApiStatus('Importing...');
        ShadertoyHost.importFromApi(shaderId).then(function(result) {
            if (!result.success) {
                setApiStatus(result.error || 'Import failed.', true);
                return;
            }
            currentPassId = 'image';
            clearDirty();
            syncFromHost();
            setApiStatus(result.cached ? 'Loaded cached import' : 'Imported from Shadertoy API');
            updateDiagnostics();
        }).catch(function(err) {
            setApiStatus(err.message || String(err), true);
        });
    }

    function applyPaste() {
        var text = pasteText.value || '';
        if (!text.trim()) return;
        var mode = pasteMode.value || 'auto';
        var parsed = null;
        try { parsed = JSON.parse(text); } catch (err) { parsed = null; }

        if (mode === 'project' && !parsed) {
            showError('Paste failed: project mode expects valid JSON.');
            return;
        }
        if (mode === 'project' && !(parsed.passes || parsed.renderpass || parsed.image || parsed.source)) {
            showError('Paste failed: JSON does not look like a Shadertoy project.');
            return;
        }

        if (mode === 'project' || (mode === 'auto' && parsed && (parsed.passes || parsed.renderpass || parsed.image || parsed.source))) {
            ShadertoyHost.loadProject(text);
            currentPassId = 'image';
            markDirty();
            syncFromHost();
            return;
        }

        if (mode === 'image') {
            ShadertoyHost.loadProject(text);
            currentPassId = 'image';
            markDirty();
            syncFromHost();
            return;
        }

        sourceEl.value = text;
        ShadertoyHost.setPassSource(currentPassId, text);
        markDirty();
        updateStatus(ShadertoyHost.compilePass(currentPassId));
        syncFromHost();
    }

    function formatCurrentSource() {
        var formatted = sourceEl.value
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map(function(line) { return line.replace(/[ \t]+$/g, ''); })
            .join('\n')
            .replace(/\n{4,}/g, '\n\n\n')
            .trim();
        if (formatted) formatted += '\n';
        sourceEl.value = formatted;
        ShadertoyHost.setPassSource(currentPassId, formatted);
        markDirty();
    }

    function exportProject() {
        var project = ShadertoyHost.serialize();
        var blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (project.name || 'shadertoy-project').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 0);
    }

    function show() {
        init();
        panel.classList.remove('hidden');
        syncFromHost();
    }

    function hide() {
        if (panel) panel.classList.add('hidden');
    }

    function syncFromHost() {
        init();
        if (!sourceEl || typeof ShadertoyHost === 'undefined') return;
        clearTimeout(inputTimer);
        syncing = true;
        var project = ShadertoyHost.getProject ? ShadertoyHost.getProject() : { name: '', description: '' };
        if (nameEl) nameEl.value = project.name || '';
        if (descriptionEl) descriptionEl.value = project.description || '';
        if (apiKeyEl && ShadertoyHost.getApiKey) apiKeyEl.value = ShadertoyHost.getApiKey();
        if (formatSelect && project.settings) formatSelect.value = project.settings.renderTargetFormat || 'rgba8';
        if (safeModeInput && ShadertoyHost.getSafeMode) safeModeInput.checked = ShadertoyHost.getSafeMode();
        sourceEl.value = ShadertoyHost.getPassSource ? ShadertoyHost.getPassSource(currentPassId) : ShadertoyHost.getSource();
        syncing = false;
        refreshPassControls();
        refreshChannels();
        refreshLibrary(project.id);
        updateStatus(ShadertoyHost.getStatus());
        refreshPause();
        refreshDirty();
        updateDiagnostics();
    }

    function refreshPassControls() {
        var label = document.getElementById('shadertoySourceLabel');
        var names = {
            common: 'Common',
            image: 'Image Pass',
            bufferA: 'Buffer A',
            bufferB: 'Buffer B',
            bufferC: 'Buffer C',
            bufferD: 'Buffer D'
        };
        if (label) label.textContent = names[currentPassId] || currentPassId;
        document.querySelectorAll('#shadertoyPassTabs button').forEach(function(button) {
            button.classList.toggle('active', button.dataset.pass === currentPassId);
        });
        if (!ShadertoyHost.getProject) return;
        var project = ShadertoyHost.getProject();
        document.querySelectorAll('#shadertoyBufferToggles input').forEach(function(input) {
            var match = (project.passes || []).filter(function(pass) { return pass.id === input.dataset.buffer; })[0];
            input.checked = !!(match && match.enabled);
        });
        refreshBufferTools();
    }

    function refreshBufferTools() {
        if (!bufferTools || !copyTarget) return;
        var isBuffer = /^buffer[A-D]$/.test(currentPassId);
        bufferTools.classList.toggle('hidden', !isBuffer);
        if (!isBuffer) return;
        var project = ShadertoyHost.getProject ? ShadertoyHost.getProject() : null;
        var pass = project && project.passes.filter(function(item) { return item.id === currentPassId; })[0];
        if (pass && scaleSelect) scaleSelect.value = String(pass.resolutionScale || 1);
        copyTarget.innerHTML = '';
        [
            ['bufferA', 'Copy to A'],
            ['bufferB', 'Copy to B'],
            ['bufferC', 'Copy to C'],
            ['bufferD', 'Copy to D']
        ].forEach(function(item) {
            if (item[0] === currentPassId) return;
            var opt = document.createElement('option');
            opt.value = item[0];
            opt.textContent = item[1];
            copyTarget.appendChild(opt);
        });
    }

    function updateDiagnostics() {
        if (!diagnosticsEl || !ShadertoyHost.getDiagnostics) return;
        var diagnostics = ShadertoyHost.getDiagnostics();
        var fmt = diagnostics.renderTargetFormat || {};
        var gpu = diagnostics.gpu || {};
        var parts = [
            'Format ' + (fmt.active || 'rgba8').toUpperCase(),
            'FPS ' + (diagnostics.fps || 0),
            diagnostics.renderer || 'renderer'
        ];
        if (gpu.maxTex) parts.push('MaxTex ' + gpu.maxTex);
        if (fmt.warning) parts.push(fmt.warning);
        if (diagnostics.safeMode) parts.push('Safe Mode');
        diagnosticsEl.textContent = parts.join(' | ');
        diagnosticsEl.classList.toggle('warning', !!fmt.warning);
    }

    function refreshChannels() {
        if (!channelContainer || !ShadertoyHost.getProject) return;
        if (currentPassId === 'common') {
            channelContainer.innerHTML = '';
            channelContainer.classList.add('hidden');
            return;
        }
        channelContainer.classList.remove('hidden');
        var project = ShadertoyHost.getProject();
        var pass = (project.passes || []).filter(function(p) { return p.id === currentPassId; })[0];
        if (!pass) return;
        channelContainer.innerHTML = '<div class="panel-title shadertoy-channel-title">Channels</div>';
        for (var i = 0; i < 4; i++) {
            channelContainer.appendChild(buildChannelRow(pass.channels[i] || { slot: i, kind: 'none' }, i));
        }
    }

    function buildChannelRow(channel, slot) {
        var row = document.createElement('div');
        row.className = 'shadertoy-channel-row';
        row.dataset.slot = slot;

        var head = document.createElement('div');
        head.className = 'shadertoy-channel-head';
        var label = document.createElement('span');
        label.textContent = 'iChannel' + slot;
        head.appendChild(label);

        var kind = document.createElement('select');
        ['none', 'buffer', 'self', 'procedural', 'image', 'keyboard', 'audio', 'video', 'webcam', 'microphone', 'unsupported'].forEach(function(name) {
            var opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            kind.appendChild(opt);
        });
        kind.value = channel.kind || 'none';
        kind.addEventListener('change', function() {
            var next = {
                slot: slot,
                kind: kind.value,
                sampler: cloneChannel(channel.sampler || {})
            };
            if (next.kind === 'buffer') next.sourceId = next.sourceId || 'bufferA';
            if (next.kind === 'procedural') next.sourceId = next.sourceId || 'checker';
            updateChannel(slot, next);
        });
        head.appendChild(kind);
        row.appendChild(head);

        var sourceWrap = document.createElement('div');
        sourceWrap.className = 'shadertoy-channel-source';
        buildSourceControl(sourceWrap, channel, slot);
        row.appendChild(sourceWrap);

        var sampler = document.createElement('div');
        sampler.className = 'shadertoy-sampler-row';
        buildSamplerControls(sampler, channel, slot);
        row.appendChild(sampler);

        var preview = document.createElement('div');
        preview.className = 'shadertoy-channel-preview';
        paintPreview(preview, channel);
        row.appendChild(preview);

        var status = document.createElement('div');
        status.className = 'shadertoy-channel-status';
        var statusInfo = typeof ShadertoyChannels !== 'undefined' ? ShadertoyChannels.getStatus(channel) : { state: 'none', message: '' };
        status.textContent = statusInfo.message || statusInfo.state || '';
        status.classList.toggle('error', statusInfo.state === 'error');
        row.appendChild(status);

        return row;
    }

    function paintPreview(preview, channel) {
        preview.textContent = '';
        preview.style.backgroundImage = '';
        if (channel.kind === 'image' && channel.dataUrl) {
            preview.style.backgroundImage = 'url("' + channel.dataUrl.replace(/"/g, '%22') + '")';
            return;
        }
        if (channel.kind === 'image' && channel.url) {
            preview.textContent = 'URL';
            return;
        }
        if (channel.kind === 'video') {
            preview.textContent = channel.dataUrl || channel.url ? 'Video' : 'No Video';
            return;
        }
        if (channel.kind === 'procedural') {
            if (channel.sourceId === 'gradient') {
                preview.style.background = 'linear-gradient(90deg, #05051a, #44aaff, #f0f)';
            } else if (channel.sourceId === 'noise' || channel.sourceId === 'value_noise') {
                preview.style.backgroundImage = 'repeating-radial-gradient(circle at 25% 30%, #ddd 0 1px, #333 1px 3px)';
            } else {
                preview.style.backgroundImage = 'linear-gradient(45deg, #222 25%, #ddd 25%, #ddd 50%, #222 50%, #222 75%, #ddd 75%)';
                preview.style.backgroundSize = '16px 16px';
            }
            return;
        }
        if (channel.kind === 'buffer' || channel.kind === 'self') {
            preview.textContent = channel.kind === 'self' ? 'Self' : (channel.sourceId || 'Buffer');
            return;
        }
        if (channel.kind === 'keyboard') {
            preview.textContent = 'Keys';
            return;
        }
        if (channel.kind === 'audio') {
            preview.style.background = 'linear-gradient(90deg, #111, #44ff88, #8844ff)';
            return;
        }
        if (channel.kind === 'webcam') {
            preview.textContent = 'Webcam';
            return;
        }
        if (channel.kind === 'microphone') {
            preview.textContent = 'Mic';
            return;
        }
        if (channel.kind === 'unsupported') {
            preview.textContent = 'Unsupported';
            return;
        }
        preview.textContent = 'None';
    }

    function buildSourceControl(container, channel, slot) {
        if (channel.kind === 'buffer') {
            var bufferSelect = document.createElement('select');
            [
                ['bufferA', 'Buffer A'],
                ['bufferB', 'Buffer B'],
                ['bufferC', 'Buffer C'],
                ['bufferD', 'Buffer D']
            ].forEach(function(item) {
                var opt = document.createElement('option');
                opt.value = item[0];
                opt.textContent = item[1];
                bufferSelect.appendChild(opt);
            });
            bufferSelect.value = channel.sourceId || 'bufferA';
            bufferSelect.addEventListener('change', function() {
                var next = cloneChannel(channel);
                next.sourceId = bufferSelect.value;
                updateChannel(slot, next);
            });
            container.appendChild(bufferSelect);
            return;
        }

        if (channel.kind === 'procedural') {
            var proceduralSelect = document.createElement('select');
            var names = typeof ShadertoyChannels !== 'undefined' ? ShadertoyChannels.getProceduralNames() : ['checker', 'noise', 'gradient', 'value_noise'];
            names.forEach(function(name) {
                var opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name.replace('_', ' ');
                proceduralSelect.appendChild(opt);
            });
            proceduralSelect.value = channel.sourceId || 'checker';
            proceduralSelect.addEventListener('change', function() {
                var next = cloneChannel(channel);
                next.sourceId = proceduralSelect.value;
                updateChannel(slot, next);
            });
            container.appendChild(proceduralSelect);
            return;
        }

        if (channel.kind === 'image' || channel.kind === 'video') {
            var file = document.createElement('input');
            file.type = 'file';
            file.accept = channel.kind === 'video' ? 'video/*' : 'image/*';
            file.addEventListener('change', function() {
                var selected = file.files && file.files[0];
                if (!selected) return;
                var reader = new FileReader();
                reader.onload = function() {
                    var next = cloneChannel(channel);
                    next.kind = channel.kind;
                    next.dataUrl = String(reader.result || '');
                    next.url = null;
                    updateChannel(slot, next);
                };
                reader.readAsDataURL(selected);
            });
            container.appendChild(file);

            var urlRow = document.createElement('div');
            urlRow.className = 'shadertoy-url-row';
            var url = document.createElement('input');
            url.type = 'text';
            url.placeholder = channel.kind === 'video' ? 'Video URL' : 'Image URL';
            url.value = channel.url || '';
            var button = document.createElement('button');
            button.className = 'sm-btn';
            button.textContent = 'Load';
            button.addEventListener('click', function() {
                var next = cloneChannel(channel);
                next.kind = channel.kind;
                next.url = url.value;
                next.dataUrl = null;
                updateChannel(slot, next);
            });
            urlRow.appendChild(url);
            urlRow.appendChild(button);
            container.appendChild(urlRow);
        }
    }

    function buildSamplerControls(container, channel, slot) {
        var sampler = channel.sampler || {};
        var filter = document.createElement('select');
        [['linear', 'Linear'], ['nearest', 'Nearest']].forEach(function(item) {
            var opt = document.createElement('option');
            opt.value = item[0];
            opt.textContent = item[1];
            filter.appendChild(opt);
        });
        filter.value = sampler.filter || 'linear';
        filter.addEventListener('change', function() {
            updateSampler(slot, channel, { filter: filter.value });
        });

        var wrap = document.createElement('select');
        [['clamp', 'Clamp'], ['repeat', 'Repeat'], ['mirror', 'Mirror']].forEach(function(item) {
            var opt = document.createElement('option');
            opt.value = item[0];
            opt.textContent = item[1];
            wrap.appendChild(opt);
        });
        wrap.value = sampler.wrap || 'clamp';
        wrap.addEventListener('change', function() {
            updateSampler(slot, channel, { wrap: wrap.value });
        });

        var vflip = labeledCheckbox('VFlip', !!sampler.vflip, function(checked) {
            updateSampler(slot, channel, { vflip: checked });
        });
        var mipmap = labeledCheckbox('Mip', !!sampler.mipmap, function(checked) {
            updateSampler(slot, channel, { mipmap: checked });
        });

        container.appendChild(filter);
        container.appendChild(wrap);
        container.appendChild(vflip);
        container.appendChild(mipmap);
    }

    function labeledCheckbox(text, checked, onChange) {
        var label = document.createElement('label');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checked;
        input.addEventListener('change', function() { onChange(input.checked); });
        label.appendChild(input);
        label.appendChild(document.createTextNode(text));
        return label;
    }

    function updateSampler(slot, channel, patch) {
        var next = cloneChannel(channel);
        next.sampler = next.sampler || {};
        for (var key in patch) next.sampler[key] = patch[key];
        updateChannel(slot, next);
    }

    function updateChannel(slot, channel) {
        ShadertoyHost.setChannel(currentPassId, slot, channel);
        markDirty();
        refreshChannels();
    }

    function cloneChannel(channel) {
        return JSON.parse(JSON.stringify(channel || {}));
    }

    function refreshPause() {
        if (!pauseBtn || typeof ShadertoyHost === 'undefined') return;
        pauseBtn.textContent = ShadertoyHost.isPaused() ? 'Run' : 'Pause';
        pauseBtn.classList.toggle('active', ShadertoyHost.isPaused());
    }

    function showError(text) {
        statusEl.textContent = 'Error';
        statusEl.className = 'shadertoy-status error';
        errorEl.textContent = text;
        errorEl.classList.remove('hidden');
    }

    function updateStatus(result) {
        init();
        if (!statusEl || !errorEl) return;
        if (!result) {
            statusEl.textContent = 'Not compiled';
            statusEl.className = 'shadertoy-status';
            errorEl.classList.add('hidden');
            errorEl.textContent = '';
            return;
        }

        if (result.success) {
            statusEl.textContent = result.warnings && result.warnings.length ? 'Compiled with warnings' : 'Compiled';
            statusEl.className = result.warnings && result.warnings.length ? 'shadertoy-status warning' : 'shadertoy-status ok';
            errorEl.textContent = result.warnings && result.warnings.length ? result.warnings.join('\n') : '';
            errorEl.classList.toggle('hidden', !(result.warnings && result.warnings.length));
            return;
        }

        statusEl.textContent = 'Compile failed';
        statusEl.className = 'shadertoy-status error';
        errorEl.textContent = (result.shaderLog || result.linkLog || result.errors && result.errors.join('\n') || 'Unknown shader error').replace(/\u0000/g, '');
        errorEl.classList.remove('hidden');
    }

    return {
        init: init,
        show: show,
        hide: hide,
        syncFromHost: syncFromHost,
        updateStatus: updateStatus,
        buildShadertoyBundle: buildShadertoyBundle
    };
})();
