#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

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
const debugPort = Number(process.env.PSYCHEDELIA_PRESET_CAPTURE_CDP_PORT || (9900 + Math.floor(Math.random() * 300)));
const timeoutMs = Number(process.env.PSYCHEDELIA_PRESET_CAPTURE_TIMEOUT || 60000);
const outputDir = process.argv[2] ? resolve(process.argv[2]) : mkdtempSync(join(tmpdir(), 'psychedelia-fractal-presets-'));
const filterArg = process.argv[3] || '';
const fourthArg = process.argv[4] || '';
const viewport = fourthArg.trim().charAt(0) === '{' ? JSON.parse(fourthArg) : { width: 1366, height: 900 };
const capturePlan = fourthArg && fourthArg.trim().charAt(0) !== '{' ? fourthArg : (process.argv[5] || 'presets');
const filters = filterArg ? new Set(filterArg.replace(/^\[|\]$/g, '').split(',').map(item => item.trim()).filter(Boolean)) : null;

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

function safeName(text) {
    return String(text || 'preset')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'preset';
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
            const data = await readFile(target);
            res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream' });
            res.end(data);
        } catch (err) {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    return new Promise(function(resolveServer, rejectServer) {
        server.once('error', rejectServer);
        server.listen(0, host, function() {
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
    if (!found) throw new Error('No Edge/Chrome executable found. Set BROWSER to a Chromium executable path.');
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

        ws.addEventListener('message', (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id && this.pending.has(msg.id)) {
                const pending = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                if (msg.error) pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                else pending.resolve(msg.result || {});
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
    return new CDPClient(ws);
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
        throw new Error((details.text || 'Evaluation failed') +
            (details.exception && details.exception.description ? ': ' + details.exception.description : ''));
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
        return {
            mean: sum / count,
            variance: Math.max(0, sumSq / count - (sum / count) * (sum / count)),
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

async function sidebarLayout(cdp) {
    return await evaluate(cdp, `(() => {
        const sidebar = document.getElementById('sidebar');
        const paramsContainer = document.getElementById('paramsContainer');
        if (!sidebar || !paramsContainer) return { available: false };
        const sidebarRect = sidebar.getBoundingClientRect();
        const rows = Array.from(paramsContainer.querySelectorAll('.param-row'));
        let rowOverflowCount = 0;
        let controlOverflowCount = 0;
        let labelOverflowCount = 0;
        let maxOverflow = 0;
        function overflowAmount(rect) {
            return Math.max(0, rect.right - sidebarRect.right, sidebarRect.left - rect.left);
        }
        rows.forEach(function(row) {
            const rowOverflow = overflowAmount(row.getBoundingClientRect());
            if (rowOverflow > 1) rowOverflowCount += 1;
            maxOverflow = Math.max(maxOverflow, rowOverflow);
            const label = row.querySelector('label');
            if (label) {
                const labelOverflow = overflowAmount(label.getBoundingClientRect());
                if (labelOverflow > 1) labelOverflowCount += 1;
                maxOverflow = Math.max(maxOverflow, labelOverflow);
            }
            Array.from(row.querySelectorAll('input, select, .slider-wrap, .val-display')).forEach(function(control) {
                const controlOverflow = overflowAmount(control.getBoundingClientRect());
                if (controlOverflow > 1) controlOverflowCount += 1;
                maxOverflow = Math.max(maxOverflow, controlOverflow);
            });
        });
        return {
            available: true,
            paramRows: rows.length,
            rowOverflowCount,
            controlOverflowCount,
            labelOverflowCount,
            maxOverflow: Number(maxOverflow.toFixed(2)),
            pageHorizontalOverflow: Math.max(
                0,
                Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) - window.innerWidth
            )
        };
    })()`);
}

async function waitForApp(cdp) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const ready = await evaluate(cdp, `Boolean(window.Renderer && window.EffectRegistry && document.getElementById('effectSelect') && EffectRegistry.getCurrent())`);
        if (ready) {
            // Tools assert right after a dropdown change, so use the immediate switch.
            await evaluate(cdp, 'window.__psySyncSwitch = true');
            return;
        }
        await wait(100);
    }
    throw new Error('App did not expose Renderer/EffectRegistry before timeout');
}

async function discoverPresets(cdp) {
    return await evaluate(cdp, `(() => {
        const filters = ${JSON.stringify(filters ? Array.from(filters) : [])};
        const capturePlan = ${JSON.stringify(capturePlan)};
        const filterSet = new Set(filters);
        const targets = [];
        const includeModes = capturePlan === 'modes' || capturePlan === 'modes+first-presets' || capturePlan === 'all';
        const includePresets = capturePlan === 'presets' || capturePlan === 'modes+first-presets' || capturePlan === 'all';
        const firstPresetOnly = capturePlan === 'modes+first-presets';
        EffectRegistry.getList().forEach(function(item) {
            if (filterSet.size && !filterSet.has(item.name)) return;
            let meta = item.fractalFlight || null;
            if (!meta) {
                EffectRegistry.switchTo(item.name);
                const effect = EffectRegistry.getCurrent();
                meta = effect && effect.fractalFlight || null;
            }
            if (!meta) return;
            if (includeModes && Array.isArray(meta.modes) && meta.modeParam) {
                meta.modes.forEach(function(modeName, index) {
                    const values = {};
                    values[meta.modeParam] = index;
                    targets.push({
                        captureKind: 'mode',
                        effect: item.name,
                        family: meta.family || item.name,
                        kind: meta.kind || '',
                        renderCost: meta.renderCost || '',
                        label: modeName || ('Mode ' + (index + 1)),
                        mode: modeName || ('Mode ' + (index + 1)),
                        index,
                        values,
                        minChanged: meta.kind === 'progressive-density' ? 0.00001 : 0.00002
                    });
                });
            }
            if (includePresets && Array.isArray(meta.smokePresets)) {
                meta.smokePresets.forEach(function(preset, index) {
                    if (firstPresetOnly && index > 0) return;
                    targets.push({
                        captureKind: 'preset',
                        effect: item.name,
                        family: meta.family || item.name,
                        kind: meta.kind || '',
                        renderCost: meta.renderCost || '',
                        label: preset && preset.name || ('Preset ' + (index + 1)),
                        preset: preset && preset.name || ('Preset ' + (index + 1)),
                        index,
                        values: preset && preset.values || {},
                        minChanged: preset && preset.minChanged || 0.001
                    });
                });
            }
        });
        EffectRegistry.switchTo('plasma');
        return targets;
    })()`);
}

async function applyTarget(cdp, target) {
    return await evaluate(cdp, `(() => {
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
        if (target.captureKind === 'preset' && presetSelect && hasPresetOption) {
            presetSelect.value = String(target.index);
            presetSelect.dispatchEvent(new Event('change', { bubbles: true }));
            presetUiApplied = true;
        } else if (target.captureKind === 'preset' && Controls.applyPreset) {
            presetUiApplied = Controls.applyPreset(target.index);
        }
        if ((target.captureKind === 'mode' || !presetUiApplied) && Controls.setValues) Controls.setValues(target.values);
        if (Renderer.resetTime) Renderer.resetTime();
        if (Renderer.clearInputPriority) Renderer.clearInputPriority();
        const effect = EffectRegistry.getCurrent();
        const currentValues = Controls.getValues ? Controls.getValues() : {};
        const keys = Object.keys(target.values || {});
        const valueMismatches = keys.filter(function(key) {
            if (!Object.prototype.hasOwnProperty.call(currentValues, key)) return true;
            return Math.abs(Number(currentValues[key]) - Number(target.values[key])) > 0.001;
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
            uiOk: target.captureKind === 'mode' || (!!presetSelect && !presetApply &&
                hasPresetOption &&
                presetSelect.value === String(target.index) &&
                presetUiApplied),
            presetUiOk: target.captureKind !== 'preset' || (!!presetSelect && !presetApply &&
                hasPresetOption &&
                presetSelect.value === String(target.index) &&
                presetUiApplied),
            keyCount: keys.length,
            valuesApplied: valueMismatches.length === 0 && visibleMismatches.length === 0,
            valueMismatches,
            visibleMismatches,
            inputPriority: Renderer.getInputPriorityState ? Renderer.getInputPriorityState() : null
        };
    })()`);
}

async function waitForProgressiveFrames(cdp, minFrames, timeout) {
    const deadline = Date.now() + timeout;
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
        if (last && last.hasFrame && last.accumulationFrames >= minFrames && !last.workerError) return last;
        await wait(120);
    }
    return last;
}

async function runCapture() {
    mkdirSync(outputDir, { recursive: true });
    const staticServer = await startStaticServer();
    const userDataDir = mkdtempSync(join(tmpdir(), 'psychedelia-preset-capture-'));
    const browserPath = findBrowser();
    const args = [
        '--headless=new',
        '--remote-debugging-port=' + debugPort,
        '--user-data-dir=' + userDataDir,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--autoplay-policy=no-user-gesture-required',
        '--window-size=' + Number(viewport.width || 1366) + ',' + Number(viewport.height || 900),
        staticServer.url
    ];

    const browser = spawn(browserPath, args, { stdio: 'ignore' });
    let cdp;
    try {
        const deadline = Date.now() + timeoutMs;
        await waitForJson('http://' + host + ':' + debugPort + '/json/version', deadline);
        cdp = await createPage(staticServer.url);
        await cdp.send('Runtime.enable');
        await cdp.send('Page.enable');
        await cdp.send('Page.bringToFront');
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: Number(viewport.width || 1366),
            height: Number(viewport.height || 900),
            deviceScaleFactor: Number(viewport.deviceScaleFactor || 1),
            mobile: !!viewport.mobile
        });
        await waitForApp(cdp);

        const targets = await discoverPresets(cdp);
        const results = [];
        for (const target of targets) {
            await glErrors(cdp);
            const setup = await applyTarget(cdp, target);
            let earlyDiagnostics = null;
            let lateDiagnostics = null;
            if (target.kind === 'progressive-density') {
                earlyDiagnostics = await waitForProgressiveFrames(cdp, 2, 6500);
            } else {
                await wait(700);
            }
            const before = await canvasStats(cdp);
            if (target.kind === 'progressive-density') {
                const nextFrame = Math.max(4, (earlyDiagnostics && earlyDiagnostics.accumulationFrames || 0) + 2);
                lateDiagnostics = await waitForProgressiveFrames(cdp, nextFrame, 6500);
            } else {
                await wait(500);
            }
            const after = await canvasStats(cdp);
            const errors = await glErrors(cdp);
            const layout = await sidebarLayout(cdp);
            const changed = sampleDiff(before, after);
            const output = join(outputDir, safeName(target.effect) + '-' + target.captureKind + '-' + String(target.index + 1).padStart(2, '0') + '-' + safeName(target.label) + '.png');
            await cdp.send('Page.bringToFront');
            const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
            await writeFile(output, Buffer.from(shot.data, 'base64'));

            const earlyNonflat = before.alpha > 0.1 && (before.mean > 0.003 || before.variance > 0.00002);
            const lateNonflat = after.alpha > 0.1 && (after.mean > 0.003 || after.variance > 0.00002);
            const nonflat = earlyNonflat || lateNonflat;
            const progressiveOk = target.kind !== 'progressive-density' ||
                !!(earlyDiagnostics && earlyDiagnostics.hasFrame && earlyDiagnostics.accumulationFrames >= 2 &&
                    lateDiagnostics && lateDiagnostics.hasFrame && lateDiagnostics.accumulationFrames >= Math.max(4, earlyDiagnostics.accumulationFrames + 2) &&
                    !earlyDiagnostics.workerError && !lateDiagnostics.workerError);
            const ok = setup.switched === true && setup.effectName === target.effect &&
                setup.uiOk &&
                setup.valuesApplied && progressiveOk && nonflat && changed > target.minChanged && errors.length === 0 &&
                layout.rowOverflowCount === 0 && layout.controlOverflowCount === 0 &&
                layout.labelOverflowCount === 0 && layout.pageHorizontalOverflow === 0;

            results.push({
                ok,
                captureKind: target.captureKind,
                effect: target.effect,
                family: target.family,
                label: target.label,
                mode: target.mode,
                preset: target.preset,
                output,
                setup,
                stats: {
                    mean: Number(before.mean.toFixed(6)),
                    variance: Number(before.variance.toFixed(6)),
                    lateMean: Number(after.mean.toFixed(6)),
                    lateVariance: Number(after.variance.toFixed(6)),
                    earlyNonflat,
                    lateNonflat,
                    nonflat,
                    alpha: Number(before.alpha.toFixed(6)),
                    changed: Number(changed.toFixed(9)),
                    progressive: {
                        early: earlyDiagnostics,
                        late: lateDiagnostics
                    },
                    glErrors: errors
                },
                layout
            });
        }

        return {
            ok: results.length > 0 && results.every(function(result) { return result.ok; }),
            outputDir,
            count: results.length,
            results
        };
    } finally {
        if (cdp) cdp.close();
        stopBrowser(browser, userDataDir);
        staticServer.server.close();
        try { rmSync(userDataDir, { recursive: true, force: true }); } catch (err) { /* noop */ }
    }
}

runCapture().then(function(result) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
}).catch(function(err) {
    console.error(err.stack || err.message);
    process.exitCode = 1;
});
