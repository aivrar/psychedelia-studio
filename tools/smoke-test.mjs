#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { auditRecording, auditRecordingUi } from './recording-audit.mjs';
import { auditEndlessScenes } from './endless-scenes-audit.mjs';
import { auditBeatReactor } from './beat-reactor-audit.mjs';
import { auditSetups } from './setups-audit.mjs';
import { auditDirectRender } from './render-audit.mjs';
import { auditEditHistory } from './edit-history-audit.mjs';
import { auditShuffle } from './shuffle-audit.mjs';
import { auditRobotFoundry } from './robot-foundry-audit.mjs';
import { auditRecentChanges } from './recent-self-audit.mjs';

// Stop a headless browser and everything it spawned. Chromium can relaunch
// itself, so on Windows anything still using this run's temporary profile
// folder is stopped too; otherwise GPU/renderer processes pile up per run.
function stopBrowser(browser, userDataDir) {
    if (process.platform !== 'win32' || !browser.pid) {
        browser.kill();
        return;
    }
    try { execSync('taskkill /pid ' + browser.pid + ' /T /F', { stdio: 'ignore' }); } catch (err) { browser.kill(); }
    const profileTag = String(userDataDir).split(/[\\/]/).pop();
    const script = "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'msedge|chrome' -and $_.CommandLine -like '*" +
        profileTag + "*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }";
    try {
        execSync('powershell -NoProfile -Command "' + script + '"', { stdio: 'ignore', timeout: 30000 });
    } catch (err) { /* best effort */ }
}

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const host = '127.0.0.1';
const staticPort = Number(process.env.PSYCHEDELIA_SMOKE_PORT || 0);
const debugPort = Number(process.env.PSYCHEDELIA_CDP_PORT || (9300 + Math.floor(Math.random() * 400)));
const headless = process.env.PSYCHEDELIA_SMOKE_HEADLESS !== '0';
const timeoutMs = Number(process.env.PSYCHEDELIA_SMOKE_TIMEOUT || 45000);

const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
};

function wait(ms) {
    return new Promise(function(resolveWait) { setTimeout(resolveWait, ms); });
}

function safePath(urlPath) {
    const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const target = resolve(rootDir, clean);
    const rel = relative(rootDir, target);
    if (rel.startsWith('..') || isAbsolute(rel)) return null;
    return target;
}

function startStaticServer() {
    const server = createServer(async function(req, res) {
        try {
            const target = safePath(req.url || '/');
            if (!target) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            const oldFiles = { 'src/engine/export.js': 'export', 'src/engine/renderer.js': 'renderer', 'src/engine/mp4-writer.js': 'mp4-writer' };
            const oldName = oldFiles[relative(rootDir, target).replaceAll('\\', '/')];
            const data = await readFile(process.argv.includes('--recording-baseline') && oldName ? join(rootDir, 'tools/audit-artifacts/' + oldName + '.before.js') : target);
            res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream' });
            res.end(data);
        } catch (err) {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    return new Promise(function(resolveServer, rejectServer) {
        server.once('error', rejectServer);
        server.listen(staticPort, host, function() {
            const address = server.address();
            resolveServer({
                server,
                url: 'http://' + host + ':' + address.port + '/'
            });
        });
    });
}

function browserCandidates() {
    const env = process.env.BROWSER ? [process.env.BROWSER] : [];
    return env.concat([
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ]);
}

function findBrowser() {
    const found = browserCandidates().find(function(candidate) {
        return candidate && existsSync(candidate);
    });
    if (!found) {
        throw new Error('No Edge/Chrome executable found. Set BROWSER to a Chromium executable path.');
    }
    return found;
}

async function waitForJson(url, deadline) {
    let lastError = null;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
        } catch (err) {
            lastError = err;
        }
        await wait(100);
    }
    throw new Error('Timed out waiting for ' + url + (lastError ? ': ' + lastError.message : ''));
}

function connectWebSocket(wsUrl) {
    return new Promise(function(resolveSocket, rejectSocket) {
        const ws = new WebSocket(wsUrl);
        ws.addEventListener('open', function() { resolveSocket(ws); }, { once: true });
        ws.addEventListener('error', function(event) {
            rejectSocket(new Error('WebSocket connection failed: ' + (event.message || wsUrl)));
        }, { once: true });
    });
}

class CDPClient {
    constructor(ws) {
        this.ws = ws;
        this.nextId = 1;
        this.pending = new Map();
        this.events = new Map();

        ws.addEventListener('message', (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id && this.pending.has(msg.id)) {
                const pending = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                if (msg.error) pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                else pending.resolve(msg.result || {});
                return;
            }
            if (msg.method && this.events.has(msg.method)) {
                this.events.get(msg.method).forEach(function(fn) { fn(msg.params || {}); });
            }
        });
    }

    send(method, params) {
        const id = this.nextId++;
        const payload = JSON.stringify({ id, method, params: params || {} });
        return new Promise((resolveSend, rejectSend) => {
            this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
            this.ws.send(payload);
        });
    }

    on(method, fn) {
        if (!this.events.has(method)) this.events.set(method, []);
        this.events.get(method).push(fn);
    }

    close() {
        try { this.ws.close(); } catch (err) { /* noop */ }
    }
}

async function createPage(url) {
    const newUrl = 'http://' + host + ':' + debugPort + '/json/new?' + encodeURIComponent(url);
    let pageInfo;
    try {
        const res = await fetch(newUrl, { method: 'PUT' });
        pageInfo = await res.json();
    } catch (err) {
        const res = await fetch(newUrl);
        pageInfo = await res.json();
    }
    const ws = await connectWebSocket(pageInfo.webSocketDebuggerUrl);
    const cdp = new CDPClient(ws);
    return cdp;
}

async function evaluate(cdp, expression) {
    const result = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true
    });
    if (result.exceptionDetails) {
        const details = result.exceptionDetails;
        const text = details.text || 'Evaluation failed';
        throw new Error(text + (details.exception && details.exception.description ? ': ' + details.exception.description : ''));
    }
    return result.result ? result.result.value : undefined;
}

function sampleDiff(a, b) {
    if (!a || !b || !a.samples || !b.samples || a.samples.length !== b.samples.length) return 0;
    let sum = 0;
    for (let i = 0; i < a.samples.length; i++) {
        sum += Math.abs(a.samples[i] - b.samples[i]);
    }
    return sum / a.samples.length / 255;
}

async function canvasStats(cdp) {
    return await evaluate(cdp, `(() => {
        const source = document.getElementById('mainCanvas');
        if (!source) return { error: 'missing canvas' };
        const w = 64, h = 36;
        const sample = document.createElement('canvas');
        sample.width = w;
        sample.height = h;
        const ctx = sample.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let sum = 0, sumSq = 0, alpha = 0;
        const samples = [];
        for (let i = 0; i < data.length; i += 4) {
            const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
            sum += lum;
            sumSq += lum * lum;
            alpha += data[i + 3] / 255;
            samples.push(data[i], data[i + 1], data[i + 2]);
        }
        const count = data.length / 4;
        const mean = sum / count;
        const variance = Math.max(0, sumSq / count - mean * mean);
        return {
            width: source.width,
            height: source.height,
            cssWidth: Math.round(source.getBoundingClientRect().width),
            cssHeight: Math.round(source.getBoundingClientRect().height),
            mean,
            variance,
            alpha: alpha / count,
            samples
        };
    })()`);
}

async function canvasStatsById(cdp, id) {
    return await evaluate(cdp, `(() => {
        const source = document.getElementById(${JSON.stringify(id)});
        if (!source) return { error: 'missing canvas' };
        const w = 64, h = 36;
        const sample = document.createElement('canvas');
        sample.width = w;
        sample.height = h;
        const ctx = sample.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let sum = 0, sumSq = 0, alpha = 0;
        const samples = [];
        for (let i = 0; i < data.length; i += 4) {
            const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
            sum += lum;
            sumSq += lum * lum;
            alpha += data[i + 3] / 255;
            samples.push(data[i], data[i + 1], data[i + 2], data[i + 3]);
        }
        const count = data.length / 4;
        const mean = sum / count;
        const variance = Math.max(0, sumSq / count - mean * mean);
        return {
            width: source.width,
            height: source.height,
            cssWidth: Math.round(source.getBoundingClientRect().width),
            cssHeight: Math.round(source.getBoundingClientRect().height),
            mixBlendMode: getComputedStyle(source).mixBlendMode,
            mean,
            variance,
            alpha: alpha / count,
            samples
        };
    })()`);
}

async function glErrors(cdp) {
    return await evaluate(cdp, `(() => {
        if (!window.Renderer || !Renderer.getGL) return [];
        const gl = Renderer.getGL();
        if (!gl) return [];
        const errors = [];
        for (let i = 0; i < 32; i++) {
            const err = gl.getError();
            if (err === gl.NO_ERROR) break;
            errors.push(err);
        }
        return errors;
    })()`);
}

async function waitForApp(cdp) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const ready = await evaluate(cdp, `Boolean(window.Renderer && window.EffectRegistry && window.PostProcess && document.getElementById('effectSelect'))`);
        if (ready) {
            // Tools assert right after a dropdown change, so use the immediate switch.
            await evaluate(cdp, 'window.__psySyncSwitch = true');
            return;
        }
        await wait(100);
    }
    throw new Error('App did not expose Renderer/EffectRegistry before timeout');
}

async function waitForExpression(cdp, expression, label) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const ready = await evaluate(cdp, `Boolean(${expression})`);
        if (ready) return;
        await wait(100);
    }
    throw new Error(`${label || expression} was not ready before timeout`);
}

async function auditEffect(cdp, effect) {
    await evaluate(cdp, `EffectRegistry.switchTo(${JSON.stringify(effect.name)})`);
    await wait(240);
    const before = await canvasStats(cdp);
    await wait(260);
    const after = await canvasStats(cdp);
    const errors = await glErrors(cdp);
    const changed = sampleDiff(before, after);
    const nonblank = before.alpha > 0.1 && (before.variance > 0.00002 || before.mean > 0.003);
    return {
        name: effect.name,
        label: effect.label,
        category: effect.category,
        nonblank,
        changed,
        animated: changed > 0.0005,
        mean: Number(before.mean.toFixed(5)),
        variance: Number(before.variance.toFixed(6)),
        glErrors: errors
    };
}

async function auditEffectContract(cdp) {
    return await evaluate(cdp, `(() => {
        const failures = [];
        const effectResults = [];
        const fractalResults = [];
        const categorySummary = {};
        const seenNames = new Set();
        const knownInfiniteZoom = new Set(['mandelbrot', 'burning_ship', 'tricorn', 'multibrot', 'mandelbrot_deep', 'orbit_trap']);
        const numericTypes = new Set(['float', 'int']);
        const allowedTypes = new Set(['float', 'int', 'select', 'bool', 'color']);
        const structuralPattern = /(iter|iteration|power|julia|seed|target|center|slice|param|trap|sequence|warmup|depth|mode|variation|blend|symmetry|zoom|radius|fractal|palette|relax|fold|scale|offset|bailout|family|c_|p_)/i;
        const animationPattern = /(speed|animate|animation|morph|color|cycle|zoom_speed|rotation|pulse|orbit|drift|phase|flow|warp|twist|distort|distortion)/i;

        function fail(message) {
            failures.push(message);
        }

        function localFail(effectName, localFailures, message) {
            localFailures.push(message);
            fail(effectName + ': ' + message);
        }

        function isIdentifier(value) {
            return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value || '');
        }

        function isFiniteNumber(value) {
            return typeof value === 'number' && isFinite(value);
        }

        function validateNumericParam(effectName, localFailures, p, type) {
            if (!isFiniteNumber(p.min)) localFail(effectName, localFailures, p.name + ' has non-finite min');
            if (!isFiniteNumber(p.max)) localFail(effectName, localFailures, p.name + ' has non-finite max');
            if (isFiniteNumber(p.min) && isFiniteNumber(p.max) && p.max <= p.min) {
                localFail(effectName, localFailures, p.name + ' max must be greater than min');
            }
            if (!isFiniteNumber(p.default)) localFail(effectName, localFailures, p.name + ' has non-finite default');
            if (isFiniteNumber(p.default) && isFiniteNumber(p.min) && isFiniteNumber(p.max) && (p.default < p.min || p.default > p.max)) {
                localFail(effectName, localFailures, p.name + ' default outside min/max');
            }
            if (p.step !== undefined && (!isFiniteNumber(p.step) || p.step <= 0)) {
                localFail(effectName, localFailures, p.name + ' has invalid step');
            }
            if (type === 'int') {
                ['min', 'max', 'default'].forEach(function(key) {
                    if (isFiniteNumber(p[key]) && Math.abs(p[key] - Math.round(p[key])) > 0.000001) {
                        localFail(effectName, localFailures, p.name + ' int ' + key + ' is not integral');
                    }
                });
            }
        }

        function validateParam(effectName, localFailures, p, paramNames) {
            if (!p || typeof p !== 'object') {
                localFail(effectName, localFailures, 'param entry is not an object');
                return { structural: false, animation: false };
            }
            if (!isIdentifier(p.name)) localFail(effectName, localFailures, 'invalid param name: ' + String(p.name));
            if (paramNames.has(p.name)) localFail(effectName, localFailures, 'duplicate param name: ' + p.name);
            paramNames.add(p.name);
            if (!String(p.label || '').trim()) localFail(effectName, localFailures, p.name + ' missing label');

            const type = p.type || 'float';
            if (!allowedTypes.has(type)) localFail(effectName, localFailures, p.name + ' has unsupported type: ' + type);

            if (numericTypes.has(type)) {
                validateNumericParam(effectName, localFailures, p, type);
            } else if (type === 'select') {
                if (!Array.isArray(p.options) || !p.options.length) {
                    localFail(effectName, localFailures, p.name + ' select has no options');
                } else if (p.options.some(function(option) { return !String(option).trim(); })) {
                    localFail(effectName, localFailures, p.name + ' select has blank option');
                } else {
                    const seenOptions = new Set();
                    p.options.forEach(function(option) {
                        const label = String(option);
                        if (seenOptions.has(label)) localFail(effectName, localFailures, p.name + ' select has duplicate option: ' + label);
                        seenOptions.add(label);
                    });
                }
                if (!isFiniteNumber(p.default) || Math.round(p.default) !== p.default) {
                    localFail(effectName, localFailures, p.name + ' select default is not an integer index');
                } else if (Array.isArray(p.options) && (p.default < 0 || p.default >= p.options.length)) {
                    localFail(effectName, localFailures, p.name + ' select default outside options');
                }
            } else if (type === 'bool') {
                if (p.default !== undefined && typeof p.default !== 'boolean' && p.default !== 0 && p.default !== 1) {
                    localFail(effectName, localFailures, p.name + ' bool default must be boolean or 0/1');
                }
            } else if (type === 'color') {
                if (p.default !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(String(p.default))) {
                    localFail(effectName, localFailures, p.name + ' color default must be #RRGGBB');
                }
            }

            const text = String(p.name || '') + ' ' + String(p.label || '');
            return {
                structural: structuralPattern.test(text),
                animation: animationPattern.test(text)
            };
        }

        function shaderHasUniformReference(shader, uniformName) {
            if (typeof shader !== 'string') return true;
            return new RegExp('\\\\b' + uniformName + '\\\\b').test(shader);
        }

        const effects = EffectRegistry.getList();
        if (!effects.length) fail('No registered effects');

        effects.forEach(function(listItem) {
            const effectName = listItem && listItem.name;
            const localFailures = [];

            if (!isIdentifier(effectName)) localFail(String(effectName), localFailures, 'invalid effect name');
            if (seenNames.has(effectName)) localFail(effectName, localFailures, 'duplicate registered effect name');
            seenNames.add(effectName);
            if (!String(listItem.label || '').trim()) localFail(effectName, localFailures, 'missing label');
            if (!String(listItem.category || '').trim()) localFail(effectName, localFailures, 'missing category');

            const category = listItem.category || 'Other';
            if (!categorySummary[category]) categorySummary[category] = { count: 0, params: 0 };
            categorySummary[category].count += 1;

            const switched = EffectRegistry.switchTo(effectName);
            const def = EffectRegistry.getCurrent();
            if (!switched || !def || def.name !== effectName) {
                localFail(effectName, localFailures, 'switchTo did not activate effect');
                effectResults.push({
                    name: effectName,
                    category,
                    params: 0,
                    structuralParams: 0,
                    animationParams: 0,
                    success: false,
                    failures: localFailures
                });
                return;
            }

            if (!def.shader && !def.render && !def.cpuRender) {
                localFail(effectName, localFailures, 'missing shader/render/cpuRender path');
            }

            const params = Array.isArray(def.params) ? def.params : [];
            categorySummary[category].params += params.length;
            const paramNames = new Set();
            const missingUniforms = [];
            let structuralParams = 0;
            let animationParams = 0;
            params.forEach(function(p) {
                const flags = validateParam(effectName, localFailures, p, paramNames);
                if (flags.structural) structuralParams += 1;
                if (flags.animation) animationParams += 1;
                if (def.shader && !def.render && p && isIdentifier(p.name) && !shaderHasUniformReference(def.shader, 'u_' + p.name)) {
                    missingUniforms.push(p.name);
                }
            });
            if (missingUniforms.length) {
                localFail(effectName, localFailures, 'plain shader does not reference uniform(s): ' + missingUniforms.join(', '));
            }

            if (effectName === 'lyapunov') {
                const zoom = params.find(function(p) { return p.name === 'zoom'; });
                const sequence = params.find(function(p) { return p.name === 'sequence_len'; });
                if (!zoom || zoom.min !== 0) localFail(effectName, localFailures, 'zoom must support 0.00 full-plane view');
                if (!sequence || !Array.isArray(sequence.options) || sequence.options.indexOf('ABAB') >= 0) {
                    localFail(effectName, localFailures, 'sequence dropdown still contains a redundant ABAB option');
                }
                if (def.shader.indexOf('max(u_zoom, 0.0)') < 0 ||
                        def.shader.indexOf('domainMask') < 0 ||
                        def.shader.indexOf('clamp(uv, vec2(0.0), vec2(4.0))') < 0) {
                    localFail(effectName, localFailures, 'continuous zero zoom shader guard is missing');
                }
            }
            if (effectName === 'newton') {
                ['motion', 'root_spin', 'distort'].forEach(function(name) {
                    const param = params.find(function(p) { return p.name === name; });
                    if (!param) {
                        localFail(effectName, localFailures, 'missing animation control: ' + name);
                    } else if (name !== 'root_spin' && Number(param.default) <= 0) {
                        localFail(effectName, localFailures, name + ' should animate by default');
                    }
                });
                if (def.shader.indexOf("cpow(z, n) - vec2(1.0, 0.0)") < 0) {
                    localFail(effectName, localFailures, 'Newton polynomial must remain z^n - 1');
                }
                if (def.shader.indexOf('4.5 / max(u_zoom, 0.05)') < 0) {
                    localFail(effectName, localFailures, 'zoom direction is not magnification-consistent');
                }
            }
            if (effectName === 'nova') {
                const brightness = params.find(function(p) { return p.name === 'brightness'; });
                if (!brightness || Number(brightness.default) < 1) {
                    localFail(effectName, localFailures, 'brightness control missing or too low by default');
                }
            }
            if (effectName === 'sierpinski') {
                const zoomSpeed = params.find(function(p) { return p.name === 'zoom_speed'; });
                if (!zoomSpeed || zoomSpeed.label !== 'Pattern Zoom Speed') {
                    localFail(effectName, localFailures, 'local zoom speed label should clarify it is pattern-specific');
                }
                if (def.shader.indexOf('vec3 bary') < 0 || def.shader.indexOf('corner < 0.5') < 0) {
                    localFail(effectName, localFailures, 'triangle mode is not the barycentric gasket construction');
                }
            }
            if (effectName === 'escape_time_lab') {
                const noneStart = def.shader.indexOf('if (m < 0.5)');
                const noneBranch = noneStart >= 0 && def.shader.slice(noneStart, noneStart + 100).indexOf('return p;') >= 0;
                if (!noneBranch) localFail(effectName, localFailures, 'Domain Warp None still changes coordinates');
                if (def.shader.indexOf('return z2 + c + prev;') < 0) {
                    localFail(effectName, localFailures, 'Manowar recurrence is missing the full previous iterate');
                }
                if (def.shader.indexOf('c = c * 0.5 + z;') < 0) {
                    localFail(effectName, localFailures, 'Spider recurrence does not update c = c/2 + z');
                }
                if (def.shader.indexOf('vec2 fppp') < 0 || def.shader.indexOf('previousZ') < 0) {
                    localFail(effectName, localFailures, 'Householder/Secant implementations are not distinct stateful solvers');
                }
                ['u_unwrapped_time', 'psyZoomHandoff', 'psyZoomNextDive', 'psyZoomPortal'].forEach(function(token) {
                    if (def.shader.indexOf(token) < 0) {
                        localFail(effectName, localFailures, 'seamless Formula Lab dive token missing: ' + token);
                    }
                });
            }
            if (effectName === 'strange_attractor_flight') {
                ['sigma * (p.y - p.x)', 'sin(p.y) - b * p.x', 'p.z * (p.x - c)', 'attractorAdvance'].forEach(function(token) {
                    if (def.shader.indexOf(token) < 0) localFail(effectName, localFailures, 'integrated attractor token missing: ' + token);
                });
            }
            if (def.fractalFlight && def.fractalFlight.kind === 'progressive-density' && def.cpuRender) {
                localFail(effectName, localFailures, 'progressive density effect exposes a decorative CPU substitute');
            }
            if (effectName === 'path_traced_fractal_flight' && /Path-Traced/i.test(def.label + ' ' + def.description)) {
                localFail(effectName, localFailures, 'single-bounce DE effect is still labeled as path traced');
            }

            if (category === 'Fractals') {
                if (params.length < 5) localFail(effectName, localFailures, 'fractal has fewer than 5 controls');
                if (structuralParams < 2) localFail(effectName, localFailures, 'fractal lacks structural formula controls');
                if (animationParams < 2) localFail(effectName, localFailures, 'fractal lacks animation/color controls');
                if (knownInfiniteZoom.has(effectName)) {
                    ['zoom_speed', 'zoom_mode', 'zoom_depth'].forEach(function(requiredName) {
                        if (!paramNames.has(requiredName)) {
                            localFail(effectName, localFailures, 'infinite zoom fractal missing ' + requiredName);
                        }
                    });
                    ['u_unwrapped_time', 'psyZoomHandoff', 'psyZoomNextDive', 'psyZoomNextTarget', 'psyZoomPortal'].forEach(function(token) {
                        if (!def.shader || def.shader.indexOf(token) < 0) {
                            localFail(effectName, localFailures, 'seamless infinite zoom token missing: ' + token);
                        }
                    });
                }
                fractalResults.push({
                    name: effectName,
                    params: params.length,
                    structuralParams,
                    animationParams,
                    infiniteZoom: knownInfiniteZoom.has(effectName),
                    success: localFailures.length === 0,
                    failures: localFailures.slice()
                });
            }

            effectResults.push({
                name: effectName,
                category,
                params: params.length,
                structuralParams,
                animationParams,
                success: localFailures.length === 0,
                failures: localFailures
            });
        });

        if (!categorySummary.Fractals || categorySummary.Fractals.count < 1) {
            fail('Missing Fractals category');
        }
        if (!fractalResults.length) {
            fail('No fractal effects found');
        }

        if (!Renderer.setSeed) {
            fail('Renderer is missing deterministic seed restoration for timeline clips');
        } else {
            const originalSeed = Renderer.getSeed();
            const originalSeedVec = Renderer.getSeedVec().slice();
            Renderer.setSeed(123.5, [0.1, 0.2, 0.3, 0.4]);
            if (Math.abs(Renderer.getSeed() - 123.5) > 0.0001 || Math.abs(Renderer.getSeedVec()[2] - 0.3) > 0.0001) {
                fail('Renderer deterministic seed restoration failed');
            }
            Renderer.setSeed(originalSeed, originalSeedVec);
        }

        EffectRegistry.switchTo('plasma');

        return {
            available: true,
            success: failures.length === 0,
            failures,
            effectCount: effects.length,
            fractalCount: fractalResults.length,
            categorySummary,
            effects: effectResults,
            fractals: fractalResults
        };
    })()`);
}

async function auditFractalLabs(cdp) {
    const discovery = await evaluate(cdp, `(() => {
        const failures = [];
        const targets = [];
        const labKinds = new Set(['fractal-lab', 'progressive-density']);

        function fail(message) {
            failures.push(message);
        }

        function esc(text) {
            return String(text).split('').map(function(ch) {
                return '.+*?^$()[]{}|\\\\'.indexOf(ch) >= 0 ? '\\\\' + ch : ch;
            }).join('');
        }

        if (!window.FractalLab || !FractalLab.validateEffect) {
            fail('FractalLab helper is unavailable');
            return { available: false, success: false, failures, targets };
        }

        EffectRegistry.getList().forEach(function(item) {
            EffectRegistry.switchTo(item.name);
            const effect = EffectRegistry.getCurrent();
            const meta = effect && effect.fractalFlight || null;
            if (!meta || !labKinds.has(meta.kind)) return;

            const params = Array.isArray(effect.params) ? effect.params : [];
            const paramNames = params.map(function(p) { return p.name; });
            const modeParam = params.find(function(p) { return p.name === meta.modeParam; });
            const modeOptions = modeParam && Array.isArray(modeParam.options) ? modeParam.options.slice() : [];
            const modeTokens = Array.isArray(meta.modeTokens) ? meta.modeTokens.slice() : [];
            const validation = FractalLab.validateEffect(effect);
            const localFailures = [];

            function localFail(message) {
                localFailures.push(message);
                fail(item.name + ': ' + message);
            }

            if (!validation.ok) validation.errors.forEach(localFail);
            if (!meta.familyKey) localFail('missing familyKey');
            if (!meta.renderCost) localFail('missing renderCost');
            if (!modeParam) localFail('missing mode select param ' + meta.modeParam);
            if (modeParam && modeParam.type !== 'select') localFail('mode param must be select');
            if (modeOptions.length !== (meta.modes || []).length) localFail('mode option count mismatch');
            if (!Array.isArray(meta.smokePresets) || meta.smokePresets.length < 3) localFail('expected at least three starter presets');

            (meta.smokePresets || []).forEach(function(preset) {
                Object.keys(preset.values || {}).forEach(function(key) {
                    if (paramNames.indexOf(key) < 0) localFail('preset ' + preset.name + ' references missing param ' + key);
                });
            });

            if (effect.shader && !effect.render) {
                params.forEach(function(p) {
                    const uniformName = 'u_' + p.name;
                    const uniformPattern = new RegExp('uniform\\\\s+float\\\\s+' + esc(uniformName) + '\\\\s*;');
                    const refPattern = new RegExp('\\\\b' + esc(uniformName) + '\\\\b', 'g');
                    const refs = effect.shader.match(refPattern) || [];
                    if (!uniformPattern.test(effect.shader)) localFail(p.name + ' missing uniform declaration');
                    if (refs.length < 2) localFail(p.name + ' uniform is not used beyond declaration');
                });
            }

            if (modeTokens.length) {
                modeTokens.forEach(function(token, index) {
                    if (!token) {
                        localFail('blank mode token at index ' + index);
                        return;
                    }
                    const inShader = effect.shader && effect.shader.indexOf(token) >= 0;
                    const inCustom = Array.isArray(effect._modeTokens) && effect._modeTokens.indexOf(token) >= 0;
                    if (!inShader && !inCustom) localFail('mode token not found in implementation: ' + token);
                });
            }

            targets.push({
                name: item.name,
                label: item.label,
                kind: meta.kind,
                family: meta.family,
                familyKey: meta.familyKey,
                modeParam: meta.modeParam,
                modes: Array.isArray(meta.modes) ? meta.modes.slice() : [],
                modeOptions,
                renderCost: meta.renderCost || 'medium',
                minChanged: meta.kind === 'progressive-density' ? 0.00001 : 0.00002,
                params: paramNames,
                localFailures
            });
        });

        EffectRegistry.switchTo('plasma');
        return {
            available: true,
            success: failures.length === 0,
            targetCount: targets.length,
            failures,
            targets
        };
    })()`);

    const modeResults = [];
    const failures = discovery.failures ? discovery.failures.slice() : [];
    if (!discovery.available) {
        return {
            available: discovery.available,
            success: false,
            targetCount: discovery.targetCount || 0,
            failures,
            targets: discovery.targets || [],
            modeResults
        };
    }

    for (const target of discovery.targets || []) {
        for (let index = 0; index < target.modes.length; index++) {
            await glErrors(cdp);
            const setup = await evaluate(cdp, `(() => {
                const ok = EffectRegistry.switchTo(${JSON.stringify(target.name)});
                const current = EffectRegistry.getCurrent();
                const values = {};
                values[${JSON.stringify(target.modeParam)}] = ${index};
                if (Controls.setValues) Controls.setValues(values);
                if (Renderer.resetTime) Renderer.resetTime();
                return {
                    ok,
                    active: current && current.name,
                    values: Controls.getValues ? Controls.getValues() : {}
                };
            })()`);
            const heavy = target.renderCost === 'heavy' || target.renderCost === 'progressive';
            await wait(heavy ? 420 : 180);
            const before = await canvasStats(cdp);
            await wait(heavy ? 520 : 260);
            const after = await canvasStats(cdp);
            const errors = await glErrors(cdp);
            const changed = sampleDiff(before, after);
            const nonblank = before.alpha > 0.1 && (before.variance > 0.00002 || before.mean > 0.003);
            const animated = changed > target.minChanged;
            const result = {
                effect: target.name,
                mode: target.modes[index],
                modeIndex: index,
                switchOk: !!setup.ok && setup.active === target.name,
                valueOk: Math.abs(Number(setup.values[target.modeParam]) - index) < 0.001,
                nonblank,
                animated,
                changed: Number(changed.toFixed(6)),
                mean: Number(before.mean.toFixed(5)),
                variance: Number(before.variance.toFixed(6)),
                glErrors: errors
            };
            if (!result.switchOk) failures.push(target.name + ': failed to activate mode ' + index);
            if (!result.valueOk) failures.push(target.name + ': mode value did not reach Controls for mode ' + index);
            if (!result.nonblank) failures.push(target.name + ': blank mode ' + target.modes[index]);
            if (!result.animated) failures.push(target.name + ': static mode ' + target.modes[index] + ' changed=' + result.changed);
            if (errors.length) failures.push(target.name + ': WebGL errors in mode ' + target.modes[index] + ' -> ' + errors.join(','));
            modeResults.push(result);
        }
    }

    await evaluate(cdp, `EffectRegistry.switchTo('plasma')`);
    return {
        available: discovery.available,
        success: failures.length === 0 && modeResults.every(function(result) {
            return result.switchOk && result.valueOk && result.nonblank && result.animated && result.glErrors.length === 0;
        }),
        targetCount: discovery.targetCount || 0,
        targets: discovery.targets || [],
        failures,
        modeResults
    };
}

async function auditPostEffect(cdp, fx) {
    await evaluate(cdp, `EffectRegistry.switchTo('plasma'); PostProcess.getEffects().forEach(fx => PostProcess.setEnabled(fx.name, false)); PostProcess.setEnabled(${JSON.stringify(fx.name)}, true);`);
    await wait(300);
    const stats = await canvasStats(cdp);
    const errors = await glErrors(cdp);
    await evaluate(cdp, `PostProcess.setEnabled(${JSON.stringify(fx.name)}, false)`);
    return {
        name: fx.name,
        label: fx.label,
        nonblank: stats.alpha > 0.1 && (stats.variance > 0.00002 || stats.mean > 0.003),
        mean: Number(stats.mean.toFixed(5)),
        variance: Number(stats.variance.toFixed(6)),
        glErrors: errors
    };
}

async function auditOverlays(cdp) {
    const setup = await evaluate(cdp, `(() => {
        EffectRegistry.switchTo('plasma');
        const labels = Array.from(document.querySelectorAll('#overlayPanel .overlay-group:first-child .param-row label')).map(label => label.textContent.trim());
        const expected = [
            'Period (sec)',
            'Duration (sec)',
            'Intensity',
            'Blend Original',
            'Color Source',
            'Strobe Color',
            'Operator',
            'Waveform',
            'Random Probability',
            'Random Seed',
            'Edge Softness',
            'Phase'
        ];
        Overlays.setEnabled('strobe', true);
        Overlays.setParam('strobe_period', 0.25);
        Overlays.setParam('strobe_duration', 0.12);
        Overlays.setParam('strobe_intensity', 0.8);
        Overlays.setParam('strobe_blend_original', 0);
        Overlays.setParam('strobe_mode', 0);
        Overlays.setParam('strobe_operator', 0);
        Overlays.setParam('strobe_waveform', 0);
        Overlays.setParam('strobe_random_probability', 1);
        Overlays.setParam('strobe_softness', 0);
        Overlays.render(0.01);
        return {
            hasOverlayCanvas: !!document.getElementById('overlayCanvas'),
            hasStrobeCanvas: !!document.getElementById('strobeCanvas'),
            controlsOk: expected.every(text => labels.includes(text)),
            labels
        };
    })()`);
    const white = await canvasStatsById(cdp, 'strobeCanvas');
    const differenceMode = await evaluate(cdp, `(() => {
        Overlays.setParam('strobe_mode', 3);
        Overlays.setParam('strobe_operator', 5);
        Overlays.render(0.02);
        const canvas = document.getElementById('strobeCanvas');
        return canvas ? getComputedStyle(canvas).mixBlendMode : '';
    })()`);
    const difference = await canvasStatsById(cdp, 'strobeCanvas');
    const suppressed = await evaluate(cdp, `(() => {
        Overlays.setParam('strobe_random_probability', 0);
        Overlays.render(0.03);
        return true;
    })()`);
    const off = await canvasStatsById(cdp, 'strobeCanvas');
    await evaluate(cdp, `Overlays.setEnabled('strobe', false); Overlays.render(0.04);`);

    return {
        available: true,
        success: setup.hasOverlayCanvas && setup.hasStrobeCanvas && setup.controlsOk &&
            white.alpha > 0.5 && white.mean > 0.2 &&
            differenceMode === 'difference' && difference.alpha > 0.5 &&
            suppressed && off.alpha < 0.02,
        setup,
        white: {
            alpha: Number(white.alpha.toFixed(5)),
            mean: Number(white.mean.toFixed(5)),
            mixBlendMode: white.mixBlendMode
        },
        difference: {
            alpha: Number(difference.alpha.toFixed(5)),
            mean: Number(difference.mean.toFixed(5)),
            mixBlendMode: differenceMode
        },
        suppressed: {
            alpha: Number(off.alpha.toFixed(5)),
            mean: Number(off.mean.toFixed(5))
        }
    };
}

async function auditSidebarControls(cdp) {
    return await evaluate(cdp, `(() => {
        const failures = [];
        const effectResults = [];
        const familySummary = {};

        function fail(message) {
            failures.push(message);
        }

        function approx(a, b, epsilon) {
            return Math.abs(Number(a) - Number(b)) <= (epsilon || 0.0005);
        }

        function dispatch(el, type) {
            el.dispatchEvent(new Event(type, { bubbles: true }));
        }

        function labelFor(row) {
            const label = row && row.querySelector('label');
            return label ? label.textContent.trim() : '';
        }

        function midpointParam(p) {
            const min = Number(p.min !== undefined ? p.min : 0);
            const max = Number(p.max !== undefined ? p.max : 1);
            if (p.type === 'int') return Math.round(min + (max - min) * 0.63);
            return min + (max - min) * 0.63;
        }

        function measureParamLayout() {
            if (!sidebar || !paramsContainer) {
                return {
                    rowOverflowCount: 0,
                    controlOverflowCount: 0,
                    labelOverflowCount: 0,
                    maxRightOverflow: 0,
                    pageHorizontalOverflow: 0
                };
            }
            const sidebarRect = sidebar.getBoundingClientRect();
            const rows = Array.from(paramsContainer.querySelectorAll('.param-row'));
            let rowOverflowCount = 0;
            let controlOverflowCount = 0;
            let labelOverflowCount = 0;
            let maxRightOverflow = 0;

            function trackOverflow(rect, countAs) {
                const rightOverflow = Math.max(0, rect.right - sidebarRect.right);
                const leftOverflow = Math.max(0, sidebarRect.left - rect.left);
                const overflow = Math.max(rightOverflow, leftOverflow);
                if (overflow > 1) {
                    maxRightOverflow = Math.max(maxRightOverflow, overflow);
                    countAs();
                }
            }

            rows.forEach(function(row) {
                trackOverflow(row.getBoundingClientRect(), function() { rowOverflowCount += 1; });
                const label = row.querySelector('label');
                if (label) {
                    trackOverflow(label.getBoundingClientRect(), function() { labelOverflowCount += 1; });
                }
                Array.from(row.querySelectorAll('input, select, .slider-wrap, .val-display')).forEach(function(control) {
                    trackOverflow(control.getBoundingClientRect(), function() { controlOverflowCount += 1; });
                });
            });

            return {
                rowOverflowCount,
                controlOverflowCount,
                labelOverflowCount,
                maxRightOverflow: Number(maxRightOverflow.toFixed(2)),
                pageHorizontalOverflow: Math.max(
                    0,
                    Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) - window.innerWidth
                )
            };
        }

        const sidebar = document.getElementById('sidebar');
        const effectSearch = document.getElementById('effectSearch');
        const effectCategoryFilter = document.getElementById('effectCategoryFilter');
        const effectSelect = document.getElementById('effectSelect');
        const paramsContainer = document.getElementById('paramsContainer');
        const resSelect = document.getElementById('resSelect');
        const fpsSelect = document.getElementById('fpsSelect');
        const uiPriorityMode = document.getElementById('uiPriorityMode');
        const durationInput = document.getElementById('durationInput');
        const animSpeed = document.getElementById('animSpeed');
        const rotSpeed = document.getElementById('rotSpeed');
        const viewZoom = document.getElementById('viewZoom');
        const viewZoomDepth = document.getElementById('viewZoomDepth');
        const viewZoomSpeed = document.getElementById('viewZoomSpeed');

        if (!sidebar) fail('Missing #sidebar');
        if (!effectSearch) fail('Missing #effectSearch');
        if (!effectCategoryFilter) fail('Missing #effectCategoryFilter');
        if (!effectSelect) fail('Missing #effectSelect');
        if (!paramsContainer) fail('Missing #paramsContainer');
        if (!resSelect) fail('Missing #resSelect');
        if (!fpsSelect) fail('Missing #fpsSelect');
        if (!uiPriorityMode) fail('Missing #uiPriorityMode');
        if (!durationInput) fail('Missing #durationInput');
        if (!animSpeed) fail('Missing #animSpeed');
        if (!rotSpeed) fail('Missing #rotSpeed');
        if (!viewZoom) fail('Missing #viewZoom');
        if (!viewZoomDepth) fail('Missing #viewZoomDepth');
        if (!viewZoomSpeed) fail('Missing #viewZoomSpeed');
        if (failures.length) return { available: true, success: false, failures, effectResults, familySummary };

        const effects = EffectRegistry.getList();
        const optionValues = Array.from(effectSelect.querySelectorAll('option')).map(option => option.value);
        const duplicateOptions = optionValues.filter((value, index) => optionValues.indexOf(value) !== index);
        if (duplicateOptions.length) fail('Effect selector has duplicate options: ' + duplicateOptions.join(', '));
        effects.forEach(effect => {
            if (optionValues.indexOf(effect.name) < 0) fail('Effect selector missing registered effect: ' + effect.name);
            const category = effect.category || 'Other';
            if (!familySummary[category]) {
                familySummary[category] = { count: 0, params: 0, selectParams: 0, motionParams: 0, effects: [] };
            }
            familySummary[category].count += 1;
            familySummary[category].effects.push(effect.name);
        });
        if (optionValues.length !== effects.length) fail('Effect selector option count does not match registry count');

        const priorityOptions = uiPriorityMode ? Array.from(uiPriorityMode.options).map(option => option.value) : [];
        ['visual', 'responsive', 'strong'].forEach(function(value) {
            if (priorityOptions.indexOf(value) < 0) fail('UI priority selector missing option: ' + value);
        });

        function selectedEffectValues() {
            return Array.from(effectSelect.querySelectorAll('option'))
                .map(option => option.value)
                .filter(Boolean);
        }

        function runEffectSearch(query) {
            effectSearch.value = query;
            dispatch(effectSearch, 'input');
            return selectedEffectValues();
        }

        function resetEffectFilters() {
            effectSearch.value = '';
            dispatch(effectSearch, 'input');
            effectCategoryFilter.value = 'all';
            dispatch(effectCategoryFilter, 'change');
            return selectedEffectValues();
        }

        function metadataForEffect(effect) {
            let meta = effect.fractalFlight || null;
            if (!meta) {
                EffectRegistry.switchTo(effect.name);
                const current = EffectRegistry.getCurrent();
                meta = current && current.fractalFlight || null;
            }
            return meta;
        }

        effectSearch.value = 'apollonian';
        dispatch(effectSearch, 'input');
        let filteredValues = Array.from(effectSelect.querySelectorAll('option')).map(option => option.value);
        if (filteredValues.indexOf('apollonian_foam_flight') < 0) fail('Effect search did not find Apollonian metadata family');
        if (filteredValues.indexOf('plasma') >= 0) fail('Effect search did not filter unrelated effects');

        effectSearch.value = 'nebulabrot';
        dispatch(effectSearch, 'input');
        filteredValues = Array.from(effectSelect.querySelectorAll('option')).map(option => option.value);
        if (filteredValues.indexOf('buddhabrot_lab') < 0) fail('Effect search did not find Buddhabrot mode metadata');

        effectSearch.value = 'tsucs';
        dispatch(effectSearch, 'input');
        filteredValues = Array.from(effectSelect.querySelectorAll('option')).map(option => option.value);
        if (filteredValues.indexOf('attractor_density_lab') < 0) fail('Effect search did not find Attractor mode metadata');

        effectSearch.value = 'swirl spiral bloom';
        dispatch(effectSearch, 'input');
        filteredValues = Array.from(effectSelect.querySelectorAll('option')).map(option => option.value);
        if (filteredValues.indexOf('flam3_density_lab') < 0) fail('Effect search did not find FLAM3 starter preset metadata');

        effectSearch.value = 'progressive';
        dispatch(effectSearch, 'input');
        filteredValues = Array.from(effectSelect.querySelectorAll('option')).map(option => option.value);
        ['buddhabrot_lab', 'attractor_density_lab', 'flam3_density_lab'].forEach(function(name) {
            if (filteredValues.indexOf(name) < 0) fail('Effect search did not find progressive render-cost metadata for ' + name);
        });
        if (filteredValues.indexOf('plasma') >= 0) fail('Effect search progressive query returned unrelated plasma effect');

        resetEffectFilters();
        effects.forEach(function(effect) {
            const meta = metadataForEffect(effect);
            if (!meta) return;
            const queries = []
                .concat(Array.isArray(meta.modes) ? meta.modes : [])
                .concat(Array.isArray(meta.modeTokens) ? meta.modeTokens : []);
            const seenQueries = new Set();
            queries.forEach(function(query) {
                query = String(query || '').trim();
                if (!query || seenQueries.has(query.toLowerCase())) return;
                seenQueries.add(query.toLowerCase());
                const values = runEffectSearch(query);
                if (values.indexOf(effect.name) < 0) {
                    fail(effect.name + ': effect search cannot find metadata query "' + query + '"');
                }
            });
            resetEffectFilters();
            const option = Array.from(effectSelect.querySelectorAll('option')).find(function(item) {
                return item.value === effect.name;
            });
            if (!option) {
                fail(effect.name + ': metadata option disappeared after search reset');
                return;
            }
            if (meta.renderCost && option.dataset.renderCost !== meta.renderCost) {
                fail(effect.name + ': selector render-cost metadata mismatch');
            }
            if (meta.familyKey && option.dataset.familyKey !== meta.familyKey) {
                fail(effect.name + ': selector family-key metadata mismatch');
            }
            if (meta.modeParam && option.dataset.modeParam !== meta.modeParam) {
                fail(effect.name + ': selector mode-param metadata mismatch');
            }
            if (Array.isArray(meta.modes) && meta.modes.length && option.title.indexOf(meta.modes[0]) < 0) {
                fail(effect.name + ': selector title does not expose mode metadata');
            }
        });
        EffectRegistry.switchTo('plasma');
        resetEffectFilters();

        const progressiveOption = effectSelect.querySelector('option[value="flam3_density_lab"]');
        if (!progressiveOption || progressiveOption.dataset.renderCost !== 'progressive' ||
                progressiveOption.dataset.familyKey !== 'flam3_density_lab' ||
                progressiveOption.dataset.modeParam !== 'flam3_mode') {
            fail('Effect selector missing API-friendly metadata attributes for flam3_density_lab');
        }
        effectCategoryFilter.value = 'Fractals';
        dispatch(effectCategoryFilter, 'change');
        filteredValues = Array.from(effectSelect.querySelectorAll('option')).map(option => option.value).filter(Boolean);
        const fractalNames = new Set(effects.filter(effect => (effect.category || 'Other') === 'Fractals').map(effect => effect.name));
        if (!filteredValues.length || filteredValues.some(value => !fractalNames.has(value))) fail('Category filter returned a non-fractal effect');

        effectCategoryFilter.value = 'all';
        dispatch(effectCategoryFilter, 'change');
        filteredValues = Array.from(effectSelect.querySelectorAll('option')).map(option => option.value).filter(Boolean);
        if (filteredValues.length !== effects.length) fail('Clearing effect filters did not restore all effects');

        for (const effect of effects) {
            const localFailures = [];
            function localFail(message) {
                localFailures.push(message);
                fail(effect.name + ': ' + message);
            }

            effectSelect.value = effect.name;
            dispatch(effectSelect, 'change');
            const current = EffectRegistry.getCurrent();
            if (!current || current.name !== effect.name) {
                localFail('select change did not switch EffectRegistry current effect');
                continue;
            }

            const defs = Controls.getParamDefs ? Controls.getParamDefs() : (current.params || []);
            const rows = Array.from(paramsContainer.querySelectorAll('.param-row'));
            if (defs.length !== rows.length) {
                localFail('parameter row count mismatch, expected ' + defs.length + ' got ' + rows.length);
            }

            const groupToggle = paramsContainer.querySelector('.param-group-toggle');
            if (groupToggle) {
                const group = groupToggle.closest('.param-group');
                const body = group && group.querySelector('.param-group-body');
                groupToggle.click();
                if (!group || !group.classList.contains('collapsed') || groupToggle.getAttribute('aria-expanded') !== 'false') {
                    localFail('parameter group did not collapse');
                }
                if (body && window.getComputedStyle(body).display !== 'none') {
                    localFail('collapsed parameter group body is still displayed');
                }
                groupToggle.click();
                if (group.classList.contains('collapsed') || groupToggle.getAttribute('aria-expanded') !== 'true') {
                    localFail('parameter group did not expand');
                }
            }

            if (effect.fractalFlight && Array.isArray(effect.fractalFlight.smokePresets) && effect.fractalFlight.smokePresets.length) {
                const presetSelect = document.getElementById('fractalPresetSelect');
                const presetApply = document.getElementById('fractalPresetApply');
                if (!presetSelect) {
                    localFail('missing starter preset UI');
                } else if (presetApply) {
                    localFail('starter preset apply button should not exist');
                } else if (Array.from(presetSelect.options).filter(option => option.value !== '').length !== effect.fractalFlight.smokePresets.length) {
                    localFail('starter preset option count mismatch');
                } else {
                    const presetIndex = effect.fractalFlight.smokePresets.length - 1;
                    const preset = effect.fractalFlight.smokePresets[presetIndex];
                    presetSelect.value = String(presetIndex);
                    dispatch(presetSelect, 'change');
                    const values = Controls.getValues();
                    Object.keys(preset.values || {}).forEach(function(key) {
                        const expected = Number(preset.values[key]);
                        const actual = Number(values[key]);
                        if (!approx(actual, expected, 0.001)) {
                            localFail('starter preset did not apply ' + key + ' expected ' + expected + ' got ' + actual);
                        }
                    });
                }
            }

            const layout = measureParamLayout();
            if (layout.rowOverflowCount || layout.controlOverflowCount || layout.labelOverflowCount || layout.pageHorizontalOverflow > 1) {
                localFail('parameter layout horizontal overflow: ' + JSON.stringify(layout));
            }

            const category = effect.category || 'Other';
            if (familySummary[category]) familySummary[category].params += defs.length;

            defs.forEach(function(p, index) {
                const row = rows[index];
                const control = row && row.querySelector('input, select');
                if (!row || !control) {
                    localFail('missing control for param ' + p.name);
                    return;
                }
                if (labelFor(row) !== (p.label || p.name)) {
                    localFail('label mismatch for ' + p.name);
                }

                const type = p.type || 'float';
                const values = Controls.getValues();

                if (type === 'select') {
                    const options = p.options || [];
                    const target = options.length > 1 ? options.length - 1 : 0;
                    control.value = String(target);
                    dispatch(control, 'change');
                    if (!approx(Controls.getValues()[p.name], target, 0.0001)) {
                        localFail('select value did not reach Controls for ' + p.name);
                    }
                    if (familySummary[category]) familySummary[category].selectParams += 1;
                    return;
                }

                if (type === 'color') {
                    control.value = '#336699';
                    dispatch(control, 'input');
                    const actual = Controls.getValues()[p.name];
                    if (!Array.isArray(actual) || actual.length !== 3 || !approx(actual[0], 0.2, 0.01) || !approx(actual[1], 0.4, 0.01) || !approx(actual[2], 0.6, 0.01)) {
                        localFail('color value did not reach Controls for ' + p.name);
                    }
                    return;
                }

                if (type === 'bool') {
                    control.checked = !control.checked;
                    dispatch(control, 'change');
                    const expected = control.checked ? 1 : 0;
                    if (!approx(Controls.getValues()[p.name], expected, 0.0001)) {
                        localFail('checkbox value did not reach Controls for ' + p.name);
                    }
                    return;
                }

                const target = midpointParam(p);
                control.value = String(target);
                const expected = type === 'int' ? parseInt(control.value) : parseFloat(control.value);
                dispatch(control, 'input');
                const actual = Controls.getValues()[p.name];
                if (!approx(actual, expected, type === 'int' ? 0.0001 : 0.001)) {
                    localFail('slider value did not reach Controls for ' + p.name + ' expected ' + expected + ' got ' + actual);
                }
                const display = row.querySelector('.val-display');
                if (!display || !display.textContent.trim()) {
                    localFail('missing value display for ' + p.name);
                }
            });

            const motionNames = defs
                .map(p => p.name)
                .filter(name => /(speed|zoom|rotation|morph|animate|pulse|frequency|flow|warp|twist|wobble|trail|rate|period|duration|phase|color|palette|mode|style|scale|detail|iteration|octave|density|glow|intensity|turbulence|damping|refraction|target|center|orbit|drift|decay|strength|threshold|contrast|saturation|brightness)/i.test(name));
            if (familySummary[category]) familySummary[category].motionParams += motionNames.length;

            effectResults.push({
                name: effect.name,
                category,
                params: defs.length,
                motionParams: motionNames.length,
                layout,
                success: localFailures.length === 0,
                failures: localFailures
            });
        }

        effectSelect.value = 'plasma';
        dispatch(effectSelect, 'change');

        if (Number(animSpeed.max) < 12) fail('Global Animation Speed max should allow at least 12x');
        animSpeed.value = '2.35';
        dispatch(animSpeed, 'input');
        if (!approx(Renderer.getAnimSpeed(), 2.35, 0.001)) fail('Global Animation Speed slider did not update Renderer');
        if (document.getElementById('animSpeedVal').textContent !== '2.4x') fail('Global Animation Speed display did not update');

        rotSpeed.value = '-1.25';
        dispatch(rotSpeed, 'input');
        if (!approx(Renderer.getRotationSpeed(), -1.25, 0.001)) fail('Rotation slider did not update Renderer');
        if (document.getElementById('rotSpeedVal').textContent !== '-1.3') fail('Rotation display did not update');

        viewZoom.value = '2.15';
        dispatch(viewZoom, 'input');
        if (!approx(Renderer.getViewZoom(), 2.15, 0.001)) fail('View Zoom slider did not update Renderer');
        if (document.getElementById('viewZoomVal').textContent !== '2.15x') fail('View Zoom display did not update');

        viewZoomDepth.value = '0.65';
        dispatch(viewZoomDepth, 'input');
        if (!approx(Renderer.getViewZoomDepth(), 0.65, 0.001)) fail('Zoom Pulse slider did not update Renderer');
        if (document.getElementById('viewZoomDepthVal').textContent !== '65%') fail('Zoom Pulse display did not update');

        if (Number(viewZoomSpeed.min) < 0) fail('Zoom Speed slider should not allow negative values');
        viewZoomSpeed.value = '-1.2';
        dispatch(viewZoomSpeed, 'input');
        if (!approx(Renderer.getViewZoomSpeed(), 0, 0.001)) fail('Zoom Speed slider did not clamp negative values');
        if (document.getElementById('viewZoomSpeedVal').textContent !== '0.00') fail('Zoom Speed display did not show clamped value');

        resSelect.value = '640x360';
        dispatch(resSelect, 'change');
        const smallRes = Renderer.getResolution();
        const overlayCanvas = document.getElementById('overlayCanvas');
        if (smallRes.width !== 640 || smallRes.height !== 360) fail('Resolution select did not update Renderer');
        if (!overlayCanvas || overlayCanvas.width !== 640 || overlayCanvas.height !== 360) fail('Resolution select did not resize overlays');
        resSelect.value = '1280x720';
        dispatch(resSelect, 'change');

        const originalTimed = VideoExport.timedRecording;
        const originalStart = VideoExport.startRecording;
        const originalStop = VideoExport.stopRecording;
        const originalIsRecording = VideoExport.isRecording;
        let timedArgs = null;
        try {
            VideoExport.timedRecording = function(canvas, duration, fps) {
                timedArgs = { hasCanvas: !!canvas, duration, fps };
            };
            VideoExport.startRecording = function(canvas, fps) {
                timedArgs = { hasCanvas: !!canvas, duration: null, fps };
            };
            VideoExport.stopRecording = function() {};
            VideoExport.isRecording = function() { return false; };
            fpsSelect.value = '24';
            durationInput.value = '7';
            // Recording length 'Same as preview loop' records for the preview duration.
            const recLength = document.getElementById('recLength');
            if (recLength) recLength.value = 'preview';
            document.getElementById('btnRecord').click();
            if (recLength) recLength.value = 'manual';
            if (!timedArgs || !timedArgs.hasCanvas || timedArgs.duration !== 7 || timedArgs.fps !== 24) {
                fail('Record button did not read FPS/Duration controls correctly');
            }
        } finally {
            VideoExport.timedRecording = originalTimed;
            VideoExport.startRecording = originalStart;
            VideoExport.stopRecording = originalStop;
            VideoExport.isRecording = originalIsRecording;
        }

        const postResults = [];
        PostProcess.getEffects().forEach(function(fx) {
            const cb = document.getElementById('pfx_' + fx.name);
            const group = cb && cb.closest('.overlay-group');
            const panel = group && group.querySelector('.overlay-params');
            const localFailures = [];
            function postFail(message) {
                localFailures.push(message);
                fail('postfx ' + fx.name + ': ' + message);
            }
            if (!cb || !panel) {
                postFail('missing checkbox or params panel');
            } else {
                cb.checked = true;
                dispatch(cb, 'change');
                if (!PostProcess.isEnabled(fx.name)) postFail('checkbox did not enable effect');
                if (panel.style.display === 'none') postFail('params did not become visible when enabled');
                const rows = Array.from(panel.querySelectorAll('.param-row'));
                const keys = Object.keys(fx.paramDefs || {});
                if (rows.length !== keys.length) postFail('param row count mismatch');
                keys.forEach(function(key, index) {
                    const p = fx.paramDefs[key];
                    const control = rows[index] && rows[index].querySelector('input, select');
                    if (!control) {
                        postFail('missing control for ' + key);
                        return;
                    }
                    if (p.type === 'select') {
                        const target = (p.options || []).length > 1 ? (p.options.length - 1) : 0;
                        control.value = String(target);
                        dispatch(control, 'change');
                        if (!approx(PostProcess.getParam(fx.name, key), target, 0.0001)) postFail('select did not update ' + key);
                    } else {
                        const target = midpointParam(p);
                        control.value = String(target);
                        const expected = p.type === 'int' ? parseInt(control.value) : parseFloat(control.value);
                        dispatch(control, 'input');
                        if (!approx(PostProcess.getParam(fx.name, key), expected, p.type === 'int' ? 0.0001 : 0.001)) postFail('slider did not update ' + key);
                    }
                });
                cb.checked = false;
                dispatch(cb, 'change');
                if (PostProcess.isEnabled(fx.name)) postFail('checkbox did not disable effect');
            }
            postResults.push({ name: fx.name, success: localFailures.length === 0, failures: localFailures });
        });

        const overlayDefs = [
            {
                id: 'strobe',
                params: [
                    { name: 'strobe_period', min: 0.03, max: 4, step: 0.01 },
                    { name: 'strobe_duration', min: 0.005, max: 2, step: 0.005 },
                    { name: 'strobe_intensity', min: 0.05, max: 1, step: 0.05 },
                    { name: 'strobe_blend_original', min: 0, max: 1, step: 0.05 },
                    { name: 'strobe_mode', type: 'select', options: ['White Flash', 'Solid Color', 'Color Cycle', 'Invert'] },
                    { name: 'strobe_color', type: 'color' },
                    { name: 'strobe_operator', type: 'select', options: ['Copy', 'Screen/Add', 'Multiply', 'Overlay', 'Hard Light', 'Difference'] },
                    { name: 'strobe_waveform', type: 'select', options: ['Square Gate', 'Sine Fade', 'Ramp Up', 'Ramp Down', 'Double Flash'] },
                    { name: 'strobe_random_probability', min: 0, max: 1, step: 0.05 },
                    { name: 'strobe_random_seed', min: 0, max: 999, step: 1, type: 'int' },
                    { name: 'strobe_softness', min: 0, max: 0.45, step: 0.01 },
                    { name: 'strobe_phase', min: 0, max: 1, step: 0.01 }
                ]
            },
            {
                id: 'lasers',
                params: [
                    { name: 'laser_count', min: 1, max: 16, step: 1, type: 'int' },
                    { name: 'laser_speed', min: 0.1, max: 5, step: 0.1 },
                    { name: 'laser_thickness', min: 1, max: 8, step: 0.5 },
                    { name: 'laser_glow', min: 0, max: 40, step: 1, type: 'int' },
                    { name: 'laser_mode', type: 'select', options: ['From Center', 'Rain', 'Scan', 'Random Bounce'] }
                ]
            },
            {
                id: 'figures',
                params: [
                    { name: 'figure_type', type: 'select', options: ['Circle', 'Triangle', 'Star', 'Hexagon', 'Cross', 'Infinity', 'Spiral', 'Flower of Life'] },
                    { name: 'figure_count', min: 1, max: 8, step: 1, type: 'int' },
                    { name: 'figure_size', min: 0.05, max: 0.8, step: 0.05 },
                    { name: 'figure_rotation', min: 0, max: 5, step: 0.1 },
                    { name: 'figure_thickness', min: 1, max: 8, step: 0.5 },
                    { name: 'figure_glow', min: 0, max: 30, step: 1, type: 'int' },
                    { name: 'figure_pulse', min: 0, max: 3, step: 0.1 }
                ]
            },
            {
                id: 'vignette',
                params: [
                    { name: 'vignette_strength', min: 0.1, max: 1, step: 0.05 }
                ]
            },
            {
                id: 'scanlines',
                params: [
                    { name: 'scanline_density', min: 1, max: 6, step: 1, type: 'int' },
                    { name: 'scanline_opacity', min: 0.05, max: 0.5, step: 0.05 }
                ]
            },
            {
                id: 'particles',
                params: [
                    { name: 'particle_count', min: 5, max: 150, step: 5, type: 'int' },
                    { name: 'particle_speed', min: 0.1, max: 5, step: 0.1 },
                    { name: 'particle_size', min: 1, max: 10, step: 0.5 },
                    { name: 'particle_brightness', min: 0.1, max: 1, step: 0.05 },
                    { name: 'particle_style', type: 'select', options: ['Drift', 'Rise', 'Orbit'] }
                ]
            }
        ];
        // The overlay engine owns its setting list; the static list above is the fallback.
        const liveOverlayDefs = window.Overlays && Overlays.getDefs ? Overlays.getDefs().map(function(d) {
            return { id: d.id, params: d.params.map(function(p) { return { name: p.name, min: p.min, max: p.max, step: p.step, type: p.type, options: p.options }; }) };
        }) : overlayDefs;
        const overlayResults = [];
        liveOverlayDefs.forEach(function(overlay) {
            const cb = document.getElementById('ov_' + overlay.id);
            const group = cb && cb.closest('.overlay-group');
            const panel = group && group.querySelector('.overlay-params');
            const localFailures = [];
            function overlayFail(message) {
                localFailures.push(message);
                fail('overlay ' + overlay.id + ': ' + message);
            }
            if (!cb || !panel) {
                overlayFail('missing checkbox or params panel');
            } else {
                cb.checked = true;
                dispatch(cb, 'change');
                if (!Overlays.isEnabled(overlay.id)) overlayFail('checkbox did not enable overlay');
                if (panel.style.display === 'none') overlayFail('params did not become visible when enabled');
                const rows = Array.from(panel.querySelectorAll('.param-row'));
                if (rows.length !== overlay.params.length) overlayFail('param row count mismatch');
                overlay.params.forEach(function(p, index) {
                    const control = rows[index] && rows[index].querySelector('input, select, textarea');
                    if (!control) {
                        overlayFail('missing control for ' + p.name);
                        return;
                    }
                    if (p.type === 'select') {
                        const target = (p.options || []).length > 1 ? (p.options.length - 1) : 0;
                        control.value = String(target);
                        dispatch(control, 'change');
                        if (!approx(Overlays.getParam(p.name), target, 0.0001)) overlayFail('select did not update ' + p.name);
                    } else if (p.type === 'image') {
                        // File picker: needs a real file, so only its presence is checked.
                    } else if (p.type === 'text' || p.type === 'textarea') {
                        control.value = 'Smoke';
                        dispatch(control, 'input');
                        if (Overlays.getParam(p.name) !== 'Smoke') overlayFail('text did not update ' + p.name);
                    } else if (p.type === 'color') {
                        control.value = '#336699';
                        dispatch(control, 'input');
                        const actual = Overlays.getParam(p.name);
                        if (!Array.isArray(actual) || actual.length !== 3 || !approx(actual[0], 0.2, 0.01) || !approx(actual[1], 0.4, 0.01) || !approx(actual[2], 0.6, 0.01)) {
                            overlayFail('color did not update ' + p.name);
                        }
                    } else {
                        const target = midpointParam(p);
                        control.value = String(target);
                        const expected = p.type === 'int' ? parseInt(control.value) : parseFloat(control.value);
                        dispatch(control, 'input');
                        if (!approx(Overlays.getParam(p.name), expected, p.type === 'int' ? 0.0001 : 0.001)) overlayFail('slider did not update ' + p.name);
                    }
                });
                cb.checked = false;
                dispatch(cb, 'change');
                if (Overlays.isEnabled(overlay.id)) overlayFail('checkbox did not disable overlay');
            }
            overlayResults.push({ id: overlay.id, success: localFailures.length === 0, failures: localFailures });
        });

        const musicResults = [];
        const bpm = document.getElementById('musicBPM');
        const key = document.getElementById('musicKey');
        const scale = document.getElementById('musicScale');
        const genre = document.getElementById('musicGenre');
        const volume = document.getElementById('musicVolume');
        if (!bpm || !key || !scale || !genre || !volume) {
            fail('Missing music controls');
        } else {
            bpm.value = '142';
            dispatch(bpm, 'input');
            if (Music.getBPM() !== 142 || document.getElementById('musicBPMVal').textContent !== '142') fail('BPM slider did not update Music');
            key.value = 'F#';
            dispatch(key, 'change');
            if (Music.getKey() !== 'F#') fail('Key select did not update Music');
            scale.value = 'dorian';
            dispatch(scale, 'change');
            if (Music.getScale() !== 'dorian') fail('Scale select did not update Music');
            const nextGenre = Music.getGenreList().filter(item => item !== Music.getGenre())[0] || Music.getGenre();
            genre.value = nextGenre;
            dispatch(genre, 'change');
            if (Music.getGenre() !== nextGenre) fail('Genre select did not update Music');
            volume.value = '-12';
            dispatch(volume, 'input');
            if (document.getElementById('musicVolumeVal').textContent !== '-12dB') fail('Volume display did not update');
            const inst = document.querySelector('#musicInstruments input[type="checkbox"]');
            if (!inst) fail('Missing instrument toggles');
            else {
                inst.checked = false;
                dispatch(inst, 'change');
                musicResults.push({ instrumentToggleId: inst.id, exercised: true });
            }
        }

        const sourceSelect = document.getElementById('audioSourceSelect');
        if (!sourceSelect) {
            fail('Missing audio source select');
        } else {
            sourceSelect.value = 'file';
            dispatch(sourceSelect, 'change');
            if (AudioAnalysis.getSource() !== 'file') fail('Audio source select did not switch to file');
            sourceSelect.value = 'studio';
            dispatch(sourceSelect, 'change');
            if (AudioAnalysis.getSource() !== 'studio') fail('Audio source select did not switch back to studio');
        }

        if (EffectRegistry.getList().some(effect => effect.name === 'shadertoy_lab')) {
            effectSelect.value = 'shadertoy_lab';
            dispatch(effectSelect, 'change');
            const panel = document.getElementById('shadertoyPanel');
            const quickKind = document.getElementById('shadertoyQuickKind');
            const quickMotion = document.getElementById('shadertoyQuickMotion');
            const quickPalette = document.getElementById('shadertoyQuickPalette');
            const quickDetail = document.getElementById('shadertoyQuickDetail');
            if (!panel || panel.classList.contains('hidden')) fail('Shadertoy Lab panel did not show when selected');
            if (!quickKind || !quickMotion || !quickPalette || !quickDetail) fail('Missing Shadertoy Quick Create controls');
            else {
                quickKind.value = 'audio_particles';
                dispatch(quickKind, 'change');
                quickMotion.value = 'rush';
                dispatch(quickMotion, 'change');
                quickPalette.value = 'matrix';
                dispatch(quickPalette, 'change');
                quickDetail.value = 'dense';
                dispatch(quickDetail, 'change');
                document.getElementById('shadertoyQuickGenerate').click();
                const project = ShadertoyHost.getProject();
                const image = project && project.passes && project.passes.filter(pass => pass.id === 'image')[0];
                if (!image || !image.source || image.source.indexOf('mainImage') < 0) fail('Shadertoy Quick Generate did not build image pass source');
                if (!image || !image.channels || !image.channels[0] || image.channels[0].kind !== 'audio') fail('Shadertoy audio Quick Create did not wire iChannel0 to audio');
            }
            effectSelect.value = 'plasma';
            dispatch(effectSelect, 'change');
            if (panel && !panel.classList.contains('hidden')) fail('Shadertoy Lab panel did not hide after switching away');
        }

        Renderer.setAnimSpeed(1);
        Renderer.setRotationSpeed(0);
        if (Renderer.setViewZoom) Renderer.setViewZoom(1);
        if (Renderer.setViewZoomDepth) Renderer.setViewZoomDepth(0);
        if (Renderer.setViewZoomSpeed) Renderer.setViewZoomSpeed(0.7);

        return {
            available: true,
            success: failures.length === 0,
            failures,
            effectOptionCount: optionValues.length,
            effectResults,
            familySummary,
            postResults,
            overlayResults,
            musicResults
        };
    })()`);
}

async function auditRendererInputPriority(cdp) {
    return await evaluate(cdp, `new Promise(function(resolve) {
        const failures = [];
        function fail(message) {
            failures.push(message);
        }

        if (!window.Renderer || typeof Renderer.prioritizeInput !== 'function' || typeof Renderer.getInputPriorityState !== 'function' ||
            typeof Renderer.setInputPriorityMode !== 'function' || typeof Renderer.getInputPriorityMode !== 'function' ||
            typeof Renderer.clearInputPriority !== 'function') {
            resolve({ available: true, success: false, failures: ['Renderer input-priority API missing'] });
            return;
        }

        try {
            EffectRegistry.switchTo('plasma');
        } catch (err) {
            // The priority path is renderer-level; an effect switch failure is reported elsewhere.
        }

        setTimeout(function() {
            const previousMode = Renderer.getInputPriorityMode();
            Renderer.setInputPriorityMode('strong');
            const before = Renderer.getInputPriorityState();
            Renderer.prioritizeInput(520);
            const immediate = Renderer.getInputPriorityState();

            setTimeout(function() {
                const during = Renderer.getInputPriorityState();
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.dispatchEvent(new Event('pointerdown', { bubbles: true }));
                } else {
                    fail('Missing #sidebar for UI event trigger');
                }
                const afterEvent = Renderer.getInputPriorityState();

                setTimeout(function() {
                    const finalState = Renderer.getInputPriorityState();
                    const skippedDelta = finalState.framesSkipped - before.framesSkipped;
                    const eventDelta = finalState.events - before.events;

                    if (!immediate.active) fail('manual priority request did not activate input priority');
                    if (immediate.mode !== 'strong') fail('input-priority mode did not switch to strong');
                    if (skippedDelta < 1) fail('renderer did not skip any submitted frames during priority window');
                    if (eventDelta < 2) fail('manual priority and sidebar event were not both counted');
                    if (finalState.minIntervalMs < 90) fail('strong input-priority frame interval is too low to help controls');
                    if (finalState.maxGapMs < 180 || finalState.maxGapMs > 340) fail('strong input-priority max gap is outside the expected relief range');
                    Renderer.setInputPriorityMode(previousMode);
                    Renderer.clearInputPriority();

                    resolve({
                        available: true,
                        success: failures.length === 0,
                        failures,
                        before,
                        immediate,
                        during,
                        afterEvent,
                        finalState,
                        skippedDelta,
                        eventDelta
                    });
                }, 180);
            }, 160);
        }, 80);
    })`);
}

async function auditGlobalViewZoom(cdp) {
    await evaluate(cdp, `(() => {
        if (Renderer.setViewZoom) Renderer.setViewZoom(1);
        if (Renderer.setViewZoomDepth) Renderer.setViewZoomDepth(0);
        if (Renderer.setViewZoomSpeed) Renderer.setViewZoomSpeed(0.7);
        EffectRegistry.switchTo('plasma');
        if (Renderer.resetTime) Renderer.resetTime();
    })()`);
    await wait(260);
    const neutral = await canvasStats(cdp);
    await evaluate(cdp, `(() => {
        Renderer.setViewZoom(2.4);
        Renderer.setViewZoomDepth(0);
        Renderer.setViewZoomSpeed(0.7);
    })()`);
    await wait(260);
    const zoomed = await canvasStats(cdp);
    const diff = sampleDiff(neutral, zoomed);
    const meta = await evaluate(cdp, `(() => {
        const state = Renderer.getViewZoomState ? Renderer.getViewZoomState() : null;
        const compiledImage = ShadertoyCompiler.buildFragmentSource({
            isWebGL2: true,
            passId: 'image',
            passSource: 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(fragCoord / iResolution.xy, 0.0, 1.0); }'
        }).source;
        const compiledBuffer = ShadertoyCompiler.buildFragmentSource({
            isWebGL2: true,
            passId: 'bufferA',
            passSource: 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(fragCoord / iResolution.xy, 0.0, 1.0); }'
        }).source;
        return {
            state,
            rendererOk: !!(Renderer.getViewZoom && Renderer.getViewZoomDepth && Renderer.getViewZoomSpeed),
            imageUsesViewCoord: compiledImage.indexOf('mainImage(color, psyViewFragCoord(gl_FragCoord.xy))') >= 0,
            bufferKeepsRawCoord: compiledBuffer.indexOf('mainImage(color, gl_FragCoord.xy)') >= 0,
            compilerUniformsOk: compiledImage.indexOf('uniform float u_view_zoom;') >= 0 &&
                compiledImage.indexOf('uniform float u_view_zoom_speed;') >= 0 &&
                compiledImage.indexOf('uniform float u_view_zoom_depth;') >= 0
        };
    })()`);
    await evaluate(cdp, `(() => {
        if (Renderer.setViewZoom) Renderer.setViewZoom(1);
        if (Renderer.setViewZoomDepth) Renderer.setViewZoomDepth(0);
        if (Renderer.setViewZoomSpeed) Renderer.setViewZoomSpeed(0.7);
    })()`);
    return {
        available: true,
        success: meta.rendererOk && meta.imageUsesViewCoord && meta.bufferKeepsRawCoord && meta.compilerUniformsOk &&
            meta.state && Math.abs(meta.state.zoom - 2.4) < 0.001 && diff > 0.001,
        diff,
        neutral: {
            mean: Number(neutral.mean.toFixed(5)),
            variance: Number(neutral.variance.toFixed(6))
        },
        zoomed: {
            mean: Number(zoomed.mean.toFixed(5)),
            variance: Number(zoomed.variance.toFixed(6))
        },
        meta
    };
}

async function auditGlobalTransformControls(cdp) {
    async function clickRange(id, fraction) {
        const rect = await evaluate(cdp, `(() => {
            const slider = document.getElementById(${JSON.stringify(id)});
            if (!slider) return null;
            slider.scrollIntoView({ block: 'center' });
            const r = slider.getBoundingClientRect();
            return { left: r.left, top: r.top, width: r.width, height: r.height };
        })()`);
        if (!rect) return false;
        const x = rect.left + rect.width * fraction;
        const y = rect.top + rect.height * 0.5;
        await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        await wait(120);
        return true;
    }

    await glErrors(cdp);
    const setup = await evaluate(cdp, `(() => {
        const select = document.getElementById('effectSelect');
        select.value = 'flam3_density_lab';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        Controls.setValues({ flam3_motion_rate: 0, flam3_color_speed: 0, flam3_accumulation_decay: 1 });
        Renderer.setAnimSpeed(0);
        Renderer.setRotationSpeed(0);
        Renderer.setRotation(0);
        Renderer.setViewZoom(1);
        Renderer.setViewZoomDepth(0);
        Renderer.setViewZoomSpeed(0.7);
        Renderer.resetTime();
        return EffectRegistry.getCurrent() && EffectRegistry.getCurrent().name;
    })()`);
    await wait(1700);
    const neutral = await canvasStats(cdp);

    const clickedZoom = await clickRange('viewZoom', 0.56);
    const zoomed = await canvasStats(cdp);
    const zoomState = await evaluate(cdp, `Renderer.getViewZoomState()`);
    const zoomDiff = sampleDiff(neutral, zoomed);

    await evaluate(cdp, `(() => { Renderer.setViewZoom(1); Renderer.setRotation(0); Renderer.setRotationSpeed(0); })()`);
    await wait(120);
    const rotationA = await canvasStats(cdp);
    const clickedRotation = await clickRange('rotSpeed', 0.70);
    const rotationStart = await evaluate(cdp, `({ speed: Renderer.getRotationSpeed(), angle: Renderer.getRotation() })`);
    await wait(520);
    const rotationB = await canvasStats(cdp);
    const rotationEnd = await evaluate(cdp, `({ speed: Renderer.getRotationSpeed(), angle: Renderer.getRotation() })`);
    const rotationDiff = sampleDiff(rotationA, rotationB);

    await evaluate(cdp, `(() => { Renderer.setRotationSpeed(0); Renderer.setRotation(0); Renderer.setViewZoom(1); })()`);
    const clickedPulse = await clickRange('viewZoomDepth', 0.62);
    const clickedPulseSpeed = await clickRange('viewZoomSpeed', 0.74);
    const pulseState = await evaluate(cdp, `(() => ({
        state: Renderer.getViewZoomState(),
        atZero: Renderer.getEffectiveViewZoom(0),
        atQuarter: Renderer.getEffectiveViewZoom(0.25)
    }))()`);
    const errors = await glErrors(cdp);
    await evaluate(cdp, `(() => {
        Renderer.setAnimSpeed(1);
        Renderer.setRotationSpeed(0);
        Renderer.setRotation(0);
        Renderer.setViewZoom(1);
        Renderer.setViewZoomDepth(0);
        Renderer.setViewZoomSpeed(0.7);
        Renderer.resetTime();
    })()`);

    const rotationDelta = Math.abs(rotationEnd.angle - rotationStart.angle);
    const success = setup === 'flam3_density_lab' && clickedZoom && clickedRotation && clickedPulse && clickedPulseSpeed &&
        zoomState.zoom > 2 && zoomDiff > 0.003 && Math.abs(rotationStart.speed) > 0.2 &&
        rotationDelta > 0.1 && rotationDiff > 0.002 && pulseState.state.depth > 0.2 &&
        pulseState.state.speed > 1 && Math.abs(pulseState.atQuarter - pulseState.atZero) > 0.03 && errors.length === 0;
    return {
        available: true,
        success,
        setup,
        zoom: { clicked: clickedZoom, state: zoomState, diff: zoomDiff },
        rotation: { clicked: clickedRotation, start: rotationStart, end: rotationEnd, delta: rotationDelta, diff: rotationDiff },
        pulse: { clicked: clickedPulse, speedClicked: clickedPulseSpeed, state: pulseState },
        glErrors: errors
    };
}

async function auditProgressiveDensityRenderer(cdp) {
    return await evaluate(cdp, `(async () => {
        if (!window.ProgressiveDensityRenderer || !ProgressiveDensityRenderer.selfTest) {
            return {
                available: false,
                success: false,
                failures: ['ProgressiveDensityRenderer is unavailable']
            };
        }
        return await ProgressiveDensityRenderer.selfTest();
    })()`);
}

async function auditShaderFallback(cdp) {
    const result = await evaluate(cdp, `(() => {
        EffectRegistry.switchTo('plasma');
        const before = EffectRegistry.getCurrent() && EffectRegistry.getCurrent().name;
        const original = ShaderManager.createProgram;
        ShaderManager.createProgram = function(source, name) {
            if (name === 'mandelbrot') return null;
            return original.apply(ShaderManager, arguments);
        };
        let switched = false;
        let current = '';
        let selected = '';
        try {
            switched = EffectRegistry.switchTo('mandelbrot');
            current = EffectRegistry.getCurrent() && EffectRegistry.getCurrent().name;
            selected = document.getElementById('effectSelect').value;
        } finally {
            ShaderManager.createProgram = original;
        }
        return { before, switched, current, selected };
    })()`);
    await wait(240);
    const stats = await canvasStats(cdp);
    return {
        available: true,
        success: result.before === 'plasma' && result.switched === true && result.current === 'plasma' &&
            result.selected === 'plasma' && stats.alpha > 0.1 && (stats.variance > 0.00002 || stats.mean > 0.003),
        result,
        mean: Number(stats.mean.toFixed(5)),
        variance: Number(stats.variance.toFixed(6))
    };
}

async function measureFps(cdp, name) {
    await evaluate(cdp, `EffectRegistry.switchTo(${JSON.stringify(name)})`);
    await wait(1200);
    const fps = await evaluate(cdp, `Renderer.getFPS ? Renderer.getFPS() : 0`);
    return { name, fps };
}

async function auditInfiniteFractalZoom(cdp) {
    const names = ['mandelbrot', 'burning_ship', 'tricorn', 'multibrot', 'mandelbrot_deep', 'orbit_trap', 'escape_time_lab'];
    const results = [];
    const seamEpsilon = 0.008;

    for (const name of names) {
        await glErrors(cdp);
        const setup = await evaluate(cdp, `(() => {
            EffectRegistry.switchTo(${JSON.stringify(name)});
            if (Renderer.resetTime) Renderer.resetTime();
            const effect = EffectRegistry.getCurrent();
            const params = effect && effect.params || [];
            const depthParam = params.find(p => p.name === 'zoom_depth');
            const zoomDepth = depthParam ? Number(depthParam.min || depthParam.default || 6) : 6;
            if (Controls.setValues) Controls.setValues({ zoom_mode: 0, zoom_speed: 1, zoom_depth: zoomDepth, color_speed: 0 });
            if (Renderer.setAnimSpeed) Renderer.setAnimSpeed(0);
            if (Renderer.setTime) Renderer.setTime(zoomDepth - ${seamEpsilon});
            return {
                effectName: effect && effect.name,
                hasZoomMode: params.some(p => p.name === 'zoom_mode'),
                hasZoomDepth: params.some(p => p.name === 'zoom_depth'),
                hasSeamClock: !!(Renderer.setTime && Renderer.getUnwrappedTime),
                zoomDepth
            };
        })()`);
        await wait(180);
        const beforeSeam = await canvasStats(cdp);
        await evaluate(cdp, `Renderer.setTime(${seamEpsilon} + ${JSON.stringify(setup.zoomDepth)})`);
        await wait(180);
        const afterSeam = await canvasStats(cdp);
        await evaluate(cdp, `Renderer.setTime(${JSON.stringify(setup.zoomDepth)} * 0.34)`);
        await wait(160);
        const motionA = await canvasStats(cdp);
        await evaluate(cdp, `Renderer.setTime(${JSON.stringify(setup.zoomDepth)} * 0.44)`);
        await wait(160);
        const motionB = await canvasStats(cdp);
        const errors = await glErrors(cdp);
        const seamDelta = sampleDiff(beforeSeam, afterSeam);
        const changed = sampleDiff(motionA, motionB);
        const nonflat = beforeSeam.alpha > 0.1 && beforeSeam.mean > 0.003 && beforeSeam.variance > 0.00002;
        const needsZoomMode = name !== 'escape_time_lab';
        results.push({
            name,
            success: setup.effectName === name && (!needsZoomMode || setup.hasZoomMode) && setup.hasZoomDepth && setup.hasSeamClock &&
                nonflat && changed > 0.00002 && seamDelta < 0.12 && errors.length === 0,
            needsZoomMode,
            hasZoomMode: setup.hasZoomMode,
            hasZoomDepth: setup.hasZoomDepth,
            hasSeamClock: setup.hasSeamClock,
            nonflat,
            changed,
            seamDelta,
            seamLimit: 0.12,
            mean: Number(beforeSeam.mean.toFixed(5)),
            variance: Number(beforeSeam.variance.toFixed(6)),
            glErrors: errors
        });
    }

    await evaluate(cdp, `(() => {
        if (Renderer.setAnimSpeed) Renderer.setAnimSpeed(1);
        if (Renderer.resetTime) Renderer.resetTime();
    })()`);

    return {
        available: true,
        success: results.every(item => item.success),
        results
    };
}

async function auditFlam3Responsiveness(cdp) {
    await glErrors(cdp);
    const setup = await evaluate(cdp, `(() => {
        const select = document.getElementById('effectSelect');
        select.value = 'flam3_density_lab';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if (Renderer.setAnimSpeed) Renderer.setAnimSpeed(1);
        if (Renderer.resetTime) Renderer.resetTime();
        return {
            effectName: EffectRegistry.getCurrent() && EffectRegistry.getCurrent().name,
            params: Controls.getParamDefs ? Controls.getParamDefs().length : 0
        };
    })()`);
    await wait(1800);
    const initial = await evaluate(cdp, `(() => {
        const effect = EffectRegistry.getCurrent();
        const diagnostics = effect && effect.getDiagnostics ? effect.getDiagnostics() : null;
        const slider = document.querySelector('[data-param="flam3_motion_rate"] input[type="range"]');
        const rect = slider && slider.getBoundingClientRect();
        Controls.setValues({ flam3_render_scale: 0.91 });
        const presetApplied = Controls.applyPreset ? Controls.applyPreset(1) : false;
        return {
            diagnostics,
            presetApplied,
            presetRenderScale: Controls.getValues().flam3_render_scale,
            sliderHeight: rect ? rect.height : 0
        };
    })()`);

    const motionRect = await evaluate(cdp, `(() => {
        const slider = document.querySelector('[data-param="flam3_motion_rate"] input[type="range"]');
        if (!slider) return null;
        slider.scrollIntoView({ block: 'center' });
        const r = slider.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
    })()`);
    if (motionRect) {
        const x = motionRect.left + motionRect.width * 0.78;
        const y = motionRect.top + motionRect.height * 0.5;
        await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    }
    await wait(180);
    const motionControl = await evaluate(cdp, `(() => {
        const row = document.querySelector('[data-param="flam3_motion_rate"]');
        const slider = row && row.querySelector('input[type="range"]');
        const display = row && row.querySelector('.val-display');
        return slider ? {
            domValue: Number(slider.value),
            controlValue: Number(Controls.getValues().flam3_motion_rate),
            display: display && display.textContent,
            ariaValue: slider.getAttribute('aria-valuetext')
        } : null;
    })()`);

    const rotateBefore = await evaluate(cdp, `(() => {
        const effect = EffectRegistry.getCurrent();
        const slider = document.querySelector('[data-param="flam3_rotate"] input[type="range"]');
        if (slider) slider.scrollIntoView({ block: 'center' });
        const r = slider && slider.getBoundingClientRect();
        const d = effect && effect.getDiagnostics ? effect.getDiagnostics() : null;
        return r ? { left: r.left, top: r.top, width: r.width, height: r.height, resetCount: d && d.resetCount || 0 } : null;
    })()`);
    if (rotateBefore) {
        const y = rotateBefore.top + rotateBefore.height * 0.5;
        const points = [0.24, 0.40, 0.56, 0.72, 0.84];
        const startX = rotateBefore.left + rotateBefore.width * points[0];
        await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: startX, y, button: 'left', clickCount: 1 });
        for (let i = 1; i < points.length; i++) {
            await cdp.send('Input.dispatchMouseEvent', {
                type: 'mouseMoved',
                x: rotateBefore.left + rotateBefore.width * points[i],
                y,
                button: 'left',
                buttons: 1
            });
            await wait(35);
        }
        const endX = rotateBefore.left + rotateBefore.width * points[points.length - 1];
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: endX, y, button: 'left', clickCount: 1 });
    }
    await wait(520);
    const afterDrag = await evaluate(cdp, `(() => {
        const effect = EffectRegistry.getCurrent();
        const d = effect && effect.getDiagnostics ? effect.getDiagnostics() : null;
        const row = document.querySelector('[data-param="flam3_rotate"]');
        const slider = row && row.querySelector('input[type="range"]');
        return {
            diagnostics: d,
            domValue: slider ? Number(slider.value) : null,
            controlValue: Number(Controls.getValues().flam3_rotate)
        };
    })()`);
    const visualA = await canvasStats(cdp);
    await wait(700);
    const visualB = await canvasStats(cdp);
    const changed = sampleDiff(visualA, visualB);
    const errors = await glErrors(cdp);
    const initialFrames = initial.diagnostics && initial.diagnostics.accumulationFrames || 0;
    const resetDelta = rotateBefore && afterDrag.diagnostics ? afterDrag.diagnostics.resetCount - rotateBefore.resetCount : 99;
    const motionSynced = !!motionControl && Math.abs(motionControl.domValue - 2.4) > 0.1 &&
        Math.abs(motionControl.domValue - motionControl.controlValue) < 0.0001 &&
        motionControl.display && motionControl.ariaValue === motionControl.display;
    const rotateSynced = rotateBefore && Math.abs(afterDrag.domValue - afterDrag.controlValue) < 0.0001;
    const success = setup.effectName === 'flam3_density_lab' && setup.params === 29 &&
        initialFrames >= 7 && initial.sliderHeight >= 20 && initial.presetApplied &&
        Math.abs(initial.presetRenderScale - 0.52) < 0.0001 && motionSynced && rotateSynced &&
        resetDelta >= 1 && resetDelta <= 2 && changed > 0.002 && errors.length === 0;
    return {
        available: true,
        success,
        setup,
        initialFrames,
        sliderHeight: initial.sliderHeight,
        presetRenderScale: initial.presetRenderScale,
        motionControl,
        rotateControl: { domValue: afterDrag.domValue, controlValue: afterDrag.controlValue, resetDelta },
        changed,
        diagnostics: afterDrag.diagnostics,
        glErrors: errors
    };
}

const fractalFlightCommonRequired = [
    'flight_speed',
    'orbit_radius',
    'orbit_spin',
    'motion_mode',
    'motion_phase',
    'roll',
    'roll_speed',
    'fov',
    'color_speed',
    'palette',
    'shade_mode',
    'fog',
    'glow'
];

const fractalFlightGroups = ['Formula', 'Flight', 'Animation', 'Visual'];

function uniqueList(items) {
    return Array.from(new Set(items));
}

async function audit3DFlightEffect(cdp, config) {
    await glErrors(cdp);
    const required = uniqueList((config.required || []).concat(fractalFlightCommonRequired));
    const setup = await evaluate(cdp, `(() => {
        const config = ${JSON.stringify({
            name: config.name,
            values: config.values || {},
            required,
            depthParams: config.depthParams || [],
            groups: fractalFlightGroups
        })};
        const switched = EffectRegistry.switchTo(config.name);
        if (Renderer.setAnimSpeed) Renderer.setAnimSpeed(1);
        if (Renderer.resetTime) Renderer.resetTime();
        if (Controls.setValues) {
            Controls.setValues(config.values);
        }
        const effect = EffectRegistry.getCurrent();
        const params = effect && effect.params || [];
        const paramNames = params.map(p => p.name);
        const groups = params.reduce((acc, p) => {
            if (p.group && acc.indexOf(p.group) < 0) acc.push(p.group);
            return acc;
        }, []);
        const currentValues = Controls.getValues ? Controls.getValues() : {};
        const valueKeys = Object.keys(config.values || {});
        const valuesApplied = valueKeys.every(key => {
            if (!Object.prototype.hasOwnProperty.call(currentValues, key)) return false;
            const expected = config.values[key];
            const actual = currentValues[key];
            if (typeof expected === 'number' && typeof actual === 'number') {
                return Math.abs(expected - actual) < 0.000001;
            }
            return expected === actual;
        });
        const depthOk = config.depthParams.some(name => paramNames.indexOf(name) >= 0);
        const commonOk = ${JSON.stringify(fractalFlightCommonRequired)}.every(name => paramNames.indexOf(name) >= 0);
        const groupOk = config.groups.every(name => groups.indexOf(name) >= 0);
        return {
            switched,
            effectName: effect && effect.name,
            requiredOk: config.required.every(name => paramNames.indexOf(name) >= 0),
            commonOk,
            depthOk,
            groupOk,
            valuesApplied,
            groups,
            missing: config.required.filter(name => paramNames.indexOf(name) < 0),
            missingCommon: ${JSON.stringify(fractalFlightCommonRequired)}.filter(name => paramNames.indexOf(name) < 0),
            missingGroups: config.groups.filter(name => groups.indexOf(name) < 0),
            missingValues: valueKeys.filter(key => !Object.prototype.hasOwnProperty.call(currentValues, key)),
            paramNames
        };
    })()`);
    await wait(config.warmupMs || 850);
    const early = await canvasStats(cdp);
    await wait(config.sampleMs || 700);
    const late = await canvasStats(cdp);
    const errors = await glErrors(cdp);
    const changed = sampleDiff(early, late);
    // Either sample may land inside the fractal for a moment (random seed per run),
    // so the flight passes if one of them shows structure.
    const hasDetail = st => st.alpha > 0.1 && st.mean > 0.003 && st.variance > 0.00002;
    const nonflat = hasDetail(early) || hasDetail(late);

    return {
        available: setup.effectName === config.name || setup.switched !== undefined,
        success: setup.switched === true && setup.effectName === config.name &&
            setup.requiredOk && setup.commonOk && setup.depthOk && setup.groupOk && setup.valuesApplied &&
            nonflat && changed > (config.minChanged || 0.001) && errors.length === 0,
        setup,
        nonflat,
        changed,
        animated: changed > (config.minChanged || 0.001),
        mean: Number(early.mean.toFixed(5)),
        variance: Number(early.variance.toFixed(6)),
        glErrors: errors
    };
}

async function auditMandelbulbFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'mandelbulb_flight',
        depthParams: ['flight_depth'],
        required: [
            'power',
            'max_iter',
            'march_steps',
            'bailout',
            'detail',
            'flight_depth',
            'fold_target',
            'polar_anim',
            'structure_pulse'
        ],
        values: {
            flight_speed: 1.15,
            flight_depth: 1.65,
            orbit_spin: 1.8,
            polar_anim: 0.8,
            motion_mode: 2,
            motion_phase: 0.25,
            structure_pulse: 0.75,
            roll_speed: 1.4,
            color_speed: 0.75,
            march_steps: 88,
            fold_target: 2,
            palette: 1,
            shade_mode: 2
        }
    });
}

async function auditTriplexMutationFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'triplex_mutation_flight',
        depthParams: ['flight_depth'],
        required: [
            'family',
            'power',
            'iterations',
            'march_steps',
            'bailout',
            'phase_twist',
            'abs_mix',
            'detail',
            'flight_depth',
            'target_mode',
            'structure_pulse',
            'formula_morph'
        ],
        values: {
            family: 4,
            power: 7.5,
            iterations: 18,
            march_steps: 112,
            bailout: 5.75,
            phase_twist: 0.72,
            abs_mix: 0.85,
            flight_speed: 2.45,
            flight_depth: 1.75,
            orbit_radius: 1.18,
            orbit_spin: 1.75,
            target_mode: 2,
            motion_mode: 3,
            motion_phase: 0.31,
            structure_pulse: 0.82,
            formula_morph: 0.95,
            roll_speed: 1.65,
            color_speed: 0.84,
            palette: 1,
            shade_mode: 3,
            fog: 0.24,
            glow: 1.85
        },
        minChanged: 0.0015
    });
}

async function auditMandelboxFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'mandelbox_flight',
        depthParams: ['flight_depth'],
        required: [
            'scale',
            'iterations',
            'box_fold',
            'min_radius',
            'fixed_radius',
            'bailout',
            'detail',
            'flight_depth',
            'fold_target',
            'fold_rotation',
            'structure_pulse'
        ],
        values: {
            scale: -1.74,
            iterations: 14,
            box_fold: 1.08,
            min_radius: 0.24,
            fixed_radius: 1.04,
            flight_speed: 2.25,
            flight_depth: 1.85,
            orbit_spin: 1.65,
            fold_target: 2,
            motion_mode: 2,
            motion_phase: 0.28,
            fold_rotation: 0.72,
            structure_pulse: 0.78,
            roll_speed: 1.55,
            color_speed: 0.82,
            palette: 2,
            shade_mode: 3,
            fog: 0.22,
            glow: 1.65
        }
    });
}

async function auditFoldedBoxVariantsFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'folded_box_variants_flight',
        depthParams: ['flight_depth'],
        required: [
            'family',
            'iterations',
            'fold_scale',
            'box_fold',
            'sphere_min',
            'sphere_fixed',
            'fold_offset',
            'surf_amp',
            'bulb_power',
            'bailout',
            'detail',
            'flight_depth',
            'fold_rotation',
            'scale_pulse',
            'surf_motion',
            'bulb_mix'
        ],
        values: {
            family: 4,
            iterations: 13,
            fold_scale: -1.46,
            box_fold: 1.02,
            sphere_min: 0.24,
            sphere_fixed: 1.02,
            fold_offset: 0.18,
            surf_amp: 0.62,
            bulb_power: 5.6,
            bailout: 9.0,
            detail: 1.26,
            flight_speed: 2.42,
            flight_depth: 1.72,
            orbit_radius: 1.16,
            orbit_spin: 1.78,
            motion_mode: 2,
            motion_phase: 0.34,
            fold_rotation: 0.92,
            scale_pulse: 0.78,
            surf_motion: 0.86,
            bulb_mix: 0.92,
            roll_speed: 1.66,
            color_speed: 0.86,
            palette: 2,
            shade_mode: 3,
            fog: 0.22,
            glow: 1.86
        },
        minChanged: 0.0014
    });
}

async function auditQuaternionJuliaFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'quaternion_julia_flight',
        depthParams: ['flight_depth'],
        required: [
            'c_x',
            'c_y',
            'c_z',
            'c_w',
            'slice_w',
            'power',
            'iterations',
            'bailout',
            'detail',
            'flight_depth',
            'target_mode',
            'constant_morph',
            'slice_motion'
        ],
        values: {
            c_x: -0.18,
            c_y: 0.72,
            c_z: 0.04,
            c_w: -0.22,
            slice_w: 0.04,
            power: 2,
            iterations: 20,
            flight_speed: 2.1,
            flight_depth: 1.35,
            orbit_radius: 1.25,
            orbit_spin: 1.55,
            target_mode: 1,
            motion_mode: 2,
            motion_phase: 0.24,
            constant_morph: 0.65,
            slice_motion: 0.78,
            roll_speed: 1.45,
            color_speed: 0.76,
            palette: 0,
            shade_mode: 2,
            fog: 0.24,
            glow: 1.55
        }
    });
}

async function auditHypercomplexSliceFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'hypercomplex_slice_flight',
        depthParams: ['flight_depth'],
        required: [
            'family',
            'c_x',
            'c_y',
            'c_z',
            'c_w',
            'slice_w',
            'power',
            'iterations',
            'bailout',
            'detail',
            'flight_depth',
            'target_mode',
            'constant_morph',
            'slice_motion',
            'rotation_4d'
        ],
        values: {
            family: 2,
            c_x: -0.22,
            c_y: 0.58,
            c_z: 0.10,
            c_w: -0.24,
            slice_w: 0.08,
            power: 2.85,
            iterations: 20,
            bailout: 7,
            detail: 1.28,
            flight_speed: 2.35,
            flight_depth: 1.55,
            orbit_radius: 1.22,
            orbit_spin: 1.72,
            target_mode: 2,
            motion_mode: 2,
            motion_phase: 0.26,
            constant_morph: 0.88,
            slice_motion: 0.92,
            rotation_4d: 0.86,
            roll_speed: 1.58,
            color_speed: 0.82,
            palette: 2,
            shade_mode: 3,
            fog: 0.24,
            glow: 1.75
        },
        minChanged: 0.0015
    });
}

async function auditSchottkyInversionFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'schottky_inversion_flight',
        depthParams: ['tunnel_depth'],
        required: [
            'family',
            'iterations',
            'sphere_radius',
            'sphere_gap',
            'center_radius',
            'inversion_factor',
            'bailout',
            'detail',
            'tunnel_depth',
            'sphere_pulse',
            'limit_twist'
        ],
        values: {
            family: 3,
            iterations: 10,
            sphere_radius: 0.72,
            sphere_gap: 0.38,
            center_radius: 1.02,
            inversion_factor: 1.0,
            flight_speed: 2.15,
            tunnel_depth: 1.45,
            orbit_radius: 1.25,
            orbit_spin: 1.65,
            motion_mode: 2,
            motion_phase: 0.22,
            sphere_pulse: 0.72,
            limit_twist: 0.74,
            roll_speed: 1.55,
            color_speed: 0.82,
            palette: 2,
            shade_mode: 2,
            fog: 0.22,
            glow: 1.75
        }
    });
}

async function auditApollonianFoamFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'apollonian_foam_flight',
        depthParams: ['tunnel_depth'],
        required: [
            'family',
            'iterations',
            'inversion_radius',
            'foam_density',
            'cell_scale',
            'sphere_gap',
            'fold_limit',
            'bailout',
            'detail',
            'tunnel_depth',
            'inversion_pulse',
            'limit_twist',
            'cell_breath'
        ],
        values: {
            family: 2,
            iterations: 11,
            inversion_radius: 0.96,
            foam_density: 1.72,
            cell_scale: 2.48,
            sphere_gap: 0.30,
            fold_limit: 1.08,
            bailout: 8.5,
            detail: 1.28,
            flight_speed: 2.45,
            tunnel_depth: 1.72,
            orbit_radius: 1.18,
            orbit_spin: 1.78,
            motion_mode: 2,
            motion_phase: 0.31,
            inversion_pulse: 0.82,
            limit_twist: 0.92,
            cell_breath: 0.86,
            roll_speed: 1.68,
            color_speed: 0.88,
            palette: 1,
            shade_mode: 3,
            fog: 0.22,
            glow: 1.85
        },
        minChanged: 0.0014
    });
}

async function auditPolyfoldFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'polyfold_flight',
        depthParams: ['tunnel_depth'],
        required: [
            'family',
            'iterations',
            'fold_scale',
            'fold_offset',
            'fold_bias',
            'fold_rotation',
            'poly_twist',
            'bailout',
            'thickness',
            'tunnel_depth',
            'structure_pulse'
        ],
        values: {
            family: 5,
            iterations: 11,
            fold_scale: 2.92,
            fold_offset: 0.74,
            fold_bias: 0.18,
            fold_rotation: 0.68,
            poly_twist: 0.74,
            flight_speed: 2.35,
            tunnel_depth: 1.75,
            orbit_radius: 1.22,
            orbit_spin: 1.75,
            motion_mode: 2,
            motion_phase: 0.27,
            structure_pulse: 0.82,
            roll_speed: 1.62,
            color_speed: 0.88,
            palette: 2,
            shade_mode: 3,
            fog: 0.20,
            glow: 1.95
        }
    });
}

async function auditKifsFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'kifs_flight',
        depthParams: ['tunnel_depth'],
        required: [
            'family',
            'iterations',
            'fold_scale',
            'fold_offset',
            'fold_bias',
            'fold_rotation',
            'bailout',
            'thickness',
            'tunnel_depth',
            'structure_pulse'
        ],
        values: {
                family: 2,
                iterations: 8,
                fold_scale: 3.05,
                fold_offset: 0.86,
                fold_bias: 0.18,
                fold_rotation: 0.45,
                flight_speed: 2.2,
                tunnel_depth: 1.65,
                orbit_spin: 1.55,
                motion_mode: 3,
                motion_phase: 0.33,
                structure_pulse: 0.65,
                roll_speed: 1.35,
                color_speed: 0.85,
                palette: 2,
                shade_mode: 3,
                fog: 0.18,
                glow: 1.85
        }
    });
}

async function auditDifsTunnelFlight(cdp) {
    return audit3DFlightEffect(cdp, {
        name: 'difs_tunnel_flight',
        depthParams: ['tunnel_depth'],
        required: [
            'family',
            'iterations',
            'fold_scale',
            'fold_offset',
            'fold_bias',
            'symmetry',
            'twist',
            'thickness',
            'bailout',
            'detail',
            'tunnel_depth',
            'structure_pulse',
            'fold_rotation'
        ],
        values: {
            family: 3,
            iterations: 10,
            fold_scale: 2.85,
            fold_offset: 0.78,
            fold_bias: 0.18,
            symmetry: 7,
            twist: 0.82,
            thickness: 0.72,
            bailout: 4.6,
            detail: 1.26,
            flight_speed: 2.5,
            tunnel_depth: 1.85,
            orbit_radius: 1.05,
            orbit_spin: 1.82,
            motion_mode: 2,
            motion_phase: 0.29,
            structure_pulse: 0.88,
            fold_rotation: 0.92,
            roll_speed: 1.72,
            color_speed: 0.88,
            palette: 1,
            shade_mode: 3,
            fog: 0.20,
            glow: 2.05
        },
        minChanged: 0.0015
    });
}

async function audit3DFlightCoverage(cdp) {
    return await evaluate(cdp, `(() => {
        const planned = [
            'mandelbulb_flight',
            'kifs_flight',
            'mandelbox_flight',
            'quaternion_julia_flight',
            'schottky_inversion_flight',
            'polyfold_flight'
        ];
        const commonDefault = ${JSON.stringify(fractalFlightCommonRequired)};
        const groupsDefault = ${JSON.stringify(fractalFlightGroups)};
        const effects = EffectRegistry.getList();
        const byName = {};
        const metadataNames = [];
        effects.forEach(item => {
            let meta = item.fractalFlight || null;
            if (!meta) {
                EffectRegistry.switchTo(item.name);
                const effect = EffectRegistry.getCurrent();
                meta = effect && effect.fractalFlight || null;
            }
            byName[item.name] = { item, meta };
            if (meta && meta.kind === 'de-raymarch') metadataNames.push(item.name);
        });
        const targetNames = Array.from(new Set(planned.concat(metadataNames)));
        const results = targetNames.map(name => {
            const record = byName[name];
            const exists = !!record;
            if (!exists) {
                return {
                    name,
                    exists,
                    pending: name !== 'mandelbulb_flight' && name !== 'kifs_flight',
                    params: 0,
                    groups: [],
                    commonOk: false,
                    depthOk: false,
                    groupOk: false,
                    metadataOk: false,
                    requiredOk: false,
                    modeParamOk: false,
                    missingCommon: commonDefault,
                    missingRequired: [],
                    metadataErrors: ['missing effect registration']
                };
            }
            EffectRegistry.switchTo(name);
            const effect = EffectRegistry.getCurrent();
            const meta = effect && effect.fractalFlight || record.meta || null;
            const params = effect && effect.params || [];
            const paramNames = params.map(p => p.name);
            const groups = params.reduce((acc, p) => {
                if (p.group && acc.indexOf(p.group) < 0) acc.push(p.group);
                return acc;
            }, []);
            const commonParams = meta && Array.isArray(meta.commonParams) && meta.commonParams.length ? meta.commonParams : commonDefault;
            const depthParams = meta && Array.isArray(meta.depthParams) && meta.depthParams.length ? meta.depthParams : ['flight_depth', 'tunnel_depth'];
            const requiredGroups = meta && Array.isArray(meta.requiredGroups) && meta.requiredGroups.length ? meta.requiredGroups : groupsDefault;
            const requiredParams = meta && Array.isArray(meta.requiredParams) ? meta.requiredParams : [];
            const missingCommon = commonParams.filter(paramName => paramNames.indexOf(paramName) < 0);
            const missingGroups = requiredGroups.filter(groupName => groups.indexOf(groupName) < 0);
            const missingRequired = requiredParams.filter(paramName => paramNames.indexOf(paramName) < 0);
            const metadataErrors = [];
            let modeParamOk = true;
            if (!meta) {
                metadataErrors.push('missing fractalFlight metadata');
                modeParamOk = false;
            } else {
                if (meta.kind !== 'de-raymarch') metadataErrors.push('metadata kind must be de-raymarch');
                if (!meta.family) metadataErrors.push('metadata family missing');
                if (!Array.isArray(meta.modes) || meta.modes.length < 1) metadataErrors.push('metadata modes missing');
                if (!Array.isArray(meta.depthParams) || meta.depthParams.length < 1) metadataErrors.push('metadata depthParams missing');
                if (!Array.isArray(meta.commonParams) || meta.commonParams.length < commonDefault.length) metadataErrors.push('metadata commonParams incomplete');
                if (!Array.isArray(meta.requiredGroups) || meta.requiredGroups.length < groupsDefault.length) metadataErrors.push('metadata requiredGroups incomplete');
                if (meta.modeParam) {
                    modeParamOk = paramNames.indexOf(meta.modeParam) >= 0;
                    const modeDef = params.find(p => p.name === meta.modeParam);
                    if (!modeParamOk) metadataErrors.push('modeParam does not map to a param');
                    if (modeDef && modeDef.type === 'select' && Array.isArray(modeDef.options) && modeDef.options.length !== meta.modes.length) {
                        metadataErrors.push('metadata modes length does not match select options');
                    }
                }
            }
            return {
                name,
                exists,
                pending: false,
                params: params.length,
                groups,
                commonOk: missingCommon.length === 0,
                depthOk: depthParams.some(paramName => paramNames.indexOf(paramName) >= 0),
                groupOk: missingGroups.length === 0,
                metadataOk: metadataErrors.length === 0,
                requiredOk: missingRequired.length === 0,
                modeParamOk,
                family: meta && meta.family || '',
                modeParam: meta && meta.modeParam || '',
                missingCommon,
                missingGroups,
                missingRequired,
                metadataErrors
            };
        });
        EffectRegistry.switchTo('plasma');
        return {
            available: true,
            success: results
                .filter(item => item.exists)
                .every(item => item.commonOk && item.depthOk && item.groupOk && item.metadataOk && item.requiredOk && item.modeParamOk),
            existing: results.filter(item => item.exists).map(item => item.name),
            metadataExisting: metadataNames,
            pending: results.filter(item => item.pending).map(item => item.name),
            results
        };
    })()`);
}

async function audit3DFlightInputWiring(cdp) {
    return await evaluate(cdp, `(() => {
        const explicitTargets = {
            mandelbox_flight: ['scale', 'iterations', 'box_fold', 'min_radius', 'fixed_radius', 'bailout', 'detail', 'flight_speed', 'flight_depth', 'orbit_radius', 'orbit_spin', 'fold_target', 'motion_mode', 'motion_phase', 'fold_rotation', 'structure_pulse', 'roll', 'roll_speed', 'fov', 'color_speed', 'palette', 'shade_mode', 'fog', 'glow'],
            quaternion_julia_flight: ['c_x', 'c_y', 'c_z', 'c_w', 'slice_w', 'power', 'iterations', 'bailout', 'detail', 'flight_speed', 'flight_depth', 'orbit_radius', 'orbit_spin', 'target_mode', 'motion_mode', 'motion_phase', 'constant_morph', 'slice_motion', 'roll', 'roll_speed', 'fov', 'color_speed', 'palette', 'shade_mode', 'fog', 'glow'],
            schottky_inversion_flight: ['family', 'iterations', 'sphere_radius', 'sphere_gap', 'center_radius', 'inversion_factor', 'bailout', 'detail', 'flight_speed', 'tunnel_depth', 'orbit_radius', 'orbit_spin', 'motion_mode', 'motion_phase', 'sphere_pulse', 'limit_twist', 'roll', 'roll_speed', 'fov', 'color_speed', 'palette', 'shade_mode', 'fog', 'glow'],
            polyfold_flight: ['family', 'iterations', 'fold_scale', 'fold_offset', 'fold_bias', 'fold_rotation', 'poly_twist', 'bailout', 'thickness', 'flight_speed', 'tunnel_depth', 'orbit_radius', 'orbit_spin', 'motion_mode', 'motion_phase', 'structure_pulse', 'roll', 'roll_speed', 'fov', 'color_speed', 'palette', 'shade_mode', 'fog', 'glow'],
            kifs_flight: ['family', 'iterations', 'fold_scale', 'fold_offset', 'fold_bias', 'fold_rotation', 'bailout', 'thickness', 'flight_speed', 'tunnel_depth', 'orbit_radius', 'orbit_spin', 'motion_mode', 'motion_phase', 'structure_pulse', 'roll', 'roll_speed', 'fov', 'color_speed', 'palette', 'shade_mode', 'fog', 'glow']
        };
        const commonDefault = ${JSON.stringify(fractalFlightCommonRequired)};
        const targets = {};
        const requiredGroups = ['Formula', 'Flight', 'Animation', 'Visual'];
        const requiredAnimation = ['flight_speed', 'orbit_spin', 'motion_mode', 'motion_phase', 'roll', 'roll_speed', 'fov', 'color_speed'];
        const results = [];
        const failures = [];

        function unique(items) {
            return Array.from(new Set(items.filter(function(item) { return !!item; })));
        }

        Object.keys(explicitTargets).forEach(function(name) {
            targets[name] = explicitTargets[name].slice();
        });

        EffectRegistry.getList().forEach(function(item) {
            let meta = item.fractalFlight || null;
            if (!meta) {
                EffectRegistry.switchTo(item.name);
                const currentEffect = EffectRegistry.getCurrent();
                meta = currentEffect && currentEffect.fractalFlight || null;
            }
            if (!meta || meta.kind !== 'de-raymarch') return;
            const metadataExpected = []
                .concat(Array.isArray(meta.requiredParams) ? meta.requiredParams : [])
                .concat(Array.isArray(meta.commonParams) && meta.commonParams.length ? meta.commonParams : commonDefault)
                .concat(Array.isArray(meta.depthParams) ? meta.depthParams : [])
                .concat(Array.isArray(meta.animationParams) ? meta.animationParams : [])
                .concat(meta.modeParam ? [meta.modeParam] : []);
            targets[item.name] = unique((targets[item.name] || []).concat(metadataExpected));
        });

        function fail(name, message) {
            failures.push(name + ': ' + message);
        }

        function esc(text) {
            return String(text).split('').map(function(ch) {
                return '.+*?^$()[]{}|\\\\'.indexOf(ch) >= 0 ? '\\\\' + ch : ch;
            }).join('');
        }

        function isFiniteNumber(value) {
            return typeof value === 'number' && isFinite(value);
        }

        Object.keys(targets).forEach(function(name) {
            const switched = EffectRegistry.switchTo(name);
            const effect = EffectRegistry.getCurrent();
            const shader = effect && effect.shader || '';
            const params = effect && effect.params || [];
            const paramNames = params.map(function(p) { return p.name; });
            const groups = params.reduce(function(acc, p) {
                if (p.group && acc.indexOf(p.group) < 0) acc.push(p.group);
                return acc;
            }, []);
            const missingExpected = targets[name].filter(function(paramName) { return paramNames.indexOf(paramName) < 0; });
            const extraParams = paramNames.filter(function(paramName) { return targets[name].indexOf(paramName) < 0; });
            const missingGroups = requiredGroups.filter(function(group) { return groups.indexOf(group) < 0; });
            const missingAnimation = requiredAnimation.filter(function(paramName) { return paramNames.indexOf(paramName) < 0; });
            const uniformFailures = [];
            const definitionFailures = [];
            const valueFailures = [];
            const duplicateParams = paramNames.filter(function(paramName, index) { return paramNames.indexOf(paramName) !== index; });

            params.forEach(function(p) {
                const uniformName = 'u_' + p.name;
                const uniformPattern = new RegExp('uniform\\\\s+float\\\\s+' + esc(uniformName) + '\\\\s*;');
                const refPattern = new RegExp('\\\\b' + esc(uniformName) + '\\\\b', 'g');
                const refs = shader.match(refPattern) || [];
                if (!uniformPattern.test(shader)) uniformFailures.push(p.name + ' missing uniform declaration');
                if (refs.length < 2) uniformFailures.push(p.name + ' uniform is not used beyond declaration');

                const type = p.type || 'float';
                if (type === 'select') {
                    if (!Array.isArray(p.options) || p.options.length < 2) definitionFailures.push(p.name + ' select needs at least two options');
                    if (!isFiniteNumber(p.default) || Math.round(p.default) !== p.default) definitionFailures.push(p.name + ' select default must be an integer');
                    if (Array.isArray(p.options) && (p.default < 0 || p.default >= p.options.length)) definitionFailures.push(p.name + ' select default outside options');
                    const branchHints = ['<' , '>=', 'floor', 'clamp', 'if'];
                    const sourceNearUniform = shader.indexOf(uniformName) >= 0;
                    if (!sourceNearUniform || !branchHints.some(function(token) { return shader.indexOf(token) >= 0; })) {
                        definitionFailures.push(p.name + ' select has no visible branch logic');
                    }
                } else {
                    if (!isFiniteNumber(p.min) || !isFiniteNumber(p.max) || !isFiniteNumber(p.default)) definitionFailures.push(p.name + ' numeric bounds/default must be finite');
                    if (isFiniteNumber(p.min) && isFiniteNumber(p.max) && p.max <= p.min) definitionFailures.push(p.name + ' max must exceed min');
                    if (isFiniteNumber(p.default) && isFiniteNumber(p.min) && isFiniteNumber(p.max) && (p.default < p.min || p.default > p.max)) definitionFailures.push(p.name + ' default outside bounds');
                    if (p.step !== undefined && (!isFiniteNumber(p.step) || p.step <= 0)) definitionFailures.push(p.name + ' invalid step');
                    if (type === 'int' && ['min', 'max', 'default'].some(function(key) { return isFiniteNumber(p[key]) && Math.abs(p[key] - Math.round(p[key])) > 0.000001; })) {
                        definitionFailures.push(p.name + ' int bounds/default must be integral');
                    }
                }
            });

            if (Controls.setValues) {
                const testValues = {};
                params.forEach(function(p) {
                    if ((p.type || 'float') === 'select') {
                        testValues[p.name] = Math.max(0, Math.min((p.options || []).length - 1, (p.default || 0) + 1));
                    } else if ((p.type || 'float') === 'int') {
                        testValues[p.name] = Math.round(Number(p.min) + (Number(p.max) - Number(p.min)) * 0.57);
                    } else {
                        testValues[p.name] = Number(p.min) + (Number(p.max) - Number(p.min)) * 0.57;
                    }
                });
                Controls.setValues(testValues);
                const current = Controls.getValues ? Controls.getValues() : {};
                Object.keys(testValues).forEach(function(key) {
                    if (!Object.prototype.hasOwnProperty.call(current, key)) {
                        valueFailures.push(key + ' did not reach Controls values');
                        return;
                    }
                    if (Math.abs(Number(current[key]) - Number(testValues[key])) > 0.001) {
                        valueFailures.push(key + ' Controls value mismatch');
                    }
                });
            } else {
                valueFailures.push('Controls.setValues unavailable');
            }

            if (!switched || !effect || effect.name !== name) fail(name, 'effect did not switch active');
            if (missingExpected.length) fail(name, 'missing expected params: ' + missingExpected.join(', '));
            if (missingGroups.length) fail(name, 'missing groups: ' + missingGroups.join(', '));
            if (missingAnimation.length) fail(name, 'missing animation controls: ' + missingAnimation.join(', '));
            if (duplicateParams.length) fail(name, 'duplicate params: ' + duplicateParams.join(', '));
            uniformFailures.forEach(function(message) { fail(name, message); });
            definitionFailures.forEach(function(message) { fail(name, message); });
            valueFailures.forEach(function(message) { fail(name, message); });

            results.push({
                name,
                switched,
                paramCount: params.length,
                expectedCount: targets[name].length,
                groups,
                missingExpected,
                extraParams,
                missingGroups,
                missingAnimation,
                duplicateParams,
                uniformFailures,
                definitionFailures,
                valueFailures,
                success: switched && missingExpected.length === 0 && missingGroups.length === 0 &&
                    missingAnimation.length === 0 && duplicateParams.length === 0 &&
                    uniformFailures.length === 0 && definitionFailures.length === 0 && valueFailures.length === 0
            });
        });

        EffectRegistry.switchTo('plasma');
        return {
            available: true,
            success: failures.length === 0 && results.every(function(result) { return result.success; }),
            failures,
            results
        };
    })()`);
}

async function auditFractalFlightPresets(cdp) {
    const discovery = await evaluate(cdp, `(() => {
        const requiredNames = [
            'triplex_mutation_flight',
            'difs_tunnel_flight',
            'hypercomplex_slice_flight',
            'apollonian_foam_flight',
            'folded_box_variants_flight'
        ];
        if (!window.EffectRegistry || !EffectRegistry.getList) {
            return { available: false, success: false, targets: [], failures: ['EffectRegistry unavailable'] };
        }
        const effects = EffectRegistry.getList();
        const targets = [];
        const failures = [];
        const seen = {};

        effects.forEach(function(item) {
            let meta = item.fractalFlight || null;
            if (!meta) {
                EffectRegistry.switchTo(item.name);
                const effect = EffectRegistry.getCurrent();
                meta = effect && effect.fractalFlight || null;
            }
            seen[item.name] = meta || null;
            if (!meta || !Array.isArray(meta.smokePresets) || meta.smokePresets.length === 0) return;
            meta.smokePresets.forEach(function(preset, index) {
                targets.push({
                    effect: item.name,
                    family: meta.family || item.name,
                    kind: meta.kind || '',
                    renderCost: meta.renderCost || '',
                    preset: preset && preset.name || ('Preset ' + (index + 1)),
                    index,
                    values: preset && preset.values || {},
                    minChanged: preset && preset.minChanged || 0.001
                });
            });
        });

        requiredNames.forEach(function(name) {
            const meta = seen[name];
            if (!meta) failures.push(name + ': missing fractalFlight metadata');
            else if (!Array.isArray(meta.smokePresets) || meta.smokePresets.length < 4) {
                failures.push(name + ': expected at least four smokePresets');
            }
        });

        EffectRegistry.switchTo('plasma');
        return {
            available: true,
            success: failures.length === 0,
            requiredNames,
            targetCount: targets.length,
            targets,
            failures
        };
    })()`);

    if (!discovery.available || !discovery.targets || !discovery.targets.length) {
        return {
            available: discovery.available,
            success: false,
            failures: (discovery.failures || []).concat('no fractal flight presets discovered'),
            results: []
        };
    }

    const results = [];
    const failures = discovery.failures ? discovery.failures.slice() : [];

    async function waitForProgressiveFrames(minFrames, timeoutMs) {
        const deadline = Date.now() + timeoutMs;
        let last = null;
        while (Date.now() < deadline) {
            last = await evaluate(cdp, `(() => {
                const effect = EffectRegistry.getCurrent && EffectRegistry.getCurrent();
                const diagnostics = effect && effect.getDiagnostics ? effect.getDiagnostics() : null;
                return diagnostics ? {
                    name: diagnostics.name || '',
                    accumulationFrames: diagnostics.accumulationFrames || 0,
                    hasFrame: !!diagnostics.hasFrame,
                    pending: !!diagnostics.pending,
                    workerStatus: diagnostics.workerStatus || '',
                    workerError: diagnostics.workerError || '',
                    resetCount: diagnostics.resetCount || 0,
                    workerResetCount: diagnostics.workerResetCount || 0,
                    staleMessages: diagnostics.staleMessages || 0,
                    lastBatchSize: diagnostics.lastBatchSize || 0,
                    lastMaxValue: diagnostics.lastMaxValue || 0
                } : null;
            })()`);
            if (last && last.hasFrame && last.accumulationFrames >= minFrames && !last.workerError) {
                // A worker message uploads a texture before the next render
                // presents it. Sampling immediately can read the previous frame.
                await evaluate(cdp, `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))`);
                return last;
            }
            await wait(120);
        }
        return last;
    }

    const effectFilter = process.argv.find(arg => arg.startsWith('--preset-effect='));
    const selectedTargets = effectFilter ? discovery.targets.filter(t => t.effect === effectFilter.split('=')[1]) : discovery.targets;
    if (!selectedTargets.length) failures.push('No presets matched the requested effect.');
    for (const target of selectedTargets) {
        await glErrors(cdp);
        const setup = await evaluate(cdp, `(() => {
            const target = ${JSON.stringify(target)};
            if (Renderer.setAnimSpeed) Renderer.setAnimSpeed(1);
            if (Renderer.setRotationSpeed) Renderer.setRotationSpeed(0);
            if (Renderer.setRotation) Renderer.setRotation(0);
            if (Renderer.setViewZoom) Renderer.setViewZoom(1);
            if (Renderer.setViewZoomDepth) Renderer.setViewZoomDepth(0);
            if (Renderer.setViewZoomSpeed) Renderer.setViewZoomSpeed(0.7);
            if (Renderer.clearInputPriority) Renderer.clearInputPriority();
            const switched = EffectRegistry.switchTo(target.effect);
            if (Renderer.setAnimSpeed) Renderer.setAnimSpeed(1);
            if (Renderer.setRotationSpeed) Renderer.setRotationSpeed(0);
            if (Renderer.setRotation) Renderer.setRotation(0);
            if (Renderer.setViewZoom) Renderer.setViewZoom(1);
            if (Renderer.setViewZoomDepth) Renderer.setViewZoomDepth(0);
            if (Renderer.setViewZoomSpeed) Renderer.setViewZoomSpeed(0.7);
            if (Renderer.clearInputPriority) Renderer.clearInputPriority();
            if (Renderer.resetTime) Renderer.resetTime();
            const presetSelect = document.getElementById('fractalPresetSelect');
            const presetApply = document.getElementById('fractalPresetApply');
            const hasPresetOption = !!presetSelect && Array.from(presetSelect.options).some(function(option) {
                return option.value === String(target.index);
            });
            let presetUiApplied = false;
            if (presetSelect && hasPresetOption) {
                presetSelect.value = String(target.index);
                presetSelect.dispatchEvent(new Event('change', { bubbles: true }));
                presetUiApplied = true;
            } else if (Controls.applyPreset) {
                presetUiApplied = Controls.applyPreset(target.index);
            }
            if (!presetUiApplied && Controls.setValues) Controls.setValues(target.values);
            if (Renderer.resetTime) Renderer.resetTime();
            if (Renderer.clearInputPriority) Renderer.clearInputPriority();
            const effect = EffectRegistry.getCurrent();
            const params = effect && effect.params || [];
            const paramNames = params.map(function(p) { return p.name; });
            const currentValues = Controls.getValues ? Controls.getValues() : {};
            const keys = Object.keys(target.values || {});
            const missingParams = keys.filter(function(key) { return paramNames.indexOf(key) < 0; });
            const missingValues = keys.filter(function(key) { return !Object.prototype.hasOwnProperty.call(currentValues, key); });
            const valueMismatches = keys.filter(function(key) {
                if (!Object.prototype.hasOwnProperty.call(currentValues, key)) return false;
                const expected = Number(target.values[key]);
                const actual = Number(currentValues[key]);
                return !isFinite(expected) || !isFinite(actual) || Math.abs(expected - actual) > 0.001;
            });
            const visibleMismatches = [];
            const rows = Array.from(document.querySelectorAll('#paramsContainer [data-param]'));
            keys.forEach(function(key) {
                const row = rows.find(function(item) { return item.dataset.param === key; });
                if (!row) {
                    visibleMismatches.push(key + ': missing row');
                    return;
                }
                const select = row.querySelector('select');
                const range = row.querySelector('input[type="range"]');
                const expected = Number(target.values[key]);
                let actual = null;
                let tolerance = 0.001;
                if (select) actual = Number(select.value);
                else if (range) {
                    actual = Number(range.value);
                    const step = Number(range.getAttribute('step'));
                    if (isFinite(step) && step > 0) tolerance = Math.max(tolerance, step * 0.51);
                }
                else return;
                if (!isFinite(actual) || Math.abs(actual - expected) > tolerance) {
                    visibleMismatches.push(key + ': visible mismatch');
                }
            });
            return {
                switched,
                effectName: effect && effect.name,
                label: effect && effect.label,
                preset: target.preset,
                keys,
                presetUiOk: !!presetSelect && !presetApply &&
                    hasPresetOption &&
                    presetSelect.value === String(target.index) &&
                    presetUiApplied,
                missingParams,
                missingValues,
                valueMismatches,
                visibleMismatches,
                inputPriority: Renderer.getInputPriorityState ? Renderer.getInputPriorityState() : null,
                valuesApplied: missingParams.length === 0 && missingValues.length === 0 &&
                    valueMismatches.length === 0 && visibleMismatches.length === 0
            };
        })()`);
        let earlyDiagnostics = null;
        let lateDiagnostics = null;
        if (target.kind === 'progressive-density') {
            earlyDiagnostics = await waitForProgressiveFrames(2, 6500);
        } else {
            await wait(700);
        }
        const early = await canvasStats(cdp);
        if (target.kind === 'progressive-density') {
            // More batches can finish while waiting for presentation and taking
            // the first screenshot. Start the second wait from the count *after*
            // that screenshot, so both samples cannot represent the same update.
            const capturedCount = await evaluate(cdp, `(() => {
                const e = EffectRegistry.getCurrent();
                const d = e && e.getDiagnostics && e.getDiagnostics();
                return d ? d.accumulationFrames || 0 : 0;
            })()`);
            const nextFrame = Math.max(4, capturedCount + 2);
            lateDiagnostics = await waitForProgressiveFrames(nextFrame, 6500);
        } else {
            await wait(500);
        }
        const late = await canvasStats(cdp);
        const errors = await glErrors(cdp);
        const changed = sampleDiff(early, late);
        const earlyNonflat = early.alpha > 0.1 && (early.mean > 0.003 || early.variance > 0.00002);
        const lateNonflat = late.alpha > 0.1 && (late.mean > 0.003 || late.variance > 0.00002);
        const nonflat = earlyNonflat || lateNonflat;
        const progressiveOk = target.kind !== 'progressive-density' ||
            !!(earlyDiagnostics && earlyDiagnostics.hasFrame && earlyDiagnostics.accumulationFrames >= 2 &&
                lateDiagnostics && lateDiagnostics.hasFrame && lateDiagnostics.accumulationFrames >= Math.max(4, earlyDiagnostics.accumulationFrames + 2) &&
                !earlyDiagnostics.workerError && !lateDiagnostics.workerError);
        const success = setup.switched === true &&
            setup.effectName === target.effect &&
            setup.presetUiOk &&
            setup.valuesApplied &&
            progressiveOk &&
            nonflat &&
            changed > target.minChanged &&
            errors.length === 0;

        if (!success) {
            failures.push(target.effect + ' / ' + target.preset + ': preset render or wiring failed' +
                ' (setup=' + (setup.switched === true && setup.effectName === target.effect && setup.presetUiOk && setup.valuesApplied ? 'ok' : 'bad') +
                ', progressive=' + (progressiveOk ? 'ok' : 'bad') +
                ', nonflat=' + nonflat +
                ', changed=' + Number(changed.toFixed(9)) +
                ', minChanged=' + target.minChanged +
                ', earlyMean=' + Number(early.mean.toFixed(6)) +
                ', earlyVariance=' + Number(early.variance.toFixed(6)) +
                ', lateMean=' + Number(late.mean.toFixed(6)) +
                ', lateVariance=' + Number(late.variance.toFixed(6)) +
                ', glErrors=' + errors.join('|') + ')');
        }

        results.push({
            effect: target.effect,
            family: target.family,
            preset: target.preset,
            success,
            setup,
            nonflat,
            earlyNonflat,
            lateNonflat,
            changed: Number(changed.toFixed(9)),
            mean: Number(early.mean.toFixed(6)),
            variance: Number(early.variance.toFixed(6)),
            lateMean: Number(late.mean.toFixed(6)),
            lateVariance: Number(late.variance.toFixed(6)),
            progressive: {
                early: earlyDiagnostics,
                late: lateDiagnostics
            },
            glErrors: errors
        });
    }

    await evaluate(cdp, `EffectRegistry.switchTo('plasma')`);
    return {
        available: true,
        success: failures.length === 0 && results.every(function(result) { return result.success; }),
        requiredNames: discovery.requiredNames,
        targetCount: selectedTargets.length,
        failures,
        results
    };
}

async function auditStatefulEffectCleanup(cdp) {
    const targetNames = ['ifs_lsystem_lab', 'buddhabrot_lab', 'attractor_density_lab', 'flam3_density_lab'];
    const results = [];
    const failures = [];

    for (const name of targetNames) {
        await glErrors(cdp);
        const activated = await evaluate(cdp, `(() => {
            const switched = EffectRegistry.switchTo(${JSON.stringify(name)});
            if (Renderer.resetTime) Renderer.resetTime();
            return {
                switched,
                active: EffectRegistry.getCurrent() && EffectRegistry.getCurrent().name
            };
        })()`);
        await wait(900);
        const cleanup = await evaluate(cdp, `(() => {
            const oldEffect = EffectRegistry.getCurrent();
            const before = oldEffect && oldEffect.getDiagnostics ? oldEffect.getDiagnostics() : null;
            const hasDiagnosticsMethod = !!(oldEffect && oldEffect.getDiagnostics);
            const switchedAway = EffectRegistry.switchTo('plasma');
            const after = oldEffect && oldEffect.getDiagnostics ? oldEffect.getDiagnostics() : null;
            function released(diag) {
                if (!diag) return true;
                if (diag.resources) {
                    return !diag.resources.program && !diag.resources.texture &&
                        !diag.resources.buffer && !diag.resources.worker;
                }
                if (Object.prototype.hasOwnProperty.call(diag, 'points') ||
                        Object.prototype.hasOwnProperty.call(diag, 'lineVertices')) {
                    return Number(diag.points || 0) === 0 && Number(diag.lineVertices || 0) === 0;
                }
                return false;
            }
            return {
                hasDiagnosticsMethod,
                before,
                switchedAway,
                after,
                released: released(after),
                active: EffectRegistry.getCurrent() && EffectRegistry.getCurrent().name
            };
        })()`);
        const errors = await glErrors(cdp);
        const success = activated.switched === true &&
            activated.active === name &&
            cleanup.hasDiagnosticsMethod &&
            cleanup.switchedAway === true &&
            cleanup.active === 'plasma' &&
            cleanup.released &&
            errors.length === 0;
        if (!success) {
            failures.push(name + ': stateful cleanup failed');
        }
        results.push({
            name,
            success,
            activated,
            cleanup,
            glErrors: errors
        });
    }

    return {
        available: true,
        success: failures.length === 0 && results.every(function(result) { return result.success; }),
        failures,
        results
    };
}

async function auditShadertoyCompiler(cdp) {
    return await evaluate(cdp, `(() => {
        if (!window.ShadertoyCompiler) return { available: false, skipped: true };
        const gl = Renderer.getGL();
        const canvas = Renderer.getCanvas();
        if (!gl || !canvas) return { available: true, success: false, error: 'No WebGL canvas available' };
        const wasRunning = Renderer.isRunning();
        Renderer.pause();

        function uploadBasics(program) {
            gl.useProgram(program);
            function one(name, value) {
                const loc = gl.getUniformLocation(program, name);
                if (loc !== null) gl.uniform1f(loc, value);
            }
            const res = gl.getUniformLocation(program, 'iResolution');
            if (res !== null) gl.uniform3f(res, canvas.width, canvas.height, 1);
            one('iTime', 1.25);
            one('iTimeDelta', 1 / 60);
            one('iFrameRate', 60);
            one('iSampleRate', 44100);
            const frame = gl.getUniformLocation(program, 'iFrame');
            if (frame !== null) gl.uniform1i(frame, 12);
            const mouse = gl.getUniformLocation(program, 'iMouse');
            if (mouse !== null) gl.uniform4f(mouse, canvas.width * 0.4, canvas.height * 0.6, canvas.width * 0.4, canvas.height * 0.6);
            const date = gl.getUniformLocation(program, 'iDate');
            if (date !== null) gl.uniform4f(date, 2026, 7, 1, 3600);
            const channelTime = gl.getUniformLocation(program, 'iChannelTime[0]');
            if (channelTime !== null) gl.uniform1fv(channelTime, new Float32Array([0, 0, 0, 0]));
            const channelRes = gl.getUniformLocation(program, 'iChannelResolution[0]');
            if (channelRes !== null) gl.uniform3fv(channelRes, new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
            const channelDate = gl.getUniformLocation(program, 'iChannelDate[0]');
            if (channelDate !== null) gl.uniform4fv(channelDate, new Float32Array([2026, 7, 1, 3600, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
        }

        function stats() {
            const w = 64, h = 36;
            const sample = document.createElement('canvas');
            sample.width = w;
            sample.height = h;
            const ctx = sample.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(canvas, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h).data;
            let sum = 0, sumSq = 0;
            for (let i = 0; i < data.length; i += 4) {
                const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
                sum += lum;
                sumSq += lum * lum;
            }
            const count = data.length / 4;
            const mean = sum / count;
            return { mean, variance: Math.max(0, sumSq / count - mean * mean) };
        }

        const validSource = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    float channelDateProbe = iChannelDate[0].w * 0.0;',
            '    fragColor = vec4(uv, 0.35 + 0.35 * sin(iTime) + channelDateProbe, 1.0);',
            '}'
        ].join('\\n');
        const valid = ShadertoyCompiler.createProgram(gl, {
            passId: 'compiler_valid',
            passName: 'Compiler Valid',
            passSource: validSource
        });
        if (!valid.success) {
            if (wasRunning) Renderer.play();
            return { available: true, success: false, valid };
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        Renderer.setProgram(valid.program);
        uploadBasics(valid.program);
        Renderer.drawQuad();
        const rendered = stats();

        const invalid = ShadertoyCompiler.createProgram(gl, {
            passId: 'compiler_invalid',
            passName: 'Compiler Invalid',
            passSource: 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { vec3 broken = ; fragColor = vec4(broken, 1.0); }'
        });
        const versioned = ShadertoyCompiler.createProgram(gl, {
            passId: 'compiler_versioned',
            passName: 'Compiler Versioned',
            passSource: '#version 300 es\\n' + validSource
        });
        if (valid.program) gl.deleteProgram(valid.program);
        if (versioned.program) gl.deleteProgram(versioned.program);
        EffectRegistry.switchTo('plasma');
        if (wasRunning) Renderer.play();
        return {
            available: true,
            success: rendered.mean > 0.05 && rendered.variance > 0.00001 && !invalid.success && versioned.success,
            rendered,
            valid: { success: valid.success, warnings: valid.warnings, shaderLog: valid.shaderLog, lineOffset: valid.lineOffset },
            invalid: { success: invalid.success, shaderLog: invalid.shaderLog },
            versioned: { success: versioned.success, warnings: versioned.warnings }
        };
    })()`);
}

async function auditShadertoyUniforms(cdp) {
    return await evaluate(cdp, `(() => {
        if (!window.ShadertoyUniforms) return { available: false, skipped: true };
        if (!window.ShadertoyCompiler) return { available: true, success: false, error: 'Compiler unavailable' };
        const gl = Renderer.getGL();
        const canvas = Renderer.getCanvas();
        if (!gl || !canvas) return { available: true, success: false, error: 'No WebGL canvas available' };
        const wasRunning = Renderer.isRunning();
        Renderer.pause();
        ShadertoyUniforms.resetFrameState({ resetMouse: true });
        ShadertoyUniforms.updateFrame(2.5, 0.02, 50);

        const rect = canvas.getBoundingClientRect();
        const downX = rect.left + rect.width * 0.25;
        const downY = rect.top + rect.height * 0.75;
        const moveX = rect.left + rect.width * 0.5;
        const moveY = rect.top + rect.height * 0.5;
        canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: downX, clientY: downY }));
        canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: moveX, clientY: moveY }));
        const mouseDuring = ShadertoyUniforms.getState(canvas).mouse;
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: moveX, clientY: moveY }));
        const mouseAfter = ShadertoyUniforms.getState(canvas).mouse;

        const expectedClickX = canvas.width * 0.25;
        const expectedClickY = canvas.height * 0.25;
        const expectedMoveX = canvas.width * 0.5;
        const expectedMoveY = canvas.height * 0.5;
        const mouseOk =
            Math.abs(mouseDuring[0] - expectedMoveX) <= 2 &&
            Math.abs(mouseDuring[1] - expectedMoveY) <= 2 &&
            Math.abs(mouseDuring[2] - expectedClickX) <= 2 &&
            Math.abs(mouseDuring[3] - expectedClickY) <= 2 &&
            mouseAfter[2] < 0 &&
            mouseAfter[3] < 0;

        const source = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    float framePulse = mod(float(iFrame), 4.0) / 4.0;',
            '    float mousePulse = clamp(abs(iMouse.z) / max(iResolution.x, 1.0), 0.0, 1.0);',
            '    fragColor = vec4(uv.x, framePulse + mousePulse * 0.25, clamp(iTime / 5.0, 0.0, 1.0), 1.0);',
            '}'
        ].join('\\n');
        const compiled = ShadertoyCompiler.createProgram(gl, { passId: 'uniform_visualizer', passName: 'Uniform Visualizer', passSource: source });
        if (!compiled.success) {
            if (wasRunning) Renderer.play();
            return { available: true, success: false, compiled };
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        Renderer.setProgram(compiled.program);
        gl.useProgram(compiled.program);
        ShadertoyUniforms.upload(gl, compiled.program, { canvas: canvas });
        Renderer.drawQuad();

        const sample = document.createElement('canvas');
        sample.width = 32;
        sample.height = 18;
        const ctx = sample.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(canvas, 0, 0, 32, 18);
        const pixels = ctx.getImageData(0, 0, 32, 18).data;
        let sum = 0, sumSq = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3 / 255;
            sum += lum;
            sumSq += lum * lum;
        }
        const count = pixels.length / 4;
        const rendered = { mean: sum / count, variance: Math.max(0, sumSq / count - (sum / count) * (sum / count)) };

        ShadertoyUniforms.resetFrameState();
        const resetState = ShadertoyUniforms.getState(canvas);
        ShadertoyUniforms.updateFrame(0.016, 0.016, 60);
        const firstFrame = ShadertoyUniforms.getState(canvas).frame;
        Renderer.setResolution(640, 360);
        const resized = ShadertoyUniforms.getState(canvas).resolution;
        Renderer.setResolution(1280, 720);
        if (compiled.program) gl.deleteProgram(compiled.program);
        EffectRegistry.switchTo('plasma');
        if (wasRunning) Renderer.play();

        return {
            available: true,
            success: mouseOk && rendered.mean > 0.04 && rendered.variance > 0.00001 && resetState.frame === 0 && firstFrame === 0 && resized[0] === 640 && resized[1] === 360,
            mouseDuring,
            mouseAfter,
            expected: { expectedClickX, expectedClickY, expectedMoveX, expectedMoveY },
            rendered,
            resetFrame: resetState.frame,
            firstFrame,
            resized
        };
    })()`);
}

async function auditAudioAnalysisCore(cdp) {
    return await evaluate(cdp, `(async () => {
        if (!window.AudioAnalysis) return { available: false, success: false };
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        async function waitUntil(fn, timeout) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                if (fn()) return true;
                await sleep(50);
            }
            return false;
        }
        function makeWavFile() {
            const sampleRate = 44100;
            const duration = 0.6;
            const samples = Math.floor(sampleRate * duration);
            const bytes = new ArrayBuffer(44 + samples * 2);
            const view = new DataView(bytes);
            function writeString(offset, text) {
                for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
            }
            writeString(0, 'RIFF');
            view.setUint32(4, 36 + samples * 2, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, 1, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * 2, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, 16, true);
            writeString(36, 'data');
            view.setUint32(40, samples * 2, true);
            for (let i = 0; i < samples; i++) {
                const sample = Math.sin(i / sampleRate * Math.PI * 2 * 440) * 0.65;
                view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
            }
            return new File([bytes], 'smoke-tone.wav', { type: 'audio/wav' });
        }
        AudioAnalysis.init();
        let notifications = 0;
        const off = AudioAnalysis.onStatusChange(function() { notifications++; });
        const sourceList = AudioAnalysis.getSourceList();
        const sourceIds = sourceList.map(function(item) { return item.id; });
        const hasSources = ['studio', 'file', 'capture', 'fallback'].every(function(id) {
            return sourceIds.indexOf(id) >= 0;
        });
        const invalidRejected = AudioAnalysis.setSource('not-a-source') === false;
        const fallbackSet = AudioAnalysis.setSource('fallback') === true;
        const first = AudioAnalysis.getAnalysis({ time: 1.25 });
        const firstWaveform = Array.from(first.waveform);
        const firstFft = Array.from(first.fft);
        const second = AudioAnalysis.getAnalysis({ time: 1.25 });
        const secondWaveform = Array.from(second.waveform);
        const secondFft = Array.from(second.fft);
        const third = AudioAnalysis.getAnalysis({ time: 2.25 });
        const thirdWaveform = Array.from(third.waveform);
        const thirdFft = Array.from(third.fft);
        const fallbackStatus = AudioAnalysis.getStatus();
        const studioWave = new Float32Array(512);
        const studioFft = new Float32Array(512);
        for (let i = 0; i < 512; i++) {
            studioWave[i] = i % 2 ? 0.75 : 0.25;
            studioFft[i] = Math.max(0, 1 - i / 512);
        }
        const providerRegistered = AudioAnalysis.setStudioProvider({
            getAnalysis: function() {
                return {
                    available: true,
                    playing: true,
                    waveform: studioWave,
                    fft: studioFft,
                    sampleRate: 48000,
                    fftSize: 1024
                };
            }
        });
        const studioSet = AudioAnalysis.setSource('studio') === true;
        const studio = AudioAnalysis.getAnalysis({ time: 3.25 });
        const studioStatus = AudioAnalysis.getStatus();
        if (window.Music && Music.getAnalysis) {
            AudioAnalysis.setStudioProvider({
                getAnalysis: Music.getAnalysis,
                isReady: Music.isReady,
                isPlaying: Music.isPlaying
            });
        }
        let studioRuntimeOk = false;
        let studioStoppedFallbackOk = false;
        let studioRuntimeStatus = null;
        let studioRuntimeAnalysis = null;
        let studioRuntimeDebug = null;
        let studioStoppedAnalysis = null;
        if (window.Music && window.Tone) {
            if (!Music.isReady()) {
                await new Promise(function(resolve) {
                    Music.init(function() { resolve(); });
                });
            }
            AudioAnalysis.setSource('studio');
            Music.start();
            const studioStarted = await waitUntil(function() { return Music.isPlaying(); }, 3000);
            await sleep(500);
            studioRuntimeAnalysis = AudioAnalysis.getAnalysis({ time: 3.75 });
            studioRuntimeStatus = AudioAnalysis.getStatus();
            studioRuntimeOk = studioStarted && studioRuntimeAnalysis.available === true && studioRuntimeAnalysis.source === 'studio' &&
                studioRuntimeAnalysis.waveform.length === 512 && studioRuntimeAnalysis.fft.length === 512 &&
                studioRuntimeStatus.source === 'studio';
            if (!studioRuntimeOk) {
                var rawStudio = Music.getAnalysis();
                try { studioRuntimeDebug = { playing: Music.isPlaying(), rawAvailable: rawStudio.available, rawPlaying: rawStudio.playing, metrics: AudioSignal.measure(rawStudio), status: studioRuntimeStatus }; }
                catch (e) { studioRuntimeDebug = { error: e.stack || String(e), status: studioRuntimeStatus }; }
            }
            Music.stop();
            await sleep(160);
            studioStoppedAnalysis = AudioAnalysis.getAnalysis({ time: 3.95 });
            studioStoppedFallbackOk = studioStoppedAnalysis.source === 'fallback' && studioStoppedAnalysis.byteData === true &&
                studioStoppedAnalysis.waveform.length === 512 && studioStoppedAnalysis.fft.length === 512;
        }

        const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
        const originalRevokeObjectUrl = URL.revokeObjectURL.bind(URL);
        const createdUrls = [];
        const revokedUrls = [];
        URL.createObjectURL = function(value) {
            const url = originalCreateObjectUrl(value);
            createdUrls.push(url);
            return url;
        };
        URL.revokeObjectURL = function(value) {
            revokedUrls.push(value);
            return originalRevokeObjectUrl(value);
        };
        let fileLoadOk = false;
        let fileReadyOk = false;
        let fileControlsOk = false;
        let fileBlockedOk = false;
        let filePlayOk = false;
        let fileSwitchKeepsPlayingOk = false;
        let fileAnalysisOk = false;
        let fileClearOk = false;
        let fileReplaceRevokesOk = false;
        let fileStatus = null;
        let fileAnalysis = null;
        try {
            const firstFileLoadOk = await AudioAnalysis.loadFile(makeWavFile());
            const firstFileReadyOk = await waitUntil(function() {
                const s = AudioAnalysis.getFileStatus();
                return s.hasFile && (s.available || s.state === 'idle') && s.duration > 0;
            }, 3000);
            const firstUrl = createdUrls[0];
            const secondFileLoadOk = await AudioAnalysis.loadFile(makeWavFile());
            fileLoadOk = firstFileLoadOk && secondFileLoadOk;
            fileReadyOk = firstFileReadyOk && await waitUntil(function() {
                const s = AudioAnalysis.getFileStatus();
                return s.hasFile && (s.available || s.state === 'idle') && s.duration > 0;
            }, 3000);
            fileReplaceRevokesOk = createdUrls.length === 2 && revokedUrls.indexOf(firstUrl) >= 0;
            AudioAnalysis.setFileLoop(true);
            const gainValue = AudioAnalysis.setFileGain(0.5);
            AudioAnalysis.seekFile(0.05);
            fileStatus = AudioAnalysis.getFileStatus();
            fileControlsOk = fileStatus.hasFile && fileStatus.loop === true && Math.abs(fileStatus.gain - 0.5) < 0.001 && fileStatus.currentTime >= 0;
            const originalMediaPlayDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'play');
            const originalAudioPlayDescriptor = window.HTMLAudioElement ? Object.getOwnPropertyDescriptor(HTMLAudioElement.prototype, 'play') : null;
            const rejectPlay = function() {
                return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
            };
            try {
                Object.defineProperty(HTMLMediaElement.prototype, 'play', {
                    configurable: true,
                    value: rejectPlay
                });
                if (window.HTMLAudioElement) {
                    Object.defineProperty(HTMLAudioElement.prototype, 'play', {
                        configurable: true,
                        value: rejectPlay
                    });
                }
            } catch (err) {
                HTMLMediaElement.prototype.play = rejectPlay;
                if (window.HTMLAudioElement) HTMLAudioElement.prototype.play = rejectPlay;
            }
            try {
                const blockedResult = await AudioAnalysis.playFile();
                const blockedStatus = AudioAnalysis.getStatus();
                const blockedFileStatus = AudioAnalysis.getFileStatus();
                fileBlockedOk = blockedResult === false && blockedStatus.state === 'blocked' && blockedFileStatus.state === 'blocked' && /blocked/i.test(blockedFileStatus.message || '');
            } finally {
                if (originalMediaPlayDescriptor) Object.defineProperty(HTMLMediaElement.prototype, 'play', originalMediaPlayDescriptor);
                if (window.HTMLAudioElement && originalAudioPlayDescriptor) {
                    Object.defineProperty(HTMLAudioElement.prototype, 'play', originalAudioPlayDescriptor);
                } else if (window.HTMLAudioElement) {
                    delete HTMLAudioElement.prototype.play;
                }
            }
            filePlayOk = await AudioAnalysis.playFile();
            await sleep(250);
            fileAnalysis = AudioAnalysis.getAnalysis({ time: 4.5 });
            fileAnalysisOk = fileAnalysis.available === true && fileAnalysis.source === 'file' && fileAnalysis.byteData === true &&
                fileAnalysis.waveform.length === 512 && fileAnalysis.fft.length === 512;
            const switchedToStudio = AudioAnalysis.setSource('studio');
            await sleep(80);
            fileSwitchKeepsPlayingOk = switchedToStudio === true && AudioAnalysis.getSource() === 'studio' && AudioAnalysis.getFileStatus().playing === true;
            AudioAnalysis.setSource('file');
            AudioAnalysis.pauseFile();
            AudioAnalysis.clearFile();
            const afterClear = AudioAnalysis.getFileStatus();
            fileClearOk = !afterClear.hasFile && AudioAnalysis.getSource() === 'studio' &&
                fileReplaceRevokesOk && revokedUrls.indexOf(createdUrls[1]) >= 0;
        } finally {
            URL.createObjectURL = originalCreateObjectUrl;
            URL.revokeObjectURL = originalRevokeObjectUrl;
        }
        const audioUiIds = [
            'audioSourceSelect',
            'audioFileInput',
            'audioFileChoose',
            'audioFilePlay',
            'audioFileClear',
            'audioFileName',
            'audioFileSeek',
            'audioFileTime',
            'audioFileGain',
            'audioFileGainVal',
            'audioFileLoop',
            'audioCaptureStart',
            'audioCaptureStop',
            'audioCaptureStatus',
            'audioSourceStatus',
            'audioMeterLevel',
            'audioMeterBass',
            'audioMeterMid',
            'audioMeterTreble',
            'audioMeterBeat'
        ];
        const audioUiControlsOk = audioUiIds.every(function(id) { return !!document.getElementById(id); });
        const audioSourceOptions = Array.from(document.querySelectorAll('#audioSourceSelect option')).map(function(option) { return option.value; });
        const fileDisabledOk = document.getElementById('audioFilePlay').disabled &&
            document.getElementById('audioFileClear').disabled &&
            document.getElementById('audioFileSeek').disabled &&
            document.getElementById('audioFileGain').disabled &&
            document.getElementById('audioFileLoop').disabled;
        const metersOk = ['audioMeterLevel', 'audioMeterBass', 'audioMeterMid', 'audioMeterTreble', 'audioMeterBeat'].every(function(id) {
            const meter = document.getElementById(id);
            return !!(meter && meter.getAttribute('role') === 'meter' && meter.getAttribute('aria-valuenow') !== null && meter.firstElementChild);
        });
        const audioUiOk = audioUiControlsOk && fileDisabledOk && metersOk && audioSourceOptions.indexOf('studio') >= 0 && audioSourceOptions.indexOf('file') >= 0 && audioSourceOptions.indexOf('capture') >= 0;

        if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        let captureUnsupportedOk = false;
        let captureRejectedOk = false;
        let captureNoTrackOk = false;
        let captureSuccessOk = false;
        let captureStopOk = false;
        let captureSwitchStopOk = false;
        let captureAnalysisOk = false;
        let captureAdvancedConstraintsOk = false;
        let captureFallbackConstraintsOk = false;
        let captureStatus = null;
        let captureAnalysis = null;
        let fakeNoAudioTrackStopped = false;
        let captureStream = null;
        let captureOscillator = null;
        let captureContext = null;
        let switchCaptureStream = null;
        let switchCaptureOscillator = null;
        let switchCaptureContext = null;
        try {
            navigator.mediaDevices.getDisplayMedia = undefined;
            const unsupportedResult = await AudioAnalysis.startCapture();
            const unsupportedStatus = AudioAnalysis.getCaptureStatus();
            captureUnsupportedOk = unsupportedResult === false && unsupportedStatus.state === 'unsupported';

            navigator.mediaDevices.getDisplayMedia = async function() {
                throw new DOMException('Denied', 'NotAllowedError');
            };
            const rejectedResult = await AudioAnalysis.startCapture();
            const rejectedStatus = AudioAnalysis.getCaptureStatus();
            captureRejectedOk = rejectedResult === false && rejectedStatus.state === 'blocked';

            navigator.mediaDevices.getDisplayMedia = async function() {
                return {
                    getAudioTracks: function() { return []; },
                    getTracks: function() {
                        return [{
                            stop: function() { fakeNoAudioTrackStopped = true; },
                            addEventListener: function() {}
                        }];
                    }
                };
            };
            const noTrackResult = await AudioAnalysis.startCapture();
            const noTrackCaptureStatus = AudioAnalysis.getCaptureStatus();
            captureNoTrackOk = noTrackResult === false && noTrackCaptureStatus.state === 'no-audio-track' && /No audio track/i.test(noTrackCaptureStatus.message || '') && fakeNoAudioTrackStopped;

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            captureContext = new AudioCtx();
            await captureContext.resume();
            const destination = captureContext.createMediaStreamDestination();
            captureOscillator = captureContext.createOscillator();
            captureOscillator.frequency.value = 220;
            captureOscillator.connect(destination);
            captureOscillator.start();
            captureStream = destination.stream;
            const captureConstraints = [];
            let firstCaptureCall = true;
            navigator.mediaDevices.getDisplayMedia = async function(constraints) {
                captureConstraints.push(constraints);
                if (firstCaptureCall) {
                    firstCaptureCall = false;
                    throw new TypeError('advanced options unsupported');
                }
                return captureStream;
            };
            const captureStarted = await AudioAnalysis.startCapture();
            await sleep(250);
            captureStatus = AudioAnalysis.getCaptureStatus();
            captureAnalysis = AudioAnalysis.getAnalysis({ time: 5.5 });
            captureAnalysisOk = captureAnalysis.available === true && captureAnalysis.source === 'capture' && captureAnalysis.byteData === true &&
                captureAnalysis.waveform.length === 512 && captureAnalysis.fft.length === 512;
            captureAdvancedConstraintsOk = captureConstraints[0] && captureConstraints[0].systemAudio === 'include' && captureConstraints[0].windowAudio === 'system';
            captureFallbackConstraintsOk = captureConstraints[1] && captureConstraints[1].video === true && captureConstraints[1].audio === true && !captureConstraints[1].systemAudio;
            captureSuccessOk = captureStarted === true && AudioAnalysis.getSource() === 'capture' && captureStatus.active === true && captureStatus.audioTrackCount > 0;
            AudioAnalysis.stopCapture();
            await sleep(50);
            captureStopOk = AudioAnalysis.getSource() === 'studio' && captureStream.getTracks().every(function(track) { return track.readyState === 'ended'; });

            switchCaptureContext = new AudioCtx();
            await switchCaptureContext.resume();
            const switchDestination = switchCaptureContext.createMediaStreamDestination();
            switchCaptureOscillator = switchCaptureContext.createOscillator();
            switchCaptureOscillator.frequency.value = 330;
            switchCaptureOscillator.connect(switchDestination);
            switchCaptureOscillator.start();
            switchCaptureStream = switchDestination.stream;
            navigator.mediaDevices.getDisplayMedia = async function() {
                return switchCaptureStream;
            };
            const switchStarted = await AudioAnalysis.startCapture();
            await sleep(120);
            const switchedAway = AudioAnalysis.setSource('studio');
            await sleep(80);
            captureSwitchStopOk = switchStarted === true && switchedAway === true && AudioAnalysis.getSource() === 'studio' &&
                switchCaptureStream.getTracks().every(function(track) { return track.readyState === 'ended'; }) &&
                AudioAnalysis.getCaptureStatus().hasCapture === false;
        } finally {
            navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
            try { if (captureOscillator) captureOscillator.stop(); } catch (err) {}
            try { if (captureContext) captureContext.close(); } catch (err2) {}
            try { if (switchCaptureOscillator) switchCaptureOscillator.stop(); } catch (err3) {}
            try { if (switchCaptureContext) switchCaptureContext.close(); } catch (err4) {}
        }
        if (off) off();
        function diff(a, b) {
            let total = 0;
            for (let i = 0; i < a.length && i < b.length; i++) total += Math.abs(Number(a[i]) - Number(b[i]));
            return total;
        }
        function variance(arr) {
            let mean = 0;
            for (let i = 0; i < arr.length; i++) mean += Number(arr[i]);
            mean /= Math.max(1, arr.length);
            let value = 0;
            for (let j = 0; j < arr.length; j++) {
                const d = Number(arr[j]) - mean;
                value += d * d;
            }
            return value / Math.max(1, arr.length);
        }
        const shapeOk = first.waveform.length === 512 && first.fft.length === 512 && first.byteData === true;
        const deterministicOk = diff(firstWaveform, secondWaveform) === 0 && diff(firstFft, secondFft) === 0;
        const animatedOk = diff(firstWaveform, thirdWaveform) > 0 && diff(firstFft, thirdFft) > 0;
        const nonFlatOk = variance(firstWaveform) > 10 && variance(firstFft) > 10;
        const metricsOk = ['level', 'bass', 'mid', 'treble', 'beat'].every(function(key) {
            return typeof first[key] === 'number' && first[key] >= 0 && first[key] <= 1;
        });
        const statusOk = fallbackStatus.state === 'fallback' && fallbackStatus.source === 'fallback';
        const providerOk = providerRegistered && studioSet && studio.available === true && studio.active === true && studioRuntimeOk && studioStoppedFallbackOk &&
            studio.source === 'studio' && studio.byteData === false &&
            studio.waveform[0] === 0.25 && studio.waveform[1] === 0.75 &&
            studio.fft[0] === 1 && studio.sampleRate === 48000 &&
            studioStatus.state === 'ready' && studioStatus.source === 'studio' &&
            !!(window.Music && typeof Music.getAnalysis === 'function');
        const captureOk = captureUnsupportedOk && captureRejectedOk && captureNoTrackOk && captureSuccessOk && captureStopOk && captureSwitchStopOk &&
            captureAnalysisOk && captureAdvancedConstraintsOk && captureFallbackConstraintsOk;
        const fileOk = fileLoadOk && fileReadyOk && fileControlsOk && fileBlockedOk && filePlayOk && fileSwitchKeepsPlayingOk && fileAnalysisOk && fileClearOk && fileReplaceRevokesOk && audioUiOk;
        const notificationOk = notifications >= 1;
        return {
            available: true,
            success: hasSources && invalidRejected && fallbackSet && shapeOk && deterministicOk && animatedOk && nonFlatOk && metricsOk && statusOk && providerOk && fileOk && captureOk && notificationOk,
            sourceIds,
            invalidRejected,
            fallbackSet,
            providerRegistered,
            studioSet,
            providerOk,
            studioRuntimeOk,
            studioRuntimeDebug,
            studioStoppedFallbackOk,
            fileOk,
            captureOk,
            file: {
                loadOk: fileLoadOk,
                readyOk: fileReadyOk,
                controlsOk: fileControlsOk,
                blockedOk: fileBlockedOk,
                playOk: filePlayOk,
                switchKeepsPlayingOk: fileSwitchKeepsPlayingOk,
                analysisOk: fileAnalysisOk,
                clearOk: fileClearOk,
                replaceRevokesOk: fileReplaceRevokesOk,
                status: fileStatus,
                analysis: fileAnalysis ? {
                    available: fileAnalysis.available,
                    active: fileAnalysis.active,
                    source: fileAnalysis.source,
                    byteData: fileAnalysis.byteData,
                    level: fileAnalysis.level,
                    bass: fileAnalysis.bass,
                    mid: fileAnalysis.mid,
                    treble: fileAnalysis.treble
                } : null,
                createdUrls,
                revokedUrls
            },
            audioUi: {
                success: audioUiOk,
                controlsOk: audioUiControlsOk,
                disabledOk: fileDisabledOk,
                metersOk,
                optionValues: audioSourceOptions
            },
            capture: {
                unsupportedOk: captureUnsupportedOk,
                rejectedOk: captureRejectedOk,
                noTrackOk: captureNoTrackOk,
                successOk: captureSuccessOk,
                stopOk: captureStopOk,
                switchStopOk: captureSwitchStopOk,
                analysisOk: captureAnalysisOk,
                advancedConstraintsOk: captureAdvancedConstraintsOk,
                fallbackConstraintsOk: captureFallbackConstraintsOk,
                status: captureStatus,
                analysis: captureAnalysis ? {
                    available: captureAnalysis.available,
                    active: captureAnalysis.active,
                    source: captureAnalysis.source,
                    byteData: captureAnalysis.byteData,
                    level: captureAnalysis.level,
                    bass: captureAnalysis.bass,
                    mid: captureAnalysis.mid,
                    treble: captureAnalysis.treble
                } : null
            },
            shapeOk,
            deterministicOk,
            animatedOk,
            nonFlatOk,
            metrics: {
                level: first.level,
                bass: first.bass,
                mid: first.mid,
                treble: first.treble,
                beat: first.beat
            },
            studioStatus,
            studioRuntime: studioRuntimeAnalysis ? {
                ok: studioRuntimeOk,
                stoppedFallbackOk: studioStoppedFallbackOk,
                status: studioRuntimeStatus,
                analysis: {
                    available: studioRuntimeAnalysis.available,
                    active: studioRuntimeAnalysis.active,
                    source: studioRuntimeAnalysis.source,
                    byteData: studioRuntimeAnalysis.byteData,
                    level: studioRuntimeAnalysis.level,
                    bass: studioRuntimeAnalysis.bass,
                    mid: studioRuntimeAnalysis.mid,
                    treble: studioRuntimeAnalysis.treble
                },
                stoppedAnalysis: studioStoppedAnalysis ? {
                    available: studioStoppedAnalysis.available,
                    active: studioStoppedAnalysis.active,
                    source: studioStoppedAnalysis.source,
                    byteData: studioStoppedAnalysis.byteData,
                    level: studioStoppedAnalysis.level,
                    bass: studioStoppedAnalysis.bass,
                    mid: studioStoppedAnalysis.mid,
                    treble: studioStoppedAnalysis.treble
                } : null
            } : null,
            status: fallbackStatus,
            notifications
        };
    })()`);
}

async function auditShadertoyLab(cdp) {
    return await evaluate(cdp, `(async () => {
        if (!window.ShadertoyHost || !window.ShadertoyEditor) return { available: false, skipped: true };
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        function stats() {
            const canvas = Renderer.getCanvas();
            const sample = document.createElement('canvas');
            sample.width = 48;
            sample.height = 27;
            const ctx = sample.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
            const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
            let sum = 0, sumSq = 0;
            for (let i = 0; i < data.length; i += 4) {
                const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
                sum += lum;
                sumSq += lum * lum;
            }
            const count = data.length / 4;
            const mean = sum / count;
            return { mean, variance: Math.max(0, sumSq / count - mean * mean) };
        }
        EffectRegistry.switchTo('shadertoy_lab');
        await sleep(300);
        const panel = document.getElementById('shadertoyPanel');
        const source = document.getElementById('shadertoySource');
        const run = document.getElementById('shadertoyRun');
        const compile = document.getElementById('shadertoyCompile');
        const status = document.getElementById('shadertoyStatus');
        const errors = document.getElementById('shadertoyErrors');
        const visible = panel && !panel.classList.contains('hidden') && source && run && compile;

        const pastedSource = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    fragColor = vec4(uv.x, 0.25 + 0.25 * sin(iTime * 2.0), uv.y, 1.0);',
            '}'
        ].join('\\n');
        source.value = pastedSource;
        source.dispatchEvent(new Event('input', { bubbles: true }));
        run.click();
        await sleep(400);
        const rendered = stats();
        const compiled = /Compiled/.test(status.textContent);

        source.value = 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { vec3 bad = ; fragColor = vec4(bad, 1.0); }';
        source.dispatchEvent(new Event('input', { bubbles: true }));
        compile.click();
        await sleep(400);
        const errorVisible = /Compile failed/.test(status.textContent) && !errors.classList.contains('hidden') && /syntax error|ERROR/i.test(errors.textContent);
        const clearedAfterError = stats();

        source.value = pastedSource;
        source.dispatchEvent(new Event('input', { bubbles: true }));
        run.click();
        await sleep(250);
        const project = ShadertoyHost.serialize();
        ShadertoyHost.loadProject(JSON.stringify(project));
        await sleep(150);
        const importOk = ShadertoyHost.getSource().indexOf('fragCoord / iResolution.xy') >= 0;

        EffectRegistry.switchTo('plasma');
        await sleep(120);
        EffectRegistry.switchTo('shadertoy_lab');
        await sleep(150);
        const retained = document.getElementById('shadertoySource').value.indexOf('fragCoord / iResolution.xy') >= 0;

        return {
            available: true,
            success: !!visible && compiled && rendered.mean > 0.04 && rendered.variance > 0.00001 && errorVisible && clearedAfterError.mean < 0.02 && importOk && retained,
            visible: !!visible,
            compiled,
            rendered,
            errorVisible,
            clearedAfterError,
            importOk,
            retained,
            status: status ? status.textContent : ''
        };
    })()`);
}

async function auditShadertoyPassGraph(cdp) {
    return await evaluate(cdp, `(async () => {
        if (!window.ShadertoyHost || !window.ShadertoyPassGraph) return { available: false, skipped: true };
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        function findPass(project, id) { return project.passes.filter(pass => pass.id === id)[0]; }
        function stats() {
            const canvas = Renderer.getCanvas();
            const sample = document.createElement('canvas');
            sample.width = 48;
            sample.height = 27;
            const ctx = sample.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
            const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
            let r = 0, g = 0, b = 0, sum = 0, sumSq = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i] / 255;
                g += data[i + 1] / 255;
                b += data[i + 2] / 255;
                const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
                sum += lum;
                sumSq += lum * lum;
            }
            const count = data.length / 4;
            const mean = sum / count;
            return { r: r / count, g: g / count, b: b / count, mean, variance: Math.max(0, sumSq / count - mean * mean) };
        }
        function captureSample() {
            const canvas = Renderer.getCanvas();
            const sample = document.createElement('canvas');
            sample.width = 48;
            sample.height = 27;
            const ctx = sample.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
            return Array.from(ctx.getImageData(0, 0, sample.width, sample.height).data);
        }
        function frameDelta(a, b) {
            let total = 0;
            for (let i = 0; i < a.length && i < b.length; i += 4) {
                total += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
            }
            return total / Math.max(1, Math.floor(Math.min(a.length, b.length) / 4)) / 255 / 3;
        }
        function compileProject(project) {
            ShadertoyHost.setProject(project);
            const result = ShadertoyHost.compile();
            if (!result.success) throw new Error(result.shaderLog || 'Pass graph compile failed');
        }

        EffectRegistry.switchTo('shadertoy_lab');
        await sleep(200);

        const imageSample = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    fragColor = texture(iChannel0, fragCoord / iResolution.xy);',
            '}'
        ].join('\\n');
        let project = ShadertoyPassGraph.makeDefaultProject(imageSample);
        findPass(project, 'bufferA').enabled = true;
        findPass(project, 'bufferA').source = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    fragColor = vec4(0.0, 0.1, 1.0, 1.0);',
            '}'
        ].join('\\n');
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA' };
        compileProject(project);
        await sleep(350);
        const bufferAToImage = stats();
        const bufferABlueOk = bufferAToImage.b > 0.8 && bufferAToImage.g < 0.2 && bufferAToImage.r < 0.1;

        project = ShadertoyPassGraph.makeDefaultProject(imageSample);
        findPass(project, 'bufferA').enabled = true;
        findPass(project, 'bufferA').source = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    vec4 prev = texture(iChannel0, uv);',
            '    fragColor = min(prev + vec4(0.045, 0.0, 0.0, 0.0), vec4(1.0, 0.0, 0.0, 1.0));',
            '}'
        ].join('\\n');
        findPass(project, 'bufferA').channels[0] = { slot: 0, kind: 'self', sourceId: 'bufferA' };
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA' };
        compileProject(project);
        await sleep(120);
        const feedbackEarly = stats();
        await sleep(700);
        const feedbackLate = stats();
        ShadertoyHost.reset();
        await sleep(120);
        const feedbackAfterReset = stats();
        const selfFeedbackOk = feedbackLate.r > feedbackEarly.r + 0.12 && feedbackAfterReset.r < feedbackLate.r - 0.08;

        project = ShadertoyPassGraph.makeDefaultProject(imageSample);
        findPass(project, 'bufferA').enabled = true;
        findPass(project, 'bufferA').source = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    fragColor = vec4(0.8, 0.0, 0.0, 1.0);',
            '}'
        ].join('\\n');
        findPass(project, 'bufferB').enabled = true;
        findPass(project, 'bufferB').source = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec4 a = texture(iChannel0, fragCoord / iResolution.xy);',
            '    fragColor = vec4(a.r * 0.1, 0.9, 0.25, 1.0);',
            '}'
        ].join('\\n');
        findPass(project, 'bufferB').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA' };
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferB' };
        compileProject(project);
        await sleep(350);
        const bufferBToImage = stats();
        const multiBufferOk = bufferBToImage.g > 0.75 && bufferBToImage.r < 0.2 && bufferBToImage.b > 0.15;

        Renderer.setResolution(640, 360);
        await sleep(180);
        const graph = ShadertoyHost.getGraph();
        const resized = graph && graph.buffers && graph.buffers.bufferA ? [graph.buffers.bufferA.width, graph.buffers.bufferA.height] : [0, 0];
        Renderer.setResolution(1280, 720);
        await sleep(180);
        const resizeOk = resized[0] === 640 && resized[1] === 360;

        const fx = PostProcess.getEffects()[0];
        PostProcess.setEnabled(fx.name, true);
        await sleep(300);
        const postFxStats = stats();
        PostProcess.setEnabled(fx.name, false);
        const postFxOk = postFxStats.mean > 0.05;

        return {
            available: true,
            success: bufferABlueOk && selfFeedbackOk && multiBufferOk && resizeOk && postFxOk,
            bufferAToImage,
            feedbackEarly,
            feedbackLate,
            feedbackAfterReset,
            bufferBToImage,
            resized,
            postFx: { name: fx.name, stats: postFxStats }
        };
    })()`);
}

async function auditShadertoyChannels(cdp) {
    return await evaluate(cdp, `(async () => {
        if (!window.ShadertoyHost || !window.ShadertoyChannels) return { available: false, skipped: true };
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        function findPass(project, id) { return project.passes.filter(pass => pass.id === id)[0]; }
        function stats() {
            const canvas = Renderer.getCanvas();
            const sample = document.createElement('canvas');
            sample.width = 48;
            sample.height = 27;
            const ctx = sample.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
            const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
            let r = 0, g = 0, b = 0, sum = 0, sumSq = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i] / 255;
                g += data[i + 1] / 255;
                b += data[i + 2] / 255;
                const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
                sum += lum;
                sumSq += lum * lum;
            }
            const count = data.length / 4;
            const mean = sum / count;
            return { r: r / count, g: g / count, b: b / count, mean, variance: Math.max(0, sumSq / count - mean * mean) };
        }
        function compileProject(project) {
            ShadertoyHost.setProject(project);
            const result = ShadertoyHost.compile();
            if (!result.success) throw new Error(result.shaderLog || 'Channel test compile failed');
        }
        function dataUrlSolid(color) {
            const canvas = document.createElement('canvas');
            canvas.width = 2;
            canvas.height = 2;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 2, 2);
            return canvas.toDataURL();
        }
        function dataUrlRedBlue() {
            const canvas = document.createElement('canvas');
            canvas.width = 2;
            canvas.height = 2;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, 1, 2);
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(1, 0, 1, 2);
            return canvas.toDataURL();
        }

        EffectRegistry.switchTo('shadertoy_lab');
        await sleep(200);
        const rows = document.querySelectorAll('#shadertoyChannels .shadertoy-channel-row').length;
        const previews = document.querySelectorAll('#shadertoyChannels .shadertoy-channel-preview').length;
        const uiOk = rows === 4 && previews === 4;

        let project = ShadertoyPassGraph.makeDefaultProject([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    fragColor = texture(iChannel0, uv * 8.0);',
            '}'
        ].join('\\n'));
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'procedural', sourceId: 'checker', sampler: { filter: 'nearest', wrap: 'repeat' } };
        compileProject(project);
        await sleep(350);
        const proceduralStats = stats();
        const proceduralOk = proceduralStats.variance > 0.02;

        project = ShadertoyPassGraph.makeDefaultProject([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    fragColor = texture(iChannel0, vec2(0.5));',
            '}'
        ].join('\\n'));
        const greenUrl = dataUrlSolid('#00ff00');
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'image', dataUrl: greenUrl, sampler: { filter: 'nearest', wrap: 'clamp' } };
        compileProject(project);
        await sleep(700);
        const imageStats = stats();
        const imageOk = imageStats.g > 0.8 && imageStats.r < 0.1 && imageStats.b < 0.1;

        project = ShadertoyPassGraph.makeDefaultProject([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    fragColor = vec4(iChannelResolution[0].xy / vec2(2.0), 0.0, 1.0);',
            '}'
        ].join('\\n'));
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'image', dataUrl: greenUrl, sampler: { filter: 'nearest', wrap: 'clamp' } };
        compileProject(project);
        await sleep(350);
        const resolutionStats = stats();
        const resolutionOk = resolutionStats.r > 0.9 && resolutionStats.g > 0.9;

        const redBlueUrl = dataUrlRedBlue();
        project = ShadertoyPassGraph.makeDefaultProject([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    fragColor = texture(iChannel0, vec2(1.25, 0.5));',
            '}'
        ].join('\\n'));
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'image', dataUrl: redBlueUrl, sampler: { filter: 'nearest', wrap: 'repeat' } };
        compileProject(project);
        await sleep(700);
        const repeatStats = stats();
        findPass(project, 'image').channels[0].sampler.wrap = 'clamp';
        compileProject(project);
        await sleep(700);
        const clampStats = stats();
        const samplerOk = repeatStats.r > 0.8 && repeatStats.b < 0.2 && clampStats.b > 0.8 && clampStats.r < 0.2;

        project = ShadertoyPassGraph.makeDefaultProject([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    fragColor = texture(iChannel0, fragCoord / iResolution.xy);',
            '}'
        ].join('\\n'));
        const badChannel = { slot: 0, kind: 'image', url: 'data:text/plain,not-an-image', sampler: { filter: 'linear', wrap: 'clamp' } };
        findPass(project, 'image').channels[0] = badChannel;
        compileProject(project);
        await sleep(1600);
        const badStatus = ShadertoyChannels.getStatus(badChannel);
        const badStats = stats();
        const fallbackOk = badStatus.state === 'error' && badStats.mean < 0.02;

        return {
            available: true,
            success: uiOk && proceduralOk && imageOk && resolutionOk && samplerOk && fallbackOk,
            ui: { rows, previews },
            proceduralStats,
            imageStats,
            resolutionStats,
            repeatStats,
            clampStats,
            badStatus,
            badStats
        };
    })()`);
}

async function auditShadertoyInputs(cdp) {
    return await evaluate(cdp, `(async () => {
        if (!window.ShadertoyHost || !window.ShadertoyChannels) return { available: false, skipped: true };
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        function findPass(project, id) { return project.passes.filter(pass => pass.id === id)[0]; }
        function stats() {
            const canvas = Renderer.getCanvas();
            const sample = document.createElement('canvas');
            sample.width = 48;
            sample.height = 27;
            const ctx = sample.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
            const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
            let r = 0, g = 0, b = 0, sum = 0, sumSq = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i] / 255;
                g += data[i + 1] / 255;
                b += data[i + 2] / 255;
                const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
                sum += lum;
                sumSq += lum * lum;
            }
            const count = data.length / 4;
            const mean = sum / count;
            return { r: r / count, g: g / count, b: b / count, mean, variance: Math.max(0, sumSq / count - mean * mean) };
        }
        function captureSample() {
            const canvas = Renderer.getCanvas();
            const sample = document.createElement('canvas');
            sample.width = 48;
            sample.height = 27;
            const ctx = sample.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
            return Array.from(ctx.getImageData(0, 0, sample.width, sample.height).data);
        }
        function frameDelta(a, b) {
            let total = 0;
            for (let i = 0; i < a.length && i < b.length; i += 4) {
                total += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
            }
            return total / Math.max(1, Math.floor(Math.min(a.length, b.length) / 4)) / 255 / 3;
        }
        function compileProject(project) {
            ShadertoyHost.setProject(project);
            const result = ShadertoyHost.compile();
            if (!result.success) throw new Error(result.shaderLog || 'Input test compile failed');
        }
        EffectRegistry.switchTo('shadertoy_lab');
        await sleep(200);
        const optionValues = Array.from(document.querySelectorAll('#shadertoyChannels select option')).map(opt => opt.value);
        const uiOptionsOk = ['keyboard', 'audio', 'video', 'webcam', 'microphone'].every(kind => optionValues.indexOf(kind) >= 0);

        let project = ShadertoyPassGraph.makeDefaultProject([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    float down = texture(iChannel0, vec2((65.5 / 256.0), (0.5 / 3.0))).r;',
            '    fragColor = vec4(down, 0.0, 0.0, 1.0);',
            '}'
        ].join('\\n'));
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'keyboard', sampler: { filter: 'nearest', wrap: 'clamp' } };
        compileProject(project);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', keyCode: 65, which: 65, bubbles: true }));
        await sleep(120);
        const keyboardStats = stats();
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', keyCode: 65, which: 65, bubbles: true }));
        const keyboardOk = keyboardStats.r > 0.8;

        project = ShadertoyPassGraph.makeDefaultProject([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    float v = texture(iChannel0, vec2(uv.x, 0.25)).r;',
            '    float band = step(0.5, v);',
            '    fragColor = vec4(vec3(band), 1.0);',
            '}'
        ].join('\\n'));
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'audio', sampler: { filter: 'linear', wrap: 'clamp' } };
        compileProject(project);
        await sleep(300);
        const audioStats = stats();
        const audioOk = audioStats.variance > 0.001 && audioStats.r > 0.1 && audioStats.b > 0.1;

        const originalAudioAnalysisGetAnalysis = window.AudioAnalysis && AudioAnalysis.getAnalysis;
        const originalAudioAnalysisGetStatus = window.AudioAnalysis && AudioAnalysis.getStatus;
        const originalWindowAudioAnalysis = window.AudioAnalysis;
        const originalMusicGetAnalysis = window.Music && Music.getAnalysis;
        let audioPriorityOk = false;
        let audioRowsOk = false;
        let audioStatusOk = false;
        let musicFallbackOk = false;
        let musicCalled = false;
        try {
            const mockWave = new Uint8Array(512);
            const mockFft = new Uint8Array(512);
            mockWave.fill(64);
            mockFft.fill(192);
            AudioAnalysis.getAnalysis = function() {
                return {
                    available: true,
                    active: true,
                    source: 'file',
                    label: 'Audio File',
                    message: '',
                    waveform: mockWave,
                    fft: mockFft,
                    byteData: true,
                    sampleRate: 48000,
                    fftSize: 1024
                };
            };
            AudioAnalysis.getStatus = function() {
                return { state: 'ready', source: 'file', message: 'Mock file source' };
            };
            if (window.Music) {
                Music.getAnalysis = function() {
                    musicCalled = true;
                    return { available: true, waveform: new Float32Array(512), fft: new Float32Array(512) };
                };
            }
            const audioChannel = { slot: 0, kind: 'audio', sampler: { filter: 'nearest', wrap: 'clamp' } };
            project = ShadertoyPassGraph.makeDefaultProject([
                'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                '    float wave = texture(iChannel0, vec2(0.5, 0.25)).r;',
                '    float fft = texture(iChannel0, vec2(0.5, 0.75)).r;',
                '    fragColor = vec4(wave, fft, 0.0, 1.0);',
                '}'
            ].join('\\n'));
            findPass(project, 'image').channels[0] = audioChannel;
            compileProject(project);
            await sleep(180);
            const rowStats = stats();
            const audioChannelStatus = ShadertoyChannels.getStatus(audioChannel);
            audioRowsOk = Math.abs(rowStats.r - 64 / 255) < 0.04 && Math.abs(rowStats.g - 192 / 255) < 0.04;
            audioPriorityOk = musicCalled === false;
            audioStatusOk = audioChannelStatus.audioSource === 'file' && audioChannelStatus.message === 'Mock file source';

            window.AudioAnalysis = undefined;
            if (window.Music) {
                Music.getAnalysis = function() {
                    const wave = new Float32Array(512);
                    const fft = new Float32Array(512);
                    wave.fill(0.2);
                    fft.fill(0.8);
                    return { available: true, waveform: wave, fft: fft };
                };
            }
            compileProject(project);
            await sleep(180);
            const fallbackStats = stats();
            musicFallbackOk = Math.abs(fallbackStats.r - 0.2) < 0.04 && Math.abs(fallbackStats.g - 0.8) < 0.04;
        } finally {
            window.AudioAnalysis = originalWindowAudioAnalysis;
            if (window.AudioAnalysis) {
                AudioAnalysis.getAnalysis = originalAudioAnalysisGetAnalysis;
                AudioAnalysis.getStatus = originalAudioAnalysisGetStatus;
            }
            if (window.Music) Music.getAnalysis = originalMusicGetAnalysis;
        }

        let videoOk = false;
        let videoEarly = null;
        let videoLate = null;
        let videoPausedDelta = null;
        let videoStatus = { state: 'skipped', message: 'MediaRecorder unavailable' };
        project = ShadertoyPassGraph.makeDefaultProject([
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    fragColor = texture(iChannel0, fragCoord / iResolution.xy);',
            '}'
        ].join('\\n'));
        const channel = { slot: 0, kind: 'video', sourceId: 'demo', sampler: { filter: 'nearest', wrap: 'repeat' } };
        findPass(project, 'image').channels[0] = channel;
        compileProject(project);
        await sleep(300);
        videoEarly = stats();
        const videoFrameEarly = captureSample();
        await sleep(700);
        videoLate = stats();
        const videoFrameLate = captureSample();
        const videoDelta = frameDelta(videoFrameEarly, videoFrameLate);
        videoStatus = ShadertoyChannels.getStatus(channel);
        ShadertoyHost.setPaused(true);
        await sleep(120);
        const videoPausedFrameA = captureSample();
        await sleep(700);
        const videoPausedFrameB = captureSample();
        videoPausedDelta = frameDelta(videoPausedFrameA, videoPausedFrameB);
        ShadertoyHost.setPaused(false);
        videoOk = videoStatus.state === 'ready' && videoDelta > 0.02 && videoPausedDelta < 0.01;

        const webcamChannel = { slot: 0, kind: 'webcam', sampler: { filter: 'linear', wrap: 'clamp' } };
        project = ShadertoyPassGraph.makeDefaultProject('void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = texture(iChannel0, fragCoord / iResolution.xy); }');
        findPass(project, 'image').channels[0] = webcamChannel;
        compileProject(project);
        await sleep(800);
        const webcamStatus = ShadertoyChannels.getStatus(webcamChannel);
        const webcamOk = ['ready', 'error', 'permission'].indexOf(webcamStatus.state) >= 0 && !!webcamStatus.message || webcamStatus.state === 'ready';

        const micChannel = { slot: 0, kind: 'microphone', sampler: { filter: 'linear', wrap: 'clamp' } };
        project = ShadertoyPassGraph.makeDefaultProject('void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = texture(iChannel0, vec2(fragCoord.x / iResolution.x, 0.25)); }');
        findPass(project, 'image').channels[0] = micChannel;
        compileProject(project);
        await sleep(800);
        const microphoneStatus = ShadertoyChannels.getStatus(micChannel);
        const microphoneOk = ['ready', 'error', 'permission'].indexOf(microphoneStatus.state) >= 0 && !!microphoneStatus.message || microphoneStatus.state === 'ready';

        return {
            available: true,
            success: uiOptionsOk && keyboardOk && audioOk && audioPriorityOk && audioRowsOk && audioStatusOk && musicFallbackOk && videoOk && webcamOk && microphoneOk,
            uiOptionsOk,
            keyboardStats,
            audioStats,
            audioRouter: {
                priorityOk: audioPriorityOk,
                rowsOk: audioRowsOk,
                statusOk: audioStatusOk,
                musicFallbackOk: musicFallbackOk
            },
            videoStatus,
            videoEarly,
            videoLate,
            videoDelta,
            videoPausedDelta,
            webcamStatus,
            microphoneStatus
        };
    })()`);
}

async function auditShadertoyWorkflow(cdp) {
    const preReload = await evaluate(cdp, `(async () => {
        if (!window.ShadertoyHost || !window.ShadertoyPassGraph) return { available: false, skipped: true };
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        function findPass(project, id) { return project.passes.filter(pass => pass.id === id)[0]; }
        function setInput(el, value) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        localStorage.removeItem('psychedelia.shadertoyLibrary.v1');
        EffectRegistry.switchTo('shadertoy_lab');
        await sleep(200);

        const requiredIds = [
            'shadertoyProjectName',
            'shadertoyProjectDescription',
            'shadertoyLibrary',
            'shadertoyCompilePass',
            'shadertoyFormat',
            'shadertoyPasteMode',
            'shadertoyPasteText',
            'shadertoyApplyPaste',
            'shadertoyCopyBuffer',
            'shadertoyClearBuffer'
        ];
        const uiOk = requiredIds.every(id => !!document.getElementById(id));

        const imageSource = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    fragColor = texture(iChannel0, fragCoord / iResolution.xy);',
            '}'
        ].join('\\n');
        const bufferSource = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    fragColor = vec4(0.1, uv.y, 0.8, 1.0);',
            '}'
        ].join('\\n');
        let project = ShadertoyPassGraph.makeDefaultProject(imageSource);
        findPass(project, 'bufferA').enabled = true;
        findPass(project, 'bufferA').source = bufferSource;
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA' };
        ShadertoyHost.setProject(project);
        let compileOk = ShadertoyHost.compile().success;
        ShadertoyEditor.syncFromHost();

        setInput(document.getElementById('shadertoyProjectName'), 'Workflow Smoke');
        setInput(document.getElementById('shadertoyProjectDescription'), 'Phase 7 metadata smoke test');
        await sleep(120);
        const meta = ShadertoyHost.getProject();
        const metadataOk = meta.name === 'Workflow Smoke' && meta.description === 'Phase 7 metadata smoke test';
        const dirtyAfterMeta = /Modified/.test(document.getElementById('shadertoyDirty').textContent);

        document.getElementById('shadertoySaveLibrary').click();
        await sleep(120);
        const libraryAfterSave = ShadertoyHost.listLibrary();
        const savedItem = libraryAfterSave[0] || null;
        const librarySaveOk = !!savedItem && savedItem.name === 'Workflow Smoke' && /Saved/.test(document.getElementById('shadertoyDirty').textContent);

        document.querySelector('#shadertoyPassTabs [data-pass="bufferA"]').click();
        await sleep(80);
        const pastedBuffer = [
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
            '    vec2 uv = fragCoord / iResolution.xy;',
            '    fragColor = vec4(0.75, uv.x, 0.2, 1.0);',
            '}'
        ].join('\\n');
        document.getElementById('shadertoyPasteMode').value = 'current';
        document.getElementById('shadertoyPasteText').value = pastedBuffer;
        document.getElementById('shadertoyApplyPaste').click();
        await sleep(160);
        const pasteOk = ShadertoyHost.getPassSource('bufferA').indexOf('0.75') >= 0 && ShadertoyHost.getStatus().success;

        ShadertoyHost.setPassSource('bufferA', 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0)');
        const fail = ShadertoyHost.compilePass('bufferA');
        const staleProgramCleared = !ShadertoyHost.getGraph().programs.bufferA;
        const passErrorOk = !fail.success && /Buffer A/.test(fail.shaderLog || '') && staleProgramCleared;

        ShadertoyHost.setPassSource('bufferA', pastedBuffer);
        const repaired = ShadertoyHost.compilePass('bufferA');
        const repairOk = repaired.success;

        const copyOk = ShadertoyHost.copyBufferPass('bufferA', 'bufferC');
        const copied = ShadertoyHost.getProject().passes.filter(pass => pass.id === 'bufferC')[0];
        const copyStateOk = copyOk && copied.enabled && copied.source.indexOf('0.75') >= 0;
        const clearOk = ShadertoyHost.clearBufferPass('bufferC');
        const cleared = ShadertoyHost.getProject().passes.filter(pass => pass.id === 'bufferC')[0];
        const clearStateOk = clearOk && !cleared.enabled && !cleared.source;

        const loadOk = savedItem ? ShadertoyHost.loadFromLibrary(savedItem.id) : false;
        const loadedProject = ShadertoyHost.getProject();
        const libraryLoadOk = loadOk && loadedProject.name === 'Workflow Smoke';
        const deleteOk = savedItem ? ShadertoyHost.deleteFromLibrary(savedItem.id) : false;
        const libraryDeleteOk = deleteOk && ShadertoyHost.listLibrary().length === 0;

        ShadertoyHost.loadProject(JSON.stringify(project));
        ShadertoyHost.setMetadata({ name: 'Workflow Smoke', description: 'Phase 7 metadata smoke test' });
        ShadertoyHost.setPassSource('bufferA', pastedBuffer);
        ShadertoyHost.compile();
        const exported = JSON.stringify(ShadertoyHost.serialize());

        return {
            available: true,
            success: uiOk && compileOk && metadataOk && dirtyAfterMeta && librarySaveOk && pasteOk && passErrorOk && repairOk && copyStateOk && clearStateOk && libraryLoadOk && libraryDeleteOk,
            uiOk,
            compileOk,
            metadataOk,
            dirtyAfterMeta,
            librarySaveOk,
            pasteOk,
            passErrorOk,
            staleProgramCleared,
            repairOk,
            copyStateOk,
            clearStateOk,
            libraryLoadOk,
            libraryDeleteOk,
            exported
        };
    })()`);

    if (!preReload.available) return preReload;
    await cdp.send('Page.reload', { ignoreCache: true });
    await waitForApp(cdp);
    await waitForExpression(cdp, 'window.ShadertoyHost && window.ShadertoyPassGraph && window.ShadertoyEditor', 'Shadertoy Lab globals');
    await wait(700);

    const exportedLiteral = JSON.stringify(preReload.exported || '');
    const postReload = await evaluate(cdp, `(async () => {
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        function stats() {
            const canvas = Renderer.getCanvas();
            const sample = document.createElement('canvas');
            sample.width = 48;
            sample.height = 27;
            const ctx = sample.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
            const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
            let sum = 0, sumSq = 0;
            for (let i = 0; i < data.length; i += 4) {
                const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
                sum += lum;
                sumSq += lum * lum;
            }
            const count = data.length / 4;
            const mean = sum / count;
            return { mean, variance: Math.max(0, sumSq / count - mean * mean) };
        }
        EffectRegistry.switchTo('shadertoy_lab');
        await sleep(300);
        const restored = ShadertoyHost.getProject();
        const restoredOk = restored.name === 'Workflow Smoke' && restored.description === 'Phase 7 metadata smoke test';
        const importResult = ShadertoyHost.loadProject(${exportedLiteral});
        await sleep(300);
        const imported = ShadertoyHost.getProject();
        const importedBuffer = imported.passes.filter(pass => pass.id === 'bufferA')[0];
        const importedImage = imported.passes.filter(pass => pass.id === 'image')[0];
        const importOk = importResult.success && imported.name === 'Workflow Smoke' && importedBuffer.enabled && importedImage.channels[0].sourceId === 'bufferA';
        const rendered = stats();
        const uiAfterReloadOk = !!document.getElementById('shadertoyProjectName') && !!document.getElementById('shadertoyLibrary');
        return {
            restoredOk,
            importOk,
            uiAfterReloadOk,
            rendered,
            success: restoredOk && importOk && uiAfterReloadOk && rendered.mean > 0.02
        };
    })()`);

    return {
        available: true,
        success: preReload.success && postReload.success,
        preReload,
        postReload
    };
}

async function auditShadertoyApiImport(cdp) {
    return await evaluate(cdp, `(async () => {
        if (!window.ShadertoyHost) return { available: false, skipped: true };
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        function findPass(project, id) { return project.passes.filter(pass => pass.id === id)[0]; }
        localStorage.removeItem('psychedelia.shadertoyApiCache.v1');
        localStorage.removeItem('psychedelia.shadertoyApiKey.v1');
        EffectRegistry.switchTo('shadertoy_lab');
        await sleep(200);

        const noKey = await ShadertoyHost.importFromApi('XyZ123');
        const noKeyOk = !noKey.success && /key/i.test(noKey.error || '');

        const originalFetch = window.fetch;
        let requestedUrl = '';
        window.fetch = async function(url) {
            requestedUrl = String(url);
            return {
                ok: true,
                status: 200,
                json: async function() {
                    return {
                        Shader: {
                            info: {
                                id: 'XyZ123',
                                name: 'API Smoke',
                                username: 'api_tester',
                                description: 'Mock public API shader',
                                license: 'CC BY-NC-SA 3.0'
                            },
                            renderpass: [
                                {
                                    type: 'common',
                                    name: 'Common',
                                    code: 'vec3 apiTint(vec3 c) { return c * vec3(1.0, 0.8, 0.6); }'
                                },
                                {
                                    type: 'buffer',
                                    name: 'Buffer A',
                                    code: [
                                        'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                                        '    vec2 uv = fragCoord / iResolution.xy;',
                                        '    fragColor = vec4(apiTint(vec3(uv.x, 0.4, 0.9)), 1.0);',
                                        '}'
                                    ].join('\\n'),
                                    inputs: []
                                },
                                {
                                    type: 'image',
                                    name: 'Image',
                                    code: [
                                        'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                                        '    vec4 a = texture(iChannel0, fragCoord / iResolution.xy);',
                                        '    fragColor = vec4(a.rgb, 1.0);',
                                        '}'
                                    ].join('\\n'),
                                    inputs: [
                                        { channel: 2, ctype: 'texture', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', sampler: { filter: 'mipmap', wrap: 'repeat', vflip: 'true' } },
                                        { channel: 0, ctype: 'buffer', src: 'Buffer A', sampler: { filter: 'linear', wrap: 'clamp', vflip: 'false' } },
                                        { channel: 1, ctype: 'cubemap', src: '/media/a/cubemap00.png', sampler: { filter: 'linear', wrap: 'repeat' } }
                                    ]
                                },
                                {
                                    type: 'sound',
                                    name: 'Sound',
                                    code: 'vec2 mainSound(int samp, float time) { return vec2(sin(time)); }',
                                    inputs: []
                                }
                            ]
                        }
                    };
                }
            };
        };

        ShadertoyHost.setApiKey('test-key');
        const imported = await ShadertoyHost.importFromApi('XyZ123');
        await sleep(250);
        const project = ShadertoyHost.getProject();
        const image = findPass(project, 'image');
        const bufferA = findPass(project, 'bufferA');
        const importedOk = imported.success && project.name === 'API Smoke' && bufferA.enabled && image.channels[0].kind === 'buffer' && image.channels[0].sourceId === 'bufferA';
        const attributionOk = project.attribution && project.attribution.source === 'Shadertoy' && project.attribution.id === 'XyZ123' && project.attribution.author === 'api_tester' && project.license === 'CC BY-NC-SA 3.0';
        const skippedPassOk = /Skipped unsupported Shadertoy passes: Sound\\./.test(project.description || '') && image.source.indexOf('mainImage') >= 0 && image.source.indexOf('mainSound') < 0;
        const unsupportedOk = image.channels[1].kind === 'unsupported' && /cubemap/i.test(image.channels[1].message || '') && ShadertoyChannels.getStatus(image.channels[1]).state === 'error';
        const textureOk = image.channels[2].kind === 'image' && /^data:image\\/png/.test(image.channels[2].url || '') && image.channels[2].sampler.mipmap && image.channels[2].sampler.wrap === 'repeat';
        const urlOk = /\\/api\\/v1\\/shaders\\/XyZ123\\?key=test-key/.test(requestedUrl);
        const cachedEntry = ShadertoyHost.getCachedImport('XyZ123');
        const cacheOk = !!(cachedEntry && cachedEntry.project && cachedEntry.project.name === 'API Smoke');

        window.fetch = async function() { throw new Error('offline'); };
        const cached = await ShadertoyHost.importFromApi('XyZ123');
        const cacheFallbackOk = cached.success && cached.cached === true && ShadertoyHost.getProject().name === 'API Smoke';
        window.fetch = originalFetch;

        const apiUiOk = !!document.getElementById('shadertoyApiKey') && !!document.getElementById('shadertoyApiShaderId') && !!document.getElementById('shadertoyImportApi');

        return {
            available: true,
            success: noKeyOk && importedOk && attributionOk && skippedPassOk && unsupportedOk && textureOk && urlOk && cacheOk && cacheFallbackOk && apiUiOk,
            noKeyOk,
            importedOk,
            attributionOk,
            skippedPassOk,
            unsupportedOk,
            textureOk,
            urlOk,
            cacheOk,
            cacheFallbackOk,
            apiUiOk,
            requestedUrl
        };
    })()`);
}

async function auditShadertoyQuality(cdp) {
    const runtime = await evaluate(cdp, `(async () => {
        if (!window.ShadertoyHost || !window.ShadertoyPassGraph) return { available: false, skipped: true };
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        function findPass(project, id) { return project.passes.filter(pass => pass.id === id)[0]; }
        EffectRegistry.switchTo('shadertoy_lab');
        await sleep(200);

        const imageSource = 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = texture(iChannel0, fragCoord / iResolution.xy); }';
        const bufferSource = 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { vec2 uv = fragCoord / iResolution.xy; fragColor = vec4(uv, 0.25, 1.0); }';
        const project = ShadertoyPassGraph.makeDefaultProject(imageSource);
        findPass(project, 'bufferA').enabled = true;
        findPass(project, 'bufferA').source = bufferSource;
        findPass(project, 'image').channels[0] = { slot: 0, kind: 'buffer', sourceId: 'bufferA' };
        ShadertoyHost.setProject(project);
        const compileOk = ShadertoyHost.compile().success;

        const rgba16 = ShadertoyHost.setRenderTargetFormat('rgba16f');
        await sleep(120);
        let diagnostics = ShadertoyHost.getDiagnostics();
        const format16Ok = diagnostics.renderTargetFormat.requested === 'rgba16f' && ['rgba16f', 'rgba8'].indexOf(diagnostics.renderTargetFormat.active) >= 0;
        const rgba32 = ShadertoyHost.setRenderTargetFormat('rgba32f');
        await sleep(120);
        diagnostics = ShadertoyHost.getDiagnostics();
        const format32Ok = diagnostics.renderTargetFormat.requested === 'rgba32f' && ['rgba32f', 'rgba16f', 'rgba8'].indexOf(diagnostics.renderTargetFormat.active) >= 0;
        ShadertoyHost.setRenderTargetFormat('rgba8');

        ShadertoyHost.setBufferResolutionScale('bufferA', 0.5);
        ShadertoyHost.reset();
        await sleep(120);
        diagnostics = ShadertoyHost.getDiagnostics();
        const canvas = Renderer.getCanvas();
        const bufferA = diagnostics.buffers.bufferA;
        const downscaleOk = bufferA && Math.abs(bufferA.width - Math.floor(canvas.width * 0.5)) <= 1 && Math.abs(bufferA.height - Math.floor(canvas.height * 0.5)) <= 1;

        const guardSource = Array(90).fill('for (int i = 0; i < 1; i++) { }').join('\\n') + '\\nvoid mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(0.0); }';
        const guarded = ShadertoyCompiler.buildFragmentSource({ passSource: guardSource, passName: 'Guarded' });
        const guardOk = guarded.warnings.some(warning => /many loops|compile slowly/i.test(warning));

        localStorage.removeItem('psychedelia.shadertoyApiCache.v1');
        ShadertoyHost.setSafeMode(true);
        ShadertoyHost.setApiKey('safe-key');
        const originalFetch = window.fetch;
        window.fetch = async function() {
            return {
                ok: true,
                status: 200,
                json: async function() {
                    return {
                        Shader: {
                            info: { id: 'SfMd01', name: 'Safe Mode API' },
                            renderpass: [
                                { type: 'image', name: 'Image', code: 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0); }', inputs: [] }
                            ]
                        }
                    };
                }
            };
        };
        const safeImport = await ShadertoyHost.importFromApi('SfMd01');
        const safeModeOk = safeImport.success && safeImport.safeMode && safeImport.status && !safeImport.status.success && /Safe Mode/i.test(safeImport.status.shaderLog || '');
        ShadertoyHost.setSafeMode(false);
        window.fetch = originalFetch;

        const webglCanvas = document.createElement('canvas');
        const webgl1 = webglCanvas.getContext('webgl');
        let webgl1Ok = true;
        if (webgl1) {
            const webgl1Program = ShadertoyCompiler.createProgram(webgl1, {
                passName: 'WebGL1 smoke',
                passSource: 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(fragCoord.xy / iResolution.xy, 0.0, 1.0); }'
            });
            webgl1Ok = !!(webgl1Program && webgl1Program.success);
        }

        const qualityUiOk = !!document.getElementById('shadertoyTargetFormat') && !!document.getElementById('shadertoySafeMode') && !!document.getElementById('shadertoyDiagnostics') && !!document.getElementById('shadertoyBufferScale');
        const diagnosticsOk = !!(diagnostics.renderTargetFormat && diagnostics.renderer && diagnostics.gpu && diagnostics.gpu.maxTex);

        let contextOk = true;
        let contextSkipped = false;
        const gl = Renderer.getGL();
        const lose = gl && gl.getExtension('WEBGL_lose_context');
        if (lose) {
            ShadertoyHost.loadProject(JSON.stringify(project));
            ShadertoyHost.compile();
            await sleep(120);
            lose.loseContext();
            await sleep(250);
            const lost = Renderer.isContextLost && Renderer.isContextLost();
            lose.restoreContext();
            await sleep(1200);
            const restored = !(Renderer.isContextLost && Renderer.isContextLost());
            EffectRegistry.switchTo('shadertoy_lab');
            await sleep(350);
            const recompiled = ShadertoyHost.compile().success;
            contextOk = !!(lost && restored && recompiled);
        } else {
            contextSkipped = true;
        }

        return {
            available: true,
            success: compileOk && format16Ok && format32Ok && downscaleOk && guardOk && safeModeOk && webgl1Ok && qualityUiOk && diagnosticsOk && contextOk,
            compileOk,
            format16Ok,
            format32Ok,
            rgba16,
            rgba32,
            downscaleOk,
            bufferA,
            guardOk,
            safeModeOk,
            webgl1Ok,
            qualityUiOk,
            diagnosticsOk,
            diagnostics,
            contextOk,
            contextSkipped
        };
    })()`);

    if (!runtime.available) return runtime;
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true
    });
    await wait(350);
    const mobile = await evaluate(cdp, `(() => {
        EffectRegistry.switchTo('shadertoy_lab');
        const panel = document.getElementById('shadertoyPanel');
        const source = document.getElementById('shadertoySource');
        const actions = Array.from(document.querySelectorAll('.shadertoy-actions'));
        const rect = panel.getBoundingClientRect();
        const sourceOk = source.clientWidth > 0 && source.scrollWidth <= source.clientWidth + 4;
        const panelOk = rect.width <= window.innerWidth + 1;
        const actionsOk = actions.every(row => row.scrollWidth <= row.clientWidth + 4);
        return { sourceOk, panelOk, actionsOk, width: rect.width, viewport: window.innerWidth, success: sourceOk && panelOk && actionsOk };
    })()`);
    await cdp.send('Emulation.clearDeviceMetricsOverride');
    await wait(250);

    return {
        available: true,
        success: runtime.success && mobile.success,
        runtime,
        mobile
    };
}

async function auditShadertoyCreatorFlow(cdp) {
    const ui = await evaluate(cdp, `(() => {
        if (!window.ShadertoyHost || !window.ShadertoyEditor || !window.ShadertoyPassGraph) return { available: false, skipped: true };
        EffectRegistry.switchTo('shadertoy_lab');
        const ids = [
            'shadertoyBeginnerMode',
            'shadertoyQuickKind',
            'shadertoyQuickMotion',
            'shadertoyQuickPalette',
            'shadertoyQuickDetail',
            'shadertoyQuickGenerate',
            'shadertoyQuickRandom',
            'shadertoyCopyForShadertoy',
            'shadertoyQuickExport',
            'shadertoyCreatorStatus'
        ];
        const controlsOk = ids.every(id => !!document.getElementById(id));
        const panel = document.getElementById('shadertoyPanel');
        const beginner = document.getElementById('shadertoyBeginnerMode');
        const apiKey = document.getElementById('shadertoyApiKey');
        const advancedButton = document.getElementById('shadertoyQuickAdvanced');
        beginner.checked = true;
        beginner.dispatchEvent(new Event('change'));
        const beginnerModeOk = panel.classList.contains('beginner-mode') && getComputedStyle(apiKey.closest('.param-row')).display === 'none';
        advancedButton.click();
        const advancedModeOk = !panel.classList.contains('beginner-mode') && getComputedStyle(apiKey.closest('.param-row')).display !== 'none';
        beginner.checked = true;
        beginner.dispatchEvent(new Event('change'));
        return {
            available: true,
            controlsOk,
            beginnerModeOk,
            advancedModeOk,
            success: controlsOk && beginnerModeOk && advancedModeOk
        };
    })()`);
    if (!ui.available) return ui;

    const patterns = [
        ['plasma', 'single'],
        ['rings', 'single'],
        ['tunnel', 'single'],
        ['kaleidoscope', 'single'],
        ['raymarch_orb', 'single'],
        ['feedback_trails', 'feedback'],
        ['mouse_paint', 'feedback'],
        ['audio_pulse', 'audio'],
        ['audio_feedback_trails', 'audio_feedback'],
        ['audio_fluid_ink', 'audio_feedback'],
        ['audio_particles', 'audio'],
        ['audio_raymarch_tunnel', 'audio'],
        ['audio_spectrum_field', 'audio'],
        ['audio_beat_strobe', 'audio'],
        ['audio_slitscan', 'audio_feedback'],
        ['texture_warp', 'procedural']
    ];
    const results = [];

    for (const pattern of patterns) {
        await glErrors(cdp);
        const loaded = await evaluate(cdp, `(() => {
            EffectRegistry.switchTo('shadertoy_lab');
            function setValue(id, value) {
                const el = document.getElementById(id);
                el.value = value;
                el.dispatchEvent(new Event('change'));
            }
            setValue('shadertoyQuickKind', ${JSON.stringify(pattern[0])});
            setValue('shadertoyQuickMotion', 'orbit');
            setValue('shadertoyQuickPalette', 'aurora');
            setValue('shadertoyQuickDetail', 'rich');
            document.getElementById('shadertoyQuickGenerate').click();
            const project = ShadertoyHost.getProject();
            const status = ShadertoyHost.getStatus();
            const image = project.passes.filter(pass => pass.id === 'image')[0];
            const bufferA = project.passes.filter(pass => pass.id === 'bufferA')[0];
            const bundle = ShadertoyEditor.buildShadertoyBundle(project);
            document.getElementById('shadertoyCopyForShadertoy').click();
            const quickExport = document.getElementById('shadertoyQuickExport');
            const sourceText = ((image && image.source) || '') + '\\n' + ((bufferA && bufferA.source) || '');
            let channelOk = true;
            let rowMapOk = true;
            if (${JSON.stringify(pattern[1])} === 'feedback') {
                channelOk = !!(bufferA && bufferA.enabled && bufferA.channels[0].kind === 'self' && image.channels[0].kind === 'buffer');
            } else if (${JSON.stringify(pattern[1])} === 'audio') {
                channelOk = !!(image && image.channels[0].kind === 'audio');
                if (${JSON.stringify(pattern[0])} === 'audio_pulse') {
                    rowMapOk = sourceText.indexOf('vec2(bar, 0.75)') >= 0 && sourceText.indexOf('vec2(uv.x, 0.25)') >= 0;
                }
            } else if (${JSON.stringify(pattern[1])} === 'audio_feedback') {
                channelOk = !!(bufferA && bufferA.enabled && bufferA.channels[0] && bufferA.channels[0].kind === 'audio' && bufferA.channels[1] && bufferA.channels[1].kind === 'self' && image.channels[0] && image.channels[0].kind === 'buffer');
            } else if (${JSON.stringify(pattern[1])} === 'procedural') {
                channelOk = !!(image && image.channels[0].kind === 'procedural');
            }
            return {
                projectName: project.name,
                compileOk: !!(status && status.success),
                sourceOk: !!(image && image.source && image.source.indexOf('mainImage') >= 0),
                channelOk,
                rowMapOk,
                bundleOk: bundle.indexOf('=== Image ===') >= 0 && bundle.indexOf('mainImage') >= 0 && bundle.indexOf('Posting still happens manually') >= 0,
                copyOk: quickExport && quickExport.value.indexOf('=== Image ===') >= 0 && !quickExport.classList.contains('hidden'),
                hasBufferA: !!(bufferA && bufferA.enabled)
            };
        })()`);
        await wait(520);
        const before = await canvasStats(cdp);
        await wait(620);
        const after = await canvasStats(cdp);
        const errors = await glErrors(cdp);
        const changed = sampleDiff(before, after);
        const nonblank = before.alpha > 0.1 && (before.variance > 0.00002 || before.mean > 0.003);
        results.push({
            id: pattern[0],
            success: loaded.compileOk && loaded.sourceOk && loaded.channelOk && loaded.rowMapOk && loaded.bundleOk && loaded.copyOk && nonblank && changed > 0.00002 && errors.length === 0,
            projectName: loaded.projectName,
            compileOk: loaded.compileOk,
            sourceOk: loaded.sourceOk,
            channelOk: loaded.channelOk,
            rowMapOk: loaded.rowMapOk,
            bundleOk: loaded.bundleOk,
            copyOk: loaded.copyOk,
            hasBufferA: loaded.hasBufferA,
            nonblank,
            changed,
            mean: Number(before.mean.toFixed(5)),
            variance: Number(before.variance.toFixed(6)),
            glErrors: errors
        });
    }

    return {
        available: true,
        success: ui.success && results.every(item => item.success),
        ui,
        results
    };
}

async function auditShadertoyMigrations(cdp) {
    const effectNames = ['game_of_life', 'reaction_diffusion', 'feedback'];
    const migratedEffects = [];
    for (const name of effectNames) {
        await glErrors(cdp);
        await evaluate(cdp, `EffectRegistry.switchTo(${JSON.stringify(name)})`);
        await wait(420);
        const before = await canvasStats(cdp);
        await wait(760);
        const after = await canvasStats(cdp);
        const errors = await glErrors(cdp);
        const meta = await evaluate(cdp, `(() => {
            const effect = EffectRegistry.getCurrent();
            const diagnostics = effect && effect.getDiagnostics ? effect.getDiagnostics() : null;
            const status = effect && effect._usesShadertoyGraph && diagnostics ? true : false;
            return {
                usesGraph: !!(effect && effect._usesShadertoyGraph),
                hasDiagnostics: !!diagnostics,
                bufferAComplete: !!(diagnostics && diagnostics.buffers && diagnostics.buffers.bufferA && diagnostics.buffers.bufferA.complete),
                activeFormat: diagnostics && diagnostics.renderTargetFormat && diagnostics.renderTargetFormat.active || '',
                renderer: diagnostics && diagnostics.renderer || ''
            };
        })()`);
        const changed = sampleDiff(before, after);
        const nonblank = before.alpha > 0.1 && (before.variance > 0.00002 || before.mean > 0.003);
        migratedEffects.push({
            name,
            success: meta.usesGraph && meta.hasDiagnostics && meta.bufferAComplete && nonblank && changed > 0.00005 && errors.length === 0,
            usesGraph: meta.usesGraph,
            hasDiagnostics: meta.hasDiagnostics,
            bufferAComplete: meta.bufferAComplete,
            activeFormat: meta.activeFormat,
            renderer: meta.renderer,
            nonblank,
            changed,
            mean: Number(before.mean.toFixed(5)),
            variance: Number(before.variance.toFixed(6)),
            glErrors: errors
        });
    }

    const examples = [];
    for (const id of ['starter_uv_gradient', 'starter_texture_channel', 'particle_feedback', 'audio_feedback_nebula', 'audio_raymarch_tunnel', 'audio_reactive_bars']) {
        await glErrors(cdp);
        const loaded = await evaluate(cdp, `(() => {
            EffectRegistry.switchTo('shadertoy_lab');
            const status = ShadertoyHost.loadExample(${JSON.stringify(id)});
            const project = ShadertoyHost.getProject();
            const image = project.passes.filter(pass => pass.id === 'image')[0];
            const bufferA = project.passes.filter(pass => pass.id === 'bufferA')[0];
            return {
                status,
                projectName: project.name,
                imageChannel0: image && image.channels && image.channels[0],
                bufferAEnabled: !!(bufferA && bufferA.enabled),
                bufferAChannel0: bufferA && bufferA.channels && bufferA.channels[0],
                bufferAChannel1: bufferA && bufferA.channels && bufferA.channels[1]
            };
        })()`);
        await wait(520);
        const before = await canvasStats(cdp);
        await wait(620);
        const after = await canvasStats(cdp);
        const errors = await glErrors(cdp);
        const changed = sampleDiff(before, after);
        const nonblank = before.alpha > 0.1 && (before.variance > 0.00002 || before.mean > 0.003);
        let channelOk = true;
        if (id === 'audio_reactive_bars' || id === 'audio_raymarch_tunnel') {
            channelOk = loaded.imageChannel0 && loaded.imageChannel0.kind === 'audio';
        } else if (id === 'audio_feedback_nebula') {
            channelOk = loaded.bufferAEnabled &&
                loaded.bufferAChannel0 && loaded.bufferAChannel0.kind === 'audio' &&
                loaded.bufferAChannel1 && loaded.bufferAChannel1.kind === 'self' &&
                loaded.imageChannel0 && loaded.imageChannel0.kind === 'buffer';
        } else if (id === 'particle_feedback') {
            channelOk = loaded.bufferAEnabled && loaded.bufferAChannel0 && loaded.bufferAChannel0.kind === 'self';
        } else if (id === 'starter_texture_channel') {
            channelOk = loaded.imageChannel0 && loaded.imageChannel0.kind === 'procedural';
        }
        examples.push({
            id,
            success: !!(loaded.status && loaded.status.success) && channelOk && nonblank && changed > 0.00002 && errors.length === 0,
            projectName: loaded.projectName,
            channelOk,
            nonblank,
            changed,
            mean: Number(before.mean.toFixed(5)),
            variance: Number(before.variance.toFixed(6)),
            glErrors: errors
        });
    }

    return {
        available: true,
        success: migratedEffects.every(item => item.success) && examples.every(item => item.success),
        migratedEffects,
        examples
    };
}

async function runAudit() {
    const startedAt = new Date().toISOString();
    const staticServer = await startStaticServer();
    const appUrl = process.argv.includes('--file') ? new URL('../index.html', import.meta.url).href : staticServer.url;
    const userDataDir = mkdtempSync(join(tmpdir(), 'psychedelia-smoke-'));
    const browserPath = findBrowser();
    const args = [
        '--remote-debugging-port=' + debugPort,
        '--user-data-dir=' + userDataDir,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--autoplay-policy=no-user-gesture-required',
        '--window-size=1366,900',
        appUrl
    ];
    if (headless) args.unshift('--headless=new');

    const browser = spawn(browserPath, args, { stdio: 'ignore' });
    const deadline = Date.now() + timeoutMs;
    let cdp;
    const consoleEntries = [];

    try {
        await waitForJson('http://' + host + ':' + debugPort + '/json/version', deadline);
        cdp = await createPage(appUrl);
        cdp.on('Runtime.consoleAPICalled', function(params) {
            consoleEntries.push({
                type: params.type,
                text: (params.args || []).map(function(arg) { return arg.value || arg.description || ''; }).join(' ')
            });
        });
        cdp.on('Runtime.exceptionThrown', function(params) {
            consoleEntries.push({
                type: 'exception',
                text: params.exceptionDetails && params.exceptionDetails.text || 'Runtime exception'
            });
        });
        cdp.on('Log.entryAdded', function(params) {
            if (params.entry) {
                consoleEntries.push({ type: params.entry.level, text: params.entry.text });
            }
        });
        await cdp.send('Runtime.enable');
        await cdp.send('Log.enable');
        await cdp.send('Page.enable');
        await waitForApp(cdp);
        await waitForExpression(
            cdp,
            'Renderer.getCanvas && Renderer.getCanvas() && Renderer.getResolution().width > 0 && EffectRegistry.getCurrent()',
            'initialized Psychedelia app'
        );

        const pageInfo = await evaluate(cdp, `({
            title: document.title,
            url: location.href,
            renderer: Renderer.getMode(),
            resolution: Renderer.getResolution(),
            effectCount: EffectRegistry.getList().length,
            postEffectCount: PostProcess.getEffects().length
        })`);
        if (process.argv.includes('--recent-self-audit-only')) {
            const audit = await auditRecentChanges(cdp, evaluate);
            const errors = consoleEntries.filter(entry => (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || ''));
            return {ok:audit.ok&&!errors.length,scope:'recent-self-audit-only',audit,console:errors};
        }
        if (process.argv.includes('--robot-only')) {
            const robots = await auditRobotFoundry(cdp, evaluate);
            const errors = consoleEntries.filter(entry => (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || ''));
            return {ok:robots.ok&&!errors.length,scope:'robot-only',robots,console:errors};
        }
        if (process.argv.includes('--shuffle-only')) {
            const shuffle = await auditShuffle(cdp, evaluate);
            const errors = consoleEntries.filter(entry => (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || ''));
            return {ok:shuffle.ok&&!errors.length,scope:'shuffle-only',shuffle,console:errors};
        }
        if (process.argv.includes('--history-only')) {
            const history = await auditEditHistory(cdp, evaluate);
            const errors = consoleEntries.filter(entry => (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || ''));
            return {ok:history.ok&&!errors.length,scope:'history-only',history,console:errors};
        }
        if (process.argv.includes('--render-only')) {
            const rendering = await auditDirectRender(cdp, evaluate);
            const errors = consoleEntries.filter(entry => (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || ''));
            return {ok:rendering.ok&&!errors.length,scope:'render-only',rendering,console:errors};
        }
        if (process.argv.includes('--setups-only')) {
            const setups = await auditSetups(cdp, evaluate);
            const errors = consoleEntries.filter(entry => (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || ''));
            return {ok:setups.ok&&!errors.length,scope:'setups-only',setups,console:errors};
        }
        if (process.argv.includes('--beat-reactor-only')) {
            const audioAnalysisCore = await auditAudioAnalysisCore(cdp);
            const beatReactor = await auditBeatReactor(cdp, evaluate);
            const errors = consoleEntries.filter(entry => (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || ''));
            return { ok: audioAnalysisCore.success && beatReactor.ok && !errors.length, scope: 'beat-reactor-only', page: pageInfo, audioAnalysisCore, beatReactor, console: errors };
        }
        if (process.argv.includes('--endless-scenes-only')) {
            const scenes = await auditEndlessScenes(cdp, evaluate);
            const errors = consoleEntries.filter(entry => (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || ''));
            return { ok: scenes.ok && !errors.length, scope: 'endless-scenes-only', page: pageInfo, scenes, console: errors };
        }
        if (process.argv.includes('--recording-only') || process.argv.includes('--recording-baseline')) {
            const recording = await auditRecording(cdp, evaluate, { baseline: process.argv.includes('--recording-baseline') });
            return { ...recording, scope: 'recording-only', page: pageInfo };
        }
        if (process.argv.includes('--recording-ui-only')) {
            const recording = await auditRecordingUi(cdp, evaluate);
            const screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
            const { writeFile } = await import('node:fs/promises');
            await writeFile(new URL('./audit-artifacts/output-panel.png', import.meta.url), Buffer.from(screenshot.data, 'base64'));
            return { ...recording, scope: 'recording-only', page: pageInfo };
        }
        const effects = await evaluate(cdp, `EffectRegistry.getList()`);
        const postEffects = await evaluate(cdp, `PostProcess.getEffects().map(fx => ({ name: fx.name, label: fx.label }))`);

        if (process.argv.includes('--presets-only')) {
            const presets = await auditFractalFlightPresets(cdp);
            return { ok: presets.success, scope: 'presets-only', presets, failures: presets.failures };
        }

        if (process.argv.includes('--infinite-zoom-only')) {
            const infiniteFractalZoom = await auditInfiniteFractalZoom(cdp);
            const relevantConsole = consoleEntries.filter(function(entry) {
                return (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || '');
            });
            const failures = [];
            if (!infiniteFractalZoom.success) failures.push('Infinite fractal zoom gate failed');
            relevantConsole.forEach(function(entry) { failures.push('Console ' + entry.type + ': ' + entry.text); });
            return {
                ok: failures.length === 0,
                scope: 'infinite-zoom-only',
                page: pageInfo,
                infiniteFractalZoom,
                console: relevantConsole,
                failures
            };
        }

        if (process.argv.includes('--flam3-only')) {
            const flam3Responsiveness = await auditFlam3Responsiveness(cdp);
            const relevantConsole = consoleEntries.filter(function(entry) {
                return (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || '');
            });
            const failures = [];
            if (!flam3Responsiveness.success) failures.push('FLAM3 responsiveness gate failed');
            relevantConsole.forEach(function(entry) { failures.push('Console ' + entry.type + ': ' + entry.text); });
            return {
                ok: failures.length === 0,
                scope: 'flam3-only',
                page: pageInfo,
                flam3Responsiveness,
                console: relevantConsole,
                failures
            };
        }

        if (process.argv.includes('--sidebar-only')) {
            const sidebarControls = await auditSidebarControls(cdp);
            const relevantConsole = consoleEntries.filter(function(entry) {
                return (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || '');
            });
            const failures = [];
            if (!sidebarControls.success) failures.push('Sidebar controls gate failed');
            relevantConsole.forEach(function(entry) { failures.push('Console ' + entry.type + ': ' + entry.text); });
            return {
                ok: failures.length === 0,
                scope: 'sidebar-only',
                page: pageInfo,
                sidebarControls,
                console: relevantConsole,
                failures
            };
        }

        if (process.argv.includes('--global-controls-only')) {
            const plainShaderZoom = await auditGlobalViewZoom(cdp);
            const globalTransformControls = await auditGlobalTransformControls(cdp);
            const relevantConsole = consoleEntries.filter(function(entry) {
                return (entry.type === 'error' || entry.type === 'exception') && !/favicon/i.test(entry.text || '');
            });
            const failures = [];
            if (!plainShaderZoom.success) failures.push('Plain shader global zoom gate failed');
            if (!globalTransformControls.success) failures.push('Custom renderer global transform gate failed');
            relevantConsole.forEach(function(entry) { failures.push('Console ' + entry.type + ': ' + entry.text); });
            return {
                ok: failures.length === 0,
                scope: 'global-controls-only',
                page: pageInfo,
                plainShaderZoom,
                globalTransformControls,
                console: relevantConsole,
                failures
            };
        }

        const effectResults = [];
        for (const effect of effects) {
            effectResults.push(await auditEffect(cdp, effect));
        }
        const effectContract = await auditEffectContract(cdp);
        if (process.argv.includes('--contract-only')) {
            return {
                ok: effectContract.available && effectContract.success,
                scope: 'contract-only',
                page: pageInfo,
                effectContract,
                failures: effectContract.failures || []
            };
        }
        const fractalLabs = await auditFractalLabs(cdp);

        const postResults = [];
        for (const fx of postEffects) {
            postResults.push(await auditPostEffect(cdp, fx));
        }
        const overlays = await auditOverlays(cdp);
        const sidebarControls = await auditSidebarControls(cdp);
        const rendererInputPriority = await auditRendererInputPriority(cdp);
        const globalViewZoom = await auditGlobalViewZoom(cdp);
        const progressiveDensityRenderer = await auditProgressiveDensityRenderer(cdp);
        const statefulEffectCleanup = await auditStatefulEffectCleanup(cdp);
        const shaderFallback = await auditShaderFallback(cdp);

        const effectNames = new Set(effects.map(function(effect) { return effect.name; }));
        const fpsTargets = ['plasma', 'mandelbrot', 'reaction_diffusion', 'feedback', 'kleinian'].filter(function(name) {
            return effectNames.has(name);
        }).slice(0, 3);
        const fps = [];
        for (const name of fpsTargets) {
            fps.push(await measureFps(cdp, name));
        }
        const infiniteFractalZoom = await auditInfiniteFractalZoom(cdp);
        const mandelbulbFlight = await auditMandelbulbFlight(cdp);
        const triplexMutationFlight = await auditTriplexMutationFlight(cdp);
        const mandelboxFlight = await auditMandelboxFlight(cdp);
        const foldedBoxVariantsFlight = await auditFoldedBoxVariantsFlight(cdp);
        const quaternionJuliaFlight = await auditQuaternionJuliaFlight(cdp);
        const hypercomplexSliceFlight = await auditHypercomplexSliceFlight(cdp);
        const schottkyInversionFlight = await auditSchottkyInversionFlight(cdp);
        const apollonianFoamFlight = await auditApollonianFoamFlight(cdp);
        const polyfoldFlight = await auditPolyfoldFlight(cdp);
        const kifsFlight = await auditKifsFlight(cdp);
        const difsTunnelFlight = await auditDifsTunnelFlight(cdp);
        const fractalFlightCoverage = await audit3DFlightCoverage(cdp);
        const fractalFlightInputWiring = await audit3DFlightInputWiring(cdp);
        const fractalFlightPresets = await auditFractalFlightPresets(cdp);

        const shadertoyCompiler = await auditShadertoyCompiler(cdp);
        const audioAnalysisCore = await auditAudioAnalysisCore(cdp);
        const shadertoyUniforms = await auditShadertoyUniforms(cdp);
        const shadertoyLab = await auditShadertoyLab(cdp);
        const shadertoyPassGraph = await auditShadertoyPassGraph(cdp);
        const shadertoyChannels = await auditShadertoyChannels(cdp);
        const shadertoyInputs = await auditShadertoyInputs(cdp);
        const shadertoyWorkflow = await auditShadertoyWorkflow(cdp);
        const shadertoyApiImport = await auditShadertoyApiImport(cdp);
        const shadertoyQuality = await auditShadertoyQuality(cdp);
        const shadertoyCreatorFlow = await auditShadertoyCreatorFlow(cdp);
        const shadertoyMigrations = await auditShadertoyMigrations(cdp);

        const relevantConsole = consoleEntries.filter(function(entry) {
            if (entry.type !== 'error' && entry.type !== 'exception') return false;
            return !/favicon/i.test(entry.text || '');
        });

        const failures = [];
        effectResults.forEach(function(result) {
            if (!result.nonblank) failures.push('Effect rendered blank: ' + result.name);
            if (result.glErrors.length) failures.push('Effect WebGL errors: ' + result.name + ' -> ' + result.glErrors.join(','));
        });
        postResults.forEach(function(result) {
            if (!result.nonblank) failures.push('Post FX rendered blank: ' + result.name);
            if (result.glErrors.length) failures.push('Post FX WebGL errors: ' + result.name + ' -> ' + result.glErrors.join(','));
        });
        relevantConsole.forEach(function(entry) {
            failures.push('Console ' + entry.type + ': ' + entry.text);
        });
        if (shadertoyCompiler.available && !shadertoyCompiler.success) {
            failures.push('Shadertoy compiler gate failed');
        }
        if (audioAnalysisCore.available && !audioAnalysisCore.success) {
            failures.push('AudioAnalysis core gate failed');
        }
        if (effectContract.available && !effectContract.success) {
            failures.push('Effect contract gate failed');
        }
        if (fractalLabs.available && !fractalLabs.success) {
            failures.push('Fractal lab gate failed');
        }
        if (infiniteFractalZoom.available && !infiniteFractalZoom.success) {
            failures.push('Infinite fractal zoom gate failed');
        }
        if (mandelbulbFlight.available && !mandelbulbFlight.success) {
            failures.push('Mandelbulb flight gate failed');
        }
        if (triplexMutationFlight.available && !triplexMutationFlight.success) {
            failures.push('Triplex mutation flight gate failed');
        }
        if (mandelboxFlight.available && !mandelboxFlight.success) {
            failures.push('Mandelbox flight gate failed');
        }
        if (foldedBoxVariantsFlight.available && !foldedBoxVariantsFlight.success) {
            failures.push('Folded box variants flight gate failed');
        }
        if (quaternionJuliaFlight.available && !quaternionJuliaFlight.success) {
            failures.push('Quaternion Julia flight gate failed');
        }
        if (hypercomplexSliceFlight.available && !hypercomplexSliceFlight.success) {
            failures.push('Hypercomplex slice flight gate failed');
        }
        if (schottkyInversionFlight.available && !schottkyInversionFlight.success) {
            failures.push('Schottky inversion flight gate failed');
        }
        if (apollonianFoamFlight.available && !apollonianFoamFlight.success) {
            failures.push('Apollonian foam flight gate failed');
        }
        if (polyfoldFlight.available && !polyfoldFlight.success) {
            failures.push('Polyfold flight gate failed');
        }
        if (kifsFlight.available && !kifsFlight.success) {
            failures.push('KIFS flight gate failed');
        }
        if (difsTunnelFlight.available && !difsTunnelFlight.success) {
            failures.push('DIFS tunnel flight gate failed');
        }
        if (fractalFlightCoverage.available && !fractalFlightCoverage.success) {
            failures.push('3D fractal flight coverage gate failed');
        }
        if (fractalFlightInputWiring.available && !fractalFlightInputWiring.success) {
            failures.push('3D fractal input wiring gate failed');
        }
        if (fractalFlightPresets.available && !fractalFlightPresets.success) {
            failures.push('3D fractal flight presets gate failed: ' + (fractalFlightPresets.failures || []).slice(0, 8).join('; '));
        }
        if (overlays.available && !overlays.success) {
            failures.push('Overlay/strobe gate failed');
        }
        if (sidebarControls.available && !sidebarControls.success) {
            failures.push('Sidebar controls gate failed');
        }
        if (rendererInputPriority.available && !rendererInputPriority.success) {
            failures.push('Renderer input priority gate failed');
        }
        if (globalViewZoom.available && !globalViewZoom.success) {
            failures.push('Global view zoom gate failed');
        }
        if (progressiveDensityRenderer.available && !progressiveDensityRenderer.success) {
            failures.push('Progressive density renderer gate failed: ' + (progressiveDensityRenderer.failures || []).join('; '));
        }
        if (statefulEffectCleanup.available && !statefulEffectCleanup.success) {
            failures.push('Stateful effect cleanup gate failed: ' + (statefulEffectCleanup.failures || []).join('; '));
        }
        if (shaderFallback.available && !shaderFallback.success) {
            failures.push('Shader fallback gate failed');
        }
        if (shadertoyUniforms.available && !shadertoyUniforms.success) {
            failures.push('Shadertoy uniforms gate failed');
        }
        if (shadertoyLab.available && !shadertoyLab.success) {
            failures.push('Shadertoy Lab gate failed');
        }
        if (shadertoyPassGraph.available && !shadertoyPassGraph.success) {
            failures.push('Shadertoy pass graph gate failed');
        }
        if (shadertoyChannels.available && !shadertoyChannels.success) {
            failures.push('Shadertoy channels gate failed');
        }
        if (shadertoyInputs.available && !shadertoyInputs.success) {
            failures.push('Shadertoy inputs gate failed');
        }
        if (shadertoyWorkflow.available && !shadertoyWorkflow.success) {
            failures.push('Shadertoy workflow gate failed');
        }
        if (shadertoyApiImport.available && !shadertoyApiImport.success) {
            failures.push('Shadertoy API import gate failed');
        }
        if (shadertoyQuality.available && !shadertoyQuality.success) {
            failures.push('Shadertoy quality gate failed');
        }
        if (shadertoyCreatorFlow.available && !shadertoyCreatorFlow.success) {
            failures.push('Shadertoy creator flow gate failed');
        }
        if (shadertoyMigrations.available && !shadertoyMigrations.success) {
            failures.push('Shadertoy migration gate failed');
        }

        return {
            ok: failures.length === 0,
            startedAt,
            completedAt: new Date().toISOString(),
            browser: browserPath,
            browserMode: headless ? 'headless' : 'headed',
            serverUrl: staticServer.url,
            page: pageInfo,
            effects: effectResults,
            postEffects: postResults,
            shadertoyCompiler,
            audioAnalysisCore,
            shadertoyUniforms,
            shadertoyLab,
            shadertoyPassGraph,
            shadertoyChannels,
            shadertoyInputs,
            shadertoyWorkflow,
            shadertoyApiImport,
            shadertoyQuality,
            shadertoyCreatorFlow,
            shadertoyMigrations,
            effectContract,
            fractalLabs,
            infiniteFractalZoom,
            mandelbulbFlight,
            triplexMutationFlight,
            mandelboxFlight,
            foldedBoxVariantsFlight,
            quaternionJuliaFlight,
            hypercomplexSliceFlight,
            schottkyInversionFlight,
            apollonianFoamFlight,
            polyfoldFlight,
            kifsFlight,
            difsTunnelFlight,
            fractalFlightCoverage,
            fractalFlightInputWiring,
            fractalFlightPresets,
            overlays,
            sidebarControls,
            rendererInputPriority,
            globalViewZoom,
            progressiveDensityRenderer,
            statefulEffectCleanup,
            shaderFallback,
            fps,
            console: relevantConsole,
            failures
        };
    } finally {
        if (cdp) cdp.close();
        stopBrowser(browser, userDataDir);
        staticServer.server.close();
        try { rmSync(userDataDir, { recursive: true, force: true }); } catch (err) { /* noop */ }
    }
}

runAudit().then(function(result) {
    if (result.scope === 'recent-self-audit-only' || result.scope === 'robot-only' || result.scope === 'shuffle-only' || result.scope === 'history-only' || result.scope === 'render-only' || result.scope === 'setups-only' || result.scope === 'beat-reactor-only' || result.scope === 'endless-scenes-only' || result.scope === 'presets-only' || result.scope === 'recording-only' || result.scope === 'contract-only' || result.scope === 'infinite-zoom-only' ||
            result.scope === 'flam3-only' || result.scope === 'sidebar-only' ||
            result.scope === 'global-controls-only') {
        console.log(JSON.stringify(result, null, 2));
        if (!result.ok) process.exitCode = 1;
        return;
    }
    const summary = {
        ok: result.ok,
        effects: result.effects.length,
        postEffects: result.postEffects.length,
        shadertoyCompiler: result.shadertoyCompiler,
        audioAnalysisCore: result.audioAnalysisCore,
        shadertoyUniforms: result.shadertoyUniforms,
        shadertoyLab: result.shadertoyLab,
        shadertoyPassGraph: result.shadertoyPassGraph,
        shadertoyChannels: result.shadertoyChannels,
        shadertoyInputs: result.shadertoyInputs,
        shadertoyWorkflow: result.shadertoyWorkflow,
        shadertoyApiImport: result.shadertoyApiImport,
        shadertoyQuality: result.shadertoyQuality,
        shadertoyCreatorFlow: result.shadertoyCreatorFlow,
        shadertoyMigrations: result.shadertoyMigrations,
        effectContract: result.effectContract,
        fractalLabs: result.fractalLabs,
        infiniteFractalZoom: result.infiniteFractalZoom,
        mandelbulbFlight: result.mandelbulbFlight,
        triplexMutationFlight: result.triplexMutationFlight,
        mandelboxFlight: result.mandelboxFlight,
        foldedBoxVariantsFlight: result.foldedBoxVariantsFlight,
        quaternionJuliaFlight: result.quaternionJuliaFlight,
        hypercomplexSliceFlight: result.hypercomplexSliceFlight,
        schottkyInversionFlight: result.schottkyInversionFlight,
        apollonianFoamFlight: result.apollonianFoamFlight,
        polyfoldFlight: result.polyfoldFlight,
        kifsFlight: result.kifsFlight,
        difsTunnelFlight: result.difsTunnelFlight,
        fractalFlightCoverage: result.fractalFlightCoverage,
        fractalFlightInputWiring: result.fractalFlightInputWiring,
        fractalFlightPresets: result.fractalFlightPresets,
        overlays: result.overlays,
        sidebarControls: result.sidebarControls,
        rendererInputPriority: result.rendererInputPriority,
        globalViewZoom: result.globalViewZoom,
        progressiveDensityRenderer: result.progressiveDensityRenderer,
        statefulEffectCleanup: result.statefulEffectCleanup,
        shaderFallback: result.shaderFallback,
        fps: result.fps,
        failures: result.failures
    };
    console.log(JSON.stringify(summary, null, 2));
    if (!result.ok) {
        console.log(JSON.stringify(result, null, 2));
        process.exitCode = 1;
    }
}).catch(function(err) {
    console.error(err.stack || err.message);
    process.exitCode = 1;
});
